import React, { useState, useEffect } from 'react';
import './AvatarPickerModal.css';
import avatarManifest from '../config/avatars.json';
import { jellyfinService } from '../services/jellyfin';

const AvatarPickerModal = ({ isOpen, onClose, onSave, userId }) => {
    const [selectedCategory, setSelectedCategory] = useState(Object.keys(avatarManifest)[0]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedCategory(Object.keys(avatarManifest)[0]);
            setSelectedImage(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const categories = Object.keys(avatarManifest);
    const images = avatarManifest[selectedCategory] || [];

    const handleSave = async () => {
        if (!selectedImage) return;
        setLoading(true);
        try {
            const prefsId = "usersettings";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (!prefs) prefs = { Id: prefsId, CustomPrefs: {} };
            if (!prefs.CustomPrefs) prefs.CustomPrefs = {};

            prefs.CustomPrefs["LegitFlix_CustomAvatarUrl"] = selectedImage;

            await jellyfinService.updateDisplayPreferences(prefsId, prefs);

            // Update local cache immediately so avatars match everywhere
            try {
                const cachedAvatars = JSON.parse(localStorage.getItem('legitflix_user_avatars') || '{}');
                cachedAvatars[userId] = selectedImage;
                localStorage.setItem('legitflix_user_avatars', JSON.stringify(cachedAvatars));
            } catch (e) {
                console.error("Failed to cache avatar in localStorage", e);
            }

            onSave(selectedImage); // Pass selected URL back to parent
            onClose();
        } catch (error) {
            console.error("Failed to save custom avatar preference:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="apm-overlay" onClick={onClose}>
            <div className="apm-modal" onClick={e => e.stopPropagation()}>
                <div className="apm-header">
                    <h2>Select Avatar</h2>
                    <button className="apm-close" onClick={onClose}>&times;</button>
                </div>

                <div className="apm-body">
                    <div className="apm-sidebar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`apm-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="apm-content">
                        <div className="apm-grid">
                            {images.map(imgName => {
                                const basePath = import.meta.env.PROD ? '/LegitFlix/Client' : '';
                                const url = `${basePath}/avatars/${selectedCategory}/${imgName}`;
                                return (
                                    <div
                                        key={imgName}
                                        className={`apm-item ${selectedImage === url ? 'selected' : ''}`}
                                        onClick={() => setSelectedImage(url)}
                                    >
                                        <div className="apm-img-wrapper">
                                            <img src={url} alt={imgName} loading="lazy" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="apm-footer">
                    <button className="apm-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                    <button
                        className="apm-btn-save"
                        onClick={handleSave}
                        disabled={!selectedImage || loading}
                    >
                        {loading ? 'Saving...' : 'Save Avatar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AvatarPickerModal;
