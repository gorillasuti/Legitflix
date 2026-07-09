
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { jellyfinService } from '../services/jellyfin';

const ThemeContext = createContext();

const sanitizeUrlStrict = (url) => {
    if (!url) return '';
    const trimmed = String(url).trim();
    let decoded;
    try {
        decoded = decodeURIComponent(trimmed);
    } catch (e) {
        decoded = trimmed;
    }
    if (/^https?:\/\//i.test(decoded) || /^\/[^\/]/i.test(decoded)) {
        return trimmed.replace(/["'()<>]/g, '');
    }
    return '';
};

const sanitizeText = (text) => {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '').trim();
};

const sanitizeHex = (hex) => {
    if (!hex) return '';
    const trimmed = hex.trim();
    if (/^#[0-9A-F]{3,6}$/i.test(trimmed)) {
        return trimmed;
    }
    return '';
};

// Keys that must never be written to any config object via dynamic iteration.
// Allowing these through a for-in loop enables prototype pollution.
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const deepSanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepSanitizeObject);

    const clean = Object.create(null);
    for (const key of Object.keys(obj)) {
        if (DANGEROUS_KEYS.has(key)) continue;
        const val = obj[key];
        clean[key] = (typeof val === 'object' && val !== null)
            ? deepSanitizeObject(val)
            : val;
    }
    return clean;
};

const URL_KEYS = ['logoUrl', 'faviconUrl', 'jellyseerrUrl', 'jellyseerrBackground', 'appBackground', 'userAvatar'];
const TEXT_KEYS = ['jellyseerrText', 'appName'];
const HEX_KEYS = { accentColor: '#ff7e00', subtitleColor: '#ffffff' };

const sanitizeFullConfig = (raw) => {
    if (!raw) return {};
    const config = { ...raw };

    for (const key of DANGEROUS_KEYS) {
        delete config[key];
    }

    for (const key of URL_KEYS) {
        if (config[key] !== undefined) {
            config[key] = sanitizeUrlStrict(config[key]);
        }
    }

    for (const key of TEXT_KEYS) {
        if (config[key] !== undefined) {
            config[key] = sanitizeText(config[key]);
        }
    }

    for (const [key, fallback] of Object.entries(HEX_KEYS)) {
        if (config[key] !== undefined) {
            config[key] = sanitizeHex(config[key]) || fallback;
        }
    }

    return config;
};

const serializeToCustomPrefs = (config) => {
    const customPrefs = {};
    for (const [key, val] of Object.entries(config)) {
        if (DANGEROUS_KEYS.has(key)) continue;
        if (val === null || val === undefined) {
            continue;
        }
        if (typeof val === 'object') {
            customPrefs[`__json:${key}`] = JSON.stringify(val);
        } else {
            customPrefs[key] = String(val);
        }
    }
    return customPrefs;
};

const deserializeFromCustomPrefs = (customPrefs) => {
    const config = {};
    if (!customPrefs) return config;

    for (const [key, val] of Object.entries(customPrefs)) {
        if (DANGEROUS_KEYS.has(key)) continue;

        if (key.startsWith('__json:')) {
            const realKey = key.slice(7);
            if (DANGEROUS_KEYS.has(realKey)) continue;
            try {
                const parsed = JSON.parse(val);
                config[realKey] = deepSanitizeObject(parsed);
            } catch (e) {
                console.error(`Failed to parse custom pref JSON for ${realKey}`, e);
            }
        } else {
            if (val === 'true') {
                config[key] = true;
            } else if (val === 'false') {
                config[key] = false;
            } else if (!isNaN(Number(val)) && val.trim() !== '') {
                config[key] = Number(val);
            } else {
                config[key] = val;
            }
        }
    }
    return config;
};

