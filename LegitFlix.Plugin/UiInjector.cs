using System;
using System.Linq;
using System.Text.Json;
using LegitFlix.Plugin.Configuration;

namespace LegitFlix.Plugin
{
    /// <summary>
    /// Centralised helper that builds every HTML/CSS/JS snippet the plugin
    /// injects into Jellyfin's web pages.
    /// </summary>
    public static class UiInjector
    {
        // ─────────────────────────────────────────────────────────────
        //  Public API
        // ─────────────────────────────────────────────────────────────

        /// <summary>
        /// Returns the full HTML injection block for the custom Plugin UI.
        /// Includes the PWA Modal so the "Disable Plugin Look" button can find the function.
        /// </summary>
        public static string BuildCustomUiInjection(PluginConfiguration config)
        {
            string styles = BuildStyleBlock(config);
            string serverConfig = BuildServerConfigScript(config);
            string modalLogic = BuildClassicModeScript(); // Needed for global modal access

            return styles + "\n" + serverConfig + "\n" + modalLogic;
        }

        /// <summary>
        /// Returns the full HTML injection block for the classic/stock Jellyfin UI.
        /// </summary>
        public static string BuildClassicModeInjection()
        {
            return BuildClassicModeScript();
        }

        public static string InjectIntoHtml(string html, string injection)
        {
            if (html.Contains("</head>"))
                return html.Replace("</head>", injection + "</head>");

            return html + injection;
        }

        // ─────────────────────────────────────────────────────────────
        //  CSS Variable Overrides
        // ─────────────────────────────────────────────────────────────

        private static string BuildStyleBlock(PluginConfiguration config)
        {
            string primary = SanitizeColor(config.PrimaryColor, "#00a4dc");
            string accent = SanitizeColor(config.AccentColor, "#ff7e00");
            string accentRgb = SanitizeColor(GetRgbFromHex(accent), "255, 106, 0");

            return $@"<style id=""legitflix-config-styles"">
    :root {{
        --clr-accent: {accent} !important;
        --clr-accent-hover: {accent} !important;
        --clr-accent-rgb: {accentRgb} !important;
        --clr-primary: {primary} !important;
    }}
</style>";
        }

        // ─────────────────────────────────────────────────────────────
        //  Server Config Script
        // ─────────────────────────────────────────────────────────────

        private static string BuildServerConfigScript(PluginConfiguration config)
        {
            string sPrimary = JsonSerializer.Serialize(config.PrimaryColor ?? "#00a4dc");
            string sAccent = JsonSerializer.Serialize(config.AccentColor ?? "#ff7e00");
            string sTheme = JsonSerializer.Serialize(config.ThemeMode ?? "dark");
            string sLogo = JsonSerializer.Serialize(config.LogoUrl ?? "");
            string sJellyUrl = JsonSerializer.Serialize(config.JellyseerrUrl ?? "https://request.legitflix.eu");
            string sSort = JsonSerializer.Serialize(config.ContentSortMode ?? "latest");
            string sJellyTxt = JsonSerializer.Serialize(config.JellyseerrText ?? "Request");
            string sVersion = JsonSerializer.Serialize(Plugin.Instance?.Version?.ToString() ?? "1.1.1.0");
            string sRemoteVersion = JsonSerializer.Serialize(Plugin.LatestRemoteVersion ?? "");

            return $@"<script id=""legitflix-server-config"">
    window.LegitFlix_ServerConfig = {{
        enableCustomUI: {Bool(config.EnableCustomUI)},
        enableGlobalOverwrites: {Bool(config.EnableGlobalOverwrites)},
        primaryColor: {sPrimary},
        accentColor: {sAccent},
        themeMode: {sTheme},
        logoUrl: {sLogo},
        showNavbarCategories: {Bool(config.ShowNavbarCategories)},
        enableJellyseerr: {Bool(config.EnableJellyseerr)},
        jellyseerrUrl: {sJellyUrl},
        showLibraryTitles: {Bool(config.ShowLibraryTitles)},
        showNavbarRequests: {Bool(config.ShowNavbarRequests)},
        showHomeRequestsCard: {Bool(config.ShowHomeRequestsCard)},
        showNavbarRandom: {Bool(config.ShowNavbarRandom)},
        contentSortMode: {sSort},
        jellyseerrText: {sJellyTxt},
        playerSeekTime: {config.PlayerSeekTime},
        playerAutoSkip: {Bool(config.PlayerAutoSkip)},
        playerAutoNextEp: {Bool(config.PlayerAutoNextEp)},
        jellyseerrGlobalOverride: {Bool(config.JellyseerrGlobalOverride)},
        lockVisualSettings: {Bool(config.LockVisualSettings)},
        lockNavigationSettings: {Bool(config.LockNavigationSettings)},
        lockPlayerSettings: {Bool(config.LockPlayerSettings)},
        showNavbarNotifications: {Bool(config.ShowNavbarNotifications)},
        pluginVersion: {sVersion},
        latestRemoteVersion: {sRemoteVersion}
    }};
</script>";
        }

