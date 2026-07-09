import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../services/jellyfin';
import { useTheme } from '../context/ThemeContext';
import SkeletonLoader from './SkeletonLoader';
import { Button } from '@/components/ui/button';
import './HeroCarousel.css';

const HeroCarousel = ({ items: propItems = [], loading: propLoading = false, onInfoClick }) => {
    const { config } = useTheme();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [fillKey, setFillKey] = useState(0);

    const intervalRef = useRef(null);
    const containerRef = useRef(null);

    // Sync prop items
    useEffect(() => {
        setItems(propItems || []);
        setCurrentIndex(0);
        setFillKey(0);
    }, [propItems]);

    // Carousel Logic
    const nextSlide = () => {
        setItems(currentItems => {
            if (currentItems.length === 0) return currentItems;
            setCurrentIndex(prev => (prev + 1) % currentItems.length);
            return currentItems;
        });
        setFillKey(k => k + 1);
    };

    const goToSlide = (index) => {
        setCurrentIndex(index);
        setFillKey(k => k + 1);
        resetTimer();
    };

    const resetTimer = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(nextSlide, 8000);

        // Remove paused class if present (if we had mouseover logic)
        if (containerRef.current) containerRef.current.classList.remove('carousel-paused');
    };

    const handleInteraction = () => {
        resetTimer();
    };

    useEffect(() => {
        if (items.length > 0) {
            resetTimer();
        }
        return () => clearInterval(intervalRef.current);
    }, [items]);


    // Synchronize favorite toggles from other components in real-time
    useEffect(() => {
        const handleToggle = (e) => {
            const { itemId, isFavorite } = e.detail;
            setItems(prevItems => prevItems.map(i =>
                i.Id === itemId
                    ? { ...i, UserData: { ...i.UserData, IsFavorite: isFavorite } }
                    : i
            ));
        };
        window.addEventListener('favoriteToggled', handleToggle);
        return () => window.removeEventListener('favoriteToggled', handleToggle);
    }, []);

    const toggleFav = async (e, item) => {
        e.stopPropagation();
        if (!item || !item.UserData) return;

        const originalState = item.UserData.IsFavorite;
        const newState = !originalState;

        // Optimistic UI Update
        setItems(prevItems => prevItems.map(i =>
            i.Id === item.Id
                ? { ...i, UserData: { ...i.UserData, IsFavorite: newState } }
                : i
        ));

        // Dispatch event
        window.dispatchEvent(new CustomEvent('favoriteToggled', { 
            detail: { itemId: item.Id, isFavorite: newState } 
        }));

        try {
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                await jellyfinService.markFavorite(user.Id, item.Id, newState);
            }
        } catch (err) {
            console.error("Failed to toggle favorite", err);
            // Revert on failure
            setItems(prevItems => prevItems.map(i =>
                i.Id === item.Id
                    ? { ...i, UserData: { ...i.UserData, IsFavorite: originalState } }
                    : i
            ));
            window.dispatchEvent(new CustomEvent('favoriteToggled', { 
                detail: { itemId: item.Id, isFavorite: originalState } 
            }));
        }
    };

    const handlePlay = (e, item) => {
        e.stopPropagation();
        if (item.Type === 'Series') {
            if (item._nextUp) {
                navigate(`/play/${item._nextUp.Id}`);
            } else {
                navigate(`/series/${item.Id}`);
            }
        } else if (item.Type === 'Movie') {
            navigate(`/movie/${item.Id}`, { state: { autoplay: true } });
        } else if (item.Type === 'Episode') {
            navigate(`/play/${item.Id}`);
        } else {
            navigate(`/item/${item.Id}`);
        }
    };


    if (propLoading) {
        return (
            <div className="hero-carousel-container" style={{ height: '90vh', background: '#141414', position: 'relative' }}>
                <div style={{
                    position: 'absolute',
                    top: '42.5%',
                    left: '4%',
                    transform: 'translateY(-50%)',
                    width: '40%',
                    maxWidth: '600px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem'
                }}>
                    {/* Title or Logo */}
                    <SkeletonLoader width="70%" height="60px" style={{ marginBottom: '0' }} />

                    {/* Meta Line */}
                    <SkeletonLoader width="40%" height="24px" />

                    {/* Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <SkeletonLoader width="100%" height="18px" />
                        <SkeletonLoader width="95%" height="18px" />
                        <SkeletonLoader width="60%" height="18px" />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
                        <SkeletonLoader width="160px" height="46px" style={{ borderRadius: '50px' }} />
                        <SkeletonLoader width="42px" height="42px" style={{ borderRadius: '50%' }} />
                        <SkeletonLoader width="42px" height="42px" style={{ borderRadius: '50%' }} />
                    </div>
                </div>
            </div>
        );
    }
    if (items.length === 0) return null;

    // Helper functions
    const getBackdropUrl = (id) => `${jellyfinService.api.basePath}/Items/${id}/Images/Backdrop/0?maxHeight=1080&quality=96`;
    const getLogoUrl = (id) => `${jellyfinService.api.basePath}/Items/${id}/Images/Logo?maxHeight=200&maxWidth=450&quality=90`;

    const getSubDubText = (item) => {
        let audioLangs = new Set();
        let subLangs = new Set();
        if (item.MediaStreams) {
            item.MediaStreams.forEach(stream => {
                if (stream.Type === 'Audio' && stream.Language) audioLangs.add(stream.Language);
                if (stream.Type === 'Subtitle' && stream.Language) subLangs.add(stream.Language);
            });
        }
        const hasSub = subLangs.size > 0;
        const hasDub = audioLangs.size > 1;
        if (hasSub && hasDub) return 'Sub | Dub';
        if (hasSub) return 'Sub';
        if (hasDub) return 'Dub';
        return '';
    };

    const getEndsAtHtml = (item) => {
        if (item.RunTimeTicks && item.Type !== 'Series') {
            const ms = item.RunTimeTicks / 10000;
            const endTime = new Date(Date.now() + ms);
            const timeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            return (
                <>
                    <span className="hero-meta-divider">•</span>
                    <span className="hero-meta-text">Ends at {timeStr}</span>
                </>
            );
        }
        return null;
    };

    return (
        <div id="legit-hero-carousel" className="hero-carousel-container" ref={containerRef}>
            {items.map((item, index) => {
                const isActive = index === currentIndex;
                const subDub = getSubDubText(item);
                const endsAt = getEndsAtHtml(item);
                const hasLogo = item.ImageTags && item.ImageTags.Logo;

                let btnText = 'START WATCHING';
                let btnSubText = '';

                if (item.Type === 'Series') {
                    if (item._nextUp) {
                        const s = item._nextUp.ParentIndexNumber;
                        const e = item._nextUp.IndexNumber;
                        btnText = 'CONTINUE';
                        btnSubText = `S${s} E${e}`;
                    } else {
                        btnSubText = 'S1 E1';
                    }
                } else {
                    if (item.UserData && item.UserData.PlaybackPositionTicks > 0) {
                        const pct = Math.round((item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100);
                        if (pct > 2 && pct < 90) {
                            btnText = 'CONTINUE';
                            btnSubText = ` - ${pct}%`;
                        }
                    }
                }

                const isFav = item.UserData?.IsFavorite;

                return (
                    <div
                        key={item.Id}
                        className={`hero-slide ${isActive ? 'active' : ''}`}
                        data-index={index}
                    >
                        <div
                            className="hero-backdrop"
                            style={{ backgroundImage: `url('${getBackdropUrl(item.Id)}')` }}
                        />
                        <div className="hero-overlay" />
                        <div className="hero-content">
                            {hasLogo ? (
                                <img
                                    src={getLogoUrl(item.Id)}
                                    className="hero-logo"
                                    alt={item.Name}
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.Type === 'Series') {
                                            navigate(`/series/${item.Id}`);
                                        } else if (item.Type === 'Movie') {
                                            navigate(`/movie/${item.Id}`);
                                        } else {
                                            navigate(`/item/${item.Id}`);
                                        }
                                    }}
                                />
                            ) : (
                                <h1
                                    className="hero-title"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.Type === 'Series') {
                                            navigate(`/series/${item.Id}`);
                                        } else if (item.Type === 'Movie') {
                                            navigate(`/movie/${item.Id}`);
                                        } else {
                                            navigate(`/item/${item.Id}`);
                                        }
                                    }}
                                >
                                    {item.Name}
                                </h1>
                            )}

                            <div className="hero-meta-line">
                                <span className="hero-badge-age">{item.OfficialRating || '13+'}</span>
                                {subDub && (
                                    <>
                                        <span className="hero-meta-divider">•</span>
                                        <span className="hero-meta-text">{subDub}</span>
                                    </>
                                )}
                                <span className="hero-meta-divider">•</span>
                                <span className="hero-meta-text">{item.Genres ? item.Genres.slice(0, 3).join(', ') : 'Anime'}</span>
                                {item.CommunityRating && (
                                    <>
                                        <span className="hero-meta-divider">•</span>
                                        <span className="hero-meta-text">⭐ {item.CommunityRating.toFixed(1)}</span>
                                    </>
                                )}
                                {endsAt}
                            </div>

                            <p className="hero-desc">{item.Overview}</p>

                            <div className="hero-actions flex gap-3 items-center">
                                <Button
                                    variant="ringHover"
                                    onClick={(e) => handlePlay(e, item)}
                                >
                                    <i className="material-icons">play_arrow</i>
                                    <span>{btnText} <small className="text-sm ml-1">{btnSubText}</small></span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className={`rounded-full w-12 h-12 border-2 border-white/20 bg-black/40 hover:bg-white/10 hover:border-white ${isFav ? 'text-red-500' : 'text-white'}`}
                                    onClick={(e) => toggleFav(e, item)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill={isFav ? "red" : "none"}
                                        stroke={isFav ? "red" : "currentColor"}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ width: '22px', height: '22px' }}
                                    >
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full w-12 h-12 border-2 border-white/20 bg-black/40 hover:bg-white/10 hover:border-white text-white"
                                    onClick={(e) => { e.stopPropagation(); onInfoClick(item.Id); }}
                                    title="More Info"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.75"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ width: '24px', height: '24px' }}
                                    >
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M12 16v-4"></path>
                                        <path d="M12 8h.01"></path>
                                    </svg>
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}

            <div className="hero-indicators">
                {items.map((_, index) => {
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex;
                    return (
                        <div
                            key={index}
                            className={`hero-indicator ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                            onClick={() => goToSlide(index)}
                        >
                            <div className="fill" key={`fill-${index}-${isActive ? fillKey : 'inactive'}`}></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HeroCarousel;
