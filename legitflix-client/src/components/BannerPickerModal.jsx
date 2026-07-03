
import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import SkeletonLoader from './SkeletonLoader';
import './BannerPickerModal.css';

const BannerPickerModal = ({ isOpen, onClose, onSave, userId }) => {
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null); // Track full item object
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !userId) return;
        setLoading(true);
        setSelectedItem(null);

        const fetchBackdrops = async () => {
            try {
                const data = await jellyfinService.getAllBackdrops(userId, 50);
                const validItems = data.filter(item => item.BackdropImageTags && item.BackdropImageTags.length > 0);
                setItems(validItems);
            } catch (err) {
                console.error('[BannerPicker] Failed to fetch backdrops', err);
            } finally {
                setLoading(false);
            }
        };
        fetchBackdrops();
    }, [isOpen, userId]);

    if (!isOpen) return null;

    const getBackdropUrl = (item) => {
        const tag = item.BackdropImageTags?.[0];
        const token = jellyfinService.api?.accessToken;
        return `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?quality=80&maxWidth=600&tag=${tag}&api_key=${token}`;
    };

    const getFullBackdropUrl = (item) => {
        const tag = item.BackdropImageTags?.[0];
        const token = jellyfinService.api?.accessToken;
        return `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?quality=90&maxWidth=1920&tag=${tag}&api_key=${token}`;
    };

    const handleSave = async () => {
        if (!selectedItem) return;

        try {
            setLoading(true);
            const user = await jellyfinService.getCurrentUser();
            const prefsId = "usersettings";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (!prefs) prefs = { Id: prefsId, CustomPrefs: {} };
            if (!prefs.CustomPrefs) prefs.CustomPrefs = {};

            const tag = selectedItem.BackdropImageTags?.[0];
            prefs.CustomPrefs["LegitFlix_Backdrop_ItemId"] = selectedItem.Id;
            prefs.CustomPrefs["LegitFlix_Backdrop_ImageTag"] = tag;
            prefs.CustomPrefs["LegitFlix_Backdrop_ServerUrl"] = jellyfinService.api.basePath;

            await jellyfinService.updateDisplayPreferences(prefsId, prefs);

            // Construct full URL to provide feedback to parent
            const token = jellyfinService.api?.accessToken || jellyfinService.api?.configuration?.accessToken;
            const newUrl = `${jellyfinService.api.basePath}/Items/${selectedItem.Id}/Images/Backdrop/0?tag=${tag}&quality=90&maxWidth=1920&api_key=${token}`;

            onSave(newUrl); // Pass URL back to parent
            onClose();
        } catch (error) {
            console.error("Failed to save backdrop preference:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="banner-picker-overlay">
            <div className="banner-picker-backdrop" onClick={onClose}></div>
            <div className="banner-picker-modal">
                <div className="banner-picker-header">
                    <h2 className="banner-picker-title">Select Banner</h2>

                </div>

                {loading ? (
                    <div className="banner-picker-grid">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                            <div key={i} className="banner-picker-card">
                                <SkeletonLoader width="100%" height="100%" style={{ borderRadius: '6px' }} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="banner-picker-grid">
                        {items.map((item) => {
                            const thumbUrl = getBackdropUrl(item);
                            const isSelected = selectedItem?.Id === item.Id;
                            return (
                                <div
                                    key={item.Id}
                                    className={`banner-picker-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedItem(item)}
                                >
                                    <img
                                        src={thumbUrl}
                                        alt={item.Name}
                                        loading="lazy"
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="banner-picker-actions">
                    <button className="btn-picker-close" onClick={onClose}>Cancel</button>
                    <button
                        className="btn-picker-save"
                        onClick={handleSave}
                        disabled={!selectedItem || loading}
                    >
                        {loading ? 'Saving...' : 'Save Banner'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BannerPickerModal;
