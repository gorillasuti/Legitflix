import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import './SyncPlayModal.css';

const SyncPlayModal = ({ isOpen, onClose }) => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newGroupName, setNewGroupName] = useState('');
    const [joinedGroup, setJoinedGroup] = useState(null);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const data = await jellyfinService.getSyncPlayGroups();
            setGroups(data || []);
        } catch (err) {
            console.error("Failed to load SyncPlay groups", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        fetchGroups();
    }, [isOpen]);

    const handleCreate = async () => {
        if (!newGroupName.trim()) return;
        try {
            await jellyfinService.createSyncPlayGroup(newGroupName.trim());
            setNewGroupName('');
            await fetchGroups();
        } catch (err) {
            console.error("Failed to create SyncPlay group", err);
        }
    };

    const handleJoin = async (groupId) => {
        try {
            await jellyfinService.joinSyncPlayGroup(groupId);
            setJoinedGroup(groupId);
            onClose();
        } catch (err) {
            console.error("Failed to join group", err);
        }
    };

    const handleLeave = async () => {
        try {
            await jellyfinService.leaveSyncPlayGroup();
            setJoinedGroup(null);
            onClose();
        } catch (err) {
            console.error("Failed to leave group", err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="lf-syncplay-modal-overlay" onClick={onClose}>
            <div className="lf-syncplay-modal-content" onClick={e => e.stopPropagation()}>
                <div className="lf-syncplay-modal-header">
                    <h2>SyncPlay Groups</h2>
                    <button className="lf-syncplay-modal-close" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
                </div>
                <div className="lf-syncplay-modal-body">
                    <div className="lf-syncplay-input-row">
                        <input
                            type="text"
                            className="lf-syncplay-pill-input"
                            placeholder="New group name..."
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                        />
                        <button 
                            className="lf-syncplay-btn-create" 
                            onClick={handleCreate}
                        >
                            Create
                        </button>
                    </div>

                    <div className="lf-syncplay-divider"></div>

                    {loading ? (
                        <div className="lf-syncplay-modal-loader">Loading groups...</div>
                    ) : groups.length === 0 ? (
                        <div className="lf-syncplay-empty-state">No active SyncPlay groups found.</div>
                    ) : (
                        <div className="lf-syncplay-device-list">
                            {groups.map(g => {
                                const isJoined = joinedGroup === g.GroupId;
                                return (
                                    <button
                                        key={g.GroupId}
                                        className={`lf-syncplay-device-item ${isJoined ? 'active' : ''}`}
                                        onClick={() => handleJoin(g.GroupId)}
                                    >
                                        <span className="material-icons lf-syncplay-device-icon">group</span>
                                        <div className="lf-syncplay-device-info">
                                            <span className="lf-syncplay-device-name">{g.GroupName}</span>
                                            <span className="lf-syncplay-device-client">{g.Members?.length || 0} members active</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                {joinedGroup && (
                    <div className="lf-syncplay-modal-footer">
                        <button 
                            className="lf-syncplay-btn-leave" 
                            onClick={handleLeave}
                        >
                            Leave Group
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SyncPlayModal;
