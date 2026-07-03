import React from 'react';
import { jellyfinService } from '../../services/jellyfin';
import HoverCard from '../HoverCard/HoverCard';
import './MediaCard.css';

const MediaCard = ({ item, onClick, onContextMenu, isSelected, isSelectionMode }) => {
    const imageUrl = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=300&fillWidth=200&quality=90`;

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onContextMenu) {
            onContextMenu(e, item);
        }
    };

    // Build subtitle text (e.g. "Sub | Dub" or "Subtitled" or "2024")
    const getSubtitle = () => {
        const parts = [];
        if (item.ProductionYear) parts.push(item.ProductionYear);
        if (item.Type === "Series" && item.Status === "Continuing") parts.push("Airing");
        return parts.join(" · ") || "";
    };

    return (
        <div
            className={`media-card-wrapper ${isSelected ? 'is-selected' : ''}`}
            onContextMenu={handleContextMenu}
        >
            <div className="media-card" onClick={(e) => onClick(item, e)}>
                <div className="media-card-image-container">
                    <img
                        className="media-card-image"
                        src={imageUrl}
                        alt={item.Name}
                        loading="lazy"
                      />
                      {isSelectionMode && (
                          <div className={`backdrop-selection-overlay ${isSelected ? 'is-selected' : ''}`}>
                              {isSelected && <span className="material-icons" style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>check</span>}
                          </div>
                      )}
                </div>

            </div>

            <div className="media-card-info">
                <div className="media-card-title">{item.Name}</div>
                {getSubtitle() && <div className="media-card-subtitle">{getSubtitle()}</div>}
            </div>

            {/* OVERLAY - Covers entire wrapper */}
            {!isSelectionMode && (
                <HoverCard
                    item={item}
                    onPlay={() => onClick(item)}
                    onDetails={() => onClick(item)}
                    onContextMenu={onContextMenu}
                />
            )}
        </div>
    );
};

export default MediaCard;
