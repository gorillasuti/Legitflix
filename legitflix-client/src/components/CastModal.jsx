import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import './CastModal.css';

const CAST_STORAGE_KEY = 'legitflix_cast_target';

const CastModal = ({ isOpen, onClose }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTarget, setActiveTarget] = useState(() => {
        try {
            const saved = localStorage.getItem(CAST_STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    useEffect(() => {
        if (!isOpen) return;
        const fetchDevices = async () => {
            try {
                setLoading(true);
                // 300s window captures TVs and media players that may be idle
                const filtered = await jellyfinService.getSessionsForCast(300);
                setSessions(filtered);
            } catch (err) {
                console.error("Failed to load sessions", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDevices();
    }, [isOpen]);

    const handleSelectTarget = (target) => {
        setActiveTarget(target);
        // Persist so players can read on mount
        try {
            if (target) {
                localStorage.setItem(CAST_STORAGE_KEY, JSON.stringify(target));
            } else {
                localStorage.removeItem(CAST_STORAGE_KEY);
            }
        } catch { }
        // Dispatch event so mounted player components react immediately
        window.dispatchEvent(new CustomEvent('castTargetUpdated', { detail: target }));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="lf-cast-modal-overlay" onClick={onClose}>
            <div className="lf-cast-modal-content" onClick={e => e.stopPropagation()}>
                <div className="lf-cast-modal-header">
                    <h2>Cast to Device</h2>
                    <button className="lf-cast-modal-close" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
                </div>
                <div className="lf-cast-modal-body">
                    {loading ? (
                        <div className="lf-cast-modal-loader">Scanning for devices...</div>
                    ) : sessions.length === 0 ? (
                        <div className="lf-cast-empty-state">
                            <span className="material-icons" style={{ fontSize: '36px', marginBottom: '8px', display: 'block', opacity: 0.4 }}>cast</span>
                            No active devices found on the network.
                            <br />
                            <small>Make sure your TV or media player has Jellyfin open.</small>
                        </div>
                    ) : (
                        <div className="lf-cast-device-list">
                            {sessions.map(s => {
                                const isActive = activeTarget && activeTarget.id === s.Id;
                                const nowPlaying = s.NowPlayingItem?.Name;
                                return (
                                    <button
                                        key={s.Id}
                                        className={`lf-cast-device-item ${isActive ? 'active' : ''}`}
                                        onClick={() => {
                                            if (isActive) {
                                                handleSelectTarget(null);
                                            } else {
                                                handleSelectTarget({ id: s.Id, name: s.DeviceName || s.Client });
                                            }
                                        }}
                                    >
                                        <span className="material-icons lf-cast-device-icon">
                                            {isActive ? 'cast_connected' : 'cast'}
                                        </span>
                                        <div className="lf-cast-device-info">
                                            <span className="lf-cast-device-name">{s.DeviceName || 'Unknown Device'}</span>
                                            <span className="lf-cast-device-client">
                                                {nowPlaying
                                                    ? `▶ ${nowPlaying}`
                                                    : `${s.Client} · ${s.UserName || 'Unknown User'}`}
                                            </span>
                                        </div>
                                        {isActive && (
                                            <span className="lf-cast-active-badge">Connected</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                {activeTarget && (
                    <div className="lf-cast-modal-footer">
                        <div className="lf-cast-active-info">
                            <span className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px', color: 'var(--clr-accent, #ff7e00)' }}>cast_connected</span>
                            Casting to <strong>{activeTarget.name}</strong>
                        </div>
                        <button
                            className="lf-cast-btn-disconnect"
                            onClick={() => handleSelectTarget(null)}
                        >
                            Disconnect
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CastModal;