const enforceServerOverrides = (updated) => {
    if (!window.LegitFlix_ServerConfig) return updated;
    const sc = window.LegitFlix_ServerConfig;
    const isLocked = (key) => {
        if (sc.enableGlobalOverwrites) return true;
        
        const isJellyseerrKey = ['enableJellyseerr', 'jellyseerrUrl', 'jellyseerrText', 'showNavbarRequests', 'showHomeRequestsCard'].includes(key);
        const isVisualKey = ['accentColor', 'themeMode', 'logoUrl', 'contentSortMode'].includes(key);
        const isNavKey = ['showNavbarCategories', 'showLibraryTitles', 'showNavbarRandom', 'showNavbarNotifications'].includes(key);
        const isPlayerKey = ['playerSeekTime', 'playerAutoSkip', 'playerAutoSkipRecap', 'playerAutoNextEp'].includes(key);
        
        return (isJellyseerrKey && sc.jellyseerrGlobalOverride) ||
               (isVisualKey && sc.lockVisualSettings) ||
               (isNavKey && sc.lockNavigationSettings) ||
               (isPlayerKey && sc.lockPlayerSettings);
    };

    if (isLocked('accentColor') && sc.accentColor !== undefined) updated.accentColor = sanitizeHex(sc.accentColor) || '#ff7e00';
    if (isLocked('themeMode') && sc.themeMode !== undefined) updated.themeMode = sc.themeMode;
    if (isLocked('logoUrl') && sc.logoUrl !== undefined) updated.logoUrl = sanitizeUrlStrict(sc.logoUrl);
    if (isLocked('showNavbarCategories') && sc.showNavbarCategories !== undefined) updated.showNavbarCategories = sc.showNavbarCategories;
    if (isLocked('enableJellyseerr') && sc.enableJellyseerr !== undefined) updated.enableJellyseerr = sc.enableJellyseerr;
    if (isLocked('jellyseerrUrl') && sc.jellyseerrUrl !== undefined) updated.jellyseerrUrl = sanitizeUrlStrict(sc.jellyseerrUrl);
    if (isLocked('showLibraryTitles') && sc.showLibraryTitles !== undefined) updated.showLibraryTitles = sc.showLibraryTitles;
    if (isLocked('showNavbarRequests') && sc.showNavbarRequests !== undefined) updated.showNavbarRequests = sc.showNavbarRequests;
    if (isLocked('showHomeRequestsCard') && sc.showHomeRequestsCard !== undefined) updated.showHomeRequestsCard = sc.showHomeRequestsCard;
    if (isLocked('showNavbarRandom') && sc.showNavbarRandom !== undefined) updated.showNavbarRandom = sc.showNavbarRandom;
    if (isLocked('contentSortMode') && sc.contentSortMode !== undefined) updated.contentSortMode = sc.contentSortMode;
    if (isLocked('jellyseerrText') && sc.jellyseerrText !== undefined) updated.jellyseerrText = sanitizeText(sc.jellyseerrText);
    if (isLocked('playerSeekTime') && sc.playerSeekTime !== undefined) updated.playerSeekTime = sc.playerSeekTime;
    if (isLocked('playerAutoSkip') && sc.playerAutoSkip !== undefined) updated.playerAutoSkip = sc.playerAutoSkip;
    if (isLocked('playerAutoSkipRecap') && sc.playerAutoSkipRecap !== undefined) updated.playerAutoSkipRecap = sc.playerAutoSkipRecap;
    if (isLocked('playerAutoNextEp') && sc.playerAutoNextEp !== undefined) updated.playerAutoNextEp = sc.playerAutoNextEp;
    if (isLocked('showNavbarNotifications') && sc.showNavbarNotifications !== undefined) updated.showNavbarNotifications = sc.showNavbarNotifications;

    return updated;
};

/**
 * Validates that a CSS color value is a safe literal before it is passed
 * into style.setProperty(). Accepts: #hex, rgb(...), rgba(...), hsl(...),
 * and named CSS keywords (letters only). Rejects everything else.
 */
