using System.IO;
using System.Linq;
using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LegitFlix.Plugin.Controllers
{
    [ApiController]
    [Route("LegitFlix")]
    [AllowAnonymous]
    public class LegitFlixController : ControllerBase
    {
        // ─────────────────────────────────────────────────────────────
        //  Debug endpoint  –  lists all embedded resources in the DLL
        // ─────────────────────────────────────────────────────────────

        [HttpGet("Debug")]
        public ActionResult GetDebug()
        {
            var resources = Assembly.GetExecutingAssembly().GetManifestResourceNames();
            return Ok(resources);
        }

        // ─────────────────────────────────────────────────────────────
        //  Client asset endpoint  –  serves the SPA and its assets
        // ─────────────────────────────────────────────────────────────

        [HttpGet("Client/{*path}")]
        public ActionResult GetContent([FromRoute] string path)
        {
            if (string.IsNullOrEmpty(path)) path = "index.html";

            var assembly     = Assembly.GetExecutingAssembly();
            var normalised   = path.Replace("/", ".");
            var resourceName = $"LegitFlix.Plugin.Assets.Client.{normalised}";

            var stream = assembly.GetManifestResourceStream(resourceName);

            // Fallback: search by suffix match
            if (stream == null)
            {
                var match = assembly.GetManifestResourceNames()
                    .FirstOrDefault(r => r.EndsWith($".{normalised}"));

                if (match != null)
                    stream = assembly.GetManifestResourceStream(match);
            }

            // SPA fallback: serve index.html for extensionless routes
            if (stream == null && !path.Contains("."))
            {
                resourceName = "LegitFlix.Plugin.Assets.Client.index.html";
                stream = assembly.GetManifestResourceStream(resourceName);
            }

            if (stream == null)
                return NotFound($"Resource not found: {resourceName}");

            // ── Special handling for index.html: inject config + scripts ──
            if (resourceName == "LegitFlix.Plugin.Assets.Client.index.html")
            {
                using var reader = new StreamReader(stream);
                string html = reader.ReadToEnd();

                var config = Plugin.Instance?.Configuration;
                if (config != null)
                {
                    string injection = UiInjector.BuildCustomUiInjection(config);
                    html = UiInjector.InjectIntoHtml(html, injection);
                }

                Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                Response.Headers["Pragma"]        = "no-cache";
                Response.Headers["Expires"]       = "0";
                return Content(html, "text/html; charset=utf-8");
            }

            return File(stream, GetContentType(path));
        }

        // ─────────────────────────────────────────────────────────────
        //  Utility
        // ─────────────────────────────────────────────────────────────

        private static string GetContentType(string path)
        {
            if (path.EndsWith(".html")) return "text/html";
            if (path.EndsWith(".js"))   return "application/javascript";
            if (path.EndsWith(".css"))  return "text/css";
            if (path.EndsWith(".svg"))  return "image/svg+xml";
            if (path.EndsWith(".png"))  return "image/png";
            if (path.EndsWith(".jpg"))  return "image/jpeg";
            if (path.EndsWith(".json")) return "application/json";
            return "application/octet-stream";
        }
    }
}
