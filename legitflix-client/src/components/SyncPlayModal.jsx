import React, { useState, useEffect, useRef } from 'react';
import { jellyfinService } from '../services/jellyfin';
import './SyncPlayModal.css';

const STORAGE_KEY = 'legitflix_syncplay_joined_group';

const SyncPlayModal = ({ isOpen, onClose }) => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newGroupName, setNewGroupName] = useState('');
    // Persist the joined group across modal open/close via localStorage
    const [joinedGroup, setJoinedGroup] = useState(() => {
        try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
    });
    const pollRef = useRef(null);

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

    // On open: restore persisted join state, refresh groups, start polling
    useEffect(() => {
        if (!isOpen) {
            // Stop polling when modal closes
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            return;
        }

        // Restore persisted joined group
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            setJoinedGroup(stored || null);
        } catch {}

        fetchGroups();

        // Live polling every 5 seconds while the modal is open
        pollRef.current = setInterval(() => {
            fetchGroups();
        }, 5000);

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [isOpen]);

    const persistJoin = (groupId) => {
        setJoinedGroup(groupId);
        try {
            if (groupId) {
                localStorage.setItem(STORAGE_KEY, groupId);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {}
    };

    const handleCreate = async () => {
        if (!newGroupName.trim()) return;
        try {
            await jellyfinService.createSyncPlayGroup(newGroupName.trim());
            setNewGroupName('');
            await fetchGroups();
            // After creating, fetch the new group and auto-join it
            const updatedGroups = await jellyfinService.getSyncPlayGroups();
            const created = updatedGroups?.find(g => g.GroupName === newGroupName.trim());
            if (created) {
                await jellyfinService.joinSyncPlayGroup(created.GroupId);
                persistJoin(created.GroupId);
                window.dispatchEvent(new CustomEvent('syncPlayJoined', { detail: { groupId: created.GroupId } }));
                setGroups(updatedGroups || []);
            }
        } catch (err) {
            console.error("Failed to create SyncPlay group", err);
        }
    };

    const handleJoin = async (groupId) => {
        try {
            await jellyfinService.joinSyncPlayGroup(groupId);
            persistJoin(groupId);
            // Tell mounted player hooks to activate SyncPlay synchronization
            window.dispatchEvent(new CustomEvent('syncPlayJoined', { detail: { groupId } }));
            // Refresh group list so the member count updates before the modal closes
            await fetchGroups();
        } catch (err) {
            console.error("Failed to join group", err);
        }
    };

    const handleLeave = async () => {
        try {
            await jellyfinService.leaveSyncPlayGroup();
            persistJoin(null);
            // Tell mounted player hooks to deactivate SyncPlay synchronization
            window.dispatchEvent(new CustomEvent('syncPlayLeft', { detail: null }));
            await fetchGroups();
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
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
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
                                // Bug A fix: Jellyfin uses "Participants" not "Members"
                                const memberCount = g.Participants?.length ?? g.Members?.length ?? 0;
                                return (
                                    <button
                                        key={g.GroupId}
                                        className={`lf-syncplay-device-item ${isJoined ? 'active' : ''}`}
                                        onClick={() => handleJoin(g.GroupId)}
                                    >
                                        <span className="material-icons lf-syncplay-device-icon">group</span>
                                        <div className="lf-syncplay-device-info">
                                            <span className="lf-syncplay-device-name">{g.GroupName}</span>
                                            <span className="lf-syncplay-device-client">
                                                {memberCount === 1
                                                    ? '1 member active'
                                                    : `${memberCount} members active`}
                                                {isJoined ? ' · Joined' : ''}
                                            </span>
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
