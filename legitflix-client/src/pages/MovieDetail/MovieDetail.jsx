import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SubtitleModal from '../../components/SubtitleModal';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import AddToListModal from '../../components/AddToListModal';
import EditMetadataModal from '../../components/EditMetadataModal';
import EditImagesModal from '../../components/EditImagesModal';
import IdentifyModal from '../../components/IdentifyModal';
import MediaInfoModal from '../../components/MediaInfoModal';
import { showToast } from '../../services/toast';
import { useDraggableScroll } from '../../hooks/useDraggableScroll';

import './MovieDetail.css';
import SkeletonLoader from '../../components/SkeletonLoader';
import jellyfinService from '../../services/jellyfin';
import Footer from '../../components/Footer';
import MoviePlayer from './MoviePlayer';
import CircleCheckIcon from '../../components/CircleCheckIcon';

const DraggableRow = ({ children, className }) => {
    const rowRef = useRef(null);
    const { events } = useDraggableScroll(rowRef);
    return (
        <div ref={rowRef} className={className} {...events} style={{ overflowX: 'auto', cursor: 'grab' }}>
            {children}
        </div>
    );
};

const MovieDetail = () => {
    console.log("[MovieDetail] Components Audit:", {
        Navbar: typeof Navbar,
        SubtitleModal: typeof SubtitleModal,
        SkeletonLoader: typeof SkeletonLoader,
        jellyfinService: typeof jellyfinService,
        MoviePlayer: typeof MoviePlayer,
        Footer: typeof Footer
    });
    const { id } = useParams();
    const navigate = useNavigate();
    const [movie, setMovie] = useState(null);
    const [similars, setSimilars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);

    // UI States
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    // Preferences
    const [audioPref, setAudioPref] = useState(localStorage.getItem('legitflix-audio-pref') || 'en');
    const [subPref, setSubPref] = useState(localStorage.getItem('legitflix-sub-pref') || 'en');
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

    // Trailer / Clean View States
    const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
    const [isCleanView, setIsCleanView] = useState(false);
    const [showTrailerHelp, setShowTrailerHelp] = useState(false);
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [trailerKey, setTrailerKey] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isPlayed, setIsPlayed] = useState(false);
    const [videoRatio, setVideoRatio] = useState(16 / 9);
    const [enableBackdrops, setEnableBackdrops] = useState(true);

    // Action menu and modals state
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState(null);
    const [listModalOpen, setListModalOpen] = useState(false);
    const [listModalType, setListModalType] = useState('playlist'); // 'playlist' | 'collection'
    const [listModalItemId, setListModalItemId] = useState(null);
    const [editMetaOpen, setEditMetaOpen] = useState(false);
    const [editImagesOpen, setEditImagesOpen] = useState(false);
    const [identifyOpen, setIdentifyOpen] = useState(false);
    const [mediaInfoModalOpen, setMediaInfoModalOpen] = useState(false);
    const [mediaInfoModalItemId, setMediaInfoModalItemId] = useState(null);

    const langDropdownRef = useRef(null);
    const actionMenuRef = useRef(null);
    const trailerHelpTimeout = useRef(null);
    const cleanViewTimeout = useRef(null);
    const trailerIframeRef = useRef(null);
    const isTrailerPlayingRef = useRef(false);

    // Initial Data Load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) return;

                // 1. Fetch Movie Details
                const movieData = await jellyfinService.getItemDetails(user.Id, id);
                setMovie(movieData);
                setIsFavorite(movieData.UserData?.IsFavorite || false);
                setIsPlayed(movieData.UserData?.Played || false);

                // Extract trailer key (if exists)
                if (movieData.RemoteTrailers && movieData.RemoteTrailers.length > 0) {
                    const url = movieData.RemoteTrailers[0].Url;
                    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                    if (ytMatch && ytMatch[1]) {
                        setTrailerKey(ytMatch[1]);
                    }
                }

                // 2. Fetch Similar Items
                const similarData = await jellyfinService.getSimilarItems(user.Id, id);
                setSimilars(similarData.Items || []);

                // 3. Fetch Display Preferences for backdrop setting
                try {
                    const prefs = await jellyfinService.getDisplayPreferences("usersettings");
                    if (prefs?.CustomPrefs?.enableBackdrops === "false") {
                        setEnableBackdrops(false);
                    }
                } catch (prefError) {
                    console.warn("Failed to load display preferences for backdrops", prefError);
                }

            } catch (error) {
                console.error("Failed to load movie data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        if (movie) {
            document.title = `Legitflix - ${movie.Name}`;
        } else {
            document.title = "LegitFlix - Movie";
        }
    }, [movie]);

    // Handle Auto-Play / Scroll from Navigation State
    const location = useLocation();
    useEffect(() => {
        if (location.state?.autoplay && !loading && movie) {
            scrollToPlayer();
        }
    }, [location.state, loading, movie]);




    const handlePrefChange = (type, value) => {
        if (type === 'audio') {
            setAudioPref(value);
            localStorage.setItem('legitflix-audio-pref', value);
        } else {
            setSubPref(value);
            localStorage.setItem('legitflix-sub-pref', value);
        }
        setIsLangDropdownOpen(false);
    };

    // Synchronize favorite toggles in real-time
    useEffect(() => {
        const handleToggle = (e) => {
            const { itemId, isFavorite: newFav } = e.detail;
            if (movie && movie.Id === itemId) {
                setIsFavorite(newFav);
            }
        };
        window.addEventListener('favoriteToggled', handleToggle);
        return () => window.removeEventListener('favoriteToggled', handleToggle);
    }, [movie]);

    const toggleFavorite = async () => {
        try {
            const user = await jellyfinService.getCurrentUser();
            const newFav = !isFavorite;
            // Optimistic update
            setIsFavorite(newFav);
            window.dispatchEvent(new CustomEvent('favoriteToggled', {
                detail: { itemId: movie.Id, isFavorite: newFav }
            }));
            await jellyfinService.markFavorite(user.Id, movie.Id, newFav);
        } catch (err) {
            console.error("Favorite toggle failed", err);
            // Revert on failure
            setIsFavorite(isFavorite);
            window.dispatchEvent(new CustomEvent('favoriteToggled', {
                detail: { itemId: movie.Id, isFavorite: isFavorite }
            }));
        }
    };

    const togglePlayed = async () => {
        try {
            const user = await jellyfinService.getCurrentUser();
            const newPlayed = !isPlayed;
            await jellyfinService.markPlayed(user.Id, movie.Id, newPlayed);
            setIsPlayed(newPlayed);
            // Update local state
            setMovie(prev => ({ ...prev, UserData: { ...prev.UserData, Played: newPlayed } }));
        } catch (err) {
            console.error("Played toggle failed", err);
        }
    };

    // Close dropdown on outside click or press ESC
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isActionMenuOpen && actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
                setIsActionMenuOpen(false);
            }
            if (isLangDropdownOpen && langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
                setIsLangDropdownOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsActionMenuOpen(false);
                setIsLangDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isActionMenuOpen, isLangDropdownOpen]);

    const handleActionClick = async (actionId) => {
        setIsActionMenuOpen(false);
        if (!movie) return;

        switch (actionId) {
            case 'addtocollection':
                setListModalItemId(movie.Id);
                setListModalType('collection');
                setListModalOpen(true);
                break;
            case 'addtoplaylist':
                setListModalItemId(movie.Id);
                setListModalType('playlist');
                setListModalOpen(true);
                break;
            case 'download':
                try {
                    const downloadUrl = jellyfinService.getDownloadUrl(movie.Id);
                    window.open(downloadUrl, '_blank');
                    showToast('Download started', 'success');
                } catch (e) {
                    console.error("Download failed:", e);
                    showToast('Download failed', 'error');
                }
                break;
            case 'copy-stream':
                try {
                    const streamUrl = jellyfinService.getDirectStreamUrl(movie.Id);
                    await navigator.clipboard.writeText(streamUrl);
                    showToast('Stream URL copied to clipboard!', 'success');
                } catch (err) {
                    console.error("Failed to copy stream url:", err);
                    showToast('Failed to copy stream URL', 'error');
                }
                break;
            case 'delete':
                setDeleteItem(movie);
                break;
            case 'edit':
                setEditMetaOpen(true);
                break;
            case 'editimages':
                setEditImagesOpen(true);
                break;
            case 'editsubtitles':
                setIsSubtitleModalOpen(true);
                break;
            case 'identify':
                setIdentifyOpen(true);
                break;
            case 'moremediainfo':
                setMediaInfoModalItemId(movie.Id);
                setMediaInfoModalOpen(true);
                break;
            case 'refresh':
                try {
                    await jellyfinService.refreshMetadata(movie.Id);
                    showToast('Metadata refresh queued', 'success');
                    // Reload item details
                    const user = await jellyfinService.getCurrentUser();
                    const data = await jellyfinService.getItemDetails(user.Id, id);
                    if (data) setMovie(data);
                } catch (e) {
                    console.error("Refresh failed:", e);
                    showToast('Refresh failed', 'error');
                }
                break;
            case 'share':
                try {
                    await navigator.clipboard.writeText(window.location.href);
                    showToast('Link copied to clipboard!', 'success');
                } catch (e) {
                    console.error("Share failed:", e);
                }
                break;
            default:
                console.log("Action click:", actionId);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteItem) return;
        try {
            await jellyfinService.deleteItem(deleteItem.Id);
            showToast('Movie deleted successfully', 'success');
            setDeleteItem(null);
            navigate('/');
        } catch (e) {
            console.error("Delete failed:", e);
            showToast('Failed to delete movie', 'error');
        }
    };

    // Trailer Logic
    const toggleMute = () => {
        const newMute = !isMuted;
        setIsMuted(newMute);
        // postMessage to YT player
        const action = newMute ? 'mute' : 'unMute';
        trailerIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: action, args: [] }),
            '*'
        );
    };

    const startCleanViewTimer = () => {
        if (cleanViewTimeout.current) clearTimeout(cleanViewTimeout.current);
        cleanViewTimeout.current = setTimeout(() => {
            if (isTrailerPlayingRef.current) {
                setIsCleanView(true);
            }
        }, 5000);
    };

    const resetCleanViewTimer = () => {
        setIsCleanView(false);
        if (isTrailerPlayingRef.current) {
            startCleanViewTimer();
        }
    };

    const handleWatchTrailer = () => {
        if (isTrailerPlaying) {
            handleStopTrailer();
            return;
        }

        isTrailerPlayingRef.current = true;
        setIsTrailerPlaying(true);

        // Mobile: Hide UI immediately
        if (window.innerWidth <= 768) {
            setIsCleanView(true);
        } else {
            setIsCleanView(false); // Reset clean view start state
            startCleanViewTimer();
        }

        // YouTube Blocking Detection
        let receivedMessage = false;
        const messageHandler = (event) => {
            if (typeof event.data === 'string' && (event.data.includes('"event"') || event.data.includes('"id"'))) {
                receivedMessage = true;
                if (trailerHelpTimeout.current) clearTimeout(trailerHelpTimeout.current);
            }
        };
        window.addEventListener('message', messageHandler);

        // Store handler to remove later if needed (though we rely on state reset)
        window.lfMessageHandler = messageHandler;

        // Auto-show help if no message received (but we now always show the button too)
        trailerHelpTimeout.current = setTimeout(() => {
            if (!receivedMessage && isTrailerPlaying) {
                console.log('Possible block detected: No YT API message received.');
                setShowTrailerHelp(true);
            }
        }, 4000);
    };

    const handleStopTrailer = () => {
        isTrailerPlayingRef.current = false;
        setIsTrailerPlaying(false);
        setIsCleanView(false);
        setShowTrailerHelp(false);
        setShowBlockedModal(false);
        setIsMuted(false); // Reset mute on stop

        if (cleanViewTimeout.current) {
            clearTimeout(cleanViewTimeout.current);
            cleanViewTimeout.current = null;
        }
        if (trailerHelpTimeout.current) {
            clearTimeout(trailerHelpTimeout.current);
            trailerHelpTimeout.current = null;
        }

        if (window.lfMessageHandler) {
            window.removeEventListener('message', window.lfMessageHandler);
            delete window.lfMessageHandler;
        }
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (cleanViewTimeout.current) clearTimeout(cleanViewTimeout.current);
            if (trailerHelpTimeout.current) clearTimeout(trailerHelpTimeout.current);
            if (window.lfMessageHandler) window.removeEventListener('message', window.lfMessageHandler);
        };
    }, []);

    // Skeleton Loader
    if (loading) {
        return (
            <div className="lf-movie-container">
                <Navbar alwaysFilled={true} />
                <section className="lf-movie-hero">
                    <div className="lf-movie-hero__backdrop" style={{ background: '#141414' }}></div>
                    <div className="lf-movie-hero__content">
                        <div className="lf-movie-hero__poster">
                            <SkeletonLoader type="rect" width="100%" height="100%" style={{ aspectRatio: '2/3', borderRadius: '8px' }} />
                        </div>

                        <div className="lf-movie-hero__info">
                            <h1 className="lf-movie-hero__title" style={{ marginBottom: '1rem' }}>
                                <SkeletonLoader type="text" width="60%" height="3rem" />
                            </h1>

                            <div className="lf-movie-hero__meta" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <SkeletonLoader type="text" width="60px" />
                                <SkeletonLoader type="text" width="40px" />
                                <SkeletonLoader type="text" width="80px" />
                            </div>

                            <div className="lf-movie-hero__details">
                                <div className="lf-movie-hero__description">
                                    <SkeletonLoader type="text" width="100%" />
                                    <SkeletonLoader type="text" width="95%" />
                                    <SkeletonLoader type="text" width="90%" />
                                </div>

                                <div className="lf-movie-hero__cast-info" style={{ marginTop: '1rem' }}>
                                    <SkeletonLoader type="text" width="80%" />
                                    <SkeletonLoader type="text" width="70%" />
                                </div>
                            </div>

                            <div className="lf-movie-hero__actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                <SkeletonLoader type="rect" width="180px" height="48px" style={{ borderRadius: '24px' }} />
                                <SkeletonLoader type="rect" width="160px" height="48px" style={{ borderRadius: '24px' }} />
                            </div>
                        </div>
                    </div>
                </section>

                <div className="lf-content-section">
                    <SkeletonLoader type="text" width="200px" height="2rem" style={{ marginBottom: '20px' }} />
                    <div className="lf-cast-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="lf-cast-card">
                                <SkeletonLoader type="rect" width="100px" height="100px" style={{ borderRadius: '50%', marginBottom: '10px' }} />
                                <SkeletonLoader type="text" width="80%" style={{ margin: '0 auto 4px' }} />
                                <SkeletonLoader type="text" width="60%" style={{ margin: '0 auto' }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    if (!movie) return <div className="lf-movie-container" style={{ color: 'white' }}>Movie not found</div>;

    const backdropUrl = jellyfinService.getImageUrl(movie, 'Backdrop');
    const posterUrl = jellyfinService.getImageUrl(movie, 'Primary');
    const logoUrl = jellyfinService.getImageUrl(movie, 'Logo');

    // Cast processing: Take top 10
    const cast = movie.People ? movie.People.slice(0, 10) : [];

    // Dummy languages for selector (In real app, we'd scan available streams from first ep)
    const audioOptions = [{ code: 'en', name: 'English' }, { code: 'ja', name: 'Japanese' }];
    const subOptions = [{ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }, { code: 'hu', name: 'Hungarian' }];

    const formatDuration = (ticks) => {
        if (!ticks) return '';
        const minutes = Math.floor(ticks / 600000000);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
    };

    const scrollToPlayer = async () => {
        const savedCast = localStorage.getItem('legitflix_cast_target');
        if (savedCast) {
            try {
                const target = JSON.parse(savedCast);
                await jellyfinService.playOnSession(target.id, movie.Id);
                alert(`Casting "${movie.Name}" to ${target.name}`);
                return;
            } catch (err) {
                console.error("Casting play failed", err);
            }
        }
        const playerSection = document.querySelector('.lf-movie-player-container');
        if (playerSection) {
            playerSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="lf-movie-container">
            <Navbar alwaysFilled={true} />

            {/* Hero Section */}
            <section
                className={`lf-movie-hero ${isCleanView ? 'is-clean-view' : ''}`}
                onMouseMove={resetCleanViewTimer}
                onClick={resetCleanViewTimer}
            >
                <div className={`lf-movie-hero__backdrop ${isTrailerPlaying ? 'is-hidden' : ''}`} style={enableBackdrops ? { backgroundImage: `url('${backdropUrl}')` } : { background: '#141414' }}></div>

                {/* Trailer Container */}
                <div className={`lf-movie-hero__trailer ${isTrailerPlaying ? 'is-playing' : ''}`}>
                    {isTrailerPlaying && trailerKey && (
                        <>
                            <iframe
                                ref={trailerIframeRef}
                                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${trailerKey}&enablejsapi=1&origin=${window.location.origin}&widget_referrer=${window.location.origin}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                                title="Trailer"
                            />
                            {/* Click to stop overlay */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    zIndex: 10,
                                    cursor: 'pointer'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleStopTrailer();
                                }}
                                title="Click to stop trailer"
                            />
                        </>
                    )}
                </div>

                {/* Trouble Playing - shows in clean-view with logo */}
                {isTrailerPlaying && (
                    <button
                        className="lf-trailer-help-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowBlockedModal(true);
                        }}
                    >
                        <span className="material-icons">help_outline</span>
                        <span>Trouble playing?</span>
                    </button>
                )}

                {/* Clean View Logo */}
                {logoUrl && (
                    <img
                        className="lf-movie-hero__logo"
                        src={logoUrl}
                        alt={movie.Name}
                    />
                )}

                <div className="lf-movie-hero__content">
                    <img className="lf-movie-hero__poster" src={posterUrl} alt={movie.Name} />

                    <div className="lf-movie-hero__info">
                        {logoUrl ? (
                            <img
                                className="lf-hero-title-logo"
                                src={logoUrl}
                                alt={movie.Name}
                            />
                        ) : (
                            <h1 className="lf-movie-hero__title">{movie.Name}</h1>
                        )}

                        <div className="lf-movie-hero__meta">
                            <span>{movie.ProductionYear}</span>
                            <span>•</span>
                            <span>{movie.OfficialRating}</span>
                            <span>•</span>
                            <span>{formatDuration(movie.RunTimeTicks)}</span>
                            <span>•</span>
                            <div className="lf-movie-hero__rating">
                                <span className="material-icons">star</span>
                                <span>{movie.CommunityRating ? movie.CommunityRating.toFixed(1) : ''}</span>
                            </div>
                        </div>

                        <div className="lf-movie-hero__details">
                            <div className="lf-movie-hero__description">
                                <p className={`lf-movie-hero__description-text ${isDescExpanded ? 'is-expanded' : ''}`}>
                                    {movie.Overview}
                                </p>
                                {movie.Overview && movie.Overview.length > 200 && (
                                    <button
                                        className={`lf-movie-hero__load-more ${isDescExpanded ? 'is-expanded' : ''}`}
                                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                                    >
                                        {isDescExpanded ? 'Show Less' : 'Read More'}
                                        <span className="material-icons">expand_more</span>
                                    </button>
                                )}
                            </div>

                            {cast.length > 0 && (
                                <div className="lf-movie-hero__cast-info">
                                    <div style={{ marginBottom: 8 }}>
                                        <strong>Starring: </strong>
                                        {cast.slice(0, 3).map(p => p.Name).join(', ')}
                                        {cast.length > 3 && <span>...</span>}
                                    </div>
                                    <div>
                                        <strong>Genres: </strong>
                                        {movie.Genres ? movie.Genres.join(', ') : ''}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lf-movie-hero__actions">
                            <button
                                className="lf-btn lf-btn--primary lf-btn--ring-hover"
                                onClick={scrollToPlayer}
                            >
                                <span className="material-icons">play_arrow</span>
                                {movie.UserData?.PlaybackPositionTicks > 0
                                    ? 'Resume'
                                    : 'Start Watching'
                                }
                            </button>
                            <button
                                className="lf-btn lf-btn--glass lf-btn--ring-hover-secondary"
                                onClick={handleWatchTrailer}
                                style={!trailerKey ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                            >
                                <span className="material-icons">{isTrailerPlaying ? 'stop_circle' : 'theaters'}</span>
                                {isTrailerPlaying ? 'Stop Trailer' : 'Watch Trailer'}
                            </button>
                            {isTrailerPlaying && (
                                <button className={`lf-btn lf-btn--glass lf-btn--icon-only ${isMuted ? 'is-muted' : ''}`} onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
                                    <span className="material-icons">{isMuted ? 'volume_off' : 'volume_up'}</span>
                                </button>
                            )}
                            <button
                                className={`lf-btn lf-btn--glass lf-btn--icon-only ${isFavorite ? 'is-active' : ''}`}
                                onClick={toggleFavorite}
                                title="Add to List"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill={isFavorite ? "red" : "none"}
                                    stroke={isFavorite ? "red" : "currentColor"}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ width: '22px', height: '22px' }}
                                >
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </button>
                            {/* Audio & Subs Dropdown */}
                            <div className={`lf-movie-actions-dropdown-wrapper ${isLangDropdownOpen ? 'is-open' : ''}`} ref={langDropdownRef} style={{ position: 'relative' }}>
                                <button
                                    className={`lf-btn lf-btn--glass lf-btn--icon-only ${isLangDropdownOpen ? 'is-active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsLangDropdownOpen(!isLangDropdownOpen);
                                        setIsActionMenuOpen(false);
                                    }}
                                    title="Audio & Subtitles"
                                >
                                    <span className="material-icons">subtitles</span>
                                </button>
                                {isLangDropdownOpen && (
                                    <div className="lf-movie-actions-popover lf-lang-popover" style={{ right: 0, width: '220px' }}>
                                        <div className="actionSheetContent">
                                            <div className="actionSheetScroller scrollY">
                                                <div className="lf-dropdown-section-title" style={{ padding: '6px 12px 2px 12px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>Audio</div>
                                                {audioOptions.map(opt => (
                                                    <button
                                                        key={opt.code}
                                                        type="button"
                                                        className="actionSheetMenuItem"
                                                        style={audioPref === opt.code ? { color: 'var(--clr-accent)' } : {}}
                                                        onClick={() => { handlePrefChange('audio', opt.code); setIsLangDropdownOpen(false); }}
                                                    >
                                                        <span className="material-icons" style={{ fontSize: '18px', color: audioPref === opt.code ? 'var(--clr-accent)' : 'transparent' }}>check</span>
                                                        <div className="listItemBodyText">{opt.name}</div>
                                                    </button>
                                                ))}
                                                <div className="actionsheetDivider"></div>
                                                <div className="lf-dropdown-section-title" style={{ padding: '6px 12px 2px 12px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>Subtitles</div>
                                                {subOptions.map(opt => (
                                                    <button
                                                        key={opt.code}
                                                        type="button"
                                                        className="actionSheetMenuItem"
                                                        style={subPref === opt.code ? { color: 'var(--clr-accent)' } : {}}
                                                        onClick={() => { handlePrefChange('sub', opt.code); setIsLangDropdownOpen(false); }}
                                                    >
                                                        <span className="material-icons" style={{ fontSize: '18px', color: subPref === opt.code ? 'var(--clr-accent)' : 'transparent' }}>check</span>
                                                        <div className="listItemBodyText">{opt.name}</div>
                                                    </button>
                                                ))}
                                                <div className="actionsheetDivider"></div>
                                                <button
                                                    type="button"
                                                    className="actionSheetMenuItem"
                                                    onClick={() => {
                                                        setIsLangDropdownOpen(false);
                                                        setIsSubtitleModalOpen(true);
                                                    }}
                                                >
                                                    <span className="material-icons" style={{ fontSize: '18px' }}>edit</span>
                                                    <div className="listItemBodyText">Edit Subtitles</div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mark Watched Button */}
                            <button
                                className={`lf-btn lf-btn--glass lf-btn--icon-only ${isPlayed ? 'is-active' : ''}`}
                                onClick={togglePlayed}
                                title={isPlayed ? "Mark Unwatched" : "Mark Watched"}
                                style={isPlayed ? { color: '#00e676', borderColor: '#00e676', background: 'rgba(0, 230, 118, 0.1)' } : {}}
                            >
                                <CircleCheckIcon size={22} color="currentColor" />
                            </button>

                            {/* Action Menu Cogwheel */}
                            <div className="lf-movie-actions-dropdown-wrapper" ref={actionMenuRef} style={{ position: 'relative' }}>
                                <button
                                    className={`lf-btn lf-btn--glass lf-btn--icon-only lf-cogwheel-btn ${isActionMenuOpen ? 'is-active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsActionMenuOpen(!isActionMenuOpen);
                                        setIsLangDropdownOpen(false);
                                    }}
                                    title="Settings"
                                >
                                    <span className="material-icons">settings</span>
                                </button>

                                {isActionMenuOpen && (
                                    <div className="lf-movie-actions-popover lf-context-menu">
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('addtocollection')}>
                                            <span className="material-icons lf-context-menu__icon">playlist_add</span>
                                            <span className="lf-context-menu__label">Add to collection</span>
                                        </button>
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('addtoplaylist')}>
                                            <span className="material-icons lf-context-menu__icon">playlist_add</span>
                                            <span className="lf-context-menu__label">Add to playlist</span>
                                        </button>
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('download')}>
                                            <span className="material-icons lf-context-menu__icon">file_download</span>
                                            <span className="lf-context-menu__label">Download</span>
                                        </button>
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('copy-stream')}>
                                            <span className="material-icons lf-context-menu__icon">content_copy</span>
                                            <span className="lf-context-menu__label">Copy Stream URL</span>
                                        </button>
                                        <button type="button" className="lf-context-menu__item is-danger" onClick={() => handleActionClick('delete')}>
                                            <span className="material-icons lf-context-menu__icon">delete</span>
                                            <span className="lf-context-menu__label">Delete media</span>
                                        </button>
                                        <div className="lf-context-menu__separator"></div>
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('edit')}>
                                            <span className="material-icons lf-context-menu__icon">edit</span>
                                            <span className="lf-context-menu__label">Edit metadata</span>
                                        </button>
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('editimages')}>
                                            <span className="material-icons lf-context-menu__icon">image</span>
                                            <span className="lf-context-menu__label">Edit images</span>
                                        </button>
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('editsubtitles')}>
                                            <span className="material-icons lf-context-menu__icon">closed_caption</span>
                                            <span className="lf-context-menu__label">Edit subtitles</span>
                                        </button>
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('identify')}>
                                            <span className="material-icons lf-context-menu__icon">search</span>
                                            <span className="lf-context-menu__label">Identify</span>
                                        </button>
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('moremediainfo')}>
                                            <span className="material-icons lf-context-menu__icon">info</span>
                                            <span className="lf-context-menu__label">Media Info</span>
                                        </button>
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('refresh')}>
                                            <span className="material-icons lf-context-menu__icon">refresh</span>
                                            <span className="lf-context-menu__label">Refresh metadata</span>
                                        </button>
                                        <button type="button" className="lf-context-menu__item" onClick={() => handleActionClick('share')}>
                                            <span className="material-icons lf-context-menu__icon">share</span>
                                            <span className="lf-context-menu__label">Share</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </section>

            <hr className="lf-section-divider" />
            {/* Embedded Player */}
            <div className="lf-movie-player-container" style={{ aspectRatio: videoRatio }}>
                <MoviePlayer
                    itemId={movie.Id}
                    serverId={movie.ServerId}
                    forceAutoPlay={location.state?.autoplay}
                    onVideoRatioChange={setVideoRatio}
                />
            </div>

            <hr className="lf-section-divider" />

            {/* Cast & Crew Section */}
            {cast.length > 0 && (
                <div className="lf-content-section">
                    <h2 className="lf-section-title">Cast & Crew</h2>
                    <DraggableRow className="lf-cast-grid">
                        {cast.map(person => (
                            <div key={person.Id || person.Name} className="lf-cast-card">
                                <img
                                    src={jellyfinService.getImageUrl(person, 'Primary') || 'https://via.placeholder.com/80x80?text=?'}
                                    alt={person.Name}
                                    className="lf-cast-card__image"
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/80x80?text=?' }}
                                />
                                <div className="lf-cast-card__name">{person.Name}</div>
                                <div className="lf-cast-card__role">{person.Role}</div>
                            </div>
                        ))}
                    </DraggableRow>
                </div>
            )}

            <hr className="lf-section-divider" />

            {/* More Like This Section */}
            {similars.length > 0 && (
                <div className="lf-content-section" style={{ marginBottom: 40 }}>
                    <h2 className="lf-section-title">More Like This</h2>
                    <DraggableRow className="lf-similar-grid">
                        {similars.map(item => (
                            <Link to={`/movie/${item.Id}`} key={item.Id} className="lf-similar-card">
                                <img
                                    className="lf-similar-card__poster"
                                    src={jellyfinService.getImageUrl(item, 'Primary')}
                                    alt={item.Name}
                                    loading="lazy"
                                />
                                <div className="lf-similar-card__title">{item.Name}</div>
                            </Link>
                        ))}
                    </DraggableRow>
                </div>
            )}

            <SubtitleModal
                isOpen={isSubtitleModalOpen}
                onClose={() => setIsSubtitleModalOpen(false)}
                seriesId={movie ? movie.Id : ''}
                initialSeasonId={null}
                initialEpisodeId={movie ? movie.Id : ''}
                isMovie={true}
            />

            {/* Added action Modals */}
            <DeleteConfirmationModal
                isOpen={deleteItem !== null}
                onClose={() => setDeleteItem(null)}
                onConfirm={handleConfirmDelete}
                itemName={deleteItem?.Name || ''}
            />

            <AddToListModal
                isOpen={listModalOpen}
                onClose={() => setListModalOpen(false)}
                itemId={listModalItemId}
                type={listModalType}
            />

            {editMetaOpen && (
                <EditMetadataModal
                    isOpen={editMetaOpen}
                    onClose={() => setEditMetaOpen(false)}
                    itemId={movie.Id}
                    onSave={async () => {
                        const user = await jellyfinService.getCurrentUser();
                        const data = await jellyfinService.getItemDetails(user.Id, id);
                        if (data) setMovie(data);
                    }}
                />
            )}

            {editImagesOpen && (
                <EditImagesModal
                    isOpen={editImagesOpen}
                    onClose={() => setEditImagesOpen(false)}
                    itemId={movie.Id}
                    onSave={async () => {
                        const user = await jellyfinService.getCurrentUser();
                        const data = await jellyfinService.getItemDetails(user.Id, id);
                        if (data) setMovie(data);
                    }}
                />
            )}

            {identifyOpen && (
                <IdentifyModal
                    isOpen={identifyOpen}
                    onClose={() => setIdentifyOpen(false)}
                    itemId={movie.Id}
                    itemName={movie.Name}
                    itemType={movie.Type}
                    onSave={async () => {
                        const user = await jellyfinService.getCurrentUser();
                        const data = await jellyfinService.getItemDetails(user.Id, id);
                        if (data) setMovie(data);
                    }}
                />
            )}

            {mediaInfoModalOpen && (
                <MediaInfoModal
                    isOpen={mediaInfoModalOpen}
                    onClose={() => {
                        setMediaInfoModalOpen(false);
                        setMediaInfoModalItemId(null);
                    }}
                    itemId={mediaInfoModalItemId}
                />
            )}

            {/* Blocked Modal */}
            {showBlockedModal && (
                <div className="lf-blocked-modal-overlay" onClick={() => { setShowBlockedModal(false); handleStopTrailer(); }}>
                    <div className="lf-blocked-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="lf-blocked-modal__close"
                            onClick={() => { setShowBlockedModal(false); handleStopTrailer(); }}
                        >
                            <span className="material-icons">close</span>
                        </button>
                        <span className="material-icons lf-blocked-icon">error_outline</span>
                        <h3>Playback issue</h3>
                        <p>The trailer can't play - your browser's tracking protection or ad blocker is likely blocking the YouTube embed.</p>
                        <button
                            className="lf-btn lf-btn--glass"
                            onClick={() => {
                                setShowBlockedModal(false);
                                handleStopTrailer();
                            }}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieDetail;
