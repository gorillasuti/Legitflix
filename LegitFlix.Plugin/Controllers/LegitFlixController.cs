using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace LegitFlix.Plugin.Controllers
{
    [ApiController]
    [Route("LegitFlix")]
    // No class-level [AllowAnonymous] — authenticated by default.
    // Each endpoint declares its own policy below.
    public class LegitFlixController : ControllerBase
    {
        private readonly ILogger<LegitFlixController> _logger;

        public LegitFlixController(ILogger<LegitFlixController> logger)
        {
            _logger = logger;
        }

        // ─────────────────────────────────────────────────────────────
        //  Debug endpoint — Administrators only.
        //  Lists embedded resource names inside the compiled DLL.
        //  NEVER exposed publicly — leaks internal assembly structure.
        // ─────────────────────────────────────────────────────────────

        [HttpGet("Debug")]
        [Authorize(Roles = "Administrator")]
        public ActionResult GetDebug()
        {
            var resources = Assembly.GetExecutingAssembly().GetManifestResourceNames();
            // Strip assembly prefix so the output is less verbose
            return Ok(resources.Select(r => r.Replace("LegitFlix.Plugin.", string.Empty)));
        }

        // ─────────────────────────────────────────────────────────────
        //  Client asset endpoint — intentionally public.
        //  Serves the SPA bundle so unauthenticated browsers can reach
        //  the login page.  Uses ONLY embedded resources — no disk I/O,
        //  immune to path traversal by design.
        // ─────────────────────────────────────────────────────────────

        [HttpGet("Client/{*path}")]
        [AllowAnonymous]
        public ActionResult GetContent([FromRoute] string path)
        {
            if (string.IsNullOrEmpty(path))
                path = "index.html";

            // ── Path sanitisation ─────────────────────────────────────
            // Even though we never touch the filesystem, a crafted path
            // could reference unintended assembly resources.  Reject
            // anything that looks like traversal or contains unsafe chars.
            var safePath = SanitiseResourcePath(path);
            if (safePath == null)
            {
                _logger.LogWarning("[LegitFlix] Rejected unsafe asset path request: {PathLength} chars", path.Length);
                return BadRequest();
            }

            var assembly     = Assembly.GetExecutingAssembly();
            var normalised   = safePath.Replace("/", ".");
            var resourceName = $"LegitFlix.Plugin.Assets.Client.{normalised}";

            var stream = assembly.GetManifestResourceStream(resourceName);

            // Fallback: suffix match for Vite content-hashed filenames
            if (stream == null)
            {
                var match = assembly.GetManifestResourceNames()
                    .FirstOrDefault(r => r.EndsWith($".{normalised}", StringComparison.Ordinal));

                if (match != null)
                {
                    resourceName = match;
                    stream = assembly.GetManifestResourceStream(match);
                }
            }

            // SPA fallback: serve index.html for extensionless client-side routes
            if (stream == null && !safePath.Contains('.'))
            {
                resourceName = "LegitFlix.Plugin.Assets.Client.index.html";
                stream = assembly.GetManifestResourceStream(resourceName);
            }

            if (stream == null)
            {
                // Generic 404 — never echo back the resource name to avoid
                // leaking internal assembly structure to the client.
                return NotFound();
            }

            // ── Special handling for index.html ───────────────────────
            if (resourceName == "LegitFlix.Plugin.Assets.Client.index.html")
            {
                try
                {
                    using var reader = new StreamReader(stream);
                    string html = reader.ReadToEnd();

                    var config = Plugin.Instance?.Configuration;
                    if (config != null)
                    {
                        string injection = UiInjector.BuildCustomUiInjection(config);
                        html = UiInjector.InjectIntoHtml(html, injection);
                    }

                    ApplyHtmlSecurityHeaders(Response);
                    return Content(html, "text/html; charset=utf-8");
                }
                catch (Exception ex)
                {
                    // Fail gracefully — fall through to Jellyfin's default UI
                    _logger.LogError(ex, "[LegitFlix] Failed to build custom UI response; falling back to raw asset.");
                    stream = assembly.GetManifestResourceStream(resourceName);
                    if (stream == null) return NotFound();
                    ApplyHtmlSecurityHeaders(Response);
                    return File(stream, "text/html; charset=utf-8");
                }
            }

            // ── Static assets (JS, CSS, images, fonts) ───────────────
            // Hashed filenames allow aggressive long-lived caching.
            ApplyStaticAssetHeaders(Response);
            return File(stream, GetContentType(safePath));
        }

        // ─────────────────────────────────────────────────────────────
        //  Security helpers
        // ─────────────────────────────────────────────────────────────

        /// <summary>
        /// Validates and sanitises a URL path segment for use as an
        /// embedded resource name suffix.  Returns <c>null</c> to signal
        /// the request should be rejected.
        /// </summary>
        private static string? SanitiseResourcePath(string rawPath)
        {
            if (string.IsNullOrWhiteSpace(rawPath))
                return "index.html";

            // Decode URL-encoding first so %2e%2e%2f bypasses don't slip through
            string decoded;
            try { decoded = Uri.UnescapeDataString(rawPath); }
            catch { return null; }

            // Reject null bytes and directory traversal sequences
            if (decoded.Contains('\0') || decoded.Contains(".."))
                return null;

            // Allow only filesystem-safe characters
            if (!Regex.IsMatch(decoded, @"^[A-Za-z0-9\-_./]+$"))
                return null;

            return decoded.TrimStart('/');
        }

        /// <summary>
        /// Applies security headers for HTML document responses.
        /// </summary>
        private static void ApplyHtmlSecurityHeaders(HttpResponse response)
        {
            response.Headers["X-Content-Type-Options"] = "nosniff";
            response.Headers["X-Frame-Options"]        = "SAMEORIGIN";
            response.Headers["X-XSS-Protection"]       = "0"; // Obsolete; CSP supersedes it
            response.Headers["Cache-Control"]           = "no-cache, no-store, must-revalidate";
            response.Headers["Pragma"]                  = "no-cache";
            response.Headers["Expires"]                 = "0";

            // Content-Security-Policy for the SPA shell:
            //   default-src 'self'                        — same-origin baseline
            //   script-src  'self' 'unsafe-inline'        — Vite inlines small chunks
            //   style-src   'self' 'unsafe-inline' fonts.googleapis.com
            //   font-src    'self' fonts.gstatic.com data:
            //   img-src     'self' data: blob:             — posters / avatars via blob
            //   connect-src 'self' wss: ws:               — Jellyfin WebSocket (SyncPlay)
            //   media-src   'self' blob:                   — HLS video segments
            //   object-src  'none'                         — block Flash / plugins
            //   base-uri    'self'                         — prevent <base> tag hijack
            response.Headers["Content-Security-Policy"] =
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                "font-src 'self' https://fonts.gstatic.com data:; " +
                "img-src 'self' https: http: data: blob:; " +
                "connect-src 'self' wss: ws:; " +
                "media-src 'self' blob:; " +
                "object-src 'none'; " +
                "base-uri 'self';";
        }

        /// <summary>
        /// Applies security headers for static asset responses (JS, CSS, images).
        /// </summary>
        private static void ApplyStaticAssetHeaders(HttpResponse response)
        {
            response.Headers["X-Content-Type-Options"] = "nosniff";
            // Hashed filenames allow aggressive long-lived caching
            response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
        }

        // ─────────────────────────────────────────────────────────────
        //  Utility
        // ─────────────────────────────────────────────────────────────

        private static string GetContentType(string path)
        {
            if (path.EndsWith(".html",  StringComparison.OrdinalIgnoreCase)) return "text/html; charset=utf-8";
            if (path.EndsWith(".js",    StringComparison.OrdinalIgnoreCase)) return "application/javascript; charset=utf-8";
            if (path.EndsWith(".css",   StringComparison.OrdinalIgnoreCase)) return "text/css; charset=utf-8";
            if (path.EndsWith(".svg",   StringComparison.OrdinalIgnoreCase)) return "image/svg+xml";
            if (path.EndsWith(".png",   StringComparison.OrdinalIgnoreCase)) return "image/png";
            if (path.EndsWith(".jpg",   StringComparison.OrdinalIgnoreCase)) return "image/jpeg";
            if (path.EndsWith(".ico",   StringComparison.OrdinalIgnoreCase)) return "image/x-icon";
            if (path.EndsWith(".json",  StringComparison.OrdinalIgnoreCase)) return "application/json; charset=utf-8";
            if (path.EndsWith(".woff2", StringComparison.OrdinalIgnoreCase)) return "font/woff2";
            if (path.EndsWith(".woff",  StringComparison.OrdinalIgnoreCase)) return "font/woff";
            if (path.EndsWith(".ttf",   StringComparison.OrdinalIgnoreCase)) return "font/ttf";
            return "application/octet-stream";
        }
    }
}
