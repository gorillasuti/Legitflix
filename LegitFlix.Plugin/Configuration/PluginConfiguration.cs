using MediaBrowser.Model.Plugins;

namespace LegitFlix.Plugin.Configuration
{
    public class PluginConfiguration : BasePluginConfiguration
    {
        public bool EnableCustomUI { get; set; } = true;
        public string PrimaryColor { get; set; } = "#00a4dc";
        public string AccentColor { get; set; } = "#ff7e00";
        public string ThemeMode { get; set; } = "dark";
        public string LogoUrl { get; set; } = "";
        public bool ShowNavbarCategories { get; set; } = true;
        public bool EnableJellyseerr { get; set; } = true;
        public string JellyseerrUrl { get; set; } = "https://request.legitflix.eu";
        public bool ShowLibraryTitles { get; set; } = true;
        public bool ShowNavbarRequests { get; set; } = true;
        public bool ShowHomeRequestsCard { get; set; } = true;
        public bool ShowNavbarRandom { get; set; } = true;
        public string ContentSortMode { get; set; } = "latest";
        public string JellyseerrText { get; set; } = "Request";
        public int PlayerSeekTime { get; set; } = 10;
        public bool PlayerAutoSkip { get; set; } = false;
        public bool PlayerAutoNextEp { get; set; } = true;
        public bool EnableGlobalOverwrites { get; set; } = false;
        public bool JellyseerrGlobalOverride { get; set; } = false;
        public bool ShowNavbarNotifications { get; set; } = true;
    }
}
