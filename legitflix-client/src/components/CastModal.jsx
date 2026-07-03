import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import './CastModal.css';

const CastModal = ({ isOpen, onClose, activeTarget, onSelectTarget }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        const fetchDevices = async () => {
            try {
                setLoading(true);
                const data = await jellyfinService.getSessions();
                // Filter controllable sessions (supports media control)
                const filtered = (data || []).filter(s => s.SupportsMediaControl);
                setSessions(filtered);
            } catch (err) {
                console.error("Failed to load sessions", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDevices();
    }, [isOpen]);

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
                        <div className="lf-cast-modal-loader">Loading devices...</div>
                    ) : sessions.length === 0 ? (
                        <div className="lf-cast-empty-state">No controllable devices found on the network.</div>
                    ) : (
                        <div className="lf-cast-device-list">
                            {sessions.map(s => {
                                const isActive = activeTarget && activeTarget.id === s.Id;
                                return (
                                    <button
                                        key={s.Id}
                                        className={`lf-cast-device-item ${isActive ? 'active' : ''}`}
                                        onClick={() => {
                                            if (isActive) {
                                                onSelectTarget(null); // Disconnect
                                            } else {
                                                onSelectTarget({ id: s.Id, name: s.DeviceName || s.Client });
                                            }
                                            onClose();
                                        }}
                                    >
                                        <span className="material-icons lf-cast-device-icon">
                                            {isActive ? 'cast_connected' : 'cast'}
                                        </span>
                                        <div className="lf-cast-device-info">
                                            <span className="lf-cast-device-name">{s.DeviceName || 'Unknown Device'}</span>
                                            <span className="lf-cast-device-client">{s.Client} ({s.ApplicationVersion})</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                {activeTarget && (
                    <div className="lf-cast-modal-footer">
                        <button 
                            className="lf-cast-btn-disconnect" 
                            onClick={() => { onSelectTarget(null); onClose(); }}
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