        // ─────────────────────────────────────────────────────────────
        //  Core Logic: Modal, Traversal, Ctrl/Cmd+K, Sidebar Injection
        // ─────────────────────────────────────────────────────────────

        private static string BuildClassicModeScript()
        {
            return @"
<script id=""legitflix-classic-mode-handler"">
    (function() {
        // 1. Native HTML5 Dialog (Modern PWA Alert)
        function openDialog() {
            var isClassic = (window.location.search.indexOf('classic=true') !== -1 || document.cookie.indexOf('lf-classic-view=true') !== -1);
            
            var existingDialog = document.getElementById('lf-pwa-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }
            var existingStyle = document.getElementById('lf-pwa-dialog-styles');
            if (existingStyle) {
                existingStyle.remove();
            }

            var style = document.createElement('style');
            style.id = 'lf-pwa-dialog-styles';
            style.innerHTML = `
                #lf-pwa-dialog {
                    padding: 0; border: none; border-radius: 12px; background: var(--theme-background, #1c1c1e);
                    color: var(--theme-text-color, #fff); width: 90%; max-width: 320px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: inherit;
                    text-align: center; outline: none; overflow: hidden;
                }
                #lf-pwa-dialog::backdrop {
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                }
                .lf-dialog-header { padding: 20px 16px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
                .lf-dialog-title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
                .lf-dialog-desc { font-size: 14px; margin: 0; opacity: 0.8; line-height: 1.4; }
                .lf-dialog-btn {
                    display: block; width: 100%; padding: 16px; border: none; background: transparent;
                    color: #00a4dc; font-size: 16px; font-weight: 500;
                    border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer; font-family: inherit;
                    outline: none !important; box-shadow: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                }
                .lf-dialog-btn:focus, .lf-dialog-btn:active {
                    outline: none !important; box-shadow: none !important;
                }
                .lf-dialog-btn:last-child { border-bottom: none; color: #ff3b30; } 
                .lf-dialog-btn:hover { background: rgba(255,255,255,0.05); }
            `;
            document.head.appendChild(style);

            var dialog = document.createElement('dialog');
            dialog.id = 'lf-pwa-dialog';
            
            if (isClassic) {
                dialog.innerHTML = `
                    <div class='lf-dialog-header'>
                        <h3 class='lf-dialog-title'>Switch View</h3>
                        <p class='lf-dialog-desc'>Would you like to return to the Legitflix interface?</p>
                    </div>
                    <button id='lf-btn-action' class='lf-dialog-btn'>Return to Legitflix</button>
                    <button id='lf-btn-cancel' class='lf-dialog-btn'>Stay in Classic Jellyfin</button>
                `;
            } else {
                dialog.innerHTML = `
                    <div class='lf-dialog-header'>
                        <h3 class='lf-dialog-title'>Switch View</h3>
                        <p class='lf-dialog-desc'>Would you like to switch to the Classic Jellyfin interface?</p>
                    </div>
                    <button id='lf-btn-action' class='lf-dialog-btn'>Switch to Classic Jellyfin</button>
                    <button id='lf-btn-cancel' class='lf-dialog-btn'>Stay in Legitflix</button>
                `;
            }
            document.body.appendChild(dialog);

            document.getElementById('lf-btn-action').onclick = function() {
                dialog.close();
                dialog.remove();
                if (isClassic) {
                    document.cookie = 'lf-classic-view=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                    window.location.href = window.location.origin + window.location.pathname;
                } else {
                    var date = new Date();
                    date.setTime(date.getTime() + (365*24*60*60*1000));
                    document.cookie = 'lf-classic-view=true; Path=/; Expires=' + date.toUTCString() + ';';
                    window.location.href = window.location.origin + window.location.pathname + '?classic=true#/home';
                }
            };
            
            document.getElementById('lf-btn-cancel').onclick = function() {
                dialog.close();
                dialog.remove();
                if (isClassic) {
                    window.location.href = window.location.origin + window.location.pathname + '?classic=true#/home';
                }
            };

            dialog.addEventListener('click', function(event) {
                var rect = dialog.getBoundingClientRect();
                var isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
                                  rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
                if (!isInDialog) {
                    dialog.close();
                    dialog.remove();
                }
            });

            dialog.showModal();
        }

        // Global access for your React button
        window.LegitFlix_OpenSwitchModal = openDialog;

        // 2. Traversal Logic
        function isLogoElement(el) {
            if (!el) return false;

            // Explicitly ignore plugin configuration pages and dashboard pages
            if (el.getAttribute) {
                var href = el.getAttribute('href') || '';
                if (href.indexOf('configurationpage') !== -1 || href.indexOf('dashboard') !== -1) {
                    return false;
                }
            }

            var classes = el.className || '';
            if (typeof classes !== 'string') classes = '';
            
            // Explicitly ignore Legitflix Custom UI navbar logo
            if (classes.indexOf('nav-logo') !== -1) {
                return false;
            }
            
            if (el.tagName === 'A' || el.tagName === 'DIV' || el.tagName === 'BUTTON' || el.tagName === 'IMG') {
                var classList = classes.split(/\s+/);
                if (classes.indexOf('headerLogo') !== -1 || 
                    classes.indexOf('logoLink') !== -1 || 
                    classes.indexOf('lnkHome') !== -1 || 
                    classList.indexOf('logo') !== -1 ||
                    el.id === 'logo') {
                    return true;
                }
                if (classes.indexOf('MuiListItemButton-root') !== -1) {
                    var text = el.textContent || el.innerText || '';
                    if (text.indexOf('Legitflix') !== -1) return true;
                }
            }
            return false;
        }


        // 3. Click Interceptor
        document.addEventListener('click', function(e) {
            var el = e.target;
            var isLogo = false;
            while (el && el !== document.body) {
                if (isLogoElement(el)) {
                    isLogo = true;
                    break;
                }
                el = el.parentElement;
            }
            if (isLogo) {
                e.preventDefault();
                e.stopPropagation();
                openDialog();
            }
        }, true);

        // 4. Ctrl/Cmd+K Handler
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                var search = window.location.search || '';
                var hasCookie = document.cookie.indexOf('lf-classic-view') !== -1;
                if (search.indexOf('classic=true') !== -1 || hasCookie) {
                    document.cookie = 'lf-classic-view=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                    window.location.href = window.location.origin + window.location.pathname;
                } else {
                    var date = new Date();
                    date.setTime(date.getTime() + (365*24*60*60*1000));
                    document.cookie = 'lf-classic-view=true; Path=/; Expires=' + date.toUTCString() + ';';
                    window.location.href = window.location.origin + window.location.pathname + '?classic=true#/home';
                }
            }
        }, true);

        // 5. Sidebar Link Injection
        function injectSwitchBackLink() {
            var container = document.querySelector('.mainDrawer-scrollContainer');
            if (!container) return;
            if (document.getElementById('lnkLegitflixSwitchBack')) return;

            var link = document.createElement('a');
            link.id = 'lnkLegitflixSwitchBack';
            link.className = 'navMenuOption lnkMediaFolder emby-button';
            link.href = '#';
            link.style.display = 'flex';
            link.style.alignItems = 'center';
            link.style.gap = '10px';
            link.innerHTML = `
                <span class='material-icons navMenuOptionIcon' aria-hidden='true'>tv</span>
                <span class='navMenuOptionText'>Legitflix UI</span>
            `;
            link.onclick = function(e) {
                e.preventDefault();
                openDialog();
            };

            var pluginMenuOptions = container.querySelector('.pluginMenuOptions');
            if (pluginMenuOptions) {
                pluginMenuOptions.appendChild(link);
            } else {
                var section = document.createElement('div');
                section.className = 'pluginMenuOptions';
                section.innerHTML = '<h3 class=""sidebarHeader"">Plugin Settings</h3>';
                section.appendChild(link);
                container.appendChild(section);
            }
        }
        setInterval(injectSwitchBackLink, 500);
    })();
</script>";
        }

        // ─────────────────────────────────────────────────────────────
        //  Utility Helpers
        // ─────────────────────────────────────────────────────────────

        private static string Bool(bool value) => value ? "true" : "false";

        public static string GetRgbFromHex(string hex)
        {
            try {
                if (string.IsNullOrEmpty(hex)) return "255, 106, 0";
                hex = hex.TrimStart('#');
                if (hex.Length == 3) return $"{Convert.ToInt32(new string(hex[0], 2), 16)}, {Convert.ToInt32(new string(hex[1], 2), 16)}, {Convert.ToInt32(new string(hex[2], 2), 16)}";
                if (hex.Length == 6) return $"{Convert.ToInt32(hex.Substring(0, 2), 16)}, {Convert.ToInt32(hex.Substring(2, 2), 16)}, {Convert.ToInt32(hex.Substring(4, 2), 16)}";
            } catch { }
            return "255, 106, 0";
        }

        public static string SanitizeColor(string? input, string fallback)
        {
            if (string.IsNullOrEmpty(input)) return fallback;
            var clean = new string(input.Where(c => char.IsLetterOrDigit(c) || c == '#' || c == ',' || c == '(' || c == ')' || c == ' ').ToArray());
            return string.IsNullOrEmpty(clean) ? fallback : clean;
        }
    }
}