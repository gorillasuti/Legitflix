import React, { useEffect, useState } from 'react';
import { jellyfinService } from '../../services/jellyfin';
import './HoverCard.css';

const HoverCard = ({ item, onPlay, onDetails, onContextMenu }) => {
    const details = item;
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
                <div className="hover-row">
                    {rating && (
                        <span className="hover-rating">
                            <span className="material-icons">star</span> {rating}
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
