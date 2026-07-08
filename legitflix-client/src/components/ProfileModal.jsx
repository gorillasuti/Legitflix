import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import BannerPickerModal from './BannerPickerModal';
import AvatarPickerModal from './AvatarPickerModal';
import { useTheme } from '../context/ThemeContext';
import './ProfileModal.css';

const ProfileModal = ({ isOpen, onClose, user }) => {
    const { config, updateConfig } = useTheme();
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');
    const [showBannerPicker, setShowBannerPicker] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [manualBannerUrl, setManualBannerUrl] = useState(null);
    useEffect(() => {
        if (!isOpen || !user) return;

        const fetchCustomBanner = async () => {
            const prefsId = "usersettings";
            const prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (prefs?.CustomPrefs?.["LegitFlix_Backdrop_ItemId"]) {
                const itemId = prefs.CustomPrefs["LegitFlix_Backdrop_ItemId"];
                const tag = prefs.CustomPrefs["LegitFlix_Backdrop_ImageTag"];
                const token = jellyfinService.api?.accessToken;
                const url = `${jellyfinService.api.basePath}/Items/${itemId}/Images/Backdrop/0?tag=${tag}&quality=90&maxWidth=1920&api_key=${token}`;
                setManualBannerUrl(url);
            }
        };
        fetchCustomBanner();
    }, [isOpen, user]);

    const displayBannerUrl = manualBannerUrl || (user ? (
        user.ImageTags?.Banner ? `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Banner?tag=${user.ImageTags.Banner}&quality=90` :
            (user.BackdropImageTags?.[0] ? `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Backdrop/0?tag=${user.BackdropImageTags[0]}&quality=90` : '')
    ) : ''); // Fallback to standard logic if no manual override

    const handleBannerSave = async (url) => {
        setManualBannerUrl(url);
        setStatus('Banner updated!');
        setTimeout(() => setStatus(''), 3000);
    };


    if (!isOpen || !user) return null;

    const handleAvatarFile = async (url) => {
        if (!url) return;
        updateConfig({ userAvatar: url });
        setShowAvatarPicker(false);
    };

    const handleDeleteAvatar = async () => {
        setUploading(true);
        setStatus('');
        try {
            const prefsId = "usersettings";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (prefs && prefs.CustomPrefs) {
                delete prefs.CustomPrefs["LegitFlix_CustomAvatarUrl"];
                await jellyfinService.updateDisplayPreferences(prefsId, prefs);
            }
            updateConfig({ userAvatar: null });
            setStatus('Profile image removed.');
        } catch (err) {
            console.error(err);
            setStatus('Failed to remove image.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteBanner = async () => {
        setUploading(true);
        setStatus('');
        try {
            const prefsId = "usersettings";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (prefs && prefs.CustomPrefs) {
                delete prefs.CustomPrefs["LegitFlix_Backdrop_ItemId"];
                delete prefs.CustomPrefs["LegitFlix_Backdrop_ImageTag"];
                delete prefs.CustomPrefs["LegitFlix_Backdrop_ServerUrl"];
                await jellyfinService.updateDisplayPreferences(prefsId, prefs);
            }
            setManualBannerUrl(null);
            updateConfig({ appBackground: null });
            setStatus('Banner image removed.');
        } catch (err) {
            console.error(err);
            setStatus('Failed to remove banner.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <div className="pm-overlay" onClick={onClose}>
                <div className="pm-modal" onClick={e => e.stopPropagation()}>
                    <button className="pm-close-floating" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>

                    {/* Cover Image Section */}
                    <div className="pm-cover">
                        {displayBannerUrl ? (
                            <img
                                src={displayBannerUrl}
                                alt="Banner"
                                className="pm-cover-img"
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons" style={{ fontSize: '48px', opacity: 0.1 }}>wallpaper</span>
                            </div>
                        )}
                        <div className="pm-cover-overlay">
                            <button
                                className="pm-edit-cover-btn"
                                onClick={() => setShowBannerPicker(true)}
                                disabled={uploading}
                            >
                                <span className="material-icons">edit</span>
                                Change Cover
                            </button>
                        </div>
                    </div>

                    {/* Profile Header (Avatar overlap) */}
                    <div className="pm-profile-header">
                        <div className="pm-avatar-container">
                            <img
                                src={config.userAvatar || jellyfinService.getUserImageUrl(user.Id, { tag: user.PrimaryImageTag || (user.ImageTags && user.ImageTags.Primary) })}
                                alt={user.Name}
                                className="pm-avatar-img"
                                onError={(e) => {
                                    e.target.src = 'https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/avatars/Netflix/010c7b9061ece2fbf7bbb8d9bb6d2bee16f4a68c.png';
                                }}
                            />
                            <div className="pm-avatar-edit-overlay" onClick={() => setShowAvatarPicker(true)}>
                                <span className="material-icons">photo_camera</span>
                            </div>
                        </div>

                        <div className="pm-user-details">
                            <h2>{user.Name}</h2>
                            <p>
                                <span className="material-icons" style={{ fontSize: '16px' }}>
                                    {user?.Policy?.IsAdministrator ? 'shield' : 'person'}
                                </span>
                                {user?.Policy?.IsAdministrator ? 'Administrator' : 'User'}
                            </p>
                        </div>
                    </div>

                    <div className="pm-divider" />

                    {/* Actions */}
                    <div className="pm-actions">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button
                                className="pm-action-row"
                                onClick={() => setShowAvatarPicker(true)}
                                disabled={uploading}
                            >
                                <span className="material-icons">face</span>
                                <span>Change Avatar</span>
                            </button>
                            <button
                                className="pm-action-row danger"
                                onClick={handleDeleteAvatar}
                                disabled={uploading}
                            >
                                <span className="material-icons">delete</span>
                                <span>Remove Avatar</span>
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button
                                className="pm-action-row"
                                onClick={() => setShowBannerPicker(true)}
                                disabled={uploading}
                            >
                                <span className="material-icons">wallpaper</span>
                                <span>Change Cover</span>
                            </button>
                            <button
                                className="pm-action-row danger"
                                onClick={handleDeleteBanner}
                                disabled={uploading || !manualBannerUrl}
                            >
                                <span className="material-icons">delete</span>
                                <span>Remove Cover</span>
                            </button>
                        </div>
                    </div>

                    {status && <div className="pm-status">{status}</div>}


                </div>
            </div>
            <BannerPickerModal
                isOpen={showBannerPicker}
                onClose={() => setShowBannerPicker(false)}
                onSave={(url) => {
                    handleBannerSave(url);
                    setShowBannerPicker(false);
                }}
                userId={user?.Id}
            />
            <AvatarPickerModal
                isOpen={showAvatarPicker}
                onClose={() => setShowAvatarPicker(false)}
                onSave={handleAvatarFile}
                userId={user?.Id}
            />
        </>
    );
};

export default ProfileModal;
