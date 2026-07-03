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


    useEffect(() => {
        if (isOpen) {
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
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Show Categories in Navbar</h3>
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
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Show Requests in Navbar</h3>

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
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Show Random Button</h3>
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

                    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                        <div>
                            <h3 className="setting-title">Randomize From</h3>
                            <p className="setting-desc">Select which libraries should be used for the random button. (None selected = All)</p>
                        </div>
                        <div className="library-chips-container">
                            {availableLibraries.map(lib => {
                                const isSelected = randomLibraries.includes(lib.Id);
                                return (
                                    <button
                                        key={lib.Id}
                                        className={`library-chip ${isSelected ? 'selected' : ''}`}
                                        onClick={() => {
                                            if (isSelected) {
                                                setRandomLibraries(prev => prev.filter(id => id !== lib.Id));
                                            } else {
                                                setRandomLibraries(prev => [...prev, lib.Id]);
                                            }
                                        }}
                                    >
                                        <span className="material-icons">{lib.Type === 'movies' ? 'movie' : (lib.Type === 'tvshows' ? 'tv' : 'folder')}</span>
                                        {lib.Name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', marginTop: '10px' }}>
                        <div>
                            <h3 className="setting-title">Content Types</h3>
                            <p className="setting-desc">Filter by content type</p>
                        </div>
                        <div className="content-type-grid">
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
            id: 'playerAutoNextEp',
            tab: 'player',
            label: 'Auto Start Next Episode',
            keywords: ['auto', 'play', 'next', 'episode', 'outro', 'countdown', 'player'],
            render: () => (
                <div className="setting-section" key="playerAutoNextEp">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Auto Start Next Episode</h3>
                            <p className="setting-desc">Automatically start the next episode with a countdown timer during outro</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={playerAutoNextEp}
                                onChange={(e) => setPlayerAutoNextEp(e.target.checked)}
                                disabled={config.enableGlobalOverwrites}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
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
                        </div>
                    </div>

                    <div className="legit-settings-content">
                        <div className="content-header">
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#eee', textTransform: 'capitalize' }}>
                                {activeTab === 'appearance' ? 'Appearance' :
                                    activeTab === 'home' ? 'Home Screen' :
                                        activeTab === 'navigation' ? 'Navigation' : 'Player'}
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
