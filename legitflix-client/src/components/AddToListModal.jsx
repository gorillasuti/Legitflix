import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import { showToast } from '../services/toast';
import './AddToListModal.css';

const AddToListModal = ({ isOpen, onClose, itemId, type = 'playlist' }) => {
    const [lists, setLists] = useState([]);
    const [newListName, setNewListName] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingLists, setLoadingLists] = useState(false);

    useEffect(() => {
        if (isOpen && itemId) {
            fetchLists();
        }
    }, [isOpen, itemId, type]);

    const fetchLists = async () => {
        setLoadingLists(true);
        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user) {
                showToast('Authentication error', 'error');
                onClose();
                return;
            }

            let result;
            if (type === 'playlist') {
                result = await jellyfinService.getPlaylists(user.Id);
            } else {
                result = await jellyfinService.getCollections(user.Id);
            }
            
            setLists(result.Items || []);
        } catch (e) {
            console.error('Failed to fetch lists', e);
            showToast(`Failed to load ${type}s`, 'error');
        } finally {
            setLoadingLists(false);
        }
    };

    const handleAddToList = async (listId, listName) => {
        setLoading(true);
        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user) return;

            const targetIds = Array.isArray(itemId) ? itemId.join(',') : itemId;
            if (type === 'playlist') {
                await jellyfinService.addToPlaylist(listId, targetIds);
            } else {
                await jellyfinService.addToCollection(listId, targetIds);
            }

            showToast(`Added to ${type} "${listName}"!`, 'success');
            onClose();
        } catch (e) {
            console.error('Failed to add to list', e);
            showToast(`Failed to add to ${type}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        const name = newListName.trim();
        if (!name) return;

        setLoading(true);
        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user) return;

            const targetIds = Array.isArray(itemId) ? itemId.join(',') : itemId;
            if (type === 'playlist') {
                await jellyfinService.createPlaylist(name, targetIds);
            } else {
                await jellyfinService.createCollection(name, targetIds);
            }

            showToast(`Created ${type} "${name}" and added item!`, 'success');
            setNewListName('');
            onClose();
        } catch (e) {
            console.error('Failed to create list', e);
            showToast(`Failed to create ${type}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const listLabel = type === 'playlist' ? 'Playlist' : 'Collection';

    return (
        <div className="lf-list-modal-overlay" onClick={onClose}>
            <div className="lf-list-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="lf-list-modal-header">
                    <h2>Add to {listLabel}</h2>
                    <button className="lf-list-modal-close" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <form className="lf-list-modal-create-form" onSubmit={handleCreateList}>
                    <input
                        type="text"
                        placeholder={`Create new ${type}...`}
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        disabled={loading}
                    />
                    <button type="submit" className="lf-list-modal-btn-add" disabled={loading || !newListName.trim()}>
                        <span className="material-icons">add</span>
                    </button>
                </form>

                <div className="lf-list-modal-divider">Or select existing</div>

                <div className="lf-list-modal-items-container">
                    {loadingLists ? (
                        <div className="lf-list-modal-loader">
                            <div className="spinner small"></div>
                        </div>
                    ) : lists.length === 0 ? (
                        <div className="lf-list-modal-empty">No {type}s found.</div>
                    ) : (
                        <div className="lf-list-modal-list">
                            {lists.map((list) => (
                                <button
                                    key={list.Id}
                                    className="lf-list-modal-item"
                                    onClick={() => handleAddToList(list.Id, list.Name)}
                                    disabled={loading}
                                >
                                    <span className="material-icons lf-list-modal-item-icon">
                                        {type === 'playlist' ? 'playlist_play' : 'folder'}
                                    </span>
                                    <span className="lf-list-modal-item-name">{list.Name}</span>
                                    <span className="material-icons lf-list-modal-item-arrow">chevron_right</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddToListModal;