const sanitizeCssColor = (value, fallback) => {
    if (!value) return fallback;
    const v = String(value).trim();
    // Hex
    if (/^#[0-9A-Fa-f]{3,8}$/.test(v)) return v;
    // rgb / rgba / hsl / hsla — digits, commas, spaces, dots, slashes, %
    if (/^(rgb|rgba|hsl|hsla)\([\d\s,%.]+\)$/i.test(v)) return v;
    // Pure keyword (e.g. 'white', 'transparent')
    if (/^[a-zA-Z]+$/.test(v)) return v;
    return fallback;
};

/**
 * Validates a CSS size/percentage value (e.g. '100%', '1.2em', '16px').
 */
const sanitizeCssSize = (value, fallback) => {
    if (!value) return fallback;
    const v = String(value).trim();
    if (/^[0-9]+(\.?[0-9]*)?(px|em|rem|%|vw|vh)?$/.test(v)) return v;
    return fallback;
};

// Map preset accent colors → matching default logo
const ACCENT_LOGO_MAP = {
    '#ff7e00': 'https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/public/default-logo-orange.png',
    '#00aaff': 'https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/public/default-logo-blue.png',
    '#00ff7e': 'https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/public/default-logo-green.png',
    '#ff3333': 'https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/public/default-logo-red.png',
    '#aa00ff': 'https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/public/default-logo-purple.png',
    '#ff00aa': 'https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/public/default-logo-pink.png',  // Pink falls back to purple
};

export const getDefaultLogo = (accentColor) => {
    return ACCENT_LOGO_MAP[accentColor?.toLowerCase()] || 'https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/public/default-logo-orange.png';
};

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Default Configuration
    const [config, setConfig] = useState({
        heroMediaTypes: 'Movie,Series',
        promoMediaTypes: ['Movie', 'Series'],
        contentTypeFilters: { Movie: true, Series: true, MusicAlbum: false, Audio: false, MusicVideo: false },
        // Random Button Config
        showNavbarRandom: true,
        randomContentFilters: { Movie: true, Series: true, Episode: true },
        contentSortMode: 'latest', // 'latest' | 'random' | 'topRated'
        heroLimit: 20,
        enableJellyseerr: true,
        jellyseerrUrl: 'https://request.legitflix.eu',
        jellyseerrBackground: null,
        jellyseerrText: 'Request',
        // Visual Customization
        logoType: 'text', // 'text' | 'image'
        logoUrl: '',
        appName: 'LegitFlix',
        fastForwardTime: 10,
        rewindTime: 10,
        hideBackdrop: false,
        disableThemeSong: false,
        enableSnow: false,
        themeMode: 'dark', // 'dark' | 'light'
        accentColor: '#ff7e00',
        showNavbarCategories: true,
        showNavbarSearch: true,
        showNavbarBookmarks: true,
        showNavbarRequests: true,
        showNavbarNotifications: true,
        showHomeRequestsCard: true,
        showLibraryTitles: true,
        appBackground: null,
        userAvatar: null,
        enableGlobalOverwrites: false,
        // Player Settings
        playerSeekTime: 10,
        playerAutoSkip: false,
        playerAutoSkipRecap: false,
        playerAutoNextEp: true,
        playerSeekForward: 30,
        playerSeekBackward: 10,
        defaultAudioLanguage: 'auto',
        defaultSubtitleLanguage: 'auto',
        prioritizeAudioLanguage: false,
        // Screensaver Settings
        screensaverType: 'none',
        screensaverTime: 180,
        screensaverInterval: 10,
        // New Subtitle Customizations
        subtitleLanguagePreference: 'eng',
        subtitleMode: 'Default',
        subtitleBurnIn: 'Auto',
        subtitleTextSize: 'Normal',
        subtitleTextWeight: 'Normal',
        subtitleFontFamily: 'Default',
        subtitleColor: '#ffffff',
        subtitleShadow: 'Drop Shadow',
        subtitleVerticalPosition: 'Bottom',
        // Media Card Poster Badges
        showQualityTags: false,
        showGenreTags: false,
        showLanguageTags: false,
        // Playback Behaviors
        playerAutoPause: false,
        playerAutoResume: false,
        playerAutoPip: false,
        playerLongPressSpeed: true,
        enableGamepad: false,
    });

    const debounceTimerRef = useRef(null);
    const pendingWriteRef = useRef(null);

    const syncFromServer = async () => {
        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user) return;

            const prefsId = "legitflix-theme";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);

            // Determine if server preferences are empty/uninitialized
            const serverIsEmpty = !prefs || !prefs.CustomPrefs || Object.keys(prefs.CustomPrefs).length === 0;

            // Load local config to see if we have historical data to migrate
            let localConfig = null;
            const localConfigStr = localStorage.getItem('LegitFlix_Config');
            if (localConfigStr) {
                try {
                    localConfig = JSON.parse(localConfigStr);
                } catch (e) {
                    console.error("[LegitFlix] Failed to parse local config during sync", e);
                }
            }

            const localHasRealData = localConfig
                && Object.keys(localConfig).length > 5
                && localConfig._syncedToServer !== true;

            if (serverIsEmpty && localHasRealData) {
                // One-time migration: upload local settings to server
                const customPrefs = serializeToCustomPrefs(localConfig);
                const newPrefs = { Id: prefsId, CustomPrefs: customPrefs };
                await jellyfinService.updateDisplayPreferences(prefsId, newPrefs);

                // Tag local config
                const updatedLocal = { ...localConfig, _syncedToServer: true };
                localStorage.setItem('LegitFlix_Config', JSON.stringify(updatedLocal));

                setConfig(prev => ({ ...prev, _syncedToServer: true }));
                return;
            }

            if (prefs && prefs.CustomPrefs) {
                const serverConfig = sanitizeFullConfig(deserializeFromCustomPrefs(prefs.CustomPrefs));
                setConfig(prev => {
                    let updated = { ...prev, ...serverConfig, _syncedToServer: true };
                    updated = enforceServerOverrides(updated);
                    updated = sanitizeFullConfig(updated);
                    localStorage.setItem('LegitFlix_Config', JSON.stringify(updated));

                    if (updated.accentColor) applyAccentColor(updated.accentColor);
                    if (updated.faviconUrl !== undefined) applyFavicon(updated.faviconUrl);
                    if (updated.themeMode) applyThemeMode(updated.themeMode);

                    applySubtitleStyles(
                        updated.subtitleTextSize,
                        updated.subtitleColor,
                        updated.subtitleTextWeight,
                        updated.subtitleFontFamily,
                        updated.subtitleShadow
                    );

                    return updated;
                });
            }
        } catch (err) {
            console.error("[LegitFlix] Failed to sync settings from server", err);
        }
    };

    const saveSettingsToServer = async (configData) => {
        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user) return;

            const prefsId = "legitflix-theme";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (!prefs) prefs = { Id: prefsId, CustomPrefs: {} };
            if (!prefs.CustomPrefs) prefs.CustomPrefs = {};

            const customPrefs = serializeToCustomPrefs(configData);
            prefs.CustomPrefs = customPrefs;

            await jellyfinService.updateDisplayPreferences(prefsId, prefs);
            pendingWriteRef.current = null;
        } catch (e) {
            console.error("[LegitFlix] Failed to save settings to server", e);
        }
    };

    const flushPendingToServer = () => {
        const pending = pendingWriteRef.current;
        if (!pending) return;

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        try {
            const token = jellyfinService.api?.accessToken || jellyfinService.api?.configuration?.accessToken;
            const userId = jellyfinService.api?.user?.id || jellyfinService._cachedUser?.Id;
            const basePath = jellyfinService.api?.configuration?.basePath || jellyfinService.api?.basePath || '';

            if (!token || !userId) return;

            const url = `${basePath}/DisplayPreferences/legitflix-theme?userId=${userId}&client=LegitFlixClient`;
            const customPrefs = serializeToCustomPrefs(pending);
            const bodyPayload = JSON.stringify({
                Id: "legitflix-theme",
                CustomPrefs: customPrefs
            });

            // Native fetch with keepalive: true
            fetch(url, {
                method: 'POST',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `MediaBrowser Token="${token}"`
                },
                body: bodyPayload
            }).catch(() => { });
        } catch (e) {
            console.error("[LegitFlix] Unload flush failed", e);
        }

        pendingWriteRef.current = null;
    };

    useEffect(() => {
        const handleUnload = () => {
            flushPendingToServer();
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushPendingToServer();
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        const targetUrl = config.faviconUrl || '/LegitFlix/Client/favicon.png';
        const enforceFavicon = () => {
            let hasFavicon = false;
            const icons = document.querySelectorAll("link[rel~='icon']");
            icons.forEach(icon => {
                hasFavicon = true;
                if (icon.getAttribute('href') !== targetUrl) {
                    icon.setAttribute('href', targetUrl);
                }
            });
            if (!hasFavicon) {
                const link = document.createElement('link');
                link.rel = 'icon';
                link.href = targetUrl;
                document.head.appendChild(link);
            }
        };

        enforceFavicon();

        const observer = new MutationObserver(() => {
            enforceFavicon();
        });
        observer.observe(document.head, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'rel']
        });

        return () => observer.disconnect();
    }, [config.faviconUrl]);

    useEffect(() => {
        syncFromServer();

        const handleAuthSuccess = () => {
            syncFromServer();
        };
        window.addEventListener('legitflix-sync-settings', handleAuthSuccess);
        return () => {
            window.removeEventListener('legitflix-sync-settings', handleAuthSuccess);
        };
    }, []);

    useEffect(() => {
        // 1. Start with client default config
        let initialConfig = { ...config };

        // 2. Load from local storage
        let localConfig = null;
        const localConfigStr = localStorage.getItem('LegitFlix_Config');
        if (localConfigStr) {
            try {
                localConfig = JSON.parse(localConfigStr);
            } catch (e) {
                console.error("Failed to parse local config", e);
            }
        }

        // 3. Determine if server overrides are enabled
        const enableGlobalOverwrites = window.LegitFlix_ServerConfig
            ? !!window.LegitFlix_ServerConfig.enableGlobalOverwrites
            : false;

        const lockVisualSettings = window.LegitFlix_ServerConfig
            ? !!window.LegitFlix_ServerConfig.lockVisualSettings
            : false;

        const lockNavigationSettings = window.LegitFlix_ServerConfig
            ? !!window.LegitFlix_ServerConfig.lockNavigationSettings
            : false;

        const lockPlayerSettings = window.LegitFlix_ServerConfig
            ? !!window.LegitFlix_ServerConfig.lockPlayerSettings
            : false;

        const jellyseerrGlobalOverride = window.LegitFlix_ServerConfig
            ? !!window.LegitFlix_ServerConfig.jellyseerrGlobalOverride
            : false;

        // 4. Merge server config if available
        if (window.LegitFlix_ServerConfig) {
            const sc = window.LegitFlix_ServerConfig;
            
            // Helper to get raw server value or fallback (local override handled by enforceServerOverrides later)
            const getVal = (key, fallback) => {
                return sc[key] !== undefined ? sc[key] : fallback;
            };

            initialConfig = {
                ...initialConfig,
                enableGlobalOverwrites,
                lockVisualSettings,
                lockNavigationSettings,
                lockPlayerSettings,
                jellyseerrGlobalOverride,
                accentColor: sanitizeHex(getVal('accentColor', initialConfig.accentColor)) || initialConfig.accentColor,
                themeMode: getVal('themeMode', initialConfig.themeMode),
                logoUrl: getVal('logoUrl', initialConfig.logoUrl) !== undefined ? sanitizeUrlStrict(getVal('logoUrl', initialConfig.logoUrl)) : initialConfig.logoUrl,
                showNavbarCategories: getVal('showNavbarCategories', initialConfig.showNavbarCategories) !== false,
                enableJellyseerr: getVal('enableJellyseerr', initialConfig.enableJellyseerr) !== false,
                jellyseerrUrl: sanitizeUrlStrict(getVal('jellyseerrUrl', initialConfig.jellyseerrUrl)) || initialConfig.jellyseerrUrl,
                showLibraryTitles: getVal('showLibraryTitles', initialConfig.showLibraryTitles) !== false,
                showNavbarRequests: getVal('showNavbarRequests', initialConfig.showNavbarRequests) !== false,
                showNavbarNotifications: getVal('showNavbarNotifications', initialConfig.showNavbarNotifications) !== false,
                showHomeRequestsCard: getVal('showHomeRequestsCard', initialConfig.showHomeRequestsCard) !== false,
                showNavbarRandom: getVal('showNavbarRandom', initialConfig.showNavbarRandom) !== false,
                contentSortMode: getVal('contentSortMode', initialConfig.contentSortMode),
                jellyseerrText: sanitizeText(getVal('jellyseerrText', initialConfig.jellyseerrText)) || initialConfig.jellyseerrText,
                playerSeekTime: getVal('playerSeekTime', initialConfig.playerSeekTime),
                playerAutoSkip: !!getVal('playerAutoSkip', initialConfig.playerAutoSkip),
                playerAutoSkipRecap: !!getVal('playerAutoSkipRecap', initialConfig.playerAutoSkipRecap),
                playerAutoNextEp: getVal('playerAutoNextEp', initialConfig.playerAutoNextEp) !== false,
                screensaverType: getVal('screensaverType', initialConfig.screensaverType),
                screensaverTime: getVal('screensaverTime', initialConfig.screensaverTime),
                screensaverInterval: getVal('screensaverInterval', initialConfig.screensaverInterval),
            };
        } else {
            initialConfig.enableGlobalOverwrites = false;
            initialConfig.lockVisualSettings = false;
            initialConfig.lockNavigationSettings = false;
            initialConfig.lockPlayerSettings = false;
            initialConfig.jellyseerrGlobalOverride = false;
        }

        // 5. Merge user-only local storage configurations (like userAvatar / appBackground)
        if (localConfig) {
            for (const key in localConfig) {
                // Prototype pollution guard: skip any key that could climb the prototype chain
                if (DANGEROUS_KEYS.has(key)) continue;
                // Only own properties — never inherited ones
                if (!Object.prototype.hasOwnProperty.call(localConfig, key)) continue;
                if (key === 'enableGlobalOverwrites' || key === 'lockVisualSettings' || key === 'lockNavigationSettings' || key === 'lockPlayerSettings' || key === 'jellyseerrGlobalOverride') continue; // NEVER allow local storage to override server lock policy
                initialConfig[key] = localConfig[key];
            }
        }

        // Enforce overrides
        initialConfig = enforceServerOverrides(initialConfig);

        // Sanitize final values
        initialConfig = sanitizeFullConfig(initialConfig);

        setConfig(initialConfig);
        applyAccentColor(initialConfig.accentColor);
        if (initialConfig.faviconUrl) applyFavicon(initialConfig.faviconUrl);
        applyThemeMode(initialConfig.themeMode || 'dark');
        applySubtitleStyles(
            initialConfig.subtitleTextSize,
            initialConfig.subtitleColor,
            initialConfig.subtitleTextWeight,
            initialConfig.subtitleFontFamily,
            initialConfig.subtitleShadow
        );
    }, []);

    const hexToHslValues = (hex) => {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        let r = parseInt(hex.slice(0, 2), 16) / 255;
        let g = parseInt(hex.slice(2, 4), 16) / 255;
        let b = parseInt(hex.slice(4, 6), 16) / 255;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        h = Math.round(h * 360);
        s = Math.round(s * 100);
        l = Math.round(l * 100);

        return `${h} ${s}% ${l}%`;
    };

    const applyAccentColor = (color) => {
        let hex = color.replace(/^#/, '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const rgbStr = `${r}, ${g}, ${b}`;
        const hexColor = `#${hex}`;

        document.documentElement.style.setProperty('--clr-accent', hexColor);
        document.documentElement.style.setProperty('--clr-accent-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
        document.documentElement.style.setProperty('--clr-accent-rgb', rgbStr);

        try {
            const hslVal = hexToHslValues(hexColor);
            document.documentElement.style.setProperty('--primary', hslVal);
            document.documentElement.style.setProperty('--ring', hslVal);
        } catch (e) {
            console.error("Failed to parse dynamic HSL color values", e);
        }

        // Force overwrite the server's injected !important CSS rules using a client style sheet tag
        try {
            let clientStyle = document.getElementById('legitflix-client-styles');
            if (!clientStyle) {
                clientStyle = document.createElement('style');
                clientStyle.id = 'legitflix-client-styles';
                document.head.appendChild(clientStyle);
            }
            clientStyle.textContent = `
                :root {
                    --clr-accent: ${hexColor} !important;
                    --clr-accent-hover: ${hexColor} !important;
                    --clr-accent-glow: rgba(${r}, ${g}, ${b}, 0.5) !important;
                    --clr-accent-rgb: ${rgbStr} !important;
                }
            `;
        } catch (e) {
            console.error("Failed to inject override client styles", e);
        }
    };

    const applyFavicon = (url) => {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = url || '/LegitFlix/Client/favicon.png';
    };

    const applyThemeMode = (mode) => {
        const root = document.documentElement;
        if (mode === 'light') {
            root.classList.add('light');
            root.classList.remove('dark');
        } else {
            root.classList.add('dark');
            root.classList.remove('light');
        }
    };

    const applySubtitleStyles = (sizeName, color, weightName, fontFamily, shadowName) => {
        const root = document.documentElement;

        const sizeMap = {
            'Small': '80%',
            'Normal': '100%',
            'Medium': '120%',
            'Large': '150%',
            'Extra Large': '200%'
        };
        const size = sizeMap[sizeName] || '100%';

        const weightMap = {
            'Light': '300',
            'Normal': 'normal',
            'Bold': 'bold'
        };
        const weight = weightMap[weightName] || 'normal';

        const fontMap = {
            'Default': 'inherit',
            'Serif': 'serif',
            'Sans-Serif': 'sans-serif',
            'Monospace': 'monospace'
        };
        const font = fontMap[fontFamily] || 'inherit';

        const shadowMap = {
            'None': 'none',
            'Drop Shadow': '0px 2px 4px rgba(0,0,0,0.9)',
            'Raised': '1px 1px 0px #000, 2px 2px 0px #000',
            'Depressed': '1px 1px 0px #fff, -1px -1px 0px #000',
            'Outline': '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
        };
        const shadow = shadowMap[shadowName] || '0px 2px 4px rgba(0,0,0,0.9)';

        root.style.setProperty('--lf-sub-size', sanitizeCssSize(size, '100%'));
        root.style.setProperty('--lf-sub-color', sanitizeCssColor(color, '#ffffff'));
        root.style.setProperty('--lf-sub-weight', weight);
        root.style.setProperty('--lf-sub-font', font);
        root.style.setProperty('--lf-sub-shadow', shadow);
    };

    const updateConfig = (newConfig) => {
        // Strip prototype-polluting keys before touching any object
        const sanitizedConfig = Object.fromEntries(
            Object.entries(newConfig).filter(([k]) => !DANGEROUS_KEYS.has(k))
        );
        if (sanitizedConfig.accentColor !== undefined) sanitizedConfig.accentColor = sanitizeHex(sanitizedConfig.accentColor) || '#ff7e00';
        if (sanitizedConfig.logoUrl !== undefined) sanitizedConfig.logoUrl = sanitizeUrlStrict(sanitizedConfig.logoUrl);
        if (sanitizedConfig.faviconUrl !== undefined) sanitizedConfig.faviconUrl = sanitizeUrlStrict(sanitizedConfig.faviconUrl);
        if (sanitizedConfig.jellyseerrUrl !== undefined) sanitizedConfig.jellyseerrUrl = sanitizeUrlStrict(sanitizedConfig.jellyseerrUrl);
        if (sanitizedConfig.jellyseerrBackground !== undefined) sanitizedConfig.jellyseerrBackground = sanitizeUrlStrict(sanitizedConfig.jellyseerrBackground);
        if (sanitizedConfig.jellyseerrText !== undefined) sanitizedConfig.jellyseerrText = sanitizeText(sanitizedConfig.jellyseerrText);
        if (sanitizedConfig.appBackground !== undefined) sanitizedConfig.appBackground = sanitizeUrlStrict(sanitizedConfig.appBackground);
        if (sanitizedConfig.userAvatar !== undefined) sanitizedConfig.userAvatar = sanitizeUrlStrict(sanitizedConfig.userAvatar);

        setConfig(prev => {
            let updated = { ...prev, ...sanitizedConfig };
            updated = enforceServerOverrides(updated);
            const cleanUpdated = sanitizeFullConfig(updated);

            localStorage.setItem('LegitFlix_Config', JSON.stringify(cleanUpdated));
            if (cleanUpdated.accentColor) applyAccentColor(cleanUpdated.accentColor);
            if (cleanUpdated.faviconUrl !== undefined) applyFavicon(cleanUpdated.faviconUrl);
            if (cleanUpdated.themeMode) applyThemeMode(cleanUpdated.themeMode);

            applySubtitleStyles(
                cleanUpdated.subtitleTextSize,
                cleanUpdated.subtitleColor,
                cleanUpdated.subtitleTextWeight,
                cleanUpdated.subtitleFontFamily,
                cleanUpdated.subtitleShadow
            );

            // Queue debounced write to server
            const cleanToSave = { ...cleanUpdated };
            delete cleanToSave.enableGlobalOverwrites;
            delete cleanToSave._syncedToServer;

            pendingWriteRef.current = cleanToSave;

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                saveSettingsToServer(cleanToSave);
            }, 300);

            return cleanUpdated;
        });
    };

    return (
        <ThemeContext.Provider value={{ config, updateConfig }}>
            {children}
        </ThemeContext.Provider>
    );
};
