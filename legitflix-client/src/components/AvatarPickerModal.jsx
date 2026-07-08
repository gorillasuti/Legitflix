import React, { useState, useEffect } from 'react';
import './AvatarPickerModal.css';
import avatarManifest from '../config/avatars.json';
import { jellyfinService } from '../services/jellyfin';

// Synchronous offline conversion of data URL to Blob to bypass connect-src CSP restrictions.
const dataURLtoBlob = (dataurl) => {
    try {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error("[dataURLtoBlob] Parsing data URL failed:", e);
        return null;
    }
};

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
            // Failsafe: Validate that selectedImage is a valid URL constructed from the official avatar manifest
            let isValidAvatar = false;
            for (const category of Object.keys(avatarManifest)) {
                for (const imgName of avatarManifest[category]) {
                    const expectedUrl = `https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/avatars/${category}/${imgName}`;
                    if (selectedImage === expectedUrl) {
                        isValidAvatar = true;
                        break;
                    }
                }
                if (isValidAvatar) break;
            }

            if (!isValidAvatar) {
                throw new Error("Security check failed: Selected avatar is not from the official manifest.");
            }

            const prefsId = "usersettings";
            let prefs = await jellyfinService.getDisplayPreferences(prefsId);
            if (!prefs) prefs = { Id: prefsId, CustomPrefs: {} };
            if (!prefs.CustomPrefs) prefs.CustomPrefs = {};

            prefs.CustomPrefs["LegitFlix_CustomAvatarUrl"] = selectedImage;

            await jellyfinService.updateDisplayPreferences(prefsId, prefs);

            // Safely extract blob locally via canvas first (to bypass CSP), falling back to direct fetch if tainted.
            try {
                let imgBlob = null;
                const imgEl = document.querySelector(`.apm-item.selected img`);
                if (imgEl) {
                    try {
                        const canvas = document.createElement('canvas');
                        let width = imgEl.naturalWidth || imgEl.width || 200;
                        let height = imgEl.naturalHeight || imgEl.height || 200;

                        // Downscale if exceeds 512px to limit base64 payload size and transit weight
                        const MAX_SIZE = 512;
                        if (width > MAX_SIZE || height > MAX_SIZE) {
                            if (width > height) {
                                height = Math.round((height * MAX_SIZE) / width);
                                width = MAX_SIZE;
                            } else {
                                width = Math.round((width * MAX_SIZE) / height);
                                height = MAX_SIZE;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(imgEl, 0, 0, width, height);
                        const dataUrl = canvas.toDataURL('image/png');
                        imgBlob = dataURLtoBlob(dataUrl);
                    } catch (canvasErr) {
                        console.warn("[AvatarPickerModal] Canvas extraction failed, trying fetch fallback:", canvasErr);
                    }
                }

                if (!imgBlob) {
                    const imgRes = await fetch(selectedImage);
                    if (imgRes.ok) {
                        imgBlob = await imgRes.blob();
                    }
                }

                if (imgBlob) {
                    // Strict payload validation: enforce image MIME types
                    if (!imgBlob.type || !imgBlob.type.startsWith('image/')) {
                        throw new Error("Security check failed: Uploaded file must be an image");
                    }
                    await jellyfinService.uploadUserImage(userId, 'Primary', imgBlob);
                } else {
                    throw new Error("Could not extract or fetch avatar image data");
                }
            } catch (err) {
                console.error("Failed to upload custom avatar to Jellyfin server", err);
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
                                const url = `https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/legitflix-client/avatars/${selectedCategory}/${imgName}`;
                                return (
                                    <div
                                        key={imgName}
                                        className={`apm-item ${selectedImage === url ? 'selected' : ''}`}
                                        onClick={() => setSelectedImage(url)}
                                    >
                                        <div className="apm-img-wrapper">
                                            <img src={url} alt={imgName} loading="lazy" crossOrigin="anonymous" />
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
