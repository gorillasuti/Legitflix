import React, { useState, useEffect, useRef } from 'react';
import { jellyfinService } from '../services/jellyfin';
import { showToast } from '../services/toast';
import './EditImagesModal.css';

const BROWSABLE_TYPES = [
    { value: 'Primary', label: 'Primary' },
    { value: 'Art', label: 'Clearart' },
    { value: 'Backdrop', label: 'Backdrop' },
    { value: 'Banner', label: 'Banner' },
    { value: 'Box', label: 'Box' },
    { value: 'BoxRear', label: 'Box (rear)' },
    { value: 'Disc', label: 'Disc' },
    { value: 'Logo', label: 'Logo' },
    { value: 'Menu', label: 'Menu' },
    { value: 'Thumb', label: 'Thumb' }
];

const UPLOAD_TYPES = [
    { value: 'Primary', label: 'Primary (Poster)' },
    { value: 'Art', label: 'Clearart' },
    { value: 'Banner', label: 'Banner' },
    { value: 'Box', label: 'Box' },
    { value: 'BoxRear', label: 'Box (rear)' },
    { value: 'Disc', label: 'Disc' },
    { value: 'Logo', label: 'Logo' },
    { value: 'Menu', label: 'Menu' },
    { value: 'Thumb', label: 'Thumb' }
];

