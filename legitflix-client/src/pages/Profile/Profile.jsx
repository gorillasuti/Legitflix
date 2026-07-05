import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import Navbar from '../../components/Navbar';
import BannerPickerModal from '../../components/BannerPickerModal';
import AvatarPickerModal from '../../components/AvatarPickerModal';
import LegitFlixSettingsModal from '../../components/LegitFlixSettingsModal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useTheme } from '../../context/ThemeContext';
import './Profile.css';

const TABS = [
    { id: 'details', label: 'My details' },
    { id: 'display', label: 'Display' },
    { id: 'home', label: 'Home Screen' },
    { id: 'playback', label: 'Playback' },
    { id: 'subtitles', label: 'Subtitles' },
    { id: 'quickconnect', label: 'Quick Connect' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'advanced', label: 'Advanced' },
];

const Profile = () => {
    const navigate = useNavigate();
    const { config, updateConfig } = useTheme();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [bannerUrl, setBannerUrl] = useState('');
    const [showBannerPicker, setShowBannerPicker] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showLegitSettings, setShowLegitSettings] = useState(false);

    // Password state
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwMsg, setPwMsg] = useState(null);
    const [pwLoading, setPwLoading] = useState(false);

    // Display preferences state
    const [themeEnabled, setThemeEnabled] = useState(true);
    const [themeMsg, setThemeMsg] = useState(null);

    // Screensaver preferences state
    const [screensaverType, setScreensaverType] = useState('none');
    const [screensaverTime, setScreensaverTime] = useState(180);
    const [screensaverInterval, setScreensaverInterval] = useState(10);
    const [displayMsg, setDisplayMsg] = useState(null);
    const [displayLoading, setDisplayLoading] = useState(false);

    // Home screen sections state
    const [homeSections, setHomeSections] = useState([
        { id: 'resume', label: 'Continue Watching', enabled: true },
        { id: 'latestMedia', label: 'Library Categories & Latest Rows', enabled: true },
        { id: 'history', label: 'Watch History', enabled: true },
        { id: 'promo', label: 'Featured Promos', enabled: true },
    ]);
    const [groupCollections, setGroupCollections] = useState(true);
    const [displayMissing, setDisplayMissing] = useState(false);
    const [displayUnaired, setDisplayUnaired] = useState(false);

    // Random button state filters
    const [randomFilters, setRandomFilters] = useState(config.randomContentFilters || { Movie: true, Series: true, Episode: true });
    const [randomLibraries, setRandomLibraries] = useState(config.randomLibraries || []);
    const [availableLibraries, setAvailableLibraries] = useState([]);
    const [hidePlayedInLatest, setHidePlayedInLatest] = useState(false);
    const [homeMsg, setHomeMsg] = useState(null);
    const [homeLoading, setHomeLoading] = useState(false);

    // Playback settings state
    const [audioLang, setAudioLang] = useState('');
    const [playDefaultAudio, setPlayDefaultAudio] = useState(true);
    const [rememberAudio, setRememberAudio] = useState(true);
    const [enableNextEpisodeAutoPlay, setEnableNextEpisodeAutoPlay] = useState(true);
    const [maxBitrate, setMaxBitrate] = useState('');
    const [preferFmp4, setPreferFmp4] = useState(false);
    const [cinemaMode, setCinemaMode] = useState(true);
    const [playbackMsg, setPlaybackMsg] = useState(null);
    const [playbackLoading, setPlaybackLoading] = useState(false);

    // Subtitle settings state
    const [subLang, setSubLang] = useState('');
    const [subMode, setSubMode] = useState('Default');
    const [rememberSubtitles, setRememberSubtitles] = useState(true);
    const [burnInSubtitles, setBurnInSubtitles] = useState(false);
    const [subtitlesMsg, setSubtitlesMsg] = useState(null);
    const [subtitlesLoading, setSubtitlesLoading] = useState(false);

    // Quick Connect state
    const [qcCode, setQcCode] = useState('');
    const [qcMsg, setQcMsg] = useState(null);

    // Advanced tab state
    const [installedPlugins, setInstalledPlugins] = useState([]);

    useEffect(() => {
        document.title = "LegitFlix - Profile Settings";
    }, []);

    useEffect(() => {
        const loadUserAndPrefs = async () => {
            const u = await jellyfinService.getCurrentUser();
            if (u) {
                setUser(u);

                // Load user configuration into state
                const cfg = u.Configuration || {};
                setAudioLang(cfg.AudioLanguagePreference || '');
                setPlayDefaultAudio(cfg.PlayDefaultAudioTrack !== false);
                setRememberAudio(cfg.RememberAudioSelections !== false);
                setEnableNextEpisodeAutoPlay(cfg.EnableNextEpisodeAutoPlay !== false);

                // Native home screen settings
                setGroupCollections(cfg.GroupMoviesIntoBoxSets !== false);
                setDisplayMissing(cfg.DisplayMissingEpisodes === true);
                setDisplayUnaired(cfg.DisplayUnairedEpisodes === true);
                setHidePlayedInLatest(cfg.HidePlayedInLatest === true);

                try {
                    const views = await jellyfinService.getUserViews(u.Id);
                    if (views && views.Items) {
                        setAvailableLibraries(views.Items.map(item => ({
                            Id: item.Id,
                            Name: item.Name,
                            Type: item.CollectionType
                        })));
                    }
                } catch (e) {
                    console.error("Failed to load libraries for Profile settings", e);
                }

                setSubLang(cfg.SubtitleLanguagePreference || '');
                setSubMode(cfg.SubtitleMode || 'Default');
                setRememberSubtitles(cfg.RememberSubtitleSelections !== false);

                // Load display preferences
                const prefsId = "usersettings";
                let customBannerUrl = null;
                try {
                    const prefs = await jellyfinService.getDisplayPreferences(prefsId);
                    if (prefs) {
                        const custom = prefs.CustomPrefs || {};

                        setThemeEnabled(custom["LegitFlix_ThemeEnabled"] !== "false");

                        setScreensaverType(custom["LegitFlix_ScreensaverType"] || config.screensaverType || 'none');
                        setScreensaverTime(custom["LegitFlix_ScreensaverTime"] ? parseInt(custom["LegitFlix_ScreensaverTime"], 10) : config.screensaverTime || 180);
                        setScreensaverInterval(custom["LegitFlix_ScreensaverInterval"] ? parseInt(custom["LegitFlix_ScreensaverInterval"], 10) : config.screensaverInterval || 10);

                        setHomeSections([
                            { id: 'resume', label: 'Continue Watching', enabled: custom["LegitFlix_HomeSection_resume"] !== 'false' },
                            { id: 'latestMedia', label: 'Library Categories & Latest Rows', enabled: custom["LegitFlix_HomeSection_latestMedia"] !== 'false' },
                            { id: 'history', label: 'Up Next', enabled: custom["LegitFlix_HomeSection_history"] !== 'false' },
                            { id: 'promo', label: 'Featured Promos', enabled: custom["LegitFlix_HomeSection_promo"] !== 'false' },
                        ]);

                        // Native keys with fallback to old LegitFlix_ keys for migration
                        setMaxBitrate(custom["maxStreamingBitrate"] || custom["LegitFlix_MaxBitrate"] || '');
                        setPreferFmp4((custom["preferFmp4"] || custom["LegitFlix_PreferFmp4"]) === 'true');
                        setCinemaMode((custom["enableCinemaMode"] ?? custom["LegitFlix_CinemaMode"]) !== 'false');

                        setBurnInSubtitles((custom["subtitleburnin"] || custom["LegitFlix_BurnInSubtitles"]) === 'true');

                        if (custom["LegitFlix_Backdrop_ItemId"]) {
                            const itemId = custom["LegitFlix_Backdrop_ItemId"];
                            const tag = custom["LegitFlix_Backdrop_ImageTag"];
                            const token = jellyfinService.api?.accessToken;
                            customBannerUrl = `${jellyfinService.api.basePath}/Items/${itemId}/Images/Backdrop/0?tag=${tag}&quality=90&maxWidth=1920&api_key=${token}`;
                        }
                    }
                } catch (e) {
                    console.warn("Failed to fetch profile display preferences", e);
                }

                if (customBannerUrl) {
                    setBannerUrl(customBannerUrl);
                } else if (u.ImageTags && u.ImageTags.Banner) {
                    setBannerUrl(`${jellyfinService.api.basePath}/Users/${u.Id}/Images/Banner?tag=${u.ImageTags.Banner}&quality=90`);
                } else if (u.BackdropImageTags && u.BackdropImageTags.length > 0) {
                    setBannerUrl(`${jellyfinService.api.basePath}/Users/${u.Id}/Images/Backdrop/0?tag=${u.BackdropImageTags[0]}&quality=90`);
                }

                // Load installed plugins for admin users
                if (u.Policy?.IsAdministrator) {
                    try {
                        const plugins = await jellyfinService.getInstalledPlugins();
                        setInstalledPlugins(plugins);
                    } catch (e) {
                        console.warn("Failed to fetch installed plugins", e);
                    }
                }
            }
        };
        loadUserAndPrefs();
    }, []);

    // Listen for global user updates (e.g. from Navbar/ProfileModal)
    useEffect(() => {
        const handleUserUpdate = (e) => {
            const updatedUser = e.detail;
            if (updatedUser) {
                setUser(prev => ({ ...prev, ...updatedUser }));

                const loadUser = async () => {
                    const u = await jellyfinService.getCurrentUser();
                    if (!u) return;

                    const prefsId = "usersettings";
                    let customBannerUrl = null;
                    try {
                        const prefs = await jellyfinService.getDisplayPreferences(prefsId);
                        if (prefs?.CustomPrefs?.["LegitFlix_Backdrop_ItemId"]) {
                            const itemId = prefs.CustomPrefs["LegitFlix_Backdrop_ItemId"];
                            const tag = prefs.CustomPrefs["LegitFlix_Backdrop_ImageTag"];
                            const token = jellyfinService.api?.accessToken;
                            customBannerUrl = `${jellyfinService.api.basePath}/Items/${itemId}/Images/Backdrop/0?tag=${tag}&quality=90&maxWidth=1920&api_key=${token}`;
                        }
                    } catch (e) { }

                    if (customBannerUrl) {
                        setBannerUrl(customBannerUrl);
                    } else if (u.ImageTags && u.ImageTags.Banner) {
                        setBannerUrl(`${jellyfinService.api.basePath}/Users/${u.Id}/Images/Banner?tag=${u.ImageTags.Banner}&quality=90`);
                    } else if (u.BackdropImageTags && u.BackdropImageTags.length > 0) {
                        setBannerUrl(`${jellyfinService.api.basePath}/Users/${u.Id}/Images/Backdrop/0?tag=${u.BackdropImageTags[0]}&quality=90`);
                    }
                };
                loadUser();
            } else {
                jellyfinService.getCurrentUser().then(u => {
                    if (u) {
                        setUser(u);
                        if (u.ImageTags && u.ImageTags.Banner) {
                            setBannerUrl(`${jellyfinService.api.basePath}/Users/${u.Id}/Images/Banner?tag=${u.ImageTags.Banner}&quality=90`);
                        } else if (u.BackdropImageTags && u.BackdropImageTags.length > 0) {
                            setBannerUrl(`${jellyfinService.api.basePath}/Users/${u.Id}/Images/Backdrop/0?tag=${u.BackdropImageTags[0]}&quality=90`);
                        }
                    }
                });
            }
        };
        window.addEventListener('userUpdated', handleUserUpdate);
        return () => window.removeEventListener('userUpdated', handleUserUpdate);
    }, []);

    // --- Handlers ---

    const handleBannerSave = async (url) => {
        if (!url) return;
        setBannerUrl(url);
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: { ...user } }));
    };

    const handleAvatarSave = async (url) => {
        if (!url || !user) return;
        try {
            setShowAvatarPicker(false);
            window.location.reload();
        } catch (e) {
            console.error("Failed to save avatar preference", e);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPwMsg(null);
        if (newPw !== confirmPw) {
            setPwMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (!newPw) {
            setPwMsg({ type: 'error', text: 'New password cannot be empty.' });
            return;
        }
        setPwLoading(true);
        try {
            await jellyfinService.updatePassword(user.Id, currentPw, newPw);
            setPwMsg({ type: 'success', text: 'Password updated successfully!' });
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
        } catch (err) {
            setPwMsg({ type: 'error', text: err.message || 'Failed to update password.' });
        } finally {
            setPwLoading(false);
        }
    };

    const handleQuickConnect = async () => {
        setQcMsg(null);
        if (!qcCode.trim()) {
            setQcMsg({ type: 'error', text: 'Please enter a code.' });
            return;
        }
        try {
            await jellyfinService.quickConnect(qcCode.trim());
            setQcMsg({ type: 'success', text: 'Device authorized successfully!' });
            setQcCode('');
        } catch (err) {
            setQcMsg({ type: 'error', text: err.message || 'Authorization failed.' });
        }
    };

    const toggleHomeSection = (id) => {
        setHomeSections(prev =>
            prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
        );
    };

    const handleThemeToggle = async (e) => {
        const newVal = e.target.checked;
        setThemeEnabled(newVal);
        setThemeMsg(null);
        try {
            const prefsId = "usersettings";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (!prefs) prefs = { Id: prefsId, CustomPrefs: {} };
            if (!prefs.CustomPrefs) prefs.CustomPrefs = {};
            prefs.CustomPrefs["LegitFlix_ThemeEnabled"] = newVal ? "true" : "false";
            await jellyfinService.updateDisplayPreferences(prefsId, prefs);
            setThemeMsg({ type: 'success', text: 'Theme preference updated!' });
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: { ...user } }));
            setTimeout(() => setThemeMsg(null), 3000);
        } catch (err) {
            console.error("Failed to save theme preference", err);
            setThemeMsg({ type: 'error', text: 'Failed to update theme preference.' });
        }
    };

    const handleSaveDisplay = async (e) => {
        e.preventDefault();
        setDisplayMsg(null);
        setDisplayLoading(true);
        try {
            const prefsId = "usersettings";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (!prefs) prefs = { Id: prefsId, CustomPrefs: {} };
            if (!prefs.CustomPrefs) prefs.CustomPrefs = {};

            prefs.CustomPrefs["LegitFlix_ScreensaverType"] = screensaverType;
            prefs.CustomPrefs["LegitFlix_ScreensaverTime"] = String(screensaverTime);
            prefs.CustomPrefs["LegitFlix_ScreensaverInterval"] = String(screensaverInterval);

            await jellyfinService.updateDisplayPreferences(prefsId, prefs);

            // Also update local client theme config context
            updateConfig({
                screensaverType,
                screensaverTime,
                screensaverInterval
            });

            setDisplayMsg({ type: 'success', text: 'Display settings updated successfully!' });
            setTimeout(() => setDisplayMsg(null), 3000);
        } catch (err) {
            console.error("Failed to save display settings", err);
            setDisplayMsg({ type: 'error', text: 'Failed to save display settings.' });
        } finally {
            setDisplayLoading(false);
        }
    };

    const handleSaveHomeScreen = async (e) => {
        e.preventDefault();
        setHomeMsg(null);
        setHomeLoading(true);
        try {
            // 1. Update native Jellyfin configuration
            const updatedConfig = {
                ...user.Configuration,
                GroupMoviesIntoBoxSets: groupCollections,
                DisplayMissingEpisodes: displayMissing,
                DisplayUnairedEpisodes: displayUnaired,
                HidePlayedInLatest: hidePlayedInLatest
            };
            await jellyfinService.updateUserConfiguration(user.Id, updatedConfig);
            setUser(prev => ({ ...prev, Configuration: updatedConfig }));

            // 2. Update custom theme layout options
            const prefsId = "usersettings";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (!prefs) prefs = { Id: prefsId, CustomPrefs: {} };
            if (!prefs.CustomPrefs) prefs.CustomPrefs = {};

            homeSections.forEach(section => {
                prefs.CustomPrefs[`LegitFlix_HomeSection_${section.id}`] = section.enabled ? "true" : "false";
            });

            await jellyfinService.updateDisplayPreferences(prefsId, prefs);

            // Update theme settings for the randomizer button
            updateConfig({
                randomLibraries,
                randomContentFilters: randomFilters
            });

            setHomeMsg({ type: 'success', text: 'Home screen preferences updated successfully!' });
            window.dispatchEvent(new CustomEvent('homeSectionsUpdated'));
        } catch (err) {
            console.error(err);
            setHomeMsg({ type: 'error', text: 'Failed to save home screen preferences.' });
        } finally {
            setHomeLoading(false);
        }
    };

    const handleSavePlayback = async (e) => {
        e.preventDefault();
        setPlaybackMsg(null);
        setPlaybackLoading(true);
        try {
            const updatedConfig = {
                ...user.Configuration,
                AudioLanguagePreference: audioLang,
                PlayDefaultAudioTrack: playDefaultAudio,
                RememberAudioSelections: rememberAudio,
                EnableNextEpisodeAutoPlay: enableNextEpisodeAutoPlay
            };
            await jellyfinService.updateUserConfiguration(user.Id, updatedConfig);

            const prefsId = "usersettings";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (!prefs) prefs = { Id: prefsId, CustomPrefs: {} };
            if (!prefs.CustomPrefs) prefs.CustomPrefs = {};

            // Native Jellyfin key names for cross-compatibility
            prefs.CustomPrefs["maxStreamingBitrate"] = maxBitrate;
            prefs.CustomPrefs["preferFmp4"] = preferFmp4 ? "true" : "false";
            prefs.CustomPrefs["enableCinemaMode"] = cinemaMode ? "true" : "false";

            await jellyfinService.updateDisplayPreferences(prefsId, prefs);

            setUser(prev => ({ ...prev, Configuration: updatedConfig }));
            setPlaybackMsg({ type: 'success', text: 'Playback settings updated successfully!' });
        } catch (err) {
            console.error(err);
            setPlaybackMsg({ type: 'error', text: 'Failed to save playback settings.' });
        } finally {
            setPlaybackLoading(false);
        }
    };

    const handleSaveSubtitles = async (e) => {
        e.preventDefault();
        setSubtitlesMsg(null);
        setSubtitlesLoading(true);
        try {
            const updatedConfig = {
                ...user.Configuration,
                SubtitleLanguagePreference: subLang,
                SubtitleMode: subMode,
                RememberSubtitleSelections: rememberSubtitles
            };
            await jellyfinService.updateUserConfiguration(user.Id, updatedConfig);

            const prefsId = "usersettings";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (!prefs) prefs = { Id: prefsId, CustomPrefs: {} };
            if (!prefs.CustomPrefs) prefs.CustomPrefs = {};

            // Native Jellyfin key name for cross-compatibility
            prefs.CustomPrefs["subtitleburnin"] = burnInSubtitles ? "true" : "false";

            await jellyfinService.updateDisplayPreferences(prefsId, prefs);

            setUser(prev => ({ ...prev, Configuration: updatedConfig }));
            setSubtitlesMsg({ type: 'success', text: 'Subtitle preferences updated successfully!' });
        } catch (err) {
            console.error(err);
            setSubtitlesMsg({ type: 'error', text: 'Failed to save subtitle preferences.' });
        } finally {
            setSubtitlesLoading(false);
        }
    };

    const handleLogout = async () => {
        await jellyfinService.logout();
    };

    if (!user) {
        return (
            <div className="profile-page">
                <Navbar />
                <div className="settings-container">
                    <SkeletonLoader type="text" width="200px" height="32px" style={{ marginBottom: '20px' }} />
                    <div className="settings-tabs-wrapper">
                        <div className="settings-tabs">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <SkeletonLoader key={i} width="100px" height="40px" style={{ display: 'inline-block', marginRight: '8px', borderRadius: '20px' }} />
                            ))}
                        </div>
                    </div>
                    <SkeletonLoader width="100%" height="250px" style={{ margin: '20px 0', borderRadius: '12px' }} />
                    <div style={{ display: 'flex', gap: '20px', marginTop: '-55px', paddingLeft: '30px', position: 'relative', marginBottom: '28px' }}>
                        <SkeletonLoader type="circle" width="110px" height="110px" style={{ border: '4px solid #0e0e0e' }} />
                    </div>

                    <div className="settings-card" style={{ padding: '28px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px' }}>
                        <SkeletonLoader width="180px" height="24px" style={{ marginBottom: '24px' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '18px' }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i}>
                                    <SkeletonLoader width="80px" height="14px" style={{ marginBottom: '8px' }} />
                                    <SkeletonLoader width="140px" height="20px" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const avatarUrl = config.userAvatar || jellyfinService.getUserImageUrl(user.Id, { tag: user.PrimaryImageTag || (user.ImageTags && user.ImageTags.Primary) });

    // --- TAB RENDERERS ---

    const renderMyDetails = () => (
        <>
            <div className="settings-card">
                <h3 className="settings-card-title">User Information</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <label>Username</label>
                        <div className="info-value">{user.Name}</div>
                    </div>
                    <div className="info-item">
                        <label>Last Login</label>
                        <div className="info-value">
                            {user.LastLoginDate ? new Date(user.LastLoginDate).toLocaleDateString() : '-'}
                        </div>
                    </div>
                    <div className="info-item">
                        <label>Administrator</label>
                        <div className="info-value">{user.Policy?.IsAdministrator ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="info-item">
                        <label>User ID</label>
                        <div className="info-value info-value-small">{user.Id}</div>
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <h3 className="settings-card-title">Change Password</h3>
                <form className="password-form" onSubmit={handlePasswordSubmit}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input
                            type="password"
                            value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)}
                            className="settings-input"
                            autoComplete="current-password"
                        />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            className="settings-input"
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)}
                            className="settings-input"
                            autoComplete="new-password"
                        />
                    </div>
                    {pwMsg && (
                        <div className={`form-message ${pwMsg.type}`}>
                            <span className="material-icons">
                                {pwMsg.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                            {pwMsg.text}
                        </div>
                    )}
                    <button type="submit" className="lf-btn lf-btn--primary lf-btn--ring-hover lf-btn--sm" disabled={pwLoading}>
                        {pwLoading ? 'Saving...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </>
    );

    const renderDisplay = () => (
        <>
            <div className="settings-card">
                <h3 className="settings-card-title">General Display Settings</h3>
                <div className="setting-rows-list">
                    <div className="setting-row" style={{ alignItems: 'center' }}>
                        <div className="setting-row-label">
                            <span>Jellyfin Classic View</span>
                            <span className="setting-hint">Switch this device to the stock Jellyfin user interface.</span>
                        </div>
                        <button
                            className="lf-btn lf-btn--glass lf-btn--sm"
                            style={{ margin: 0 }}
                            onClick={() => {
                                const attemptOpen = () => {
                                    if (window.LegitFlix_OpenSwitchModal) {
                                        window.LegitFlix_OpenSwitchModal();
                                    } else {
                                        console.warn("Modal not loaded yet, retrying...");
                                        setTimeout(attemptOpen, 200);
                                    }
                                };
                                attemptOpen();
                            }}
                        >
                            Disable Plugin Look
                        </button>
                    </div>

                    <div className="setting-row" style={{ marginTop: '16px' }}>
                        <div className="setting-row-label">
                            <span>Enable Profile Theme</span>
                            <span className="setting-hint">Use the custom settings profile theme for background and avatar</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={themeEnabled}
                                onChange={handleThemeToggle}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
                {themeMsg && (
                    <div className={`form-message ${themeMsg.type}`} style={{ marginTop: '16px' }}>
                        <span className="material-icons">
                            {themeMsg.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        {themeMsg.text}
                    </div>
                )}
            </div>

            <div className="settings-card">
                <h3 className="settings-card-title">Screensaver Settings</h3>
                <p className="settings-description">Configure the idle screensaver behaviour for this device.</p>
                <form onSubmit={handleSaveDisplay}>
                    <div className="setting-rows-list">
                        <div className="setting-row-column" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="setting-row-label">
                                <span>Screensaver Style</span>
                                <span className="setting-hint">Choose the screensaver style to display when the system is inactive.</span>
                            </div>
                            <select
                                className="settings-select"
                                value={screensaverType}
                                onChange={(e) => setScreensaverType(e.target.value)}
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    padding: '10px',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            >
                                <option value="none" style={{ background: '#1c1c1c' }}>None</option>
                                <option value="dim" style={{ background: '#1c1c1c' }}>Dim</option>
                                <option value="backdrop" style={{ background: '#1c1c1c' }}>Backdrop</option>
                                <option value="logo" style={{ background: '#1c1c1c' }}>Logo</option>
                            </select>
                        </div>

                        <div className="setting-row-column" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                            <div className="setting-row-label">
                                <span>Screensaver Time (seconds)</span>
                                <span className="setting-hint">The amount of time in seconds of inactivity required to start the screensaver.</span>
                            </div>
                            <input
                                type="number"
                                min="10"
                                max="3600"
                                className="settings-input"
                                value={screensaverTime}
                                onChange={(e) => setScreensaverTime(Math.max(10, parseInt(e.target.value, 10) || 180))}
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    padding: '10px',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>

                        {(screensaverType === 'backdrop' || screensaverType === 'logo') && (
                            <div className="setting-row-column" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                                <div className="setting-row-label">
                                    <span>Backdrop/Logo Screensaver Interval (seconds)</span>
                                    <span className="setting-hint">The amount of time in seconds to display each backdrop image or logo.</span>
                                </div>
                                <input
                                    type="number"
                                    min="2"
                                    max="300"
                                    className="settings-input"
                                    value={screensaverInterval}
                                    onChange={(e) => setScreensaverInterval(Math.max(2, parseInt(e.target.value, 10) || 10))}
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        color: '#ffffff',
                                        padding: '10px',
                                        fontSize: '0.9rem'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {displayMsg && (
                        <div className={`form-message ${displayMsg.type}`} style={{ marginTop: '16px' }}>
                            <span className="material-icons">
                                {displayMsg.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                            {displayMsg.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="lf-btn lf-btn--primary lf-btn--ring-hover lf-btn--sm"
                        disabled={displayLoading}
                        style={{ marginTop: '24px' }}
                    >
                        {displayLoading ? 'Saving...' : 'Save Display Settings'}
                    </button>
                </form>
            </div>
        </>
    );

    const renderHomeScreen = () => (
        <>
            <div className="settings-card">
                <h3 className="settings-card-title">Home Screen Sections</h3>
                <p className="settings-description">Choose which sections to display on your home screen.</p>
                <div className="setting-rows-list">
                    {homeSections.map(section => (
                        <div className="setting-row" key={section.id}>
                            <div className="setting-row-label">
                                <span>{section.label}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={section.enabled}
                                    onChange={() => toggleHomeSection(section.id)}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="settings-card">
                <h3 className="settings-card-title">Jellyfin Library Options</h3>
                <p className="settings-description">Configure native Jellyfin content preferences for your account.</p>

                <div className="setting-rows-list">
                    <div className="setting-row">
                        <div className="setting-row-label">
                            <span>Group movies into collections</span>
                            <span className="setting-hint">Display collections of movies as a single item on rows</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={groupCollections}
                                onChange={e => setGroupCollections(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="setting-row">
                        <div className="setting-row-label">
                            <span>Display missing episodes within seasons</span>
                            <span className="setting-hint">Shows placeholders for missing episodes in series</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={displayMissing}
                                onChange={e => setDisplayMissing(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="setting-row">
                        <div className="setting-row-label">
                            <span>Display unaired episodes</span>
                            <span className="setting-hint">Show metadata for upcoming episodes that haven't aired yet</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={displayUnaired}
                                onChange={e => setDisplayUnaired(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="setting-row">
                        <div className="setting-row-label">
                            <span>Hide watched media from Latest</span>
                            <span className="setting-hint">Filter out played media from the recently added categories</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={hidePlayedInLatest}
                                onChange={e => setHidePlayedInLatest(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <h3 className="settings-card-title">Poster & Navigation Overlays</h3>
                <p className="settings-description">Select which badges appear on media card posters and navbar menus.</p>

                <div className="setting-rows-list">
                    <div className="setting-row">
                        <div className="setting-row-label">
                            <span>Quality Tags</span>
                            <span className="setting-hint">Show UHD, 4K, 1080p, and HDR badges on hover overlay</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={!!config.showQualityTags}
                                onChange={e => updateConfig({ showQualityTags: e.target.checked })}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="setting-row">
                        <div className="setting-row-label">
                            <span>Genre Tags</span>
                            <span className="setting-hint">Show primary category icons (e.g. Comedy, Action) on hover overlay</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={!!config.showGenreTags}
                                onChange={e => updateConfig({ showGenreTags: e.target.checked })}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="setting-row">
                        <div className="setting-row-label">
                            <span>Audio Language Flags</span>
                            <span className="setting-hint">Show country flag badges of main audio language on hover overlay</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={!!config.showLanguageTags}
                                onChange={e => updateConfig({ showLanguageTags: e.target.checked })}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="setting-row" title={config.enableGlobalOverwrites ? "Managed globally via plugin settings" : ""}>
                        <div className="setting-row-label">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                Show Navbar Categories
                                {config.enableGlobalOverwrites && (
                                    <span className="material-icons" style={{ fontSize: '14px', color: '#ff7e00', cursor: 'help' }}>lock</span>
                                )}
                            </span>
                            <span className="setting-hint">Display Movies, TV Shows, etc. tabs in navigation bar</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={!!config.showNavbarCategories}
                                disabled={config.enableGlobalOverwrites}
                                onChange={e => updateConfig({ showNavbarCategories: e.target.checked })}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="setting-row" title={config.enableGlobalOverwrites ? "Managed globally via plugin settings" : ""}>
                        <div className="setting-row-label">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                Show Random Play Button
                                {config.enableGlobalOverwrites && (
                                    <span className="material-icons" style={{ fontSize: '14px', color: '#ff7e00', cursor: 'help' }}>lock</span>
                                )}
                            </span>
                            <span className="setting-hint">Display the random play picker button in navigation bar</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={!!config.showNavbarRandom}
                                disabled={config.enableGlobalOverwrites}
                                onChange={e => updateConfig({ showNavbarRandom: e.target.checked })}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    {!!config.showNavbarRandom && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingLeft: '12px', borderLeft: '2px solid rgba(255,255,255,0.05)', marginBottom: '15px', marginTop: '-5px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div className="setting-row-label">
                                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Randomize From</span>
                                    <span className="setting-hint">Select which libraries should be used for the random button. (None selected = All)</span>
                                </div>
                                <div className="content-type-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                    {availableLibraries.map(lib => {
                                        const isSelected = randomLibraries.includes(lib.Id);
                                        return (
                                            <button
                                                key={lib.Id}
                                                type="button"
                                                className={`content-type-chip ${isSelected ? 'active' : ''}`}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setRandomLibraries(prev => prev.filter(id => id !== lib.Id));
                                                    } else {
                                                        setRandomLibraries(prev => [...prev, lib.Id]);
                                                    }
                                                }}
                                            >
                                                <span className="material-icons" style={{ fontSize: '16px', marginRight: '4px' }}>
                                                    {lib.Type === 'movies' ? 'movie' : (lib.Type === 'tvshows' ? 'tv' : 'folder')}
                                                </span>
                                                {lib.Name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div className="setting-row-label">
                                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Content Types</span>
                                    <span className="setting-hint">Filter by content type</span>
                                </div>
                                <div className="content-type-grid" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    {['Movie', 'Series', 'Episode'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
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

                    <div className="setting-row" title={config.enableGlobalOverwrites || config.jellyseerrGlobalOverride ? "Managed globally via plugin settings" : ""}>
                        <div className="setting-row-label">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                Show Requests in Navbar
                                {(config.enableGlobalOverwrites || config.jellyseerrGlobalOverride) && (
                                    <span className="material-icons" style={{ fontSize: '14px', color: '#ff7e00', cursor: 'help' }}>lock</span>
                                )}
                            </span>
                            <span className="setting-hint">Display the requests integration button in navigation bar</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={!!config.showNavbarRequests}
                                disabled={config.enableGlobalOverwrites || config.jellyseerrGlobalOverride}
                                onChange={e => updateConfig({ showNavbarRequests: e.target.checked })}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>

                {homeMsg && (
                    <div className={`form-message ${homeMsg.type}`} style={{ marginTop: '16px', marginBottom: '16px' }}>
                        <span className="material-icons">
                            {homeMsg.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        {homeMsg.text}
                    </div>
                )}
                <button className="lf-btn lf-btn--primary lf-btn--ring-hover lf-btn--sm" onClick={handleSaveHomeScreen} disabled={homeLoading} style={{ marginTop: '20px' }}>
                    {homeLoading ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>
        </>
    );

    const renderPlayback = () => (
        <div className="settings-card">
            <h3 className="settings-card-title">Playback Settings</h3>
            <div className="form-group">
                <label>Preferred Audio Language</label>
                <select
                    className="settings-select"
                    value={audioLang}
                    onChange={e => setAudioLang(e.target.value)}
                >
                    <option value="">Auto / Server Default</option>
                    <option value="eng">English</option>
                    <option value="hun">Hungarian</option>
                    <option value="jpn">Japanese</option>
                    <option value="ger">German</option>
                    <option value="fre">French</option>
                    <option value="spa">Spanish</option>
                </select>
            </div>
            <div className="form-group">
                <label>Max Streaming Bitrate</label>
                <select
                    className="settings-select"
                    value={maxBitrate}
                    onChange={e => setMaxBitrate(e.target.value)}
                >
                    <option value="">Auto</option>
                    <option value="120000000">120 Mbps (4K)</option>
                    <option value="80000000">80 Mbps</option>
                    <option value="60000000">60 Mbps</option>
                    <option value="40000000">40 Mbps</option>
                    <option value="20000000">20 Mbps (1080p)</option>
                    <option value="8000000">8 Mbps (720p)</option>
                    <option value="4000000">4 Mbps</option>
                    <option value="2000000">2 Mbps</option>
                </select>
            </div>
            <div className="form-group">
                <label>Seek Time</label>
                <select
                    className="settings-select"
                    value={config.playerSeekTime || 10}
                    onChange={e => updateConfig({ playerSeekTime: parseInt(e.target.value, 10) })}
                >
                    <option value="5">5 Seconds</option>
                    <option value="10">10 Seconds (Default)</option>
                    <option value="15">15 Seconds</option>
                    <option value="30">30 Seconds</option>
                    <option value="60">60 Seconds</option>
                </select>
            </div>
            <div className="setting-rows-list">
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Play Default Audio Track</span>
                        <span className="setting-hint">Automatically play the default audio track if matching language is not found</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={playDefaultAudio}
                            onChange={e => setPlayDefaultAudio(e.target.checked)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Remember Audio Track Selections</span>
                        <span className="setting-hint">Remember manually selected audio tracks for future playback</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={rememberAudio}
                            onChange={e => setRememberAudio(e.target.checked)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Next Episode Auto Play</span>
                        <span className="setting-hint">Automatically start playing the next episode in a series</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={enableNextEpisodeAutoPlay}
                            onChange={e => setEnableNextEpisodeAutoPlay(e.target.checked)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Prefer fMP4-HLS Container</span>
                        <span className="setting-hint">Uses fMP4 container for HLS playback when available</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={preferFmp4}
                            onChange={e => setPreferFmp4(e.target.checked)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Enable Cinema Mode</span>
                        <span className="setting-hint">Play trailers and custom intros before the main feature</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={cinemaMode}
                            onChange={e => setCinemaMode(e.target.checked)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Auto Skip Intros</span>
                        <span className="setting-hint">Automatically skip intro / opening sequences when detected</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={!!config.playerAutoSkip}
                            onChange={e => updateConfig({ playerAutoSkip: e.target.checked })}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Auto Skip Recaps</span>
                        <span className="setting-hint">Automatically skip "previously on" recap segments when detected</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={!!config.playerAutoSkipRecap}
                            onChange={e => updateConfig({ playerAutoSkipRecap: e.target.checked })}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Auto Pause on Tab Switch</span>
                        <span className="setting-hint">Pause playback when you switch browser tabs</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={!!config.playerAutoPause}
                            onChange={e => updateConfig({ playerAutoPause: e.target.checked })}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Auto Resume on Tab Switch</span>
                        <span className="setting-hint">Resume playback automatically when returning to tab</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={!!config.playerAutoResume}
                            onChange={e => updateConfig({ playerAutoResume: e.target.checked })}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Auto Picture-in-Picture</span>
                        <span className="setting-hint">Automatically enter PiP mode when switching browser tabs</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={!!config.playerAutoPip}
                            onChange={e => updateConfig({ playerAutoPip: e.target.checked })}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Long Press for 2x Speed</span>
                        <span className="setting-hint">Hold on player surface to playback at double speed</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={config.playerLongPressSpeed !== false}
                            onChange={e => updateConfig({ playerLongPressSpeed: e.target.checked })}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="setting-row">
                    <div className="setting-row-label">
                        <span>Enable Gamepad Control</span>
                        <span className="setting-hint">Control player and navigate the app using a connected gamepad</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={!!config.enableGamepad}
                            onChange={e => updateConfig({ enableGamepad: e.target.checked })}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>
            {playbackMsg && (
                <div className={`form-message ${playbackMsg.type}`} style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <span className="material-icons">
                        {playbackMsg.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {playbackMsg.text}
                </div>
            )}
            <button className="lf-btn lf-btn--primary lf-btn--ring-hover lf-btn--sm" onClick={handleSavePlayback} disabled={playbackLoading} style={{ marginTop: '20px' }}>
                {playbackLoading ? 'Saving...' : 'Save Preferences'}
            </button>
        </div>
    );

    const renderSubtitles = () => (
        <>
            <div className="settings-card">
                <h3 className="settings-card-title">Subtitle Preferences</h3>
                <div className="form-group">
                    <label>Preferred Subtitle Language</label>
                    <select
                        className="settings-select"
                        value={subLang}
                        onChange={e => setSubLang(e.target.value)}
                    >
                        <option value="">None</option>
                        <option value="eng">English</option>
                        <option value="hun">Hungarian</option>
                        <option value="jpn">Japanese</option>
                        <option value="ger">German</option>
                        <option value="fre">French</option>
                        <option value="spa">Spanish</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Subtitle Mode</label>
                    <select
                        className="settings-select"
                        value={subMode}
                        onChange={e => setSubMode(e.target.value)}
                    >
                        <option value="Default">Default</option>
                        <option value="Always">Always Show</option>
                        <option value="OnlyForced">Only Forced</option>
                        <option value="None">None</option>
                        <option value="Smart">Smart (match audio)</option>
                    </select>
                </div>
                <div className="setting-rows-list">
                    <div className="setting-row">
                        <div className="setting-row-label">
                            <span>Remember Subtitle Selections</span>
                            <span className="setting-hint">Remember manually selected subtitle tracks for future playback</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={rememberSubtitles}
                                onChange={e => setRememberSubtitles(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                    <div className="setting-row">
                        <div className="setting-row-label">
                            <span>Burn in Subtitles</span>
                            <span className="setting-hint">Permanently render subtitles into the video stream</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={burnInSubtitles}
                                onChange={e => setBurnInSubtitles(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <h3 className="settings-card-title">Subtitle Style & Appearance</h3>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Text Size</label>
                    <select className="settings-select" value={config.subtitleTextSize} onChange={e => updateConfig({ subtitleTextSize: e.target.value })}>
                        <option value="Small">Small</option>
                        <option value="Normal">Normal</option>
                        <option value="Medium">Medium</option>
                        <option value="Large">Large</option>
                        <option value="Extra Large">Extra Large</option>
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Text Weight</label>
                    <select className="settings-select" value={config.subtitleTextWeight} onChange={e => updateConfig({ subtitleTextWeight: e.target.value })}>
                        <option value="Light">Light</option>
                        <option value="Normal">Normal</option>
                        <option value="Bold">Bold</option>
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Font Family</label>
                    <select className="settings-select" value={config.subtitleFontFamily} onChange={e => updateConfig({ subtitleFontFamily: e.target.value })}>
                        <option value="Default">Default</option>
                        <option value="Serif">Serif</option>
                        <option value="Sans-Serif">Sans-Serif</option>
                        <option value="Monospace">Monospace</option>
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Text Color</label>
                    <select className="settings-select" value={config.subtitleColor} onChange={e => updateConfig({ subtitleColor: e.target.value })}>
                        <option value="#ffffff">White</option>
                        <option value="#ffff00">Yellow</option>
                        <option value="#00ff00">Green</option>
                        <option value="#00ffff">Cyan</option>
                        <option value="#ff00ff">Magenta</option>
                        <option value="#ff0000">Red</option>
                        <option value="#000000">Black</option>
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Drop Shadow</label>
                    <select className="settings-select" value={config.subtitleShadow} onChange={e => updateConfig({ subtitleShadow: e.target.value })}>
                        <option value="None">None</option>
                        <option value="Drop Shadow">Drop Shadow</option>
                        <option value="Raised">Raised</option>
                        <option value="Depressed">Depressed</option>
                        <option value="Outline">Outline</option>
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Vertical Position</label>
                    <select className="settings-select" value={config.subtitleVerticalPosition} onChange={e => updateConfig({ subtitleVerticalPosition: e.target.value })}>
                        <option value="Bottom">Bottom</option>
                        <option value="Top">Top</option>
                    </select>
                </div>

                <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                    <label className="setting-row-label" style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '8px' }}>Live Subtitle Preview</label>
                    <div className="lf-subtitle-preview-box" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '80px',
                        background: '#141414',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <span style={{
                            fontSize: config.subtitleTextSize === 'Small' ? '0.75rem' : config.subtitleTextSize === 'Normal' ? '1rem' : config.subtitleTextSize === 'Medium' ? '1.25rem' : config.subtitleTextSize === 'Large' ? '1.5rem' : '1.75rem',
                            color: config.subtitleColor,
                            fontWeight: config.subtitleTextWeight === 'Normal' ? 'normal' : config.subtitleTextWeight === 'Bold' ? 'bold' : '300',
                            fontFamily: config.subtitleFontFamily === 'Default' ? 'inherit' : config.subtitleFontFamily === 'Serif' ? 'serif' : config.subtitleFontFamily === 'Sans-Serif' ? 'sans-serif' : 'monospace',
                            textShadow: config.subtitleShadow === 'None' ? 'none' : config.subtitleShadow === 'Drop Shadow' ? '0px 2px 4px rgba(0,0,0,0.9)' : config.subtitleShadow === 'Raised' ? '1px 1px 0px #000, 2px 2px 0px #000' : config.subtitleShadow === 'Depressed' ? '1px 1px 0px #fff, -1px -1px 0px #000' : '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                            position: 'absolute',
                            bottom: config.subtitleVerticalPosition === 'Bottom' ? '12px' : 'auto',
                            top: config.subtitleVerticalPosition === 'Top' ? '12px' : 'auto',
                            transition: 'all 0.2s ease'
                        }}>
                            The quick brown fox jumps over the lazy dog.
                        </span>
                    </div>
                </div>

                {subtitlesMsg && (
                    <div className={`form-message ${subtitlesMsg.type}`} style={{ marginTop: '16px', marginBottom: '16px' }}>
                        <span className="material-icons">
                            {subtitlesMsg.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        {subtitlesMsg.text}
                    </div>
                )}
                <button className="lf-btn lf-btn--primary lf-btn--ring-hover lf-btn--sm" onClick={handleSaveSubtitles} disabled={subtitlesLoading} style={{ marginTop: '20px' }}>
                    {subtitlesLoading ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>
        </>
    );

    const renderShortcuts = () => {
        const isAdmin = !!user?.Policy?.IsAdministrator;
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

        const visibleShortcuts = shortcuts.filter(sh => !sh.adminOnly || isAdmin);

        return (
            <div className="settings-card">
                <h3 className="settings-card-title">Keyboard Shortcuts</h3>
                <p className="settings-description">Use keyboard buttons to control navigation and media playback.</p>

                <div className="lf-shortcuts-list" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginTop: '15px'
                }}>
                    {visibleShortcuts.map((sh, idx) => (
                        <div key={idx} className="lf-shortcut-row" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
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
                    ))}
                </div>
            </div>
        );
    };

    const renderQuickConnect = () => (
        <div className="settings-card">
            <h3 className="settings-card-title">Quick Connect</h3>
            <p className="settings-description">
                Enter the code displayed on your device to authorize it with your account.
            </p>
            <div className="qc-row">
                <input
                    type="text"
                    className="settings-input qc-input"
                    placeholder="Enter code"
                    value={qcCode}
                    onChange={e => setQcCode(e.target.value)}
                    maxLength={10}
                />
                <button className="lf-btn lf-btn--primary lf-btn--ring-hover lf-btn--sm" onClick={handleQuickConnect} style={{ height: '38px', whiteSpace: 'nowrap' }}>
                    Authorize
                </button>
            </div>
            {qcMsg && (
                <div className={`form-message ${qcMsg.type}`} style={{ marginTop: '12px' }}>
                    <span className="material-icons">
                        {qcMsg.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {qcMsg.text}
                </div>
            )}
        </div>
    );

    const renderAdvanced = () => (
        <div className="advanced-settings-container">
            {/* Server Settings Group */}
            {user.Policy?.IsAdministrator && (
                <div className="settings-card" style={{ marginBottom: '24px' }}>
                    <h3 className="settings-card-title">Server Administration</h3>
                    <p className="settings-description">Manage your Jellyfin server parameters, network settings, and plugin list.</p>

                    <button
                        className="btn-link-row"
                        onClick={() => { window.location.href = '/web/index.html?classic=true#/dashboard'; }}
                    >
                        <span className="material-icons">dashboard</span>
                        <div>
                            <span>Server Dashboard</span>
                            <span className="setting-hint">Manage server settings, users, and libraries</span>
                        </div>
                        <span className="material-icons link-arrow">chevron_right</span>
                    </button>

                    <button
                        className="btn-link-row"
                        onClick={() => { window.location.href = '/web/index.html?classic=true#/dashboard/networking'; }}
                    >
                        <span className="material-icons">lan</span>
                        <div>
                            <span>Networking</span>
                            <span className="setting-hint">Configure IP address binding, ports, and SSL certificates</span>
                        </div>
                        <span className="material-icons link-arrow">chevron_right</span>
                    </button>

                    <button
                        className="btn-link-row"
                        onClick={() => { window.location.href = '/web/index.html?classic=true#/dashboard/plugins'; }}
                    >
                        <span className="material-icons">extension</span>
                        <div>
                            <span>Plugins Manager</span>
                            <span className="setting-hint">Browse, install, and update Jellyfin catalog plugins</span>
                        </div>
                        <span className="material-icons link-arrow">chevron_right</span>
                    </button>
                </div>
            )}

            {/* User Preferences Group */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <h3 className="settings-card-title">User preferences</h3>
                <p className="settings-description">Manage native Jellyfin user preferences or open the LegitFlix theme manager.</p>

                <button
                    className="btn-link-row"
                    onClick={() => setShowLegitSettings(true)}
                >
                    <span className="material-icons">palette</span>
                    <div>
                        <span>LegitFlix Theme Customizer</span>
                        <span className="setting-hint">Customize theme colors, banners, and app appearance</span>
                    </div>
                    <span className="material-icons link-arrow">chevron_right</span>
                </button>
            </div>

            {/* Installed Plugins Grid */}
            {user.Policy?.IsAdministrator && (
                <div className="settings-card">
                    <h3 className="settings-card-title">Installed Plugins</h3>
                    <p className="settings-description" style={{ marginBottom: '20px' }}>
                        Plugins currently loaded on the Jellyfin server. Standard web plugins may only function within the classic view.
                    </p>

                    {installedPlugins.length === 0 ? (
                        <div className="plugin-empty-state">
                            <span className="material-icons">extension_off</span>
                            <p>No active plugins found or loaded.</p>
                        </div>
                    ) : (
                        <div className="plugin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {installedPlugins.map(plugin => (
                                <div key={plugin.Id || plugin.Name} className="plugin-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#f5f5f5' }}>{plugin.Name}</h4>
                                            <span style={{ fontSize: '0.75rem', background: plugin.Status === 'Active' ? 'rgba(0,255,126,0.1)' : 'rgba(255,255,255,0.1)', color: plugin.Status === 'Active' ? '#00ff7e' : '#aaa', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
                                                {plugin.Status || 'Active'}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#aaa', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {plugin.Description || 'No description provided.'}
                                        </p>
                                    </div>
                                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#666' }}>
                                        <span>v{plugin.Version}</span>
                                        {plugin.ConfigurationFileName && (
                                            <span
                                                className="plugin-config-link"
                                                onClick={() => {
                                                    const cleanId = plugin.Id ? plugin.Id.replace(/-/g, '') : '';
                                                    window.location.href = `/web/index.html?classic=true#/dashboard/plugins/${cleanId}?name=${encodeURIComponent(plugin.Name)}`;
                                                }}
                                                style={{ color: 'var(--clr-accent, #ff7e00)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
                                            >
                                                <span className="material-icons" style={{ fontSize: '14px' }}>settings</span>
                                                Configure
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'details': return renderMyDetails();
            case 'display': return renderDisplay();
            case 'home': return renderHomeScreen();
            case 'playback': return renderPlayback();
            case 'subtitles': return renderSubtitles();
            case 'quickconnect': return renderQuickConnect();
            case 'shortcuts': return renderShortcuts();
            case 'advanced': return renderAdvanced();
            default: return null;
        }
    };

    return (
        <div className="profile-page">
            <Navbar />

            <div className="settings-container">
                <h1 className="settings-page-title">Account Settings</h1>

                {/* TABS */}
                <div className="settings-tabs-wrapper">
                    <div className="settings-tabs">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* BANNER */}
                {themeEnabled && (
                    <div
                        className={`settings-banner ${bannerUrl ? 'has-banner' : ''}`}
                        style={bannerUrl ? { backgroundImage: `url('${bannerUrl}')` } : {}}
                    >
                        <div className="banner-overlay"></div>
                        <div className="banner-edit-btn" onClick={() => setShowBannerPicker(true)}>
                            <span className="material-icons-outlined">
                                {bannerUrl ? 'edit' : 'add_photo_alternate'}
                            </span>
                            <span>{bannerUrl ? 'Change profile banner' : 'Add profile banner'}</span>
                        </div>
                    </div>
                )}

                {/* AVATAR */}
                {themeEnabled && (
                    <div className="settings-avatar-wrap">
                        <div
                            className="settings-avatar"
                            style={avatarUrl ? { backgroundImage: `url('${avatarUrl}')` } : {}}
                        >
                            {!avatarUrl && <span className="material-icons avatar-placeholder">person</span>}
                        </div>
                        <div className="avatar-edit-badge" title="Change avatar" onClick={() => setShowAvatarPicker(true)}>
                            <span className="material-icons">edit</span>
                        </div>
                    </div>
                )}

                {/* CONTENT */}
                <div className="settings-content">
                    {renderContent()}
                </div>
            </div>

            <BannerPickerModal
                isOpen={showBannerPicker}
                onClose={() => setShowBannerPicker(false)}
                onSave={handleBannerSave}
                userId={user?.Id}
            />

            <LegitFlixSettingsModal
                isOpen={showLegitSettings}
                onClose={() => setShowLegitSettings(false)}
                userId={user?.Id}
            />

            <AvatarPickerModal
                isOpen={showAvatarPicker}
                onClose={() => setShowAvatarPicker(false)}
                onSave={handleAvatarSave}
                userId={user?.Id}
            />
        </div>
    );
};

export default Profile;