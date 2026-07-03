import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import { showToast } from '../services/toast';
import './EditMetadataModal.css';

const EditMetadataModal = ({ isOpen, onClose, itemId }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [metadata, setMetadata] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [originalTitle, setOriginalTitle] = useState('');
    const [overview, setOverview] = useState('');
    const [premiereDate, setPremiereDate] = useState('');
    const [productionYear, setProductionYear] = useState('');
    const [officialRating, setOfficialRating] = useState('');

    useEffect(() => {
        if (isOpen && itemId) {
            fetchMetadata();
        }
    }, [isOpen, itemId]);

    const fetchMetadata = async () => {
        setLoading(true);
        try {
            const editorInfo = await jellyfinService.getMetadataEditor(itemId);
            if (editorInfo && editorInfo.Item) {
                const item = editorInfo.Item;
                setMetadata(item);
                setName(item.Name || '');
                setOriginalTitle(item.OriginalTitle || '');
                setOverview(item.Overview || '');
                
                // Format premiere date if exists
                if (item.PremiereDate) {
                    setPremiereDate(item.PremiereDate.split('T')[0]);
                } else {
                    setPremiereDate('');
                }
                
                setProductionYear(item.ProductionYear || '');
                setOfficialRating(item.OfficialRating || '');
            }
        } catch (e) {
            console.error('Failed to fetch metadata', e);
            showToast('Failed to load metadata.', 'error');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!metadata) return;

        setSaving(true);
        try {
            // Reconstruct updated metadata object
            const updatedMetadata = {
                ...metadata,
                Name: name,
                OriginalTitle: originalTitle,
                Overview: overview,
                PremiereDate: premiereDate ? new Date(premiereDate).toISOString() : null,
                ProductionYear: productionYear ? parseInt(productionYear, 10) : null,
                OfficialRating: officialRating
            };

            await jellyfinService.updateItemMetadata(itemId, updatedMetadata);
            showToast('Metadata updated successfully!', 'success');
            onClose();
            setTimeout(() => window.location.reload(), 1000);
        } catch (e) {
            console.error('Failed to save metadata', e);
            showToast('Failed to update metadata.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="lf-meta-modal-overlay" onClick={onClose}>
            <div className="lf-meta-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="lf-meta-modal-header">
                    <h2>Edit Metadata</h2>
                    <button className="lf-meta-modal-close" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="lf-meta-modal-body">
                    {loading ? (
                        <div className="lf-meta-modal-loader">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="lf-meta-modal-form">
                            <div className="lf-meta-form-group">
                                <label>Title / Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={saving}
                                />
                            </div>

                            <div className="lf-meta-form-group">
                                <label>Original Title</label>
                                <input
                                    type="text"
                                    value={originalTitle}
                                    onChange={(e) => setOriginalTitle(e.target.value)}
                                    disabled={saving}
                                />
                            </div>

                            <div className="lf-meta-form-group">
                                <label>Overview / Description</label>
                                <textarea
                                    value={overview}
                                    onChange={(e) => setOverview(e.target.value)}
                                    rows={4}
                                    disabled={saving}
                                />
                            </div>

                            <div className="lf-meta-form-row">
                                <div className="lf-meta-form-group">
                                    <label>Release Date</label>
                                    <input
                                        type="date"
                                        value={premiereDate}
                                        onChange={(e) => setPremiereDate(e.target.value)}
                                        disabled={saving}
                                    />
                                </div>

                                <div className="lf-meta-form-group">
                                    <label>Year</label>
                                    <input
                                        type="number"
                                        value={productionYear}
                                        onChange={(e) => setProductionYear(e.target.value)}
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            <div className="lf-meta-form-group">
                                <label>Parental Rating</label>
                                <input
                                    type="text"
                                    value={officialRating}
                                    onChange={(e) => setOfficialRating(e.target.value)}
                                    placeholder="e.g. PG-13, TV-MA"
                                    disabled={saving}
                                />
                            </div>

                            <div className="lf-meta-modal-actions">
                                <button type="button" className="lf-meta-btn-cancel" onClick={onClose} disabled={saving}>
                                    Cancel
                                </button>
                                <button type="submit" className="lf-meta-btn-save" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditMetadataModal;