const EditImagesModal = ({ isOpen, onClose, itemId }) => {
    const [view, setView] = useState('list'); // 'list' | 'search'
    const [itemType, setItemType] = useState('');

    // Image list state
    const [loading, setLoading] = useState(false);
    const [imagesList, setImagesList] = useState([]);
    const [uploadingType, setUploadingType] = useState(null);
    const [showUploadDropdown, setShowUploadDropdown] = useState(false);

    // Remote search state
    const [providers, setProviders] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState('');
    const [selectedType, setSelectedType] = useState('Primary');
    const [allLanguages, setAllLanguages] = useState(true); // Default to true to find neutral/English logos!
    const [remoteImages, setRemoteImages] = useState([]);
    const [searchingRemote, setSearchingRemote] = useState(false);
    const [downloadingUrl, setDownloadingUrl] = useState(null);

    const fileInputRef = useRef(null);
    const uploadDropdownRef = useRef(null);

    useEffect(() => {
        if (isOpen && itemId) {
            fetchItemDetails();
            fetchImages();
            fetchProviders();
            setView('list');
            setRemoteImages([]);
            setShowUploadDropdown(false);
            setAllLanguages(true);
        }
    }, [isOpen, itemId]);

    // Close upload dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(e.target)) {
                setShowUploadDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // AUTOMATIC REMOTE IMAGE SEARCH TRIGGER
    useEffect(() => {
        if (view === 'search' && isOpen && itemId) {
            handleSearchRemote();
        }
    }, [view, selectedType, selectedProvider, allLanguages, itemId, isOpen]);

    const fetchItemDetails = async () => {
        try {
            const user = jellyfinService.getCurrentUser();
            if (user && user.Id) {
                const item = await jellyfinService.getItemDetails(user.Id, itemId);
                setItemType(item?.Type || '');
            }
        } catch (e) {
            console.error('Failed to fetch item details', e);
        }
    };

    const fetchImages = async () => {
        setLoading(true);
        try {
            const list = await jellyfinService.getItemImages(itemId);
            setImagesList(list || []);
        } catch (e) {
            console.error('Failed to fetch item images', e);
            showToast('Failed to load images.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchProviders = async () => {
        try {
            const list = await jellyfinService.getRemoteImageProviders(itemId);
            setProviders(list || []);
        } catch (e) {
            console.error('Failed to fetch remote image providers', e);
        }
    };

    const handleDelete = async (imageType, index = null) => {
        const displayLabel = index !== null ? `${imageType} ${index + 1}` : imageType;
        if (!window.confirm(`Are you sure you want to delete the ${displayLabel}?`)) return;

        setLoading(true);
        try {
            await jellyfinService.deleteItemImage(itemId, imageType, index);
            showToast(`${displayLabel} deleted successfully.`, 'success');
            await fetchImages();
        } catch (e) {
            console.error('Failed to delete image', e);
            showToast('Failed to delete image.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadClick = (type) => {
        setUploadingType(type);
        setShowUploadDropdown(false);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingType) return;

        const targetType = uploadingType;
        let index = null;
        if (targetType === 'Backdrop') {
            const backdrops = imagesList.filter(img => img.ImageType === 'Backdrop');
            index = backdrops.length;
        }

        setLoading(true);
        try {
            await jellyfinService.uploadItemImage(itemId, targetType, file, index);
            showToast(`${targetType} image uploaded successfully!`, 'success');
            await fetchImages();
        } catch (e) {
            console.error('Failed to upload image', e);
            showToast('Failed to upload image.', 'error');
        } finally {
            setUploadingType(null);
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleSearchRemote = async () => {
        setSearchingRemote(true);
        try {
            const params = {
                type: selectedType,
                includeAllLanguages: allLanguages
            };
            if (selectedProvider) {
                params.providerName = selectedProvider;
            }
            const res = await jellyfinService.getRemoteImages(itemId, params);
            setRemoteImages(res.Images || []);
        } catch (err) {
            console.error('Failed to search remote images', err);
            showToast('Failed to search remote images.', 'error');
        } finally {
            setSearchingRemote(false);
        }
    };

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        handleSearchRemote();
    };

    const handleDownloadRemote = async (imageUrl, imageType) => {
        setDownloadingUrl(imageUrl);
        try {
            await jellyfinService.downloadRemoteImage(itemId, imageType, imageUrl);
            showToast('Remote image downloaded and set!', 'success');
            await fetchImages();
            setView('list');
        } catch (err) {
            console.error('Failed to download remote image', err);
            showToast('Failed to download remote image.', 'error');
        } finally {
            setDownloadingUrl(null);
        }
    };

    const openSearchForType = (type) => {
        setSelectedType(type);
        setRemoteImages([]);
        setView('search');
    };

    if (!isOpen) return null;

    const isEpisode = itemType === 'Episode';
    const uploadTypes = isEpisode ? [{ value: 'Primary', label: 'Primary (Poster)' }] : UPLOAD_TYPES;
    const browsableTypes = isEpisode ? [{ value: 'Primary', label: 'Primary' }] : BROWSABLE_TYPES;

    const baseUrl = jellyfinService.getBasePath();

    // Separate backdrops and other images
    const backdropImages = imagesList.filter(img => img.ImageType === 'Backdrop');
    const otherImages = imagesList.filter(img => img.ImageType !== 'Backdrop');

    const handleHeaderBack = () => {
        if (view === 'search') {
            setView('list');
        } else {
            onClose();
        }
    };

    return (
        <div className="lf-img-modal-overlay" onClick={onClose}>
            <div className="lf-img-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="lf-img-modal-header">
                    <button className="lf-img-header-back-btn" onClick={handleHeaderBack} title="Back">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <h2>{view === 'search' ? 'Search Images' : 'Edit Images'}</h2>
                    <button className="lf-img-modal-close" onClick={onClose} title="Close">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="lf-img-modal-body">
                    {/* Hidden upload file input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />

                    {view === 'list' ? (
                        loading && uploadingType === null ? (
                            <div className="lf-img-modal-loader">
                                <div className="spinner"></div>
                            </div>
                        ) : (
                            <div className="lf-img-editor-lists-container">

                                {/* -- SECTION: IMAGES -- */}
                                <div className="lf-img-editor-section">
                                    <div className="lf-img-editor-section-header">
                                        <h3>Images</h3>
                                        <div className="lf-img-editor-section-actions">
                                            <button
                                                className="lf-img-sec-btn"
                                                onClick={() => openSearchForType('Primary')}
                                                title="Browse all images"
                                            >
                                                <span className="material-icons">search</span>
                                            </button>
                                            <div className="lf-img-upload-dropdown-wrapper" ref={uploadDropdownRef}>
                                                <button
                                                    className="lf-img-sec-btn"
                                                    onClick={() => setShowUploadDropdown(!showUploadDropdown)}
                                                    title="Upload new image"
                                                >
                                                    <span className="material-icons">add</span>
                                                </button>
                                                {showUploadDropdown && (
                                                    <div className="lf-img-upload-dropdown-menu">
                                                        <div className="lf-img-upload-dropdown-header">Select Image Type</div>
                                                        {uploadTypes.map(ut => (
                                                            <button
                                                                key={ut.value}
                                                                onClick={() => handleUploadClick(ut.value)}
                                                                className="lf-img-upload-dropdown-item"
                                                            >
                                                                {ut.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {otherImages.length === 0 ? (
                                        <div className="lf-img-section-empty">No images added. Click + to upload.</div>
                                    ) : (
                                        <div className="lf-img-cards-grid">
                                            {otherImages.map(img => {
                                                const type = img.ImageType;
                                                const tag = img.Tag || '';
                                                const imgUrl = `${baseUrl}/Items/${itemId}/Images/${type}?tag=${tag}&maxWidth=480&quality=90`;
                                                const isTransparent = ['Logo', 'Art'].includes(type);

                                                return (
                                                    <div key={type} className="lf-img-editor-card">
                                                        <div className={`lf-img-editor-card-preview ${isTransparent ? 'transparent-bg' : ''}`}>
                                                            <img src={imgUrl} alt={type} />
                                                        </div>
                                                        <div className="lf-img-editor-card-footer">
                                                            <div className="lf-img-card-title">{type}</div>
                                                            <div className="lf-img-card-dims">
                                                                {img.Width && img.Height ? `${img.Width} X ${img.Height}` : 'unknown size'}
                                                            </div>
                                                            <div className="lf-img-card-actions-row">
                                                                <button
                                                                    onClick={() => openSearchForType(type)}
                                                                    title="Search remote"
                                                                >
                                                                    <span className="material-icons text-sm">search</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(type)}
                                                                    title="Delete"
                                                                >
                                                                    <span className="material-icons text-sm">delete</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {!isEpisode && (
                                    <>
                                        <br />
                                        {/* -- SECTION: BACKDROPS -- */}
                                        <div className="lf-img-editor-section">
                                            <div className="lf-img-editor-section-header">
                                                <h3>Backdrops</h3>
                                                <div className="lf-img-editor-section-actions">
                                                    <button
                                                        className="lf-img-sec-btn"
                                                        onClick={() => openSearchForType('Backdrop')}
                                                        title="Browse all backdrops"
                                                    >
                                                        <span className="material-icons">search</span>
                                                    </button>
                                                    <button
                                                        className="lf-img-sec-btn"
                                                        onClick={() => handleUploadClick('Backdrop')}
                                                        title="Upload new backdrop"
                                                    >
                                                        <span className="material-icons">add</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {backdropImages.length === 0 ? (
                                                <div className="lf-img-section-empty">No backdrops added. Click + to upload.</div>
                                            ) : (
                                                <div className="lf-img-cards-grid">
                                                    {backdropImages.map((img, index) => {
                                                        const tag = img.Tag || '';
                                                        const imgUrl = `${baseUrl}/Items/${itemId}/Images/Backdrop/${img.ImageIndex}?tag=${tag}&maxWidth=480&quality=80`;

                                                        return (
                                                            <div key={index} className="lf-img-editor-card">
                                                                <div className="lf-img-editor-card-preview">
                                                                    <img src={imgUrl} alt={`Backdrop ${index + 1}`} />
                                                                </div>
                                                                <div className="lf-img-editor-card-footer">
                                                                    <div className="lf-img-card-title">Backdrop</div>
                                                                    <div className="lf-img-card-dims">
                                                                        {img.Width && img.Height ? `${img.Width} X ${img.Height}` : 'unknown size'}
                                                                    </div>
                                                                    <div className="lf-img-card-actions-row">
                                                                        <button disabled title="Move left">
                                                                            <span className="material-icons text-sm">chevron_left</span>
                                                                        </button>
                                                                        <button disabled title="Move right">
                                                                            <span className="material-icons text-sm">chevron_right</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDelete('Backdrop', img.ImageIndex)}
                                                                            title="Delete"
                                                                        >
                                                                            <span className="material-icons text-sm">delete</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                            </div>
                        )
                    ) : (
                        /* Remote Image Search Tab */
                        <div className="lf-remote-search-tab">
                            <form className="lf-remote-search-filters" onSubmit={handleSearchSubmit}>
                                <div className="lf-filter-field">
                                    <label>Source</label>
                                    <select
                                        value={selectedProvider}
                                        onChange={(e) => setSelectedProvider(e.target.value)}
                                        disabled={searchingRemote}
                                    >
                                        <option value="">All</option>
                                        {providers.map(p => (
                                            <option key={p.Name} value={p.Name}>{p.Name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="lf-filter-field">
                                    <label>Type</label>
                                    <select
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value)}
                                        disabled={searchingRemote}
                                    >
                                        {browsableTypes.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <label className="lf-filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={allLanguages}
                                        onChange={(e) => setAllLanguages(e.target.checked)}
                                        disabled={searchingRemote}
                                    />
                                    <span>All languages</span>
                                </label>

                                <button
                                    type="submit"
                                    className="lf-remote-btn-search"
                                    disabled={searchingRemote}
                                >
                                    <span className="material-icons">search</span>
                                    <span>{searchingRemote ? 'Searching...' : 'Search'}</span>
                                </button>
                            </form>

                            <div className="lf-remote-results-container">
                                {searchingRemote ? (
                                    <div className="lf-img-modal-loader">
                                        <div className="spinner"></div>
                                    </div>
                                ) : remoteImages.length === 0 ? (
                                    <div className="lf-remote-empty">
                                        <span className="material-icons">image_search</span>
                                        <p>No remote images found. Try different filters.</p>
                                    </div>
                                ) : (
                                    (() => {
                                        const isLandscape = ['Backdrop', 'Banner', 'Thumb', 'Art', 'Logo', 'Menu', 'Disc'].includes(selectedType);
                                        const isTransparent = ['Logo', 'Art'].includes(selectedType);
                                        return (
                                            <div className="lf-remote-grid-container">
                                                {/* Use a uniform grid format, just like the stock Jellyfin UI */}
                                                <div className="lf-remote-grid">
                                                    {remoteImages.map((img, index) => {
                                                        const isDownloading = downloadingUrl === img.Url;
                                                        return (
                                                            <div key={index} className="lf-remote-img-card">
                                                                <div className={`lf-remote-img-preview ${isTransparent ? 'transparent-bg' : ''}`}>
                                                                    <a href={img.Url} target="_blank" rel="noopener noreferrer">
                                                                        <img src={img.Url} alt={img.ProviderName} />
                                                                    </a>
                                                                </div>
                                                                <div className="lf-remote-img-meta">
                                                                    <div className="lf-remote-provider">{img.ProviderName}</div>
                                                                    {img.Width && img.Height && (
                                                                        <div className="lf-remote-resolution">{img.Width} x {img.Height}</div>
                                                                    )}
                                                                    {img.Language && (
                                                                        <div className="lf-remote-lang">Lang: {img.Language.toUpperCase()}</div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    className="lf-remote-btn-download"
                                                                    onClick={() => handleDownloadRemote(img.Url, selectedType)}
                                                                    disabled={downloadingUrl !== null}
                                                                >
                                                                    {isDownloading ? (
                                                                        <div className="spinner small"></div>
                                                                    ) : (
                                                                        <>
                                                                            <span className="material-icons">cloud_download</span>
                                                                            <span>Download</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lf-img-modal-footer">
                    <button className="lf-img-btn-close" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditImagesModal;
