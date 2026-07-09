import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './JellyseerrCard.css';

const JellyseerrCard = () => {
    const { config } = useTheme();

    // Default to true if undefined, consistent with Settings Modal logic
    if (config.enableJellyseerr === false || config.showHomeRequestsCard === false) return null;

    // Validate the configured URL before rendering as href to prevent javascript: URI injection
    const safeJellyseerrUrl = /^https?:\/\//i.test(config.jellyseerrUrl ?? '')
        ? config.jellyseerrUrl
        : '#';

    return (
        <a
            href={safeJellyseerrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="library-card jellyseerr-card-wrapper"
        >
            <div
                className="jellyseerr-image library-card-image"
                style={{ backgroundImage: `url('${config.jellyseerrBackground || "https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/public/seerr.jpg"}')` }}
            />
            {config.showLibraryTitles && (
                <div className="library-card-overlay">
                    <span className="library-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-icons" style={{ fontSize: '1.25rem' }}>add_circle_outline</span>
                        <span>{config.jellyseerrText || 'Request'}</span>
                    </span>
                </div>
            )}
        </a>
    );
};

export default JellyseerrCard;
