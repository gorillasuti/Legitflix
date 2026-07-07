
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
                        console.log("[Navbar] Fetched full user details with Policy:", finalUser);
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
            console.log("[Navbar] Received userUpdated event", e.detail);
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

    const isAdmin = user?.Policy?.IsAdministrator;
    console.log('[Navbar] User:', user, 'isAdmin:', isAdmin);

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
