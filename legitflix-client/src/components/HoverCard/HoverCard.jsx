import React, { useEffect, useState } from 'react';
import { jellyfinService } from '../../services/jellyfin';
import { useTheme } from '../../context/ThemeContext';
import './HoverCard.css';

const HoverCard = ({ item, onPlay, onDetails, onContextMenu }) => {
    const details = item;
    const { config } = useTheme();
    const [isFavorite, setIsFavorite] = useState(details.UserData?.IsFavorite || false);
    const [isPlayed, setIsPlayed] = useState(details.UserData?.Played || false);

    // Sync state if item changes
    useEffect(() => {
        setIsFavorite(item.UserData?.IsFavorite || false);
        setIsPlayed(item.UserData?.Played || false);
    }, [item]);

    // Synchronize favorite toggles from other components in real-time
    useEffect(() => {
        const handleToggle = (e) => {
            const { itemId, isFavorite: newFav } = e.detail;
            if (itemId === item.Id) {
                setIsFavorite(newFav);
            }
        };
        window.addEventListener('favoriteToggled', handleToggle);
        return () => window.removeEventListener('favoriteToggled', handleToggle);
    }, [item.Id]);

    // Use the same image as MediaCard for the backdrop
    const backdropUrl = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=450&fillWidth=300&quality=90`;

    // Extract info from item
    const rating = details.CommunityRating ? details.CommunityRating.toFixed(1) : null;
    const year = details.ProductionYear || null;
    const isSeries = details.Type === 'Series';
    const seasons = isSeries ? (details.ChildCount ? `${details.ChildCount} Seasons` : null) : null;
    const unplayed = details.UserData?.UnplayedItemCount || null;

    const toggleFavorite = async (e) => {
        e.stopPropagation();
        try {
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                const newFav = !isFavorite;
                
                // Optimistic local update
                setIsFavorite(newFav);
                
                // Dispatch event so other components sync in real-time
                window.dispatchEvent(new CustomEvent('favoriteToggled', { 
                    detail: { itemId: item.Id, isFavorite: newFav } 
                }));

                await jellyfinService.markFavorite(user.Id, item.Id, newFav);
            }
        } catch (err) {
            console.error("Failed to toggle favorite", err);
            // Revert state on failure
            setIsFavorite(!isFavorite);
            window.dispatchEvent(new CustomEvent('favoriteToggled', { 
                detail: { itemId: item.Id, isFavorite: !isFavorite } 
            }));
        }
    };

    const togglePlayed = async (e) => {
        e.stopPropagation();
        try {
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                const newPlayed = !isPlayed;
                await jellyfinService.markPlayed(user.Id, item.Id, newPlayed);
                setIsPlayed(newPlayed);
            }
        } catch (err) {
            console.error("Failed to toggle played", err);
        }
    };

    const renderHoverBadges = () => {
        const badges = [];

        if (config.showQualityTags) {
            const videoStream = details.MediaStreams?.find(s => s.Type === 'Video');
            const width = details.Width || videoStream?.Width || 0;
            const height = details.Height || videoStream?.Height || 0;
            
            if (width >= 3840 || height >= 2160) {
                badges.push(<span key="qual" className="hover-badge quality-4k" style={{ background: 'rgba(229, 9, 20, 0.15)', border: '1px solid rgba(229, 9, 20, 0.35)', color: '#ff4d5a', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>4K UHD</span>);
            } else if (width >= 1920 || height >= 1080) {
                badges.push(<span key="qual" className="hover-badge quality-1080p" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#eee', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>1080p</span>);
            } else if (width >= 1280 || height >= 720) {
                badges.push(<span key="qual" className="hover-badge quality-720p" style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ccc', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>720p</span>);
            }
            
            const isHdr = videoStream?.VideoRangeType === 'HDR' || videoStream?.VideoRange === 'HDR' || details.VideoRange === 'HDR';
            if (isHdr) {
                badges.push(<span key="hdr" className="hover-badge quality-hdr" style={{ background: 'rgba(255, 170, 0, 0.15)', border: '1px solid rgba(255, 170, 0, 0.4)', color: '#ffc04d', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>HDR</span>);
            }
        }

        // 2. Genre Tags
        if (config.showGenreTags && details.Genres && details.Genres.length > 0) {
            const genre = details.Genres[0];
            const genreIcons = {
                'action': '🎭',
                'comedy': '😂',
                'drama': '😭',
                'horror': '🧟',
                'sci-fi': '👽',
                'thriller': '🕵️',
                'animation': '🦄',
                'documentary': '📹',
                'romance': '❤️',
                'fantasy': '🧙',
                'adventure': '🤠',
                'mystery': '🔍'
            };
            const icon = genreIcons[genre.toLowerCase()] || '🎬';
            badges.push(<span key="genre" className="hover-badge genre-tag" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', color: '#eee' }}>{icon} {genre}</span>);
        }

        // 3. Audio Language Flags
        if (config.showLanguageTags) {
            const lang = details.MediaStreams?.find(s => s.Type === 'Audio')?.Language || details.Language;
            if (lang) {
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
                const flag = flags[lang.toLowerCase()] || lang.toUpperCase();
                badges.push(<span key="lang" className="hover-badge lang-tag" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', color: '#eee' }}>{flag} {lang.toUpperCase()}</span>);
            }
        }


        if (badges.length === 0) return null;

        return (
            <div className="hover-badges-row" style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '6px',
                marginBottom: '10px'
            }}>
                {badges}
            </div>
        );
    };

    return (
        <div
            className="legitflix-hover-overlay"
            onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                onDetails();
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onContextMenu) onContextMenu(e, item);
            }}
        >
            {/* Backdrop Image */}
            <div className="hover-backdrop" style={{ backgroundImage: `url(${backdropUrl})` }}></div>
            <div className="hover-overlay-tint"></div>
            <div className="hover-body">
                <h3 className="hover-title">{details.Name}</h3>
                {renderHoverBadges()}
                <div className="hover-row">
                    {rating && (
                        <span className="hover-rating">
                            <span className="material-icons" style={{ fontSize: '15px', color: '#ffcc00' }}>star</span> {rating}
                        </span>
                    )}
                    {details.CriticRating && (
                        <span className="hover-rating" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ fontSize: '1.05rem', lineHeight: '1' }}>🍅</span> {details.CriticRating}%
                        </span>
                    )}
                    {year && <span className="hover-seasons">{year}</span>}
                    {isSeries && seasons && <span className="hover-seasons">{seasons}</span>}
                    {isSeries && unplayed && <span className="hover-unplayed">{unplayed}</span>}
                </div>
                <div className="hover-desc">
                    {details.Overview || "No description available."}
                </div>
            </div>

            <div className="hover-footer">
                <div className="hover-icon-row">
                    <button className="hover-icon-btn" title="Play user" onClick={(e) => {
                        e.stopPropagation();
                        onPlay();
                    }}>
                        <span className="material-icons">play_arrow</span>
                    </button>
                    <button 
                        className={`hover-icon-btn ${isFavorite ? 'is-active' : ''}`} 
                        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"} 
                        onClick={toggleFavorite}
                        style={isFavorite ? { color: 'var(--clr-accent, #ff3d71)' } : {}}
                    >
                        <span className="material-icons">{isFavorite ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <button 
                        className={`hover-icon-btn ${isPlayed ? 'is-active' : ''}`} 
                        title={isPlayed ? "Mark Unplayed" : "Mark Played"} 
                        onClick={togglePlayed}
                        style={isPlayed ? { color: 'var(--clr-success, #4caf50)' } : {}}
                    >
                        <span className="material-icons">{isPlayed ? 'check_circle' : 'check_circle_outline'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HoverCard;
