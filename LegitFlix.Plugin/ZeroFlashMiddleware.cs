using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace LegitFlix.Plugin
{
    /// <summary>
    /// Middleware that intercepts requests to the Jellyfin web root and serves
    /// the custom Plugin UI.  When the <c>lf-classic-view</c> cookie is set (or
    /// <c>?classic=true</c> is in the query string) the stock Jellyfin UI is
    /// served instead, with a small script injected for returning to the plugin.
    /// </summary>
    public class ZeroFlashMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ZeroFlashMiddleware> _logger;

        // Cache the HTML in memory so we only read the embedded resource once.
        private readonly string? _cachedHtml;

        public ZeroFlashMiddleware(RequestDelegate next, ILogger<ZeroFlashMiddleware> logger)
        {
            _next = next;
            _logger = logger;
            _cachedHtml = LoadEmbeddedHtml();

            if (_cachedHtml != null)
                _logger.LogInformation("[LegitFlix] Zero-Flash middleware active. Custom UI will be served at /");
            else
                _logger.LogWarning("[LegitFlix] Zero-Flash middleware: Could not find embedded index.html. Falling through to default Jellyfin UI.");
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // ── Fast-exit: only intercept GET requests ──
            if (!string.Equals(context.Request.Method, "GET", StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

            // ── Fast-exit: plugin disabled or uninstalled ──
            if (Plugin.Instance == null || !Plugin.IsActive || Plugin.Instance.Configuration?.EnableCustomUI == false)
            {
                await _next(context);
                return;
            }

            // ── Only intercept root entry points that load Jellyfin Web ──
            var path = (context.Request.Path.Value?.TrimEnd('/') ?? string.Empty).ToLowerInvariant();
            bool isEntryPoint = path == string.Empty
                             || path == "/web"
                             || path == "/web/index.html";

            if (!isEntryPoint)
            {
                await _next(context);
                return;
            }

            if (_cachedHtml == null)
            {
                // No embedded HTML available — fall through to Jellyfin's own pipeline
                await _next(context);
                return;
            }

            // ── Classic-mode bypass ──
            bool requestClassic = context.Request.Query.ContainsKey("classic")
                               || context.Request.Cookies.ContainsKey("lf-classic-view");

            if (requestClassic)
            {
                await ServeClassicWithInjection(context);
                return;
            }

            // ── Serve the custom Plugin UI ──
            await ServeCustomUi(context);
        }

        // ─────────────────────────────────────────────────────────────
        //  Classic Mode  (stock Jellyfin UI + return-to-plugin script)
        // ─────────────────────────────────────────────────────────────

        private async Task ServeClassicWithInjection(HttpContext context)
        {
            _logger.LogInformation("[LegitFlix] Classic mode requested, injecting return-to-plugin script.");

            // Force a full 200 response — strip client cache-validation and
            // encoding headers so we can read the body as plain text.
            context.Request.Headers.Remove("If-None-Match");
            context.Request.Headers.Remove("If-Modified-Since");
            context.Request.Headers.Remove("Accept-Encoding");

            var originalBodyStream = context.Response.Body;
            using var buffer = new MemoryStream();

            context.Response.Body = buffer;
            await _next(context);
            context.Response.Body = originalBodyStream;

            bool isCompressed = context.Response.Headers.ContainsKey("Content-Encoding")
                             && context.Response.Headers["Content-Encoding"].ToString() != "identity";

            bool isHtml = context.Response.StatusCode == 200
                       && !isCompressed
                       && context.Response.ContentType != null
                       && context.Response.ContentType.Contains("text/html");

            if (isHtml)
            {
                buffer.Seek(0, SeekOrigin.Begin);
                string body = await new StreamReader(buffer).ReadToEndAsync();

                string injection = UiInjector.BuildClassicModeInjection();
                body = UiInjector.InjectIntoHtml(body, injection);

                try
                {
                    if (!context.Response.HasStarted)
                    {
                        context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                        context.Response.Headers["Pragma"]        = "no-cache";
                        context.Response.Headers["Expires"]       = "0";
                        context.Response.ContentLength = System.Text.Encoding.UTF8.GetByteCount(body);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[LegitFlix] Failed to set headers for classic response.");
                }

                await context.Response.WriteAsync(body);
            }
            else
            {
                // Non-HTML or compressed — pass through unmodified
                buffer.Seek(0, SeekOrigin.Begin);
                await buffer.CopyToAsync(originalBodyStream);
            }
        }

        // ─────────────────────────────────────────────────────────────
        //  Custom Plugin UI  (embedded index.html + config injection)
        // ─────────────────────────────────────────────────────────────

        private async Task ServeCustomUi(HttpContext context)
        {
            context.Response.StatusCode  = 200;
            context.Response.ContentType = "text/html; charset=utf-8";
            context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            context.Response.Headers["Pragma"]        = "no-cache";
            context.Response.Headers["Expires"]       = "0";

            var htmlToServe = _cachedHtml!;
            var config = Plugin.Instance?.Configuration;

            if (config != null)
            {
                string injection = UiInjector.BuildCustomUiInjection(config);
                htmlToServe = UiInjector.InjectIntoHtml(htmlToServe, injection);
            }

            await context.Response.WriteAsync(htmlToServe);
        }

        // ─────────────────────────────────────────────────────────────
        //  Embedded Resource Loader
        // ─────────────────────────────────────────────────────────────

        private static string? LoadEmbeddedHtml()
        {
            var assembly = System.Reflection.Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("LegitFlix.Plugin.Assets.Client.index.html");
            if (stream == null) return null;

            using var reader = new StreamReader(stream);
            return reader.ReadToEnd();
        }
    }
}