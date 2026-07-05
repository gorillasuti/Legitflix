
import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

const sanitizeUrl = (url) => {
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
        showLibraryTitles: true,
        appBackground: null,
        userAvatar: null,
        enableGlobalOverwrites: false,
        // Player Settings
        playerSeekTime: 10,
        playerAutoSkip: false,
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
    });

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

        // 4. Merge server config if available
        if (window.LegitFlix_ServerConfig) {
            const sc = window.LegitFlix_ServerConfig;
            
            // Helper to load setting: if global overrides are enabled, server wins.
            // If disabled, user's local config wins.
            const getVal = (key, fallback) => {
                if (sc[key] === undefined) return fallback;
                if (enableGlobalOverwrites) {
                    return sc[key];
                } else {
                    return (localConfig && localConfig[key] !== undefined) ? localConfig[key] : sc[key];
                }
            };

            initialConfig = {
                ...initialConfig,
                enableGlobalOverwrites,
                accentColor: sanitizeHex(getVal('accentColor', initialConfig.accentColor)) || initialConfig.accentColor,
                themeMode: getVal('themeMode', initialConfig.themeMode),
                logoUrl: getVal('logoUrl', initialConfig.logoUrl) !== undefined ? sanitizeUrl(getVal('logoUrl', initialConfig.logoUrl)) : initialConfig.logoUrl,
                showNavbarCategories: getVal('showNavbarCategories', initialConfig.showNavbarCategories) !== false,
                enableJellyseerr: getVal('enableJellyseerr', initialConfig.enableJellyseerr) !== false,
                jellyseerrUrl: sanitizeUrl(getVal('jellyseerrUrl', initialConfig.jellyseerrUrl)) || initialConfig.jellyseerrUrl,
                showLibraryTitles: getVal('showLibraryTitles', initialConfig.showLibraryTitles) !== false,
                showNavbarRequests: getVal('showNavbarRequests', initialConfig.showNavbarRequests) !== false,
                showNavbarRandom: getVal('showNavbarRandom', initialConfig.showNavbarRandom) !== false,
                contentSortMode: getVal('contentSortMode', initialConfig.contentSortMode),
                jellyseerrText: sanitizeText(getVal('jellyseerrText', initialConfig.jellyseerrText)) || initialConfig.jellyseerrText,
                playerSeekTime: getVal('playerSeekTime', initialConfig.playerSeekTime),
                playerAutoSkip: !!getVal('playerAutoSkip', initialConfig.playerAutoSkip),
                playerAutoNextEp: getVal('playerAutoNextEp', initialConfig.playerAutoNextEp) !== false,
                screensaverType: getVal('screensaverType', initialConfig.screensaverType),
                screensaverTime: getVal('screensaverTime', initialConfig.screensaverTime),
                screensaverInterval: getVal('screensaverInterval', initialConfig.screensaverInterval),
            };
        } else {
            initialConfig.enableGlobalOverwrites = false;
        }

        // 5. Merge user-only local storage configurations (like userAvatar / appBackground)
        if (localConfig) {
            const scKeys = window.LegitFlix_ServerConfig ? Object.keys(window.LegitFlix_ServerConfig) : [];
            for (const key in localConfig) {
                if (key === 'enableGlobalOverwrites') continue; // NEVER allow local storage to override server lock policy
                if (!enableGlobalOverwrites || !scKeys.includes(key)) {
                    initialConfig[key] = localConfig[key];
                }
            }
        }

        // Sanitize final values
        if (initialConfig.accentColor !== undefined) initialConfig.accentColor = sanitizeHex(initialConfig.accentColor) || '#ff7e00';
        if (initialConfig.logoUrl !== undefined) initialConfig.logoUrl = sanitizeUrl(initialConfig.logoUrl);
        if (initialConfig.faviconUrl !== undefined) initialConfig.faviconUrl = sanitizeUrl(initialConfig.faviconUrl);
        if (initialConfig.jellyseerrUrl !== undefined) initialConfig.jellyseerrUrl = sanitizeUrl(initialConfig.jellyseerrUrl);
        if (initialConfig.jellyseerrBackground !== undefined) initialConfig.jellyseerrBackground = sanitizeUrl(initialConfig.jellyseerrBackground);
        if (initialConfig.jellyseerrText !== undefined) initialConfig.jellyseerrText = sanitizeText(initialConfig.jellyseerrText);
        if (initialConfig.appBackground !== undefined) initialConfig.appBackground = sanitizeUrl(initialConfig.appBackground);

        setConfig(initialConfig);
        applyAccentColor(initialConfig.accentColor);
        if (initialConfig.faviconUrl) applyFavicon(initialConfig.faviconUrl);
        applyThemeMode(initialConfig.themeMode || 'dark');
        applySubtitleStyles(initialConfig.subtitleSize, initialConfig.subtitleColor, initialConfig.subtitleBackground);
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
        link.href = url || '/favicon.png';
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

    const applySubtitleStyles = (size, color, background) => {
        const root = document.documentElement;
        root.style.setProperty('--lf-sub-size', size || '100%');
        root.style.setProperty('--lf-sub-color', color || '#ffffff');

        // Background & Shadow logic
        let textShadow = '0px 1px 2px rgba(0,0,0,0.8)';
        let bgColor = 'transparent';

        if (background === 'drop-shadow') {
            textShadow = '0px 2px 4px rgba(0,0,0,0.9)';
        } else if (background === 'outline') {
            textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
        } else if (background === 'box') {
            bgColor = 'rgba(0,0,0,0.7)';
            textShadow = 'none';
        } else if (background === 'none') {
            textShadow = 'none';
        }

        root.style.setProperty('--lf-sub-shadow', textShadow);
        root.style.setProperty('--lf-sub-bg', bgColor);
    };

    const updateConfig = (newConfig) => {
        const sanitizedConfig = { ...newConfig };
        // Strip prototype-polluting keys before touching any object
        const sanitizedConfig = Object.fromEntries(
            Object.entries(newConfig).filter(([k]) => !DANGEROUS_KEYS.has(k))
        );
        if (sanitizedConfig.accentColor !== undefined) sanitizedConfig.accentColor = sanitizeHex(sanitizedConfig.accentColor) || '#ff7e00';
        if (sanitizedConfig.logoUrl !== undefined) sanitizedConfig.logoUrl = sanitizeUrl(sanitizedConfig.logoUrl);
        if (sanitizedConfig.faviconUrl !== undefined) sanitizedConfig.faviconUrl = sanitizeUrl(sanitizedConfig.faviconUrl);
        if (sanitizedConfig.jellyseerrUrl !== undefined) sanitizedConfig.jellyseerrUrl = sanitizeUrl(sanitizedConfig.jellyseerrUrl);
        if (sanitizedConfig.jellyseerrBackground !== undefined) sanitizedConfig.jellyseerrBackground = sanitizeUrl(sanitizedConfig.jellyseerrBackground);
        if (sanitizedConfig.jellyseerrText !== undefined) sanitizedConfig.jellyseerrText = sanitizeText(sanitizedConfig.jellyseerrText);
        if (sanitizedConfig.appBackground !== undefined) sanitizedConfig.appBackground = sanitizeUrl(sanitizedConfig.appBackground);

        setConfig(prev => {
            const updated = { ...prev, ...sanitizedConfig };
            
            // Re-enforce server configurations if global overwrites are enabled!
            if (updated.enableGlobalOverwrites && window.LegitFlix_ServerConfig) {
                const sc = window.LegitFlix_ServerConfig;
                if (sc.accentColor !== undefined) updated.accentColor = sanitizeHex(sc.accentColor) || '#ff7e00';
                if (sc.themeMode !== undefined) updated.themeMode = sc.themeMode;
                if (sc.logoUrl !== undefined) updated.logoUrl = sanitizeUrl(sc.logoUrl);
                if (sc.showNavbarCategories !== undefined) updated.showNavbarCategories = sc.showNavbarCategories;
                if (sc.enableJellyseerr !== undefined) updated.enableJellyseerr = sc.enableJellyseerr;
                if (sc.jellyseerrUrl !== undefined) updated.jellyseerrUrl = sanitizeUrl(sc.jellyseerrUrl);
                if (sc.showLibraryTitles !== undefined) updated.showLibraryTitles = sc.showLibraryTitles;
                if (sc.showNavbarRequests !== undefined) updated.showNavbarRequests = sc.showNavbarRequests;
                if (sc.showNavbarRandom !== undefined) updated.showNavbarRandom = sc.showNavbarRandom;
                if (sc.contentSortMode !== undefined) updated.contentSortMode = sc.contentSortMode;
                if (sc.jellyseerrText !== undefined) updated.jellyseerrText = sanitizeText(sc.jellyseerrText);
                if (sc.playerSeekTime !== undefined) updated.playerSeekTime = sc.playerSeekTime;
                if (sc.playerAutoSkip !== undefined) updated.playerAutoSkip = sc.playerAutoSkip;
                if (sc.playerAutoNextEp !== undefined) updated.playerAutoNextEp = sc.playerAutoNextEp;
            }

            localStorage.setItem('LegitFlix_Config', JSON.stringify(updated));
            if (updated.accentColor) applyAccentColor(updated.accentColor);
            if (updated.faviconUrl !== undefined) applyFavicon(updated.faviconUrl);
            if (updated.themeMode) applyThemeMode(updated.themeMode);
            const cleanUpdated = sanitizeFullConfig(updated);

            if (updated.subtitleSize !== undefined || updated.subtitleColor !== undefined || updated.subtitleBackground !== undefined) {
                applySubtitleStyles(updated.subtitleSize, updated.subtitleColor, updated.subtitleBackground);
            }

            return updated;
            return cleanUpdated;
        });
    };

    return (
        <ThemeContext.Provider value={{ config, updateConfig }}>
            {children}
        </ThemeContext.Provider>
    );
};
