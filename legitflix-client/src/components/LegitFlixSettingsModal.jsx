import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { jellyfinService } from '../services/jellyfin';
import BannerPickerModal from './BannerPickerModal';
import AvatarPickerModal from './AvatarPickerModal';
import './LegitFlixSettingsModal.css';

const sanitizeUrl = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (/^(https?:\/\/|\/)/i.test(trimmed)) {
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

const PRESET_COLORS = [
    { name: 'Orange', value: '#ff7e00' },
    { name: 'Blue', value: '#00aaff' },
    { name: 'Pink', value: '#ff00aa' },
    { name: 'Green', value: '#00ff7e' },
    { name: 'Red', value: '#ff3333' },
    { name: 'Purple', value: '#aa00ff' },
];

const LegitFlixSettingsModal = ({ isOpen, onClose, userId }) => {
    const { config, updateConfig } = useTheme();
    const originalTitleRef = useRef(null);

    // Tab State
    const [activeTab, setActiveTab] = useState('appearance');
    const [showBannerPicker, setShowBannerPicker] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('app'); // 'app' | 'jellyseerr'
    const [uploading, setUploading] = useState(false);

    // Form State
    const [accentColor, setAccentColor] = useState(config.accentColor || '#ff7e00');
    const [themeMode, setThemeMode] = useState(config.themeMode || 'dark');
    const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
    const [showCategories, setShowCategories] = useState(config.showNavbarCategories !== false);
    const [enableJellyseerr, setEnableJellyseerr] = useState(config.enableJellyseerr !== false);
    const [jellyseerrUrl, setJellyseerrUrl] = useState(config.jellyseerrUrl || 'https://request.legitflix.eu');
    const [showLibraryTitles, setShowLibraryTitles] = useState(config.showLibraryTitles !== false);
    const [showNavbarRequests, setShowNavbarRequests] = useState(config.showNavbarRequests !== false);
    const [customHex, setCustomHex] = useState('');
    const [contentTypes, setContentTypes] = useState(config.contentTypeFilters || { Movie: true, Series: true, MusicAlbum: false, Audio: false, MusicVideo: false });

    // Random Button State
    const [showNavbarRandom, setShowNavbarRandom] = useState(config.showNavbarRandom !== false);
    const [randomFilters, setRandomFilters] = useState(config.randomContentFilters || { Movie: true, Series: true, Episode: true });
    const [randomLibraries, setRandomLibraries] = useState(config.randomLibraries || []);
    const [availableLibraries, setAvailableLibraries] = useState([]);

    const [sortMode, setSortMode] = useState(config.contentSortMode || 'latest');

    // Jellyseerr/Request Customization
    const [jellyseerrText, setJellyseerrText] = useState(config.jellyseerrText || 'Request Feature');
    const [jellyseerrBackground, setJellyseerrBackground] = useState(config.jellyseerrBackground || '');

    // Player customization state
    const [playerSeekTime, setPlayerSeekTime] = useState(config.playerSeekTime || 10);
    const [playerAutoSkip, setPlayerAutoSkip] = useState(!!config.playerAutoSkip);
    const [playerAutoNextEp, setPlayerAutoNextEp] = useState(config.playerAutoNextEp !== false);

    // Subtitle customization state
    const [subtitleLanguagePreference, setSubtitleLanguagePreference] = useState(config.subtitleLanguagePreference || 'eng');
    const [subtitleMode, setSubtitleMode] = useState(config.subtitleMode || 'Default');
    const [subtitleBurnIn, setSubtitleBurnIn] = useState(config.subtitleBurnIn || 'Auto');
    const [subtitleTextSize, setSubtitleTextSize] = useState(config.subtitleTextSize || 'Normal');
    const [subtitleTextWeight, setSubtitleTextWeight] = useState(config.subtitleTextWeight || 'Normal');
    const [subtitleFontFamily, setSubtitleFontFamily] = useState(config.subtitleFontFamily || 'Default');
    const [subtitleColor, setSubtitleColor] = useState(config.subtitleColor || '#ffffff');
    const [subtitleShadow, setSubtitleShadow] = useState(config.subtitleShadow || 'Drop Shadow');
    const [subtitleVerticalPosition, setSubtitleVerticalPosition] = useState(config.subtitleVerticalPosition || 'Bottom');

    // Poster tags state
    const [showQualityTags, setShowQualityTags] = useState(!!config.showQualityTags);
    const [showGenreTags, setShowGenreTags] = useState(!!config.showGenreTags);
    const [showLanguageTags, setShowLanguageTags] = useState(!!config.showLanguageTags);

    // Playback behaviors state
    const [playerAutoPause, setPlayerAutoPause] = useState(!!config.playerAutoPause);
    const [playerAutoResume, setPlayerAutoResume] = useState(!!config.playerAutoResume);
    const [playerAutoPip, setPlayerAutoPip] = useState(!!config.playerAutoPip);
    const [playerLongPressSpeed, setPlayerLongPressSpeed] = useState(config.playerLongPressSpeed !== false);

    const [isAdmin, setIsAdmin] = useState(false);


    useEffect(() => {
        if (isOpen) {
            const fetchUserRoleAndLibraries = async () => {
                try {
                    const currentUser = await jellyfinService.getCurrentUser();
                    if (currentUser) {
                        setIsAdmin(!!currentUser?.Policy?.IsAdministrator);
                        const views = await jellyfinService.getUserViews(currentUser.Id);
                        if (views && views.Items) {
                            setAvailableLibraries(views.Items.map(item => ({
                                Id: item.Id,
                                Name: item.Name,
                                Type: item.CollectionType
                            })));
                        }
                    }
                } catch (e) {
                    console.error("[LegitFlix] Failed to check admin role or load libraries:", e);
                }
            };
            fetchUserRoleAndLibraries();

            if (!originalTitleRef.current) {
                originalTitleRef.current = document.title;
            }
            const tabLabels = {
                appearance: 'Appearance',
                home: 'Home Screen',
                navigation: 'Navigation',
                player: 'Player'
            };
            const tabLabel = tabLabels[activeTab] || activeTab;
            document.title = `Legitflix - Settings: ${tabLabel}`;
        } else {
            if (originalTitleRef.current) {
                document.title = originalTitleRef.current;
                originalTitleRef.current = null;
            }
        }

        return () => {
            if (originalTitleRef.current) {
                document.title = originalTitleRef.current;
            }
        };
    }, [isOpen, activeTab]);

    useEffect(() => {
        if (isOpen) {
            // Reset to current config when opening
            setAccentColor(config.accentColor || '#ff7e00');
            setThemeMode(config.themeMode || 'dark');
            setLogoUrl(config.logoUrl || '');
            setShowCategories(config.showNavbarCategories !== false);
            setEnableJellyseerr(config.enableJellyseerr !== false);
            setJellyseerrUrl(config.jellyseerrUrl || 'https://request.legitflix.eu');
            setShowLibraryTitles(config.showLibraryTitles !== false);
            setShowNavbarRequests(config.showNavbarRequests !== false);
            setContentTypes(config.contentTypeFilters || { Movie: true, Series: true, MusicAlbum: false, Audio: false, MusicVideo: false });

            // Random Config Reset
            setShowNavbarRandom(config.showNavbarRandom !== false);
            setRandomFilters(config.randomContentFilters || { Movie: true, Series: true, Episode: true });
            setRandomLibraries(config.randomLibraries || []);

            setSortMode(config.contentSortMode || 'latest');
            setJellyseerrText(config.jellyseerrText || 'Request');
            setJellyseerrBackground(config.jellyseerrBackground || '');
            setPlayerSeekTime(config.playerSeekTime || 10);
            setPlayerAutoSkip(!!config.playerAutoSkip);
            setPlayerAutoNextEp(config.playerAutoNextEp !== false);

            // Subtitles
            setSubtitleLanguagePreference(config.subtitleLanguagePreference || 'eng');
            setSubtitleMode(config.subtitleMode || 'Default');
            setSubtitleBurnIn(config.subtitleBurnIn || 'Auto');
            setSubtitleTextSize(config.subtitleTextSize || 'Normal');
            setSubtitleTextWeight(config.subtitleTextWeight || 'Normal');
            setSubtitleFontFamily(config.subtitleFontFamily || 'Default');
            setSubtitleColor(config.subtitleColor || '#ffffff');
            setSubtitleShadow(config.subtitleShadow || 'Drop Shadow');
            setSubtitleVerticalPosition(config.subtitleVerticalPosition || 'Bottom');

            // Poster Tags
            setShowQualityTags(!!config.showQualityTags);
            setShowGenreTags(!!config.showGenreTags);
            setShowLanguageTags(!!config.showLanguageTags);

            // Playback Options
            setPlayerAutoPause(!!config.playerAutoPause);
            setPlayerAutoResume(!!config.playerAutoResume);
            setPlayerAutoPip(!!config.playerAutoPip);
            setPlayerLongPressSpeed(config.playerLongPressSpeed !== false);

            if (!PRESET_COLORS.some(c => c.value === config.accentColor)) {
                setCustomHex(config.accentColor);
            }
        }
    }, [isOpen, config]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleColorChange = (color) => {
        setAccentColor(color);
        setCustomHex('');
    };

    const handleCustomHexChange = (e) => {
        const val = e.target.value;
        setCustomHex(val);
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            setAccentColor(val);
        }
    };

    const handleSave = () => {
        // Compute media type arrays from checkboxes
        const enabledTypes = Object.entries(contentTypes).filter(([, v]) => v).map(([k]) => k);
        const heroStr = enabledTypes.length > 0 ? enabledTypes.join(',') : 'Movie,Series';
        const promoArr = enabledTypes.length > 0 ? enabledTypes : ['Movie', 'Series'];

        const cleanAccent = sanitizeHex(accentColor) || '#ff7e00';
        const cleanLogo = sanitizeUrl(logoUrl);
        const cleanJellyseerrUrl = sanitizeUrl(jellyseerrUrl);
        const cleanJellyseerrText = sanitizeText(jellyseerrText);
        const cleanJellyseerrBackground = sanitizeUrl(jellyseerrBackground);

        updateConfig({
            accentColor: cleanAccent,
            themeMode,
            logoUrl: cleanLogo,
            logoType: cleanLogo ? 'image' : 'text',
            showNavbarCategories: showCategories,
            enableJellyseerr,
            jellyseerrUrl: cleanJellyseerrUrl,
            showLibraryTitles,
            showNavbarRequests,
            contentTypeFilters: contentTypes,

            // Random Config Save
            showNavbarRandom,
            randomContentFilters: randomFilters,
            randomLibraries: randomLibraries,

            heroMediaTypes: heroStr,
            promoMediaTypes: promoArr,
            contentSortMode: sortMode,
            jellyseerrText: cleanJellyseerrText,
            jellyseerrBackground: cleanJellyseerrBackground,

            // Player Settings
            playerSeekTime,
            playerAutoSkip,
            playerAutoNextEp,

            // Subtitle Settings
            subtitleLanguagePreference,
            subtitleMode,
            subtitleBurnIn,
            subtitleTextSize,
            subtitleTextWeight,
            subtitleFontFamily,
            subtitleColor,
            subtitleShadow,
            subtitleVerticalPosition,

            // Poster Tags
            showQualityTags,
            showGenreTags,
            showLanguageTags,

            // Playback Options
            playerAutoPause,
            playerAutoResume,
            playerAutoPip,
            playerLongPressSpeed,
        });
        onClose();
    };

    const handleReset = () => {
        setAccentColor('#ff7e00');
        setThemeMode('dark');
        setLogoUrl('');
        setCustomHex('');
        setShowCategories(true);
        setEnableJellyseerr(true);
        setJellyseerrUrl('https://request.legitflix.eu');
        setShowLibraryTitles(true);
        setShowNavbarRequests(true);
        setContentTypes({ Movie: true, Series: true, MusicAlbum: false, Audio: false, MusicVideo: false });

        // Random Config Reset
        setShowNavbarRandom(true);
        setRandomFilters({ Movie: true, Series: true, Episode: true });

        setSortMode('latest');

        // Player Reset
        setPlayerSeekTime(10);
        setPlayerAutoSkip(false);
        setPlayerAutoNextEp(true);
    };

    const handleAvatarFile = async (url) => {
        setShowAvatarPicker(false);
        window.location.reload(); // Refresh to show new avatar
    };

    const settingsList = [
        {
            id: 'accentColor',
            tab: 'appearance',
            label: 'Accent Color',
            keywords: ['color', 'theme', 'style', 'appearance'],
            render: () => (
                <div className="setting-section" key="accentColor">
                    <h3>Accent Color</h3>
                    <div className="color-presets">
                        {PRESET_COLORS.map(c => {
                            const isSelected = accentColor === c.value;
                            return (
                                <div
                                    key={c.value}
                                    className={`color-preset ${isSelected ? 'selected' : ''} ${config.enableGlobalOverwrites ? 'disabled' : ''}`}
                                    style={{
                                        backgroundColor: c.value,
                                        opacity: config.enableGlobalOverwrites ? 0.5 : 1,
                                        pointerEvents: config.enableGlobalOverwrites ? 'none' : 'auto'
                                    }}
                                    onClick={() => !config.enableGlobalOverwrites && handleColorChange(c.value)}
                                    title={c.name}
                                >
                                    {isSelected && <span className="material-icons">check</span>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="custom-color-input">
                        <label>Custom Hex:</label>
                        <input
                            type="text"
                            placeholder="#RRGGBB"
                            value={customHex}
                            onChange={handleCustomHexChange}
                            maxLength={7}
                            disabled={config.enableGlobalOverwrites}
                        />
                        <div className="color-preview" style={{ backgroundColor: accentColor }}></div>
                    </div>
                </div>
            )
        },
        {
            id: 'themeMode',
            tab: 'appearance',
            label: 'Theme Mode',
            keywords: ['dark', 'light', 'mode', 'theme', 'appearance'],
            render: () => (
                <div className="setting-section hidden" key="themeMode">
                    <h3>Theme Mode</h3>
                    <p className="setting-desc">Choose between Dark and Light mode.</p>
                    <div className="setting-row" style={{ justifyContent: 'flex-start', gap: '10px' }}>
                        <button
                            className={`lf-btn ${themeMode === 'dark' ? 'lf-btn--primary' : 'lf-btn--secondary'}`}
                            onClick={() => !config.enableGlobalOverwrites && setThemeMode('dark')}
                            disabled={config.enableGlobalOverwrites}
                            style={{ minWidth: '100px' }}
                        >
                            <span className="material-icons" style={{ marginRight: '8px' }}>dark_mode</span>
                            Dark
                        </button>
                        <button
                            className={`lf-btn ${themeMode === 'light' ? 'lf-btn--primary' : 'lf-btn--secondary'}`}
                            onClick={() => !config.enableGlobalOverwrites && setThemeMode('light')}
                            disabled={config.enableGlobalOverwrites}
                            style={{ minWidth: '100px' }}
                        >
                            <span className="material-icons" style={{ marginRight: '8px' }}>light_mode</span>
                            Light
                        </button>
                    </div>
                </div>
            )
        },
        {
            id: 'logoUrl',
            tab: 'appearance',
            label: 'Custom Logo URL',
            keywords: ['logo', 'image', 'branding', 'appearance'],
            render: () => (
                <div className="setting-section" key="logoUrl">
                    <h3>Custom Logo URL</h3>
                    <p className="setting-desc">Enter a direct URL to an image to replace the Legitflix logo.</p>
                    <input
                        type="text"
                        className="legit-input"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        disabled={config.enableGlobalOverwrites}
                    />
                </div>
            )
        },
        {
            id: 'faviconUrl',
            tab: 'appearance',
            label: 'Custom Favicon URL',
            keywords: ['favicon', 'icon', 'tab', 'browser', 'branding'],
            render: () => (
                <div className="setting-section" key="faviconUrl">
                    <h3>Custom Favicon URL</h3>
                    <p className="setting-desc">Enter a direct URL to an image to use as the browser tab icon.</p>
                    <input
                        type="text"
                        className="legit-input"
                        placeholder="https://example.com/favicon.ico"
                        value={config.faviconUrl || ''}
                        onChange={(e) => updateConfig({ faviconUrl: e.target.value })}
                    />
                </div>
            )
        },
        {
            id: 'avatar',
            tab: 'appearance',
            label: 'Profile Avatar',
            keywords: ['avatar', 'profile', 'image', 'picture', 'user'],
            render: () => (
                <div className="setting-section" key="avatar">
                    <h3>Profile Avatar</h3>
                    <p className="setting-desc">Change your user profile picture.</p>
                    <div className="setting-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <img
                                src={config.userAvatar || `${jellyfinService.api.basePath}/Users/${userId}/Images/Primary?quality=90&t=${Date.now()}`}
                                alt="Current Avatar"
                                style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <button className="lf-btn lf-btn--secondary" onClick={() => setShowAvatarPicker(true)}>
                                <span className="material-icons" style={{ fontSize: '18px', marginRight: '8px' }}>face</span>
                                Change Avatar
                            </button>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'appBackground',
            tab: 'appearance',
            label: 'App Background Image',
            keywords: ['background', 'image', 'wallpaper', 'banner', 'appearance'],
            render: () => (
                <div className="setting-section" key="appBackground">
                    <h3>App Background Image</h3>
                    <p className="setting-desc">Select a backdrop from your library to use as the app background.</p>
                    <div className="setting-row" style={{ alignItems: 'center', gap: '15px' }}>
                        {config.appBackground ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
                                <div style={{
                                    width: '120px',
                                    height: '68px',
                                    borderRadius: '6px',
                                    backgroundColor: '#2a2a2a',
                                    backgroundImage: `url('${config.appBackground}')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    flexShrink: 0
                                }} />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        className="lf-btn lf-btn--secondary"
                                        onClick={() => {
                                            setPickerMode('app');
                                            setShowBannerPicker(true);
                                        }}
                                    >
                                        Change Image
                                    </button>
                                    <button
                                        className="lf-btn lf-btn--secondary"
                                        style={{ color: 'var(--clr-error)', borderColor: 'var(--clr-error)' }}
                                        onClick={async () => {
                                            try {
                                                const prefsId = "usersettings";
                                                let prefs = await jellyfinService.getDisplayPreferences(prefsId);
                                                if (prefs && prefs.CustomPrefs) {
                                                    delete prefs.CustomPrefs["LegitFlix_Backdrop_ItemId"];
                                                    delete prefs.CustomPrefs["LegitFlix_Backdrop_ImageTag"];
                                                    delete prefs.CustomPrefs["LegitFlix_Backdrop_ServerUrl"];
                                                    await jellyfinService.updateDisplayPreferences(prefsId, prefs);
                                                }
                                                updateConfig({ appBackground: null });
                                                window.location.reload();
                                            } catch (err) {
                                                console.error("Failed to remove backdrop preference", err);
                                            }
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                className="lf-btn lf-btn--secondary"
                                onClick={() => {
                                    setPickerMode('app');
                                    setShowBannerPicker(true);
                                }}
                            >
                                <span className="material-icons" style={{ fontSize: '18px', marginRight: '8px' }}>image</span>
                                Select Background
                            </button>
                        )}
                    </div>
                </div>
            )
        },
        {
            id: 'requestFeature',
            tab: 'home',
            label: 'Request Feature (Jellyseerr)',
            keywords: ['request', 'jellyseerr', 'ombi', 'home', 'card'],
            render: () => (
                <>
                    <div className="setting-section" key="requestFeature">
                        <div className="setting-row">
                            <div>
                                <h3 className="setting-title">Request</h3>
                                <p className="setting-desc">Enable "{config.jellyseerrText || 'Request'}" card on Home screen</p>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={enableJellyseerr}
                                    onChange={(e) => setEnableJellyseerr(e.target.checked)}
                                    disabled={config.enableGlobalOverwrites}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        <div className="fade-in" style={{ marginTop: '10px' }}>
                            <p className="setting-desc">Request URL (Required for both Home Card and Navbar):</p>
                            <input
                                type="text"
                                className="legit-input"
                                placeholder="https://request.legitflix.eu"
                                value={jellyseerrUrl}
                                onChange={(e) => setJellyseerrUrl(e.target.value)}
                                disabled={config.enableGlobalOverwrites}
                            />
                        </div>
                    </div>

                    <div className="setting-section" key="requestFeatureCustomization">
                        <h3>Card Appearance</h3>
                        <p className="setting-desc">Customize the look of the Request card on the Home screen.</p>

                        <div className="setting-row" style={{ marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="setting-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Card Title</label>
                                <input
                                    type="text"
                                    className="legit-input"
                                    placeholder="Request"
                                    value={jellyseerrText}
                                    onChange={(e) => setJellyseerrText(e.target.value)}
                                    disabled={config.enableGlobalOverwrites}
                                />
                            </div>
                        </div>

                        <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                            <div>
                                <label className="setting-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Card Background URL</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '120px',
                                        height: '68px',
                                        borderRadius: '6px',
                                        backgroundColor: '#2a2a2a',
                                        backgroundImage: `url('${jellyseerrBackground || 'https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/public/jellyseerr.jpg'}')`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        flexShrink: 0
                                    }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                                        <input
                                            type="text"
                                            className="legit-input"
                                            style={{ marginTop: 0 }}
                                            placeholder="https://example.com/background.jpg"
                                            value={jellyseerrBackground}
                                            onChange={(e) => setJellyseerrBackground(e.target.value)}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="lf-btn lf-btn--secondary"
                                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                onClick={() => {
                                                    setPickerMode('jellyseerr');
                                                    setShowBannerPicker(true);
                                                }}
                                            >
                                                Select from Library
                                            </button>
                                            {jellyseerrBackground && (
                                                <button
                                                    className="lf-btn lf-btn--secondary"
                                                    style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--clr-error)', borderColor: 'var(--clr-error)' }}
                                                    onClick={() => setJellyseerrBackground('')}
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </>
            )
        },
        {
            id: 'libraryTitles',
            tab: 'home',
            label: 'Show Library Titles',
            keywords: ['library', 'names', 'titles', 'overlay', 'home'],
            render: () => (
                <div className="setting-section" key="libraryTitles">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Show Library Titles</h3>
                            <p className="setting-desc">Display text overlay on library cards</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={showLibraryTitles}
                                onChange={(e) => setShowLibraryTitles(e.target.checked)}
                                disabled={config.enableGlobalOverwrites}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'contentFilters',
            tab: 'home',
            label: 'Content Filters',
            keywords: ['content', 'media', 'type', 'movie', 'series', 'music', 'filter', 'carousel', 'promo', 'hero'],
            render: () => {
                const MEDIA_TYPES = [
                    { key: 'Movie', label: 'Movies', icon: 'movie' },
                    { key: 'Series', label: 'Series', icon: 'tv' },
                    { key: 'MusicAlbum', label: 'Music Albums', icon: 'album' },
                    { key: 'Audio', label: 'Audio', icon: 'audiotrack' },
                    { key: 'MusicVideo', label: 'Music Videos', icon: 'music_video' },
                ];
                return (
                    <div className="setting-section" key="contentFilters">
                        <h3>Content Filters</h3>
                        <p className="setting-desc">Choose which media types appear in the Hero Carousel and Promo Banner.</p>
                        <div className="content-type-grid">
                            {MEDIA_TYPES.map(t => (
                                <label key={t.key} className={`content-type-chip ${contentTypes[t.key] ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={!!contentTypes[t.key]}
                                        onChange={(e) => setContentTypes(prev => ({ ...prev, [t.key]: e.target.checked }))}
                                    />
                                    <span className="material-icons">{t.icon}</span>
                                    <span>{t.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            }
        },
        {
            id: 'displayOrder',
            tab: 'home',
            label: 'Display Order',
            keywords: ['sort', 'order', 'random', 'latest', 'rated', 'carousel', 'promo', 'display'],
            render: () => {
                const SORT_MODES = [
                    { key: 'latest', label: 'Latest', icon: 'schedule', desc: 'Newest additions first' },
                    { key: 'random', label: 'Random', icon: 'shuffle', desc: 'Shuffled each visit' },
                    { key: 'topRated', label: 'Top Rated', icon: 'star', desc: 'Highest community rating' },
                ];
                return (
                    <div className="setting-section" key="displayOrder">
                        <h3>Display Order</h3>
                        <p className="setting-desc">How content is sorted in the Carousel and Promo Banners.</p>
                        <div className="content-type-grid">
                            {SORT_MODES.map(m => (
                                <label
                                    key={m.key}
                                    className={`content-type-chip ${sortMode === m.key ? 'active' : ''} ${config.enableGlobalOverwrites ? 'disabled' : ''}`}
                                    title={m.desc}
                                    style={{
                                        opacity: config.enableGlobalOverwrites ? 0.6 : 1,
                                        pointerEvents: config.enableGlobalOverwrites ? 'none' : 'auto'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="sortMode"
                                        checked={sortMode === m.key}
                                        onChange={() => !config.enableGlobalOverwrites && setSortMode(m.key)}
                                        disabled={config.enableGlobalOverwrites}
                                    />
                                    <span className="material-icons">{m.icon}</span>
                                    <span>{m.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            }
        },
        {
            id: 'navbarCategories',
            tab: 'navigation',
            label: 'Show Categories in Navbar',
            keywords: ['navigation', 'menu', 'navbar', 'categories', 'links'],
            render: () => (
                <div className="setting-section" key="navbarCategories">
                    <div className="setting-row" title={config.enableGlobalOverwrites ? "Managed globally via plugin settings" : ""}>
                        <div>
                            <h3 className="setting-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                Show Categories in Navbar
                                {config.enableGlobalOverwrites && (
                                    <span className="material-icons" style={{ fontSize: '14px', color: '#ff7e00', cursor: 'help' }}>lock</span>
                                )}
                            </h3>
                            <p className="setting-desc">Display library links in the top navigation bar</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={showCategories}
                                onChange={(e) => setShowCategories(e.target.checked)}
                                disabled={config.enableGlobalOverwrites}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'navbarRequests',
            tab: 'navigation',
            label: 'Show Requests in Navbar',
            keywords: ['navigation', 'navbar', 'requests', 'jellyseerr'],
            render: () => (
                <div className="setting-section" key="navbarRequests">
                    <div className="setting-row" title={config.enableGlobalOverwrites || config.jellyseerrGlobalOverride ? "Managed globally via plugin settings" : ""}>
                        <div>
                            <h3 className="setting-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                Show Requests in Navbar
                                {(config.enableGlobalOverwrites || config.jellyseerrGlobalOverride) && (
                                    <span className="material-icons" style={{ fontSize: '14px', color: '#ff7e00', cursor: 'help' }}>lock</span>
                                )}
                            </h3>

                            <p className="setting-desc">Display the "{config.jellyseerrText || 'Requests'}" link next to categories in the navbar</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={showNavbarRequests}
                                onChange={(e) => setShowNavbarRequests(e.target.checked)}
                                disabled={config.enableGlobalOverwrites}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )

        },
        {
            id: 'navbarSearch',
            tab: 'navigation',
            label: 'Show Search Button',
            keywords: ['navigation', 'navbar', 'search', 'find'],
            render: () => (
                <div className="setting-section" key="navbarSearch">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Show Search Button</h3>
                            <p className="setting-desc">Display the search icon in the navbar (Hotkey: F4)</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={config.showNavbarSearch !== false}
                                onChange={(e) => updateConfig({ showNavbarSearch: e.target.checked })}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'navbarBookmarks',
            tab: 'navigation',
            label: 'Show Bookmarks Button',
            keywords: ['navigation', 'navbar', 'bookmarks', 'favorites', 'list'],
            render: () => (
                <div className="setting-section" key="navbarBookmarks">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Show Favorite Button</h3>
                            <p className="setting-desc">Display the favorites icon in the navbar</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={config.showNavbarBookmarks !== false}
                                onChange={(e) => updateConfig({ showNavbarBookmarks: e.target.checked })}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'navbarRandom',
            tab: 'navigation',
            label: 'Random Button',
            keywords: ['navigation', 'navbar', 'random', 'lucky', 'casino'],
            render: () => (
                <div className="setting-section" key="navbarRandom">
                    <div className="setting-row" style={{ marginBottom: '10px' }} title={config.enableGlobalOverwrites ? "Managed globally via plugin settings" : ""}>
                        <div>
                            <h3 className="setting-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                Show Random Button
                                {config.enableGlobalOverwrites && (
                                    <span className="material-icons" style={{ fontSize: '14px', color: '#ff7e00', cursor: 'help' }}>lock</span>
                                )}
                            </h3>
                            <p className="setting-desc">Display the "I'm Feeling Lucky" button in the navbar</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={showNavbarRandom}
                                onChange={(e) => setShowNavbarRandom(e.target.checked)}
                                disabled={config.enableGlobalOverwrites}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    {showNavbarRandom && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingLeft: '12px', borderLeft: '2px solid rgba(255,255,255,0.05)', marginBottom: '10px', marginTop: '-5px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                    <h4 className="setting-title" style={{ fontSize: '0.9rem' }}>Randomize From</h4>
                                    <p className="setting-desc">Select which libraries should be used for the random button. (None selected = All)</p>
                                </div>
                                <div className="content-type-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {availableLibraries.map(lib => {
                                        const isSelected = randomLibraries.includes(lib.Id);
                                        return (
                                            <button
                                                key={lib.Id}
                                                className={`content-type-chip ${isSelected ? 'active' : ''}`}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setRandomLibraries(prev => prev.filter(id => id !== lib.Id));
                                                    } else {
                                                        setRandomLibraries(prev => [...prev, lib.Id]);
                                                    }
                                                }}
                                            >
                                                <span className="material-icons" style={{ fontSize: '16px' }}>{lib.Type === 'movies' ? 'movie' : (lib.Type === 'tvshows' ? 'tv' : 'folder')}</span>
                                                {lib.Name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                    <h4 className="setting-title" style={{ fontSize: '0.9rem' }}>Content Types</h4>
                                    <p className="setting-desc">Filter by content type</p>
                                </div>
                                <div className="content-type-grid" style={{ display: 'flex', gap: '8px' }}>
                                    {['Movie', 'Series', 'Episode'].map(type => (
                                        <button
                                            key={type}
                                            className={`content-type-chip ${randomFilters[type] ? 'active' : ''}`}
                                            onClick={() => {
                                                setRandomFilters(prev => ({ ...prev, [type]: !prev[type] }));
                                            }}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'playerSeekTime',
            tab: 'player',
            label: 'Seek Time',
            keywords: ['seek', 'skip', 'forward', 'rewind', 'time', 'seconds', 'player'],
            render: () => (
                <div className="setting-section" key="playerSeekTime">
                    <h3>Seek Time</h3>
                    <p className="setting-desc">Number of seconds to skip when seeking forward or backward.</p>
                    <select
                        className="legit-select"
                        value={playerSeekTime}
                        onChange={(e) => setPlayerSeekTime(parseInt(e.target.value, 10))}
                        disabled={config.enableGlobalOverwrites}
                        style={{
                            width: '100%',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: '#ffffff',
                            padding: '10px',
                            fontSize: '0.9rem',
                            marginTop: '8px',
                            opacity: config.enableGlobalOverwrites ? 0.6 : 1,
                            pointerEvents: config.enableGlobalOverwrites ? 'none' : 'auto'
                        }}
                    >
                        <option value="5" style={{ background: '#1c1c1c' }}>5 Seconds</option>
                        <option value="10" style={{ background: '#1c1c1c' }}>10 Seconds (Default)</option>
                        <option value="15" style={{ background: '#1c1c1c' }}>15 Seconds</option>
                        <option value="30" style={{ background: '#1c1c1c' }}>30 Seconds</option>
                        <option value="60" style={{ background: '#1c1c1c' }}>60 Seconds</option>
                    </select>
                </div>
            )
        },
        {
            id: 'playerAutoSkip',
            tab: 'player',
            label: 'Auto Skip Intros & Recaps',
            keywords: ['auto', 'skip', 'intro', 'recap', 'outro', 'player'],
            render: () => (
                <div className="setting-section" key="playerAutoSkip">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Auto Skip Intros & Recaps</h3>
                            <p className="setting-desc">Automatically skip intros and recaps when they are detected</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={playerAutoSkip}
                                onChange={(e) => setPlayerAutoSkip(e.target.checked)}
                                disabled={config.enableGlobalOverwrites}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'playerAutoPause',
            tab: 'player',
            label: 'Auto Pause',
            keywords: ['auto', 'pause', 'tab', 'switch', 'player'],
            render: () => (
                <div className="setting-section" key="playerAutoPause">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Auto Pause on Tab Switch</h3>
                            <p className="setting-desc">Pause video playback automatically when you switch to another browser tab</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={playerAutoPause}
                                onChange={(e) => setPlayerAutoPause(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'playerAutoResume',
            tab: 'player',
            label: 'Auto Resume',
            keywords: ['auto', 'resume', 'tab', 'switch', 'player'],
            render: () => (
                <div className="setting-section" key="playerAutoResume">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Auto Resume on Tab Switch</h3>
                            <p className="setting-desc">Resume video playback automatically when returning back to this tab</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={playerAutoResume}
                                onChange={(e) => setPlayerAutoResume(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'playerAutoPip',
            tab: 'player',
            label: 'Auto Picture-in-Picture',
            keywords: ['auto', 'pip', 'picture-in-picture', 'tab', 'switch', 'player'],
            render: () => (
                <div className="setting-section" key="playerAutoPip">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Auto Picture-in-Picture</h3>
                            <p className="setting-desc">Automatically enter Picture-in-Picture mode when switching browser tabs</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={playerAutoPip}
                                onChange={(e) => setPlayerAutoPip(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'playerLongPressSpeed',
            tab: 'player',
            label: 'Long Press for 2x Speed',
            keywords: ['long', 'press', 'speed', 'double', '2x', 'player'],
            render: () => (
                <div className="setting-section" key="playerLongPressSpeed">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Long Press for 2x Speed (β)</h3>
                            <h3 className="setting-title">Long Press for 2x Speed</h3>
                            <p className="setting-desc">Press and hold on the video player to play at 2x speed (ideal for touch/mobile)</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={playerLongPressSpeed}
                                onChange={(e) => setPlayerLongPressSpeed(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        // Poster Overlay Badges (tab: 'home')
        {
            id: 'posterTags',
            tab: 'home',
            label: 'Poster Badges',
            keywords: ['poster', 'badge', 'tag', 'quality', 'genre', 'language', 'rating'],
            render: () => (
                <div className="setting-section" key="posterTags" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                    <h3>Hover Card Overlay Badges</h3>
                    <p className="setting-desc">Select which overlay tags appear when hovering over library/home media item cards</p>
                    
                    <div className="setting-row" style={{ marginTop: '15px' }}>
                        <div>
                            <h4 className="setting-title" style={{ fontSize: '0.9rem' }}>Quality Tags</h4>
                            <p className="setting-desc">Display UHD, 4K, 1080p, HDR badges on hover overlay</p>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={showQualityTags} onChange={(e) => setShowQualityTags(e.target.checked)} />
                            <span className="slider"></span>
                        </label>
                    </div>
                    
                    <div className="setting-row" style={{ marginTop: '15px' }}>
                        <div>
                            <h4 className="setting-title" style={{ fontSize: '0.9rem' }}>Genre Tags</h4>
                            <p className="setting-desc">Show primary category icons (e.g. Comedy, Action) on hover overlay</p>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={showGenreTags} onChange={(e) => setShowGenreTags(e.target.checked)} />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="setting-row" style={{ marginTop: '15px' }}>
                        <div>
                            <h4 className="setting-title" style={{ fontSize: '0.9rem' }}>Audio Language Flags</h4>
                            <p className="setting-desc">Show country flag badges of main audio language on hover overlay</p>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={showLanguageTags} onChange={(e) => setShowLanguageTags(e.target.checked)} />
                            <span className="slider"></span>
                        </label>
                    </div>


                </div>
            )
        },
        // Subtitles Customizations (tab: 'subtitles')
        {
            id: 'subtitlesGeneral',
            tab: 'subtitles',
            label: 'Subtitle Preferences',
            keywords: ['subtitle', 'language', 'mode', 'burn'],
            render: () => (
                <div className="setting-section" key="subtitlesGeneral">
                    <h3>Subtitles</h3>
                    
                    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                        <label className="setting-title" style={{ fontSize: '0.9rem' }}>Preferred subtitle language</label>
                        <select className="legit-select" style={{ width: '100%' }} value={subtitleLanguagePreference} onChange={(e) => setSubtitleLanguagePreference(e.target.value)}>
                            <option value="eng" style={{ background: '#1c1c1c' }}>English</option>
                            <option value="spa" style={{ background: '#1c1c1c' }}>Spanish</option>
                            <option value="jpn" style={{ background: '#1c1c1c' }}>Japanese</option>
                            <option value="hun" style={{ background: '#1c1c1c' }}>Hungarian</option>
                            <option value="ger" style={{ background: '#1c1c1c' }}>German</option>
                            <option value="fre" style={{ background: '#1c1c1c' }}>French</option>
                        </select>
                    </div>

                    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginTop: '15px' }}>
                        <label className="setting-title" style={{ fontSize: '0.9rem' }}>Subtitle mode</label>
                        <select className="legit-select" style={{ width: '100%' }} value={subtitleMode} onChange={(e) => setSubtitleMode(e.target.value)}>
                            <option value="Default" style={{ background: '#1c1c1c' }}>Default</option>
                            <option value="Always" style={{ background: '#1c1c1c' }}>Always Play</option>
                            <option value="OnlyTranslation" style={{ background: '#1c1c1c' }}>Only Translations</option>
                            <option value="None" style={{ background: '#1c1c1c' }}>Off</option>
                        </select>
                        <p className="setting-desc">Determines when subtitle tracks are automatically loaded.</p>
                    </div>

                    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginTop: '15px' }}>
                        <label className="setting-title" style={{ fontSize: '0.9rem' }}>Burn subtitles</label>
                        <select className="legit-select" style={{ width: '100%' }} value={subtitleBurnIn} onChange={(e) => setSubtitleBurnIn(e.target.value)}>
                            <option value="Auto" style={{ background: '#1c1c1c' }}>Auto (Recommended)</option>
                            <option value="All" style={{ background: '#1c1c1c' }}>All (Forces Transcode)</option>
                            <option value="None" style={{ background: '#1c1c1c' }}>None (Direct Play Only)</option>
                        </select>
                        <p className="setting-desc">Burning image formats (PGS, VobSub) requires transcode. Auto balances performance and compatibility.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'subtitlesStyling',
            tab: 'subtitles',
            label: 'Subtitle Appearance',
            keywords: ['subtitle', 'style', 'color', 'size', 'font', 'weight', 'shadow', 'position'],
            render: () => {
                const previewStyles = {
                    fontSize: subtitleTextSize === 'Small' ? '0.75rem' : subtitleTextSize === 'Normal' ? '1rem' : subtitleTextSize === 'Medium' ? '1.25rem' : subtitleTextSize === 'Large' ? '1.5rem' : '1.75rem',
                    color: subtitleColor,
                    fontWeight: subtitleTextWeight === 'Normal' ? 'normal' : subtitleTextWeight === 'Bold' ? 'bold' : '300',
                    fontFamily: subtitleFontFamily === 'Default' ? 'inherit' : subtitleFontFamily === 'Serif' ? 'serif' : subtitleFontFamily === 'Sans-Serif' ? 'sans-serif' : 'monospace',
                    textShadow: subtitleShadow === 'None' ? 'none' : subtitleShadow === 'Drop Shadow' ? '0px 2px 4px rgba(0,0,0,0.9)' : subtitleShadow === 'Raised' ? '1px 1px 0px #000, 2px 2px 0px #000' : subtitleShadow === 'Depressed' ? '1px 1px 0px #fff, -1px -1px 0px #000' : '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                };

                return (
                    <div className="setting-section" key="subtitlesStyling" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                        <h3>Subtitle Appearance</h3>
                        <p className="setting-desc">These settings affect text subtitles rendered on this device</p>

                        <div className="setting-row" style={{ marginTop: '15px' }}>
                            <div style={{ flex: 1, marginRight: '10px' }}>
                                <label className="setting-title" style={{ fontSize: '0.85rem' }}>Text Size</label>
                                <select className="legit-select" style={{ width: '100%', marginTop: '5px' }} value={subtitleTextSize} onChange={(e) => setSubtitleTextSize(e.target.value)}>
                                    <option value="Small" style={{ background: '#1c1c1c' }}>Small</option>
                                    <option value="Normal" style={{ background: '#1c1c1c' }}>Normal</option>
                                    <option value="Medium" style={{ background: '#1c1c1c' }}>Medium</option>
                                    <option value="Large" style={{ background: '#1c1c1c' }}>Large</option>
                                    <option value="Extra Large" style={{ background: '#1c1c1c' }}>Extra Large</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="setting-title" style={{ fontSize: '0.85rem' }}>Text Weight</label>
                                <select className="legit-select" style={{ width: '100%', marginTop: '5px' }} value={subtitleTextWeight} onChange={(e) => setSubtitleTextWeight(e.target.value)}>
                                    <option value="Light" style={{ background: '#1c1c1c' }}>Light</option>
                                    <option value="Normal" style={{ background: '#1c1c1c' }}>Normal</option>
                                    <option value="Bold" style={{ background: '#1c1c1c' }}>Bold</option>
                                </select>
                            </div>
                        </div>

                        <div className="setting-row" style={{ marginTop: '15px' }}>
                            <div style={{ flex: 1, marginRight: '10px' }}>
                                <label className="setting-title" style={{ fontSize: '0.85rem' }}>Font</label>
                                <select className="legit-select" style={{ width: '100%', marginTop: '5px' }} value={subtitleFontFamily} onChange={(e) => setSubtitleFontFamily(e.target.value)}>
                                    <option value="Default" style={{ background: '#1c1c1c' }}>Default</option>
                                    <option value="Serif" style={{ background: '#1c1c1c' }}>Serif</option>
                                    <option value="Sans-Serif" style={{ background: '#1c1c1c' }}>Sans-Serif</option>
                                    <option value="Monospace" style={{ background: '#1c1c1c' }}>Monospace</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="setting-title" style={{ fontSize: '0.85rem' }}>Text Color</label>
                                <select className="legit-select" style={{ width: '100%', marginTop: '5px' }} value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)}>
                                    <option value="#ffffff" style={{ background: '#1c1c1c' }}>White</option>
                                    <option value="#ffff00" style={{ background: '#1c1c1c' }}>Yellow</option>
                                    <option value="#00ff00" style={{ background: '#1c1c1c' }}>Green</option>
                                    <option value="#00ffff" style={{ background: '#1c1c1c' }}>Cyan</option>
                                    <option value="#ff00ff" style={{ background: '#1c1c1c' }}>Magenta</option>
                                    <option value="#ff0000" style={{ background: '#1c1c1c' }}>Red</option>
                                    <option value="#000000" style={{ background: '#1c1c1c' }}>Black</option>
                                </select>
                            </div>
                        </div>

                        <div className="setting-row" style={{ marginTop: '15px' }}>
                            <div style={{ flex: 1, marginRight: '10px' }}>
                                <label className="setting-title" style={{ fontSize: '0.85rem' }}>Drop Shadow</label>
                                <select className="legit-select" style={{ width: '100%', marginTop: '5px' }} value={subtitleShadow} onChange={(e) => setSubtitleShadow(e.target.value)}>
                                    <option value="None" style={{ background: '#1c1c1c' }}>None</option>
                                    <option value="Drop Shadow" style={{ background: '#1c1c1c' }}>Drop Shadow</option>
                                    <option value="Raised" style={{ background: '#1c1c1c' }}>Raised</option>
                                    <option value="Depressed" style={{ background: '#1c1c1c' }}>Depressed</option>
                                    <option value="Outline" style={{ background: '#1c1c1c' }}>Outline</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="setting-title" style={{ fontSize: '0.85rem' }}>Vertical Position</label>
                                <select className="legit-select" style={{ width: '100%', marginTop: '5px' }} value={subtitleVerticalPosition} onChange={(e) => setSubtitleVerticalPosition(e.target.value)}>
                                    <option value="Bottom" style={{ background: '#1c1c1c' }}>Bottom</option>
                                    <option value="Top" style={{ background: '#1c1c1c' }}>Top</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            <label className="setting-title" style={{ fontSize: '0.85rem', color: '#aaa' }}>Live Subtitle Preview</label>
                            <div className="lf-subtitle-preview-box" style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '80px',
                                background: '#141414',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '6px',
                                marginTop: '8px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <span style={{
                                    ...previewStyles,
                                    position: 'absolute',
                                    bottom: subtitleVerticalPosition === 'Bottom' ? '12px' : 'auto',
                                    top: subtitleVerticalPosition === 'Top' ? '12px' : 'auto',
                                    transition: 'all 0.2s ease'
                                }}>
                                    The quick brown fox jumps over the lazy dog.
                                </span>
                            </div>
                        </div>
                    </div>
                );
            }
        },
        // Shortcuts Tab settings (tab: 'shortcuts')
        {
            id: 'shortcutsHelp',
            tab: 'shortcuts',
            label: 'Keyboard Shortcuts',
            keywords: ['shortcuts', 'keybinds', 'keys', 'hotkeys'],
            render: () => {
                const shortcuts = [
                    { keys: 'Shift + H', desc: 'Go to Home Screen' },
                    { keys: 'F4', desc: 'Open Search Panel' },
                    { keys: 'Ctrl + K', desc: 'Switch Between Plugin UI / Jellyfin UI' },
                    { keys: 'D', desc: 'Go to Dashboard', adminOnly: true },
                    { keys: 'Q', desc: 'Quick Connect' },
                    { keys: 'R', desc: 'Play Random Item' },
                    { keys: 'Space / Click', desc: 'Play / Pause Video' },
                    { keys: 'Space (Hold) / Click (Hold)', desc: 'Fast-Forward at 2.0x playback speed' },
                    { keys: 'Arrow Left / Right', desc: 'Seek Backward / Forward' },
                    { keys: 'A', desc: 'Cycle Video Aspect Ratio' },
                    { keys: 'I', desc: 'Toggle Playback Info Overlay' },
                    { keys: 'S', desc: 'Open Subtitle Search Menu' },
                    { keys: 'C', desc: 'Cycle Subtitle Tracks' },
                    { keys: 'V', desc: 'Cycle Audio Tracks' },
                    { keys: '+ / -', desc: 'Increase / Decrease Playback Speed' },
                    { keys: ',', desc: 'Step Back 1 Frame (when paused)' },
                    { keys: '.', desc: 'Step Forward 1 Frame (when paused)' }
                ];

                return (
                    <div className="setting-section" key="shortcutsHelp">
                        <h3>Keyboard Shortcuts</h3>
                        <p className="setting-desc">Use keyboard buttons to control navigation and media playback</p>

                        <div className="lf-shortcuts-list" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            marginTop: '15px'
                        }}>
                            {shortcuts.map((sh, idx) => {
                                if (sh.adminOnly && !isAdmin) {
                                    return null;
                                }

                                return (
                                    <div key={idx} className="lf-shortcut-row" style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <span style={{ fontSize: '0.85rem', color: '#ddd' }}>{sh.desc}</span>
                                        <kbd style={{
                                            background: '#333',
                                            border: '1px solid #555',
                                            borderRadius: '4px',
                                            color: '#fff',
                                            padding: '3px 8px',
                                            fontSize: '0.8rem',
                                            fontFamily: 'monospace',
                                            boxShadow: '0 2px 0 #111'
                                        }}>{sh.keys}</kbd>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
        }
    ];

    const filteredSettings = settingsList.filter(s => s.tab === activeTab);

    if (!isOpen) return null;

    return (
        <>
            <div className="legit-settings-overlay" onClick={onClose}>
                <div className="legit-settings-modal expanded" onClick={e => e.stopPropagation()}>
                    <div className="legit-settings-sidebar">
                        <div className="sidebar-header">
                            <h2>Settings</h2>
                        </div>
                        <div className="sidebar-tabs">
                            <button
                                className={`sidebar-tab ${activeTab === 'appearance' ? 'active' : ''}`}
                                onClick={() => setActiveTab('appearance')}
                            >
                                <span className="material-icons">palette</span> Appearance
                            </button>
                            <button
                                className={`sidebar-tab ${activeTab === 'home' ? 'active' : ''}`}
                                onClick={() => setActiveTab('home')}
                            >
                                <span className="material-icons">home</span> Home Screen
                            </button>
                            <button
                                className={`sidebar-tab ${activeTab === 'navigation' ? 'active' : ''}`}
                                onClick={() => setActiveTab('navigation')}
                            >
                                <span className="material-icons">menu</span> Navigation
                            </button>
                            <button
                                className={`sidebar-tab ${activeTab === 'player' ? 'active' : ''}`}
                                onClick={() => setActiveTab('player')}
                            >
                                <span className="material-icons">play_circle</span> Player
                            </button>
                            <button
                                className={`sidebar-tab ${activeTab === 'subtitles' ? 'active' : ''}`}
                                onClick={() => setActiveTab('subtitles')}
                            >
                                <span className="material-icons">subtitles</span> Subtitles
                            </button>
                            <button
                                className={`sidebar-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
                                onClick={() => setActiveTab('shortcuts')}
                            >
                                <span className="material-icons">keyboard</span> Shortcuts
                            </button>
                        </div>
                    </div>

                    <div className="legit-settings-content">
                        <div className="content-header">
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#eee', textTransform: 'capitalize' }}>
                                {activeTab === 'appearance' ? 'Appearance' :
                                    activeTab === 'home' ? 'Home Screen' :
                                        activeTab === 'navigation' ? 'Navigation' :
                                            activeTab === 'player' ? 'Player' :
                                                activeTab === 'shortcuts' ? 'Keyboard Shortcuts' : 'Subtitles'}
                            </h2>
                            <button className="close-btn-icon" onClick={onClose}>&times;</button>
                        </div>

                        <div className="content-body">
                            {config.enableGlobalOverwrites && (
                                <div className="server-override-banner">
                                    <span className="material-icons">lock</span>
                                    <span>Some preferences are locked to server-defined settings.</span>
                                </div>
                            )}
                            {filteredSettings.map(s => s.render())}
                        </div>

                        <div className="content-footer">
                            <button className="lf-btn lf-btn--glass lf-btn--sm" onClick={handleReset}>Reset</button>
                            <button className="lf-btn lf-btn--primary lf-btn--ring-hover lf-btn--sm" onClick={handleSave}>Save Preferences</button>
                        </div>
                    </div>
                </div>
            </div>
            <BannerPickerModal
                isOpen={showBannerPicker}
                onClose={() => setShowBannerPicker(false)}
                onSave={(url) => {
                    if (pickerMode === 'app') {
                        updateConfig({ appBackground: url });
                    } else if (pickerMode === 'jellyseerr') {
                        setJellyseerrBackground(url);
                    }
                    setShowBannerPicker(false);
                }}
                userId={userId}
            />
            <AvatarPickerModal
                isOpen={showAvatarPicker}
                onClose={() => setShowAvatarPicker(false)}
                onSave={handleAvatarFile}
                userId={userId}
            />
        </>
    );
};

export default LegitFlixSettingsModal;
