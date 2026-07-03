import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import { showToast } from '../services/toast';
import './IdentifyModal.css';

const IdentifyModal = ({ isOpen, onClose, itemId, itemType: itemTypeProp }) => {
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [applying, setApplying] = useState(false);

    const [item, setItem] = useState(null);
    const [externalIds, setExternalIds] = useState([]);

    // Search Criteria state
    const [name, setName] = useState('');
    const [year, setYear] = useState('');
    const [providerIds, setProviderIds] = useState({});

    // Results & Selection State
    const [searchResults, setSearchResults] = useState(null);
    const [selectedResult, setSelectedResult] = useState(null);
    const [replaceImages, setReplaceImages] = useState(true);

    useEffect(() => {
        if (isOpen && itemId) {
            resetState();
            fetchItemData();
        }
    }, [isOpen, itemId]);

    const resetState = () => {
        setItem(null);
        setExternalIds([]);
        setName('');
        setYear('');
        setProviderIds({});
        setSearchResults(null);
        setSelectedResult(null);
        setReplaceImages(true);
    };

    const fetchItemData = async () => {
        setLoading(true);
        try {
            // Get item details directly (includes Type, Name, Path, ProviderIds)
            const currentItem = await jellyfinService.getItemDetails(itemId);
            if (currentItem) {
                setItem(currentItem);
                setName(currentItem.Name || '');
                setYear(currentItem.ProductionYear || '');

                // Prefill existing ProviderIds
                const currentProviderIds = currentItem.ProviderIds || {};

                // Fetch valid external IDs for this item type
                const externalIdList = await jellyfinService.getExternalIdInfos(itemId);
                setExternalIds(externalIdList || []);

                const initialIds = {};
                (externalIdList || []).forEach(ext => {
                    initialIds[ext.Key] = currentProviderIds[ext.Key] || '';
                });
                setProviderIds(initialIds);
            } else {
                console.error('getItemDetails returned null for', itemId);
                showToast('Failed to load item data.', 'error');
            }
        } catch (e) {
            console.error('Failed to load item info for identification', e);
            showToast('Failed to load item data.', 'error');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleProviderIdChange = (key, value) => {
        setProviderIds(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setSearching(true);
        setSelectedResult(null);
        try {
            const searchInfo = {
                Name: name,
                Year: year ? parseInt(year, 10) : null,
                ProviderIds: {}
            };

            // Only send non-empty provider IDs
            Object.keys(providerIds).forEach(k => {
                if (providerIds[k]?.trim()) {
                    searchInfo.ProviderIds[k] = providerIds[k].trim();
                }
            });

            const resolvedType = item?.Type || itemTypeProp || 'Movie';
            const results = await jellyfinService.searchRemoteItems(itemId, resolvedType, searchInfo);
            setSearchResults(results || []);
            if (!results || results.length === 0) {
                showToast('No search results found.', 'info');
            }
        } catch (e) {
            console.error('Remote search failed', e);
            showToast('Failed to perform remote search.', 'error');
        } finally {
            setSearching(false);
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        if (!selectedResult) return;
        setApplying(true);
        try {
            const success = await jellyfinService.applyRemoteSearch(itemId, selectedResult, replaceImages);
            if (success) {
                showToast('Identification applied successfully!', 'success');
                onClose();
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showToast('Failed to apply identification.', 'error');
            }
        } catch (e) {
            console.error('Apply identification failed', e);
            showToast('Failed to apply identification.', 'error');
        } finally {
            setApplying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="lf-identify-overlay" onClick={onClose}>
            <div className="lf-identify-content" onClick={(e) => e.stopPropagation()}>
                <div className="lf-identify-header">
                    <h2>Identify Item</h2>
                    <button className="lf-identify-close" onClick={onClose} disabled={applying}>
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="lf-identify-body">
                    {loading ? (
                        <div className="lf-identify-loader">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <>
                            {item?.Path && (
                                <div className="lf-identify-path-container">
                                    <div className="lf-identify-path-label">File Path</div>
                                    <div className="lf-identify-path-value">{item.Path}</div>
                                </div>
                            )}

                            {/* -- Search Form (Only if no result selected for confirm step) -- */}
                            {!selectedResult && (
                                <form onSubmit={handleSearch} className="lf-identify-form">
                                    <p className="lf-identify-desc">
                                        Enter name, year, or provider identifiers below to search remote metadata providers (e.g. TMDB, TVDB).
                                    </p>

                                    <div className="lf-identify-group">
                                        <label>Title / Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            disabled={searching}
                                        />
                                    </div>

                                    <div className="lf-identify-group">
                                        <label>Production Year</label>
                                        <input
                                            type="number"
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                            min="1800"
                                            max="2100"
                                            disabled={searching}
                                        />
                                    </div>

                                    {externalIds.length > 0 && (
                                        <div className="lf-identify-providers-section">
                                            <h3>Provider IDs</h3>
                                            <div className="lf-identify-providers-grid">
                                                {externalIds.map(ext => (
                                                    <div className="lf-identify-group" key={ext.Key}>
                                                        <label>{ext.Name} ID</label>
                                                        <input
                                                            type="text"
                                                            value={providerIds[ext.Key] || ''}
                                                            onChange={(e) => handleProviderIdChange(ext.Key, e.target.value)}
                                                            placeholder={`e.g. ${ext.Key} number`}
                                                            disabled={searching}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button type="submit" className="lf-identify-btn-submit" disabled={searching}>
                                        {searching ? 'Searching...' : 'Search'}
                                    </button>
                                </form>
                            )}

                            {/* -- Search Results List (Only if results retrieved and not in confirmation step) -- */}
                            {searchResults !== null && !selectedResult && (
                                <div className="lf-identify-results-wrapper">
                                    <h3>Search Results ({searchResults.length})</h3>
                                    {searchResults.length === 0 ? (
                                        <div className="lf-identify-no-results">No matches found. Try refining search options.</div>
                                    ) : (
                                        <div className="lf-identify-results-list">
                                            {searchResults.map((result, idx) => (
                                                <div
                                                    key={idx}
                                                    className="lf-identify-result-item"
                                                    onClick={() => setSelectedResult(result)}
                                                >
                                                    <div className="lf-identify-result-thumb">
                                                        {result.ImageUrl ? (
                                                            <img src={result.ImageUrl} alt={result.Name} onError={(e) => { e.target.style.display = 'none'; }} />
                                                        ) : (
                                                            <div className="lf-identify-fallback-thumb">
                                                                <span className="material-icons">movie</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="lf-identify-result-info">
                                                        <div className="lf-identify-result-name">{result.Name}</div>
                                                        {result.ProductionYear && (
                                                            <div className="lf-identify-result-year">{result.ProductionYear}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* -- Confirmation Form (If search result is selected) -- */}
                            {selectedResult && (
                                <form onSubmit={handleApply} className="lf-identify-confirm-form">
                                    <h3>Confirm Selection</h3>
                                    <div className="lf-identify-selected-preview">
                                        <div className="lf-identify-result-thumb selected">
                                            {selectedResult.ImageUrl ? (
                                                <img src={selectedResult.ImageUrl} alt={selectedResult.Name} />
                                            ) : (
                                                <div className="lf-identify-fallback-thumb">
                                                    <span className="material-icons">movie</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="lf-identify-selected-details">
                                            <div className="lf-identify-selected-title">{selectedResult.Name}</div>
                                            {selectedResult.ProductionYear && (
                                                <div className="lf-identify-selected-year">{selectedResult.ProductionYear}</div>
                                            )}
                                            {selectedResult.Overview && (
                                                <p className="lf-identify-selected-overview">{selectedResult.Overview}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="lf-identify-replace-wrapper">
                                        <label className="lf-identify-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={replaceImages}
                                                onChange={(e) => setReplaceImages(e.target.checked)}
                                                disabled={applying}
                                            />
                                            <span>Replace all existing images</span>
                                        </label>
                                    </div>

                                    <div className="lf-identify-actions">
                                        <button
                                            type="button"
                                            className="lf-identify-btn-back"
                                            onClick={() => setSelectedResult(null)}
                                            disabled={applying}
                                        >
                                            Back to Results
                                        </button>
                                        <button
                                            type="submit"
                                            className="lf-identify-btn-ok"
                                            disabled={applying}
                                        >
                                            {applying ? 'Applying...' : 'OK'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IdentifyModal;
