import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import MediaCard from '../../components/MediaCard/MediaCard';
import Navbar from '../../components/Navbar';
import ContextMenu from '../../components/ContextMenu';
import CustomDropdown from '../../components/CustomDropdown';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import AddToListModal from '../../components/AddToListModal';
import MediaInfoModal from '../../components/MediaInfoModal';
import EditMetadataModal from '../../components/EditMetadataModal';
import EditImagesModal from '../../components/EditImagesModal';
import SubtitleModal from '../../components/SubtitleModal';
import IdentifyModal from '../../components/IdentifyModal';
import { Button } from '../../components/ui/button';
import { showToast } from '../../services/toast';
import SkeletonLoader from '../../components/SkeletonLoader';
import './Library.css';
import { gsap } from 'gsap';

const Library = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [libraryName, setLibraryName] = useState('');
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('DateCreated,Descending'); // Default: Date Added
    const [filter, setFilter] = useState('All'); // All, Unplayed, Favorites
    const [viewType, setViewType] = useState('Primary'); // Poster vs Backdrop (todo?)

    // Pagination / Infinite Scroll
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef();
    const ITEMS_PER_PAGE = 50;

    const [contextMenu, setContextMenu] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);

    // Selection Mode State
    const [selectionMode, setSelectionMode] = useState(null); // 'library' | null
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectionMenuOpen, setSelectionMenuOpen] = useState(false);

    const selectionPanelRef = useRef(null);
    const selectionMenuRef = useRef(null);

    useEffect(() => {
        if (selectionMode && selectionPanelRef.current) {
            gsap.fromTo(selectionPanelRef.current,
                { y: 150, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
            );
        }
    }, [selectionMode]);

    useEffect(() => {
        if (selectionMenuOpen && selectionMenuRef.current) {
            gsap.fromTo(selectionMenuRef.current,
                { scale: 0.95, opacity: 0, y: 10 },
                { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: "power3.out" }
            );
        }
    }, [selectionMenuOpen]);

    useEffect(() => {
        if (selectionMode) {
            document.body.classList.add('legitflix-selection-mode');
        } else {
            document.body.classList.remove('legitflix-selection-mode');
        }
        return () => {
            document.body.classList.remove('legitflix-selection-mode');
        };
    }, [selectionMode]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && selectionMode) {
                cancelSelectionMode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectionMode]);

    // List & Media Info Modals State
    const [listModalOpen, setListModalOpen] = useState(false);
    const [listModalType, setListModalType] = useState('playlist'); // 'playlist' | 'collection'
    const [listModalItemId, setListModalItemId] = useState(null);
    const [mediaInfoModalOpen, setMediaInfoModalOpen] = useState(false);
    const [mediaInfoModalItemId, setMediaInfoModalItemId] = useState(null);

    // Edit Modals State
    const [editMetaOpen, setEditMetaOpen] = useState(false);
    const [editMetaItemId, setEditMetaItemId] = useState(null);
    const [editImagesOpen, setEditImagesOpen] = useState(false);
    const [editImagesItemId, setEditImagesItemId] = useState(null);
    const [editSubsOpen, setEditSubsOpen] = useState(false);
    const [editSubsItemId, setEditSubsItemId] = useState(null);
    const [editSubsSeriesId, setEditSubsSeriesId] = useState(null);
    const [editSubsIsMovie, setEditSubsIsMovie] = useState(false);
    const [identifyOpen, setIdentifyOpen] = useState(false);
    const [identifyItemId, setIdentifyItemId] = useState(null);
    const [identifyItemType, setIdentifyItemType] = useState(null);

    // Initial Load & Reset on ID/Sort/Filter change
    useEffect(() => {
        setItems([]);
        setPage(0);
        setHasMore(true);
        setLoading(true);
        cancelSelectionMode();
        fetchLibraryDetails();
        fetchItems(0, true);
    }, [id, sortBy, filter]);

    useEffect(() => {
        if (libraryName) {
            document.title = `Legitflix - ${libraryName}`;
        } else {
            document.title = "LegitFlix - Library";
        }
    }, [libraryName]);

    const fetchLibraryDetails = async () => {
        try {
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                const lib = await jellyfinService.getItem(user.Id, id);
                setLibraryName(lib.Name);
            }
        } catch (e) {
            console.error("Failed to fetch library details", e);
        }
    };

    const fetchItems = async (pageIndex, isNew = false) => {
        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user) return;

            const sortParts = sortBy.split(',');
            const sortField = sortParts[0];
            const sortOrder = sortParts[1];

            const query = {
                parentId: id,
                sortBy: [sortField],
                sortOrder: [sortOrder],
                limit: ITEMS_PER_PAGE,
                startIndex: pageIndex * ITEMS_PER_PAGE,
                recursive: true,
                includeItemTypes: ['Movie', 'Series'],
                fields: ['PrimaryImageAspectRatio', 'Overview', 'DateCreated', 'ProductionYear', 'CommunityRating', 'CriticRating', 'OfficialRating', 'UserData', 'MediaStreams', 'Width', 'Height', 'Genres'],
                filters: [],
            };

            if (user?.Configuration?.GroupMoviesIntoBoxSets) {
                query.collapseBoxSets = true;
            }

            if (filter === 'Unplayed') {
                query.filters.push('IsUnplayed');
            } else if (filter === 'Favorites') {
                query.filters.push('IsFavorite');
            }

            const res = await jellyfinService.getItems(user.Id, query);

            if (res && res.Items) {
                if (isNew) {
                    setItems(res.Items);
                } else {
                    setItems(prev => [...prev, ...res.Items]);
                }
                setHasMore(res.Items.length >= ITEMS_PER_PAGE);
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error("Failed to fetch library items", e);
        } finally {
            setLoading(false);
        }
    };

    // Infinite Scroll Observer
    const lastItemElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    fetchItems(nextPage, false);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // Context Menu
    const handleContextMenu = (e, item) => {
        e.preventDefault();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        setContextMenu({
            x: clientX,
            y: clientY,
            item: item
        });
    };

    const closeContextMenu = () => setContextMenu(null);

    const handleConfirmDelete = async () => {
        if (deleteItem) {
            try {
                await jellyfinService.deleteItem(deleteItem.Id);
                showToast(`${deleteItem.Type} deleted successfully.`, 'success');
                setItems(prev => prev.filter(i => i.Id !== deleteItem.Id));
                setDeleteItem(null);
            } catch (e) {
                console.error("Failed to delete item", e);
                showToast("Failed to delete item.", "error");
            }
        }
    };

    const handleMenuAction = async (action, item) => {
        closeContextMenu();
        switch (action) {
            case 'play':
                if (item.Type === 'Movie' || item.Type === 'Episode') navigate(`/play/${item.Id}`);
                else navigate(`/item/${item.Id}`, { state: { autoplay: true } });
                break;
            case 'play_all_from_here': {
                const currentIndex = items.findIndex(i => i.Id === item.Id);
                if (currentIndex !== -1) {
                    const remainingItems = items.slice(currentIndex + 1);
                    const remainingIds = remainingItems.map(i => i.Id);
                    navigate(`/play/${item.Id}`, { state: { playlist: remainingIds } });
                }
                break;
            }
            case 'shuffle': {
                const user = await jellyfinService.getCurrentUser();
                if (user && item.Type === 'Series') {
                    try {
                        const episodes = await jellyfinService.getEpisodes(user.Id, item.Id);
                        if (episodes && episodes.length > 0) {
                            const playable = episodes.filter(ep => ep.LocationType !== 'Virtual');
                            if (playable.length > 0) {
                                const shuffled = [...playable].sort(() => Math.random() - 0.5);
                                const firstId = shuffled[0].Id;
                                const remainingIds = shuffled.slice(1).map(ep => ep.Id);
                                navigate(`/play/${firstId}`, { state: { playlist: remainingIds } });
                                showToast('Shuffling series playback...', 'success');
                            } else {
                                showToast('No playable episodes found.', 'warning');
                            }
                        } else {
                            showToast('No episodes found in series.', 'warning');
                        }
                    } catch (err) {
                        console.error('Failed to shuffle series', err);
                        showToast('Failed to shuffle series playback.', 'error');
                    }
                }
                break;
            }
            case 'download':
                window.open(jellyfinService.getDownloadUrl(item.Id), '_blank');
                showToast('Download started.', 'success');
                break;
            case 'copy_stream':
                try {
                    const streamUrl = jellyfinService.getStreamUrl(item.Id);
                    await navigator.clipboard.writeText(streamUrl);
                    showToast('Stream URL copied to clipboard!', 'success');
                } catch (clipboardErr) {
                    console.error('Failed to copy stream url', clipboardErr);
                    showToast('Failed to copy stream URL.', 'error');
                }
                break;
            case 'add_collection':
                setListModalItemId(item.Id);
                setListModalType('collection');
                setListModalOpen(true);
                break;
            case 'add_playlist':
                setListModalItemId(item.Id);
                setListModalType('playlist');
                setListModalOpen(true);
                break;
            case 'media_info':
                setMediaInfoModalItemId(item.Id);
                setMediaInfoModalOpen(true);
                break;
            case 'edit_metadata':
                setEditMetaItemId(item.Id);
                setEditMetaOpen(true);
                break;
            case 'edit_images':
                setEditImagesItemId(item.Id);
                setEditImagesOpen(true);
                break;
            case 'edit_subtitles':
                if (item.Type === 'Movie') {
                    setEditSubsSeriesId(item.Id);
                    setEditSubsItemId(item.Id);
                    setEditSubsIsMovie(true);
                } else {
                    setEditSubsSeriesId(item.SeriesId || item.Id);
                    setEditSubsItemId(item.Id);
                    setEditSubsIsMovie(false);
                }
                setEditSubsOpen(true);
                break;
            case 'delete':
                setDeleteItem(item);
                break;
            case 'identify':
                setIdentifyItemId(item.Id);
                setIdentifyItemType(item.Type || null);
                setIdentifyOpen(true);
                break;
            case 'refresh': {
                const success = await jellyfinService.refreshItem(item.Id);
                if (success) {
                    showToast('Metadata refresh queued!', 'success');
                } else {
                    showToast('Failed to queue metadata refresh.', 'error');
                }
                break;
            }
            default:
                console.log(action);
        }
    };

    const getContextMenuOptions = (item) => {
        if (!item) return [];

        const options = [];

        if (item.Type === 'Series') {
            options.push({ label: 'Play', icon: 'play_arrow', action: () => handleMenuAction('play', item) });
            options.push({ label: 'Shuffle', icon: 'shuffle', action: () => handleMenuAction('shuffle', item) });

            options.push({ type: 'separator' });

            options.push({ label: 'Select', icon: 'library_add_check', action: () => enterSelectionMode(item) });
            options.push({ label: 'Add to collection', icon: 'playlist_add', action: () => handleMenuAction('add_collection', item) });
            options.push({ label: 'Add to playlist', icon: 'playlist_add', action: () => handleMenuAction('add_playlist', item) });
            options.push({ label: 'Download All', icon: 'file_download', action: () => handleMenuAction('download', item) });
            options.push({
                label: 'Delete Series',
                icon: 'delete',
                danger: true,
                action: () => handleMenuAction('delete', item)
            });

            options.push({ type: 'separator' });

            options.push({ label: 'Edit metadata', icon: 'edit', action: () => handleMenuAction('edit_metadata', item) });
            options.push({ label: 'Edit images', icon: 'image', action: () => handleMenuAction('edit_images', item) });
            options.push({ label: 'Identify', icon: 'edit', action: () => handleMenuAction('identify', item) });
            options.push({ label: 'Refresh metadata', icon: 'refresh', action: () => handleMenuAction('refresh', item) });
        } else {
            options.push({ label: 'Play', icon: 'play_arrow', action: () => handleMenuAction('play', item) });
            options.push({ label: 'Play all from here', icon: 'play_arrow', action: () => handleMenuAction('play_all_from_here', item) });

            options.push({ type: 'separator' });

            options.push({ label: 'Select', icon: 'library_add_check', action: () => enterSelectionMode(item) });
            options.push({ label: 'Add to collection', icon: 'playlist_add', action: () => handleMenuAction('add_collection', item) });
            options.push({ label: 'Add to playlist', icon: 'playlist_add', action: () => handleMenuAction('add_playlist', item) });
            options.push({ label: 'Download', icon: 'file_download', action: () => handleMenuAction('download', item) });
            options.push({ label: 'Copy Stream URL', icon: 'content_copy', action: () => handleMenuAction('copy_stream', item) });
            options.push({
                label: 'Delete media',
                icon: 'delete',
                danger: true,
                action: () => handleMenuAction('delete', item)
            });

            options.push({ type: 'separator' });

            options.push({ label: 'Edit metadata', icon: 'edit', action: () => handleMenuAction('edit_metadata', item) });
            options.push({ label: 'Edit images', icon: 'image', action: () => handleMenuAction('edit_images', item) });
            options.push({ label: 'Edit subtitles', icon: 'closed_caption', action: () => handleMenuAction('edit_subtitles', item) });
            options.push({ label: 'Identify', icon: 'edit', action: () => handleMenuAction('identify', item) });
            options.push({ label: 'Media Info', icon: 'info', action: () => handleMenuAction('media_info', item) });
            options.push({ label: 'Refresh metadata', icon: 'refresh', action: () => handleMenuAction('refresh', item) });
        }

        return options;
    };

    const handleCardClick = (item, e) => {
        if (selectionMode) {
            const newSet = new Set(selectedItems);
            if (newSet.has(item.Id)) {
                newSet.delete(item.Id);
            } else {
                newSet.add(item.Id);
            }
            setSelectedItems(newSet);
            if (newSet.size === 0) {
                setSelectionMode(null);
            }
        } else {
            navigate(`/item/${item.Id}`);
        }
    };

    const enterSelectionMode = (item) => {
        setSelectionMode('library');
        setSelectedItems(new Set([item.Id]));
    };

    const handleBatchAction = async (action) => {
        if (!selectionMode || selectedItems.size === 0) return;

        const itemIds = Array.from(selectedItems);

        if (action === 'playlist') {
            setListModalType('playlist');
            setListModalItemId(itemIds);
            setListModalOpen(true);
            return;
        }
        if (action === 'collection') {
            setListModalType('collection');
            setListModalItemId(itemIds);
            setListModalOpen(true);
            return;
        }

        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user) return;

            if (action === 'played') {
                await Promise.all(itemIds.map(id => jellyfinService.markPlayed(user.Id, id, true)));
                showToast(`Marked ${itemIds.length} items as watched.`, 'success');
            } else if (action === 'unplayed') {
                await Promise.all(itemIds.map(id => jellyfinService.markPlayed(user.Id, id, false)));
                showToast(`Marked ${itemIds.length} items as unwatched.`, 'success');
            } else if (action === 'favorite') {
                await Promise.all(itemIds.map(id => jellyfinService.markFavorite(user.Id, id, true)));
                showToast(`Added ${itemIds.length} items to favorites.`, 'success');
            } else if (action === 'delete') {
                if (window.confirm(`Are you sure you want to delete these ${itemIds.length} items from your server? This cannot be undone.`)) {
                    await Promise.all(itemIds.map(id => jellyfinService.deleteItem(id)));
                    showToast("Deleted selected items", "success");
                } else {
                    return;
                }
            } else if (action === 'group') {
                await jellyfinService.groupVersions(itemIds);
                showToast("Grouped item versions", "success");
            } else if (action === 'refresh') {
                await Promise.all(itemIds.map(id => jellyfinService.refreshItem(id)));
                showToast("Metadata refresh queued!", "success");
            }

            cancelSelectionMode(() => {
                fetchItems(0, true);
            });
        } catch (error) {
            console.error("Failed to perform batch action", error);
            showToast("Failed to perform action on some items.", "error");
        }
    };

    const handleSelectAll = () => {
        if (!selectionMode) return;
        const allIds = items.map(item => item.Id);
        const allSelected = allIds.every(id => selectedItems.has(id));

        if (allSelected) {
            setSelectedItems(new Set());
            setSelectionMode(null);
        } else {
            setSelectedItems(new Set(allIds));
        }
    };

    const cancelSelectionMode = (callback) => {
        if (selectionPanelRef.current) {
            gsap.to(selectionPanelRef.current, {
                y: 150,
                opacity: 0,
                duration: 0.25,
                ease: "power2.in",
                onComplete: () => {
                    setSelectionMode(null);
                    setSelectedItems(new Set());
                    setSelectionMenuOpen(false);
                    if (typeof callback === 'function') callback();
                }
            });
        } else {
            setSelectionMode(null);
            setSelectedItems(new Set());
            setSelectionMenuOpen(false);
            if (typeof callback === 'function') callback();
        }
    };

    return (
        <div className="library-page">
            <Navbar alwaysFilled={true} />

            <div className="library-header-container">
                <div className="library-header-content">
                    <h1 className="library-title">{libraryName || 'Library'}</h1>

                    <div className="library-controls">
                        {/* Sort Dropdown */}
                        <CustomDropdown
                            icon="sort"
                            value={sortBy}
                            onChange={setSortBy}
                            options={[
                                { value: "DateCreated,Descending", label: "Date Added" },
                                { value: "SortName,Ascending", label: "Name (A-Z)" },
                                { value: "SortName,Descending", label: "Name (Z-A)" },
                                { value: "ProductionYear,Descending", label: "Release Date (Newest)" },
                                { value: "ProductionYear,Ascending", label: "Release Date (Oldest)" },
                                { value: "CommunityRating,Descending", label: "Rating" }
                            ]}
                        />

                        {/* Filter Dropdown */}
                        <CustomDropdown
                            icon="filter_list"
                            value={filter}
                            onChange={setFilter}
                            options={[
                                { value: "All", label: "All Items" },
                                { value: "Unplayed", label: "Unplayed" },
                                { value: "Favorites", label: "Favorites" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            <div className="library-grid-container">
                <div className="library-grid">
                    {items.length > 0 ? (
                        items.map((item, index) => {
                            const isSelected = selectedItems.has(item.Id);
                            const isSelectionMode = selectionMode !== null;

                            const cardElement = (
                                <div className={`library-grid-item ${isSelected ? 'is-selected' : ''} ${isSelectionMode ? 'selection-mode-active' : ''}`}>
                                    <MediaCard
                                        item={item}
                                        onClick={handleCardClick}
                                        onContextMenu={isSelectionMode ? (e) => e.preventDefault() : handleContextMenu}
                                        isSelected={isSelected}
                                        isSelectionMode={isSelectionMode}
                                    />
                                </div>
                            );

                            // Use ref for last item to trigger infinite scroll
                            if (items.length === index + 1) {
                                return (
                                    <div ref={lastItemElementRef} key={item.Id}>
                                        {cardElement}
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={item.Id}>
                                        {cardElement}
                                    </div>
                                );
                            }
                        })
                    ) : (
                        loading && [...Array(12)].map((_, i) => (
                            <div key={i} className="library-grid-item">
                                <SkeletonLoader type="rect" width="100%" height="100%" style={{ aspectRatio: '2/3', borderRadius: '8px' }} />
                            </div>
                        ))
                    )}
                </div>
                {loading && items.length > 0 && (
                    <div className="library-loader">
                        <span className="material-icons spin">autorenew</span>
                    </div>
                )}
                {!loading && items.length === 0 && (
                    <div className="empty-state">No items found.</div>
                )}
            </div>

            {selectionMode && (
                <div ref={selectionPanelRef} className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#1e1e1e] border border-neutral-800 rounded-xl shadow-2xl p-4 z-50 flex items-center gap-4 legit-selection-panel">
                    <span className="text-lg ml-2 text-popover-foreground">{selectedItems.size} Selected</span>
                    <div className="h-6 w-px bg-neutral-800 mx-2"></div>

                    <div className="flex gap-2">
                        {/* Select All */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-neutral-300 hover:text-white hover:bg-neutral-800 gap-2"
                            onClick={handleSelectAll}
                            title="Select All"
                        >
                            <span className="material-icons text-lg">select_all</span>
                            <span className="hidden sm:inline">Select All</span>
                        </Button>

                        {/* Mark Played */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:text-green-300 hover:bg-green-400/10 gap-2"
                            onClick={() => handleBatchAction('played')}
                            title="Mark as Played"
                        >
                            <span className="material-icons text-lg">check_box</span>
                            <span className="hidden sm:inline">Played</span>
                        </Button>

                        {/* Mark Unplayed */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 gap-2"
                            onClick={() => handleBatchAction('unplayed')}
                            title="Mark as Unplayed"
                        >
                            <span className="material-icons text-lg">check_box_outline_blank</span>
                            <span className="hidden sm:inline">Unplayed</span>
                        </Button>

                        {/* More Button */}
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-neutral-300 hover:text-white hover:bg-neutral-800 gap-2"
                                onClick={() => setSelectionMenuOpen(!selectionMenuOpen)}
                                title="More Actions"
                            >
                                <span className="material-icons text-lg">more_vert</span>
                                <span className="hidden sm:inline">More</span>
                            </Button>

                            {selectionMenuOpen && (
                                <div ref={selectionMenuRef} className="absolute bottom-full mb-2 right-0 bg-[#1a1a1a] border border-neutral-800 rounded-lg shadow-xl py-1 w-48 z-[2000]">
                                    <button
                                        className="w-full text-left px-4 py-2 hover:bg-neutral-800 text-sm text-neutral-200 flex items-center gap-2"
                                        onClick={() => { setSelectionMenuOpen(false); handleBatchAction('playlist'); }}
                                    >
                                        <span className="material-icons text-sm text-neutral-400">playlist_add</span>
                                        Add to playlist
                                    </button>
                                    <button
                                        className="w-full text-left px-4 py-2 hover:bg-neutral-800 text-sm text-neutral-200 flex items-center gap-2"
                                        onClick={() => { setSelectionMenuOpen(false); handleBatchAction('collection'); }}
                                    >
                                        <span className="material-icons text-sm text-neutral-400">add</span>
                                        Add to collection
                                    </button>
                                    <button
                                        className="w-full text-left px-4 py-2 hover:bg-neutral-800 text-sm text-neutral-200 flex items-center gap-2"
                                        onClick={() => { setSelectionMenuOpen(false); handleBatchAction('refresh'); }}
                                    >
                                        <span className="material-icons text-sm text-neutral-400">refresh</span>
                                        Refresh metadata
                                    </button>
                                    <button
                                        className="w-full text-left px-4 py-2 hover:bg-neutral-800 text-sm text-neutral-200 flex items-center gap-2"
                                        onClick={() => { setSelectionMenuOpen(false); handleBatchAction('group'); }}
                                    >
                                        <span className="material-icons text-sm text-neutral-400">call_merge</span>
                                        Group versions
                                    </button>
                                    <div className="h-px bg-neutral-800 my-1"></div>
                                    <button
                                        className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-sm text-red-400 hover:text-red-300 flex items-center gap-2"
                                        onClick={() => { setSelectionMenuOpen(false); handleBatchAction('delete'); }}
                                    >
                                        <span className="material-icons text-sm text-red-400">delete</span>
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="h-6 w-px bg-neutral-800 mx-2"></div>
                    <div className="flex items-center-safe gap-2">
                        <Button
                            className="lf-btn lf-btn--ring-hover"
                            size="sm"
                            onClick={cancelSelectionMode}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                onConfirm={handleConfirmDelete}
                itemName={deleteItem?.Name}
                itemType={deleteItem?.Type}
            />

            <AddToListModal
                isOpen={listModalOpen}
                onClose={() => setListModalOpen(false)}
                itemId={listModalItemId}
                type={listModalType}
            />

            <MediaInfoModal
                isOpen={mediaInfoModalOpen}
                onClose={() => setMediaInfoModalOpen(false)}
                itemId={mediaInfoModalItemId}
            />

            <EditMetadataModal
                isOpen={editMetaOpen}
                onClose={() => setEditMetaOpen(false)}
                itemId={editMetaItemId}
            />

            <EditImagesModal
                isOpen={editImagesOpen}
                onClose={() => setEditImagesOpen(false)}
                itemId={editImagesItemId}
            />

            <SubtitleModal
                isOpen={editSubsOpen}
                onClose={() => setEditSubsOpen(false)}
                seriesId={editSubsSeriesId}
                initialEpisodeId={editSubsItemId}
                isMovie={editSubsIsMovie}
                onSubtitleDownloaded={() => showToast('Subtitle downloaded.', 'success')}
            />

            <IdentifyModal
                isOpen={identifyOpen}
                onClose={() => setIdentifyOpen(false)}
                itemId={identifyItemId}
                itemType={identifyItemType}
            />

            {
                contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        options={getContextMenuOptions(contextMenu.item)}
                        onClose={closeContextMenu}
                    />
                )
            }
        </div >
    );
};

export default Library;
