using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using LegitFlix.Plugin.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Serialization;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Controller.Configuration;

namespace LegitFlix.Plugin
{
    public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages, IDisposable
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private Timer? _updateCheckTimer;

        private const string RemoteMetaUrl =
            "https://raw.githubusercontent.com/gorillasuti/Legitflix/main/LegitFlix.Plugin/meta.json";

        public override string Name => "Legitflix";
        // New GUID to avoid conflicts and force re-registration
        public override Guid Id => Guid.Parse("a1b2c3d4-e5f6-7890-1234-567890abcdef");

        /// <summary>
        /// The latest version string fetched from the remote GitHub meta.json.
        /// Null if not yet fetched or fetch failed.
        /// </summary>
        public static string? LatestRemoteVersion { get; private set; }

        public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
            : base(applicationPaths, xmlSerializer)
        {
            Instance = this;
            IsActive = true;

            // Check for updates on startup (after 10s delay) and every 2 hours
            _updateCheckTimer = new Timer(
                async _ => await CheckForRemoteUpdateAsync(),
                null,
                TimeSpan.FromSeconds(10),
                TimeSpan.FromHours(2));
        }

        public static Plugin Instance { get; private set; }

        public static bool IsActive { get; private set; }

        public IEnumerable<PluginPageInfo> GetPages()
        {
            return new[]
            {
                new PluginPageInfo
                {
                    Name = "LegitFlix UI",
                    EmbeddedResourcePath = GetType().Namespace + ".Configuration.configPage.html",
                    EnableInMainMenu = true
                }
            };
        }

        private static async System.Threading.Tasks.Task CheckForRemoteUpdateAsync()
        {
            try
            {
                var response = await _httpClient.GetStringAsync(RemoteMetaUrl);
                using var doc = JsonDocument.Parse(response);
                if (doc.RootElement.TryGetProperty("version", out var versionEl))
                {
                    LatestRemoteVersion = versionEl.GetString();
                }
            }
            catch
            {
                // Silently fail — network may be unavailable
            }
        }

        public void Dispose()
        {
            IsActive = false;
            _updateCheckTimer?.Dispose();
            _updateCheckTimer = null;
        }
    }
}
