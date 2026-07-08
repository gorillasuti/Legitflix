
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme, getDefaultLogo } from '../context/ThemeContext';
import { jellyfinService } from '../services/jellyfin';
import SearchModal from './SearchModal/SearchModal';
import LegitFlixSettingsModal from './LegitFlixSettingsModal';
import QuickConnectModal from './QuickConnectModal';
import ProfileModal from './ProfileModal';
import AvatarPickerModal from './AvatarPickerModal';
import CastModal from './CastModal';
import SyncPlayModal from './SyncPlayModal';

import './Navbar.css';

const Navbar = ({ alwaysFilled = false }) => {
    const { config, updateConfig } = useTheme();
    const fallbackAvatar = `https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/avatars/Netflix/010c7b9061ece2fbf7bbb8d9bb6d2bee16f4a68c.png`;
    const [user, setUser] = useState(null);
    const [libraries, setLibraries] = useState([]);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showLegitSettings, setShowLegitSettings] = useState(false);
    const [showQuickConnect, setShowQuickConnect] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [hasEnhancedPlugin, setHasEnhancedPlugin] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showOtherSettings, setShowOtherSettings] = useState(false);

    // Cast & SyncPlay states
    const [showCastModal, setShowCastModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifDropdownRef = useRef(null);
    const [showSyncPlayModal, setShowSyncPlayModal] = useState(false);
    const [castTarget, setCastTarget] = useState(() => {
        const saved = localStorage.getItem('legitflix_cast_target');
        return saved ? JSON.parse(saved) : null;
    });

    const handleSelectCastTarget = (target) => {
        setCastTarget(target);
        if (target) {
            localStorage.setItem('legitflix_cast_target', JSON.stringify(target));
        } else {
            localStorage.removeItem('legitflix_cast_target');
        }
        window.dispatchEvent(new CustomEvent('castTargetUpdated', { detail: target }));
    };

    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    // Fetch User and Libraries
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const u = await jellyfinService.getCurrentUser();
                let finalUser = u;

                // If user exists but Policy is missing (common with window.ApiClient), fetch full details
                if (u && !u.Policy && jellyfinService.api?.user) {
                    try {
                        const response = await jellyfinService.api.user.getUserById({ userId: u.Id });
                        finalUser = response.data;
                    } catch (err) {
                        console.warn("[Navbar] Failed to fetch full user details", err);
                    }
                }

                setUser(finalUser);
                if (finalUser && config.showNavbarCategories) {
                    const libs = await jellyfinService.getUserViews(finalUser.Id);
                    if (libs && libs.Items) {
                        setLibraries(libs.Items);
                    }
                }
            } catch (err) {
                console.error("Navbar fetch error", err);
            }
        };
        fetchUserData();
    }, [config.showNavbarCategories]); // Re-fetch if toggle changes

    // Listen for global user updates
    useEffect(() => {
        const handleUserUpdate = (e) => {
            if (e.detail) {
                setUser(prev => ({ ...prev, ...e.detail }));
            } else {
                jellyfinService.getCurrentUser().then(u => {
                    if (u) setUser(u);
                });
            }
        };
        window.addEventListener('userUpdated', handleUserUpdate);
        return () => window.removeEventListener('userUpdated', handleUserUpdate);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const closeMenu = (e) => {
            if (!e.target.closest('.nav-avatar-container')) {
                setShowMenu(false);
            }
            if (!e.target.closest('.nav-notifications-container')) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);

    // Global Search Shortcut (F4)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F4') {
                e.preventDefault();
                setShowSearch(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Notifications Fetcher & Cache Manager
    useEffect(() => {
        if (!user || config.showNavbarNotifications === false) return;

        // Load from localStorage cache first for zero-latency loading
        try {
            const cached = localStorage.getItem(`legitflix_notifs_${user.Id}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                setNotifications(parsed);
                // Calculate unread count based on non-dismissed
                let dismissed = [];
                try {
                    const saved = localStorage.getItem(`legitflix_notifs_dismissed_${user.Id}`);
                    dismissed = saved ? JSON.parse(saved) : [];
                } catch (e) { }
                const visible = parsed.filter(item => !dismissed.includes(item.Id));
                const lastCheck = localStorage.getItem(`legitflix_notifs_last_check_${user.Id}`) || '';
                const unread = visible.filter(item => {
                    const dateVal = item.DateCreated || item.DateLastAdded;
                    return !lastCheck || (dateVal && dateVal > lastCheck);
                }).length;
                setUnreadCount(unread);
            }
        } catch (e) {
            console.warn("Failed to load cached notifications", e);
        }

        const fetchLatestAdded = async () => {
            try {
                const fields = 'PrimaryImageAspectRatio,Overview,ImageTags,ProductionYear,RunTimeTicks,CommunityRating,OfficialRating,UserData,DateCreated,DateLastAdded,MediaStreams,Width,Height';
                const endpoint = `/Users/${user.Id}/Items/Latest?limit=20&fields=${fields}`;
                const data = await jellyfinService.makeRequest(endpoint);

                if (Array.isArray(data)) {
                    let finalData = [...data];

                    // Admin-only: check for plugin updates (version is fetched server-side)
                    const isAdmin = user?.Policy?.IsAdministrator;
                    if (isAdmin) {
                        const serverCfg = window.LegitFlix_ServerConfig || {};
                        const localVersion = serverCfg.pluginVersion || '1.1.1.0';
                        const remoteVersion = serverCfg.latestRemoteVersion;
                        if (remoteVersion && isVersionNewer(localVersion, remoteVersion)) {
                            // Only show if not already dismissed for this version
                            const updateId = `legitflix-plugin-update-${remoteVersion}`;
                            let dismissed = [];
                            try {
                                const saved = localStorage.getItem(`legitflix_notifs_dismissed_${user.Id}`);
                                dismissed = saved ? JSON.parse(saved) : [];
                            } catch (e) { }
                            if (!dismissed.includes(updateId)) {
                                const updateItem = {
                                    Id: updateId,
                                    Name: `LegitFlix Update Available`,
                                    Type: 'SystemUpdate',
                                    DateCreated: new Date().toISOString(),
                                    IsSystemUpdate: true,
                                    RemoteVersion: remoteVersion,
                                    LocalVersion: localVersion
                                };
                                finalData = [updateItem, ...finalData];
                            }
                        }
                    }

                    setNotifications(finalData);
                    localStorage.setItem(`legitflix_notifs_${user.Id}`, JSON.stringify(finalData));

                    // Filter out dismissed
                    let dismissed = [];
                    try {
                        const saved = localStorage.getItem(`legitflix_notifs_dismissed_${user.Id}`);
                        dismissed = saved ? JSON.parse(saved) : [];
                    } catch (e) { }

                    const visible = finalData.filter(item => !dismissed.includes(item.Id));
                    const lastCheck = localStorage.getItem(`legitflix_notifs_last_check_${user.Id}`) || '';
                    const unread = visible.filter(item => {
                        const dateVal = item.DateCreated || item.DateLastAdded;
                        return !lastCheck || (dateVal && dateVal > lastCheck);
                    }).length;
                    setUnreadCount(unread);
                }
            } catch (err) {
                console.error("Failed to fetch latest added media notifications", err);
            }
        };

        fetchLatestAdded();

        // Fetch every 5 minutes in background
        const interval = setInterval(fetchLatestAdded, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user, config.showNavbarNotifications]);

    const handleBellClick = () => {
        setShowNotifications(!showNotifications);
    };

    const handleMarkAllRead = () => {
        const newestNotif = notifications.find(item => {
            try {
                const saved = localStorage.getItem(`legitflix_notifs_dismissed_${user?.Id}`);
                const dismissed = saved ? JSON.parse(saved) : [];
                return !dismissed.includes(item.Id);
            } catch (e) {
                return true;
            }
        });
        const timestamp = newestNotif ? (newestNotif.DateCreated || newestNotif.DateLastAdded) : new Date().toISOString();
        localStorage.setItem(`legitflix_notifs_last_check_${user?.Id}`, timestamp);
        setUnreadCount(0);
        setShowNotifications(false);
    };

    const handleDismissAll = () => {
        const itemIds = notifications.map(item => item.Id);
        try {
            const saved = localStorage.getItem(`legitflix_notifs_dismissed_${user?.Id}`);
            let dismissed = saved ? JSON.parse(saved) : [];
            const newDismissed = Array.from(new Set([...dismissed, ...itemIds]));
            localStorage.setItem(`legitflix_notifs_dismissed_${user?.Id}`, JSON.stringify(newDismissed));

            // Also mark as read
            const newestNotif = notifications[0];
            const timestamp = newestNotif ? (newestNotif.DateCreated || newestNotif.DateLastAdded) : new Date().toISOString();
            localStorage.setItem(`legitflix_notifs_last_check_${user?.Id}`, timestamp);
            setUnreadCount(0);
        } catch (e) {
            console.error("Failed to dismiss notifications", e);
        }
        setShowNotifications(false);
    };

    const getVisibleNotifications = (itemsList) => {
        if (!itemsList) return [];
        try {
            const saved = localStorage.getItem(`legitflix_notifs_dismissed_${user?.Id}`);
            const dismissed = saved ? JSON.parse(saved) : [];
            return itemsList.filter(item => !dismissed.includes(item.Id));
        } catch (e) {
            return itemsList;
        }
    };

    const getItemQuality = (item) => {
        const videoStream = item.MediaStreams?.find(s => s.Type === 'Video');
        const width = item.Width || videoStream?.Width || 0;
        const height = item.Height || videoStream?.Height || 0;

        if (width >= 3840 || height >= 2160) {
            return '4K';
        } else if (width >= 1920 || height >= 1080) {
            return '1080p';
        } else if (width >= 1280 || height >= 720) {
            return '720p';
        }
        return null;
    };

    const getItemLanguage = (item) => {
        const audioStream = item.MediaStreams?.find(s => s.Type === 'Audio');
        const lang = audioStream?.Language || item.Language;
        if (!lang) return null;

        const flags = {
            'eng': '🇺🇸', 'en': '🇺🇸',
            'spa': '🇪🇸', 'es': '🇪🇸',
            'hun': '🇭🇺', 'hu': '🇭🇺',
            'ger': '🇩🇪', 'de': '🇩🇪',
            'fre': '🇫🇷', 'fr': '🇫🇷',
            'jpn': '🇯🇵', 'ja': '🇯🇵',
            'ita': '🇮🇹', 'it': '🇮🇹',
            'por': '🇵🇹', 'pt': '🇵🇹',
            'rus': '🇷🇺', 'ru': '🇷🇺',
            'zho': '🇨🇳', 'zh': '🇨🇳',
            'kor': '🇰🇷', 'ko': '🇰🇷'
        };
        const flag = flags[lang.toLowerCase()] || '';
        return flag ? `${flag} ${lang.toUpperCase()}` : lang.toUpperCase();
    };

    const isVersionNewer = (local, remote) => {
        if (!local || !remote) return false;
        const localParts = local.split('.').map(Number);
        const remoteParts = remote.split('.').map(Number);
        for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
            const localVal = localParts[i] || 0;
            const remoteVal = remoteParts[i] || 0;
            if (remoteVal > localVal) return true;
            if (localVal > remoteVal) return false;
        }
        return false;
    };

    const groupNotificationsByDate = (items) => {
        const groups = {
            today: [],
            thisWeek: [],
            earlier: []
        };

        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const oneWeekMs = 7 * oneDayMs;

        items.forEach(item => {
            const dateVal = item.DateCreated || item.DateLastAdded || item.PremiereDate;
            if (!dateVal) {
                groups.earlier.push(item);
                return;
            }
            const createdDate = new Date(dateVal);
            if (isNaN(createdDate.getTime())) {
                groups.earlier.push(item);
                return;
            }
            const diffMs = now - createdDate;

            if (diffMs < oneDayMs) {
                groups.today.push(item);
            } else if (diffMs < oneWeekMs) {
                groups.thisWeek.push(item);
            } else {
                groups.earlier.push(item);
            }
        });

        return groups;
    };

    const formatNotifDate = (dateStr) => {
        if (!dateStr) return 'Recently added';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Recently added';
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);

        if (diffMins < 60) {
            return `${diffMins <= 0 ? 1 : diffMins}m ago`;
        }
        if (diffHrs < 24) {
            return `${diffHrs}h ago`;
        }

        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const isAdmin = user?.Policy?.IsAdministrator;

    const handleAvatarFile = async (url) => {
        if (!url) return;
        try {
            updateConfig({ userAvatar: url });
            setShowAvatarPicker(false);
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: { ...user } }));
        } catch (err) {
            console.error("Avatar update failed", err);
        }
    };

    const handleRandomPlay = async () => {
        setShowMobileMenu(false);
        try {
            const filters = config.randomContentFilters || { Movie: true, Series: true, Episode: true };
            const includeItemTypes = Object.entries(filters)
                .filter(([_, enabled]) => enabled)
                .map(([type]) => type);

            if (includeItemTypes.length === 0) {
                alert("Please select at least one content type in Theme Settings > Content.");
                return;
            }

            const user = await jellyfinService.getCurrentUser();
            if (!user) return;

            const query = {
                sortBy: ['Random'],
                limit: 1,
                recursive: true,
                includeItemTypes: includeItemTypes,
                fields: ['MediaSources', 'SeriesId']
            };

            if (config.randomLibraries && config.randomLibraries.length > 0) {
                query.parentId = config.randomLibraries.join(',');
            }

            const result = await jellyfinService.getItems(user.Id, query);

            if (result && result.Items && result.Items.length > 0) {
                const item = result.Items[0];
                if (item.Type === 'Movie') {
                    navigate(`/movie/${item.Id}`);
                } else if (item.Type === 'Series') {
                    navigate(`/series/${item.Id}`);
                } else if (item.Type === 'Episode' && item.SeriesId) {
                    navigate(`/series/${item.SeriesId}`);
                } else {
                    navigate(`/item/${item.Id}`);
                }
            } else {
                alert("No items found to play randomly.");
            }
        } catch (e) {
            console.error("Random play failed", e);
        }
    };
    const getCategoryIcon = (collectionType) => {
        switch (collectionType?.toLowerCase()) {
            case 'movies': return 'movie';
            case 'tvshows': return 'tv';
            case 'music': return 'music_note';
            case 'books': return 'library_books';
            case 'homevideos': return 'video_library';
            case 'boxsets': return 'collections';
            case 'playlists': return 'queue_music';
            default: return 'folder';
        }
    };

    return (
        <>
            <nav className={`navbar ${isScrolled || alwaysFilled ? 'scrolled' : ''}`}>
                <div className="nav-content">

                    {/* Left Section: Logo & Categories */}
                    <div className="nav-start">
                        <Link to="/" className="nav-logo">
                            {config.logoUrl ? (
                                <img src={config.logoUrl} alt={config.appName} />
                            ) : (
                                <img src={getDefaultLogo(config.accentColor)} alt={config.appName} />
                            )}
                        </Link>

                        <div className="nav-links primary-links">
                            {/* Real Jellyfin library categories */}
                            {config.showNavbarCategories && libraries.map(lib => (
                                <span
                                    key={lib.Id}
                                    className="nav-link"
                                    onClick={() => navigate(`/library/${lib.Id}`)}
                                >
                                    {lib.Name}
                                </span>
                            ))}

                            {/* Divider + Requests - only if setting enabled */}
                            {config.jellyseerrUrl && config.showNavbarRequests !== false && (
                                <>
                                    <span className="nav-divider" />
                                    <span
                                        className="nav-link"
                                        onClick={() => window.open(config.jellyseerrUrl, '_blank')}
                                    >
                                        {config.jellyseerrText || 'Request'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Section: Icons & Profile */}
                    <div className="nav-end">
                        <div className="nav-actions">
                            {/* Desktop Actions */}
                            <div className="desktop-actions">
                                {/* Search Icon - Toggleable */}
                                {config.showNavbarSearch !== false && (
                                    <button
                                        className="nav-icon-btn"
                                        onClick={() => setShowSearch(true)}
                                        title="Search (F4)"
                                    >
                                        <span className="material-icons">search</span>
                                    </button>
                                )}

                                {/* Favorites / Bookmarks - Toggleable */}
                                {config.showNavbarBookmarks !== false && (
                                    <Link to="/favorites" className="nav-icon-btn" title="My List">
                                        <span className="material-icons">favorite</span>
                                    </Link>
                                )}

                                {/* Random Button */}
                                {config.showNavbarRandom !== false && (
                                    <button
                                        className="nav-icon-btn"
                                        onClick={handleRandomPlay}
                                        title="Random - I'm feeling lucky"
                                    >
                                        <span className="material-icons">casino</span>
                                    </button>
                                )}

                                {/* Notification Bell Icon & Dropdown - Toggleable */}
                                {config.showNavbarNotifications !== false && (
                                    <div className="nav-notifications-container" ref={notifDropdownRef}>
                                        <button
                                            className={`nav-icon-btn ${showNotifications ? 'active' : ''}`}
                                            onClick={handleBellClick}
                                            title="Recently Added"
                                        >
                                            <span className="material-icons">notifications</span>
                                            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                                        </button>
                                        {showNotifications && (
                                            (() => {
                                                const visibleNotifs = getVisibleNotifications(notifications);
                                                return (
                                                    <div className="notifications-dropdown">
                                                        <div className="notifications-header">
                                                            <h3>Recently Added</h3>
                                                            {visibleNotifs.length > 0 && (
                                                                <div className="notifications-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                    {unreadCount > 0 && (
                                                                        <button className="notifications-clear-btn" onClick={handleMarkAllRead}>
                                                                            Mark Read
                                                                        </button>
                                                                    )}
                                                                    {unreadCount > 0 && <span style={{ opacity: 0.3, fontSize: '0.8rem', color: '#dadada' }}>|</span>}
                                                                    <button className="notifications-clear-btn" onClick={handleDismissAll}>
                                                                        Clear All
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="notifications-list">
                                                            {visibleNotifs.length === 0 ? (
                                                                <div className="notifications-empty">
                                                                    <span className="material-icons">notifications_off</span>
                                                                    <span>No new media added recently</span>
                                                                </div>
                                                            ) : (
                                                                (() => {
                                                                    const grouped = groupNotificationsByDate(visibleNotifs);
                                                                    const hasToday = grouped.today.length > 0;
                                                                    const hasThisWeek = grouped.thisWeek.length > 0;
                                                                    const hasEarlier = grouped.earlier.length > 0;
                                                                    const lastCheck = localStorage.getItem(`legitflix_notifs_last_check_${user?.Id}`) || '';

                                                                    const renderItem = (item) => {
                                                                        // System Update notification (admin only)
                                                                        if (item.IsSystemUpdate) {
                                                                            return (
                                                                                <div
                                                                                    key={item.Id}
                                                                                    className="notification-item notification-system-update"
                                                                                    onClick={() => {
                                                                                        setShowNotifications(false);
                                                                                        window.location.href = '/web/index.html?classic=true#/dashboard/plugins';
                                                                                    }}
                                                                                >
                                                                                    <div className="notification-update-icon">
                                                                                        <img src="/LegitFlix/Client/Legitflix-icon.svg" alt="LegitFlix" />
                                                                                    </div>
                                                                                    <div className="notification-info">
                                                                                        <span className="notification-title">{item.Name}</span>
                                                                                        <div className="notification-meta">
                                                                                            <span className="notification-badge-update">UPDATE</span>
                                                                                            <span>v{item.LocalVersion} → v{item.RemoteVersion}</span>
                                                                                        </div>
                                                                                        <span className="notification-update-hint">Click to go to Plugins Dashboard</span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }

                                                                        const posterUrl = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=120&fillWidth=80&quality=80`;
                                                                        const dateVal = item.DateCreated || item.DateLastAdded;
                                                                        const isUnread = !lastCheck || (dateVal && dateVal > lastCheck);
                                                                        const isSeries = item.Type === 'Series';
                                                                        const quality = getItemQuality(item);
                                                                        const language = getItemLanguage(item);

                                                                        return (
                                                                            <div
                                                                                key={item.Id}
                                                                                className={`notification-item ${isUnread ? 'unread' : ''}`}
                                                                                onClick={() => {
                                                                                    setShowNotifications(false);
                                                                                    if (isSeries) navigate(`/series/${item.Id}`);
                                                                                    else navigate(`/movie/${item.Id}`);
                                                                                }}
                                                                            >
                                                                                <img
                                                                                    src={posterUrl}
                                                                                    alt={item.Name}
                                                                                    className="notification-poster"
                                                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/50x75?text=?'; }}
                                                                                />
                                                                                <div className="notification-info">
                                                                                    <span className="notification-title">{item.Name}</span>
                                                                                    <div className="notification-meta">
                                                                                        <span className="notification-badge-type">{item.Type}</span>
                                                                                        {quality && <span className="notification-badge-quality">{quality}</span>}
                                                                                        {language && <span className="notification-badge-lang">{language}</span>}
                                                                                        {item.ProductionYear && <span>{item.ProductionYear}</span>}
                                                                                        {isUnread && <span className="notification-badge-new">NEW</span>}
                                                                                    </div>
                                                                                    <span className="notification-date">{formatNotifDate(dateVal)}</span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    };

                                                                    return (
                                                                        <>
                                                                            {hasToday && (
                                                                                <>
                                                                                    <div className="notification-recency-header">Today</div>
                                                                                    {grouped.today.map(renderItem)}
                                                                                </>
                                                                            )}
                                                                            {hasThisWeek && (
                                                                                <>
                                                                                    <div className="notification-recency-header">This Week</div>
                                                                                    {grouped.thisWeek.map(renderItem)}
                                                                                </>
                                                                            )}
                                                                            {hasEarlier && (
                                                                                <>
                                                                                    <div className="notification-recency-header">Earlier</div>
                                                                                    {grouped.earlier.map(renderItem)}
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Mobile Hamburger (Now using Lucide) */}
                            <button
                                className="nav-icon-btn mobile-hamburger"
                                onClick={() => setShowMobileMenu(true)}
                            >
                                <span className="material-icons" style={{ fontSize: '28px' }}>menu</span>
                            </button>

                            {/* Cast Status Indicator */}
                            {castTarget && (
                                <button
                                    className="nav-icon-btn active"
                                    onClick={() => setShowCastModal(true)}
                                    style={{ marginRight: '8px', color: 'var(--clr-accent, #ff6a00)' }}
                                    title={`Casting to ${castTarget.name}`}
                                >
                                    <span className="material-icons">cast_connected</span>
                                </button>
                            )}

                            {/* User Profile & Menu (Desktop) */}
                            <div
                                className={`nav-avatar-container ${showMenu ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                ref={dropdownRef}
                            >
                                {user ? (
                                    <div className="nav-avatar-wrapper">
                                        <img
                                            src={config.userAvatar || jellyfinService.getUserImageUrl(user.Id, { tag: user.PrimaryImageTag || (user.ImageTags && user.ImageTags.Primary) })}
                                            alt={user.Name}
                                            className="nav-avatar"
                                            onError={(e) => { e.target.src = fallbackAvatar; }}
                                        />
                                        <span className="material-icons avatar-arrow">expand_more</span>
                                    </div>
                                ) : (
                                    <div className="nav-avatar-wrapper">
                                        <span className="material-icons nav-avatar-placeholder">person</span>
                                        <span className="material-icons avatar-arrow">expand_more</span>
                                    </div>
                                )}

                                {showMenu && (
                                    <div className="nav-dropdown-menu usermenu">
                                        {/* User Header */}
                                        {user && (
                                            <div className="user-menu-header" onClick={() => { setShowMenu(false); setShowProfileModal(true); }}>
                                                <div className="header-avatar-container">
                                                    <img
                                                        src={config.userAvatar || jellyfinService.getUserImageUrl(user.Id, { tag: user.PrimaryImageTag || (user.ImageTags && user.ImageTags.Primary) })}
                                                        alt={user.Name}
                                                        className="menu-avatar"
                                                        onError={(e) => { e.target.src = fallbackAvatar; }}
                                                    />
                                                </div>
                                                <div className="user-menu-info">
                                                    <span className="user-name">{user.Name}</span>
                                                    <span className="user-status">
                                                        <span className="material-icons">{isAdmin ? 'shield' : 'person'}</span>
                                                        {isAdmin ? 'Administrator' : 'User'}
                                                    </span>
                                                </div>
                                                <span className="material-icons edit-icon">edit</span>
                                            </div>
                                        )}

                                        {/* General */}
                                        <div className="menu-section-label">General</div>
                                        {isAdmin && (
                                            <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html?classic=true#/dashboard'; }}>
                                                <span className="material-icons">dashboard</span> Dashboard
                                            </button>
                                        )}
                                        <button onClick={() => { setShowMenu(false); setShowSearch(true); }}>
                                            <span className="material-icons">search</span> Search
                                        </button>
                                        <button onClick={() => { setShowMenu(false); setShowCastModal(true); }}>
                                            <span className="material-icons">{castTarget ? 'cast_connected' : 'cast'}</span> Cast to Device
                                        </button>
                                        <button onClick={() => { setShowMenu(false); setShowSyncPlayModal(true); }}>
                                            <span className="material-icons">smartphone</span> SyncPlay
                                        </button>

                                        {/* Preferences */}
                                        <div className="dropdown-divider"></div>
                                        <div className="menu-section-label">Preferences</div>
                                        <button onClick={() => { setShowMenu(false); navigate('/profile'); }}>
                                            <span className="material-icons">settings</span> User Settings
                                        </button>
                                        <button onClick={() => { setShowMenu(false); setShowLegitSettings(true); }}>
                                            <span className="material-icons">palette</span> Theme Settings
                                        </button>

                                        {/* Account */}
                                        <div className="dropdown-divider"></div>
                                        <div className="menu-section-label">Account</div>
                                        <button onClick={() => { setShowMenu(false); setShowAvatarPicker(true); }}>
                                            <span className="material-icons">person</span> Change Avatar
                                        </button>
                                        <button onClick={() => { setShowMenu(false); setShowQuickConnect(true); }}>
                                            <span className="material-icons">qr_code</span> Quick Connect
                                        </button>
                                        <button onClick={async () => {
                                            setShowMenu(false);
                                            await jellyfinService.logout();
                                            navigate('/login/select-server');
                                        }}>
                                            <span className="material-icons">dns</span> Change Server
                                        </button>
                                        <button onClick={() => {
                                            setShowMenu(false);
                                            jellyfinService.logout();
                                        }}>
                                            <span className="material-icons">logout</span> Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Fullscreen Menu */}
            <div className={`mobile-menu-overlay ${showMobileMenu ? 'active' : ''}`} onClick={() => setShowMobileMenu(false)}>
                <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
                    <div className="mobile-menu-header">
                        <div className="mobile-logo-small">
                            {config.logoUrl ? (
                                <img src={config.logoUrl} alt={config.appName} style={{ height: '24px' }} />
                            ) : (
                                <span className="mobile-menu-title">Menu</span>
                            )}
                        </div>
                        <button className="mobile-menu-close" onClick={() => setShowMobileMenu(false)}>
                            <span className="material-icons" style={{ fontSize: '28px' }}>close</span>
                        </button>
                    </div>

                    <div className="mobile-menu-content">
                        {/* Big Search Bar Quick Action */}
                        <div className="mobile-search-trigger" onClick={() => { setShowMobileMenu(false); setShowSearch(true); }}>
                            <span className="material-icons search-icon">search</span>
                            <span className="search-placeholder">Search...</span>
                        </div>

                        {/* Links List */}
                        <div className="mobile-links-list">
                            <button
                                className="mobile-link-item"
                                onClick={() => { setShowMobileMenu(false); navigate('/'); }}
                            >
                                <span className="material-icons link-icon">home</span>
                                Home
                            </button>

                            {/* My List (Favorites) - Integrated into Categories */}
                            {config.showNavbarBookmarks !== false && (
                                <button
                                    className="mobile-link-item"
                                    onClick={() => { setShowMobileMenu(false); navigate('/favorites'); }}
                                >
                                    <span className="material-icons link-icon">favorite</span>
                                    My List
                                </button>
                            )}

                            {/* Dynamic Categories */}
                            {config.showNavbarCategories && libraries.map(lib => (
                                <button
                                    key={lib.Id}
                                    className="mobile-link-item"
                                    onClick={() => { setShowMobileMenu(false); navigate(`/library/${lib.Id}`); }}
                                >
                                    <span className="material-icons link-icon">{getCategoryIcon(lib.CollectionType)}</span>
                                    {lib.Name}
                                </button>
                            ))}
                        </div>

                        <div className="mobile-menu-spacer" style={{ flex: 1 }}></div>

                        {/* Bottom Actions: Random + Settings/Logout */}
                        <div className="mobile-bottom-actions">
                            {/* Random Link */}
                            {config.showNavbarRandom !== false && (
                                <button
                                    className="mobile-link-item special-random"
                                    onClick={handleRandomPlay}
                                >
                                    <span className="material-icons link-icon">casino</span>
                                    Random
                                </button>
                            )}

                            <div className="mobile-divider"></div>

                            {/* User Settings (External) */}
                            <button className="mobile-link-item small" onClick={() => { setShowMobileMenu(false); navigate('/profile'); }}>
                                <span className="material-icons link-icon" style={{ fontSize: '20px' }}>person</span>
                                Profile & Settings
                            </button>

                            {/* Theme Settings */}
                            <button className="mobile-link-item small" onClick={() => { setShowMobileMenu(false); setShowLegitSettings(true); }}>
                                <span className="material-icons link-icon" style={{ fontSize: '20px' }}>palette</span>
                                Theme Settings
                            </button>

                            {/* Other Settings Dropdown */}
                            <div className="mobile-submenu-container">
                                <button
                                    className={`mobile-link-item small ${showOtherSettings ? 'active-submenu' : ''}`}
                                    onClick={() => setShowOtherSettings(!showOtherSettings)}
                                >
                                    <span className="material-icons link-icon" style={{ fontSize: '20px' }}>tune</span>
                                    Other Settings
                                    <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '20px' }}>
                                        {showOtherSettings ? 'expand_less' : 'expand_more'}
                                    </span>
                                </button>

                                {showOtherSettings && (
                                    <div className="mobile-submenu">
                                        {isAdmin && (
                                            <button className="mobile-link-item small submenu-item" onClick={() => { setShowMobileMenu(false); window.location.href = '/web/index.html?classic=true#/dashboard'; }}>
                                                <span className="material-icons link-icon">dashboard</span>
                                                Dashboard
                                            </button>
                                        )}
                                        <button className="mobile-link-item small submenu-item" onClick={() => { setShowMobileMenu(false); setShowProfileModal(true); }}>
                                            <span className="material-icons link-icon">account_circle</span>
                                            Change Profile
                                        </button>
                                        <button className="mobile-link-item small submenu-item" onClick={async () => {
                                            setShowMobileMenu(false);
                                            await jellyfinService.logout();
                                            navigate('/login/select-server');
                                        }}>
                                            <span className="material-icons link-icon">dns</span>
                                            Change Server
                                        </button>
                                        <button className="mobile-link-item small submenu-item" onClick={() => { setShowMobileMenu(false); setShowQuickConnect(true); }}>
                                            <span className="material-icons link-icon">qr_code</span>
                                            Quick Connect
                                        </button>
                                        <button className="mobile-link-item small submenu-item" onClick={() => { setShowMobileMenu(false); setShowCastModal(true); }}>
                                            <span className="material-icons link-icon">{castTarget ? 'cast_connected' : 'cast'}</span>
                                            Cast to Device
                                        </button>
                                        <button className="mobile-link-item small submenu-item" onClick={() => { setShowMobileMenu(false); setShowSyncPlayModal(true); }}>
                                            <span className="material-icons link-icon">smartphone</span>
                                            SyncPlay
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Log Out Button - Moved out of dropdown */}
                            <button className="mobile-link-item small" onClick={() => {
                                setShowMobileMenu(false);
                                jellyfinService.logout();
                            }}>
                                <span className="material-icons link-icon" style={{ fontSize: '20px' }}>logout</span>
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
            <LegitFlixSettingsModal isOpen={showLegitSettings} onClose={() => setShowLegitSettings(false)} userId={user?.Id} />
            <QuickConnectModal isOpen={showQuickConnect} onClose={() => setShowQuickConnect(false)} />
            <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} user={user} />
            <AvatarPickerModal
                isOpen={showAvatarPicker}
                onClose={() => setShowAvatarPicker(false)}
                onSave={handleAvatarFile}
                userId={user?.Id}
                uploading={uploading}
            />
            <CastModal
                isOpen={showCastModal}
                onClose={() => setShowCastModal(false)}
            />
            <SyncPlayModal
                isOpen={showSyncPlayModal}
                onClose={() => setShowSyncPlayModal(false)}
            />
        </>
    );
};


// End of Navbar.jsx


export default Navbar;
