import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { useTheme } from '../../context/ThemeContext';
import { useDraggableScroll } from '../../hooks/useDraggableScroll';
import Navbar from '../../components/Navbar';
import HeroCarousel from '../../components/HeroCarousel';
import MediaRow from '../../components/MediaRow';
import Footer from '../../components/Footer';
import InfoModal from '../../components/InfoModal';
import LegacyContextMenu from '../../components/ContextMenu';
import SkeletonLoader from '../../components/SkeletonLoader';
import JellyseerrCard from '../../components/JellyseerrCard';
import { Button } from '../../components/ui/button';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import AddToListModal from '../../components/AddToListModal';
import MediaInfoModal from '../../components/MediaInfoModal';
import EditMetadataModal from '../../components/EditMetadataModal';
import EditImagesModal from '../../components/EditImagesModal';
import SubtitleModal from '../../components/SubtitleModal';
import IdentifyModal from '../../components/IdentifyModal';
import { showToast } from '../../services/toast';
import './Home.css';
import { gsap } from 'gsap';

const DraggableRow = ({ children, className, style }) => {
    const rowRef = useRef(null);
    const { events } = useDraggableScroll(rowRef);
    return (
        <div ref={rowRef} className={className} {...events} style={{ overflowX: 'auto', cursor: 'grab', ...style }}>
            {children}
        </div>
    );
};

const Home = () => {
    const { config } = useTheme();
    const navigate = useNavigate();
    const promoScrollRef = useRef(null);
    const promoIsSnapping = useRef(false);
    const promoIsScrolling = useRef(false);
    const backdropInitialized = useRef(false);
    const promoInitialized = useRef(false);

    const LOOP_COPIES = 6;

    const getCardWidth = () => {
        if (promoScrollRef.current) {
            const firstCard = promoScrollRef.current.querySelector('.promo3-card');
            if (firstCard) {
                const rect = firstCard.getBoundingClientRect();
                if (rect.width > 0) {
                    return rect.width + 20; // width + 20px gap
                }
            }
        }
        return 320; // default fallback (300px + 20px gap)
    };

    const scrollPromoRight = () => {
        if (promoScrollRef.current && promoItems.length > 0) {
            const cardWidth = getCardWidth();
            const nextIdx = (activePromoIndex + 1) % promoItems.length;
            setActivePromoIndex(nextIdx);

            promoIsScrolling.current = true;
            promoScrollRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
            setTimeout(() => {
                promoIsScrolling.current = false;
            }, 450);
        }
    };

    const selectPromoCard = (realIdx, scrollIdx) => {
        setActivePromoIndex(realIdx);
        if (promoScrollRef.current) {
            const cardWidth = getCardWidth();
            // Override scroll and snap locks to ensure immediate user feedback
            promoIsScrolling.current = true;
            promoIsSnapping.current = false;
            promoScrollRef.current.scrollTo({
                left: scrollIdx * cardWidth,
                behavior: 'smooth'
            });
            setTimeout(() => {
                promoIsScrolling.current = false;
            }, 450);
        }
    };

    const handlePromoScroll = () => {
        const container = promoScrollRef.current;
        if (!container || promoIsSnapping.current || promoIsScrolling.current || !promoInitialized.current) return;
        const scrollLeft = container.scrollLeft;
        const cardWidth = getCardWidth();
        const totalWidth = promoItems.length * cardWidth;

        // Infinite loop (6 copies):
        // Snap forward if scrolled before copy 2
        if (scrollLeft < totalWidth * 2) {
            promoIsSnapping.current = true;
            container.scrollLeft = scrollLeft + totalWidth;
            requestAnimationFrame(() => { promoIsSnapping.current = false; });
            return;
        }
        // Snap backward if scrolled past copy 4
        if (scrollLeft > totalWidth * 4) {
            promoIsSnapping.current = true;
            container.scrollLeft = scrollLeft - totalWidth;
            requestAnimationFrame(() => { promoIsSnapping.current = false; });
            return;
        }

        const rawIndex = Math.round(scrollLeft / cardWidth);
        const index = ((rawIndex % promoItems.length) + promoItems.length) % promoItems.length;
        if (index >= 0 && index < promoItems.length && index !== activePromoIndex) {
            setActivePromoIndex(index);
        }
    };

    const [libraries, setLibraries] = useState([]);
    const [resumeItems, setResumeItems] = useState([]);
    const [historyItems, setHistoryItems] = useState([]);
    const [promoItems, setPromoItems] = useState([]);
    const [carouselItems, setCarouselItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activePromoIndex, setActivePromoIndex] = useState(0);
    const [backdropA, setBackdropA] = useState('');
    const [backdropB, setBackdropB] = useState('');
    const [isAActive, setIsAActive] = useState(true);
    const [modalItem, setModalItem] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);

    // Selection Mode State
    const [selectionMode, setSelectionMode] = useState(null); // 'resume' | 'history' | null
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectionMenuOpen, setSelectionMenuOpen] = useState(false);
    const [activeRowItems, setActiveRowItems] = useState([]);
    const [homePrefs, setHomePrefs] = useState({});

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

    useEffect(() => {
        const handleHomeSectionsUpdate = async () => {
            try {
                const prefs = await jellyfinService.getDisplayPreferences("usersettings");
                if (prefs && prefs.CustomPrefs) {
                    setHomePrefs(prefs.CustomPrefs);
                }
            } catch (e) {
                console.warn("Failed to reload home sections layout", e);
            }
        };
        window.addEventListener('homeSectionsUpdated', handleHomeSectionsUpdate);
        return () => window.removeEventListener('homeSectionsUpdated', handleHomeSectionsUpdate);
    }, []);

    // Synchronize favorite toggles from other components in real-time
    useEffect(() => {
        const handleToggle = (e) => {
            const { itemId, isFavorite } = e.detail;
            setPromoItems(prevItems => prevItems.map(i =>
                i.Id === itemId
                    ? { ...i, UserData: { ...i.UserData, IsFavorite: isFavorite } }
                    : i
            ));
        };
        window.addEventListener('favoriteToggled', handleToggle);
    }, []);

    // Initialize backdrop states when promoItems load
    useEffect(() => {
        if (promoItems.length > 0 && !backdropInitialized.current) {
            const firstBackdrop = `${jellyfinService.api.basePath}/Items/${promoItems[0].Id}/Images/Backdrop/0?maxWidth=1400&quality=90`;
            setBackdropA(firstBackdrop);
            setBackdropB(firstBackdrop);
            backdropInitialized.current = true;
        }
    }, [promoItems]);

    // Handle backdrop image swaps and crossfade
    useEffect(() => {
        if (promoItems.length === 0) return;
        const activeItem = promoItems[activePromoIndex];
        if (!activeItem) return;
        const newBackdrop = `${jellyfinService.api.basePath}/Items/${activeItem.Id}/Images/Backdrop/0?maxWidth=1400&quality=90`;

        setIsAActive(currentIsAActive => {
            if (currentIsAActive) {
                setBackdropB(newBackdrop);
                return false;
            } else {
                setBackdropA(newBackdrop);
                return true;
            }
        });
    }, [activePromoIndex, promoItems.length]);

    // Initialize scroll position to middle loop section without triggering scroll events
    useEffect(() => {
        if (!loading && promoItems.length > 0 && promoScrollRef.current) {
            let attempts = 0;
            const initScroll = () => {
                const container = promoScrollRef.current;
                if (!container) return;
                const firstCard = container.querySelector('.promo3-card');
                if (!firstCard || firstCard.getBoundingClientRect().width === 0) {
                    if (attempts < 10) {
                        attempts++;
                        setTimeout(initScroll, 100);
                    }
                    return;
                }
                const rect = firstCard.getBoundingClientRect();
                const cardWidth = rect.width + 20; // actual width + 20px gap
                const middleOffset = 3 * promoItems.length * cardWidth;
                promoIsSnapping.current = true;
                container.scrollLeft = middleOffset;
                setTimeout(() => {
                    promoIsSnapping.current = false;
                    promoInitialized.current = true;
                }, 150);
            };
            initScroll();
        }
    }, [loading, promoItems.length]);

    // Handle window resize to keep active card aligned properly
    useEffect(() => {
        const handleResize = () => {
            if (promoScrollRef.current && promoItems.length > 0) {
                const cardWidth = getCardWidth();
                const scrollIdx = 3 * promoItems.length + activePromoIndex;
                promoIsScrolling.current = true;
                promoScrollRef.current.scrollLeft = scrollIdx * cardWidth;
                setTimeout(() => {
                    promoIsScrolling.current = false;
                }, 50);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [activePromoIndex, promoItems.length]);



    const togglePromoFav = async (e, item) => {
        e.stopPropagation();
        if (!item || !item.UserData) return;

        const originalState = item.UserData.IsFavorite;
        const newState = !originalState;

        // Optimistic UI Update
        setPromoItems(prevItems => prevItems.map(i =>
            i.Id === item.Id
                ? { ...i, UserData: { ...i.UserData, IsFavorite: newState } }
                : i
        ));

        // Dispatch event so other components sync
        window.dispatchEvent(new CustomEvent('favoriteToggled', {
            detail: { itemId: item.Id, isFavorite: newState }
        }));

        try {
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                await jellyfinService.markFavorite(user.Id, item.Id, newState);
            }
        } catch (err) {
            console.error("Failed to toggle promo favorite", err);
            // Revert on failure
            setPromoItems(prevItems => prevItems.map(i =>
                i.Id === item.Id
                    ? { ...i, UserData: { ...i.UserData, IsFavorite: originalState } }
                    : i
            ));
            window.dispatchEvent(new CustomEvent('favoriteToggled', {
                detail: { itemId: item.Id, isFavorite: originalState }
            }));
        }
    };


    const fetchData = async (showSkeleton = true) => {
        if (showSkeleton) setLoading(true);
        try {
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                document.title = `Legitflix - Home`;

                const safeFetch = async (promise, fallback = { Items: [] }) => {
                    try {
                        const res = await promise;
                        return res || fallback;
                    } catch (e) {
                        console.warn("[LegitFlix] safeFetch failed for endpoint in Home:", e);
                        return fallback;
                    }
                };

                const [views, resume, history, latestUploadsResult, prefsResult] = await Promise.all([
                    safeFetch(jellyfinService.getUserViews(user.Id)),
                    safeFetch(jellyfinService.getResumeItems(user.Id)),
                    safeFetch(jellyfinService.getHistoryItems(user.Id)),
                    safeFetch(jellyfinService.getItems(user.Id, {
                        sortBy: config.contentSortMode === 'random' ? ['Random'] : (config.contentSortMode === 'topRated' ? ['CommunityRating'] : ['DateCreated']),
                        sortOrder: ['Descending'],
                        limit: 40,
                        recursive: true,
                        includeItemTypes: typeof config.heroMediaTypes === 'string' ? config.heroMediaTypes.split(',') : (config.heroMediaTypes || ['Movie', 'Series']),
                        fields: ['PrimaryImageAspectRatio', 'Overview', 'DateCreated', 'ProductionYear', 'CommunityRating', 'OfficialRating', 'Genres', 'ImageTags', 'BackdropImageTags', 'RunTimeTicks', 'UserData', 'MediaStreams', 'Width', 'Height', 'ChildCount', 'RecursiveItemCount']
                    })),
                    safeFetch(jellyfinService.getDisplayPreferences("usersettings"), {})
                ]);

                let homePrefsData = {};
                if (prefsResult && prefsResult.CustomPrefs) {
                    homePrefsData = prefsResult.CustomPrefs;
                }
                setHomePrefs(homePrefsData);

                if (views?.Items) setLibraries(views.Items);

                let resumeIds = new Set();
                if (resume?.Items) {
                    const filteredResume = resume.Items.filter(item => {
                        const played = item.UserData?.Played || item.UserData?.PlayedPercentage >= 100;
                        return !played;
                    }).slice(0, 15);
                    setResumeItems(filteredResume);
                    resumeIds = new Set(filteredResume.map(i => i.Id));
                }

                if (history?.Items) {
                    const seenSeries = new Set();
                    const uniqueHistory = [];
                    for (const item of history.Items) {
                        if (resumeIds.has(item.Id)) {
                            continue;
                        }
                        if (item.Type === 'Episode') {
                            if (!seenSeries.has(item.SeriesId)) {
                                seenSeries.add(item.SeriesId);
                                uniqueHistory.push(item);
                            }
                        } else {
                            uniqueHistory.push(item);
                        }
                        if (uniqueHistory.length >= 15) break;
                    }
                    setHistoryItems(uniqueHistory);
                }

                // === PHASE 1 COMPLETE: Show content immediately ===
                if (latestUploadsResult?.Items) {
                    const allLatest = latestUploadsResult.Items || [];
                    const backdropLatest = allLatest.filter(i => i.BackdropImageTags && i.BackdropImageTags.length > 0);
                    const carouselItemsData = backdropLatest.slice(0, 6);
                    const promoItemsData = backdropLatest.slice(6, 12);

                    // Show carousel & promo immediately (without Next Up enrichment)
                    setCarouselItems([...carouselItemsData]);
                    setPromoItems([...promoItemsData]);

                    // Drop the skeleton NOW - all above-the-fold content is ready
                    setLoading(false);

                    // === PHASE 2: Enrich Next Up in background (non-blocking) ===
                    const enrichNextUp = async (items, setter) => {
                        const enriched = await Promise.all(items.map(async (item) => {
                            if (item.Type === 'Series') {
                                try {
                                    const nextUp = await jellyfinService.getNextUp(user.Id, item.Id);
                                    if (nextUp.Items && nextUp.Items.length > 0) {
                                        return { ...item, _nextUp: nextUp.Items[0] };
                                    }
                                } catch (e) {
                                    console.warn('Failed to fetch Next Up for item', e);
                                }
                            }
                            return item;
                        }));
                        setter(enriched);
                    };

                    // Fire both enrichments concurrently, don't await them for skeleton
                    enrichNextUp(carouselItemsData, setCarouselItems);
                    enrichNextUp(promoItemsData, setPromoItems);
                    return; // Skip the finally block's setLoading(false) since we already did it
                }
            }
        } catch (err) {
            console.error("Home fetch error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [config]); // Re-fetch when config changes (e.g. sort mode)

    const handlePlay = (e, item) => {
        e.stopPropagation();
        if (item.Type === 'Series') {
            if (item._nextUp) {
                navigate(`/play/${item._nextUp.Id}`);
            } else {
                navigate(`/series/${item.Id}`);
            }
        } else if (item.Type === 'Movie') {
            navigate(`/movie/${item.Id}`, { state: { autoplay: true } });
        } else if (item.Type === 'Episode') {
            navigate(`/play/${item.Id}`);
        } else {
            navigate(`/item/${item.Id}`);
        }
    };

    const handlePlayAllFromHere = (currentItem, section = 'resume') => {
        const list = section === 'history' ? historyItems : resumeItems;
        const currentIndex = list.findIndex(i => i.Id === currentItem.Id);
        if (currentIndex === -1) return;

        const remainingItems = list.slice(currentIndex + 1);
        const remainingIds = remainingItems.map(i => i.Id);

        let targetId = currentItem.Id;
        if (currentItem.Type === 'Series' && currentItem._nextUp) {
            targetId = currentItem._nextUp.Id;
        }
        navigate(`/play/${targetId}`, { state: { playlist: remainingIds } });
    };

    const openModal = (id) => setModalItem(id);
    const closeModal = () => setModalItem(null);

    const handleConfirmDelete = async () => {
        if (deleteItem) {
            try {
                await jellyfinService.deleteItem(deleteItem.Id);
                showToast(`${deleteItem.Type} deleted successfully.`, 'success');
                setResumeItems(prev => prev.filter(i => i.Id !== deleteItem.Id));
                setHistoryItems(prev => prev.filter(i => i.Id !== deleteItem.Id));
                setPromoItems(prev => prev.filter(i => i.Id !== deleteItem.Id));
                setCarouselItems(prev => prev.filter(i => i.Id !== deleteItem.Id));
                setDeleteItem(null);
                fetchData(false);
            } catch (e) {
                console.error("Failed to delete item", e);
                showToast("Failed to delete item.", "error");
            }
        }
    };

    const handleContextMenu = (e, item, section = null, rowItems = null) => {
        e.preventDefault();

        if (rowItems) {
            setActiveRowItems(rowItems);
        } else if (section === 'resume') {
            setActiveRowItems(resumeItems);
        } else if (section === 'history') {
            setActiveRowItems(historyItems);
        }

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
            item,
            section
        });
    };

    const closeContextMenu = () => setContextMenu(null);

    const handleMenuAction = async (action, item) => {
        closeContextMenu();
        switch (action) {
            case 'play':
                handlePlay({ stopPropagation: () => { } }, item);
                break;
            case 'play_all_from_here':
                handlePlayAllFromHere(item, 'resume');
                break;
            case 'play_all_from_history':
                handlePlayAllFromHere(item, 'history');
                break;
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
                const downloadUrl = jellyfinService.getDownloadUrl(item.Id);
                window.open(downloadUrl, '_blank');
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
            case 'refresh':
                const success = await jellyfinService.refreshItem(item.Id);
                if (success) {
                    showToast('Metadata refresh queued!', 'success');
                } else {
                    showToast('Failed to queue metadata refresh.', 'error');
                }
                break;
            case 'remove_resume': {
                const currentUser = await jellyfinService.getCurrentUser();
                if (currentUser) {
                    await jellyfinService.hideFromResume(item.Id);
                    showToast('Removed from Continue Watching.', 'success');
                    setResumeItems(prev => prev.filter(i => i.Id !== item.Id));
                    fetchData(false);
                }
                break;
            }
            case 'remove_history':
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    const idToRemove = (item.Type === 'Episode' && item.SeriesId) ? item.SeriesId : item.Id;
                    await jellyfinService.markPlayed(user.Id, idToRemove, false);
                    showToast('Removed from History.', 'success');
                    setHistoryItems(prev => prev.filter(i => i.Id !== item.Id && i.SeriesId !== idToRemove));
                    fetchData(false);
                }
                break;
            case 'toggle_favorite': {
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    const newFav = !item.UserData?.IsFavorite;
                    await jellyfinService.markFavorite(user.Id, item.Id, newFav);
                    showToast(newFav ? 'Added to favorites.' : 'Removed from favorites.', 'success');
                    const updateFav = prev => prev.map(i => i.Id === item.Id ? { ...i, UserData: { ...i.UserData, IsFavorite: newFav } } : i);
                    setResumeItems(updateFav);
                    setHistoryItems(updateFav);
                    setPromoItems(updateFav);
                    setCarouselItems(updateFav);
                    fetchData(false);
                }
                break;
            }
            case 'toggle_played': {
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    const newPlayed = !item.UserData?.Played;
                    await jellyfinService.markPlayed(user.Id, item.Id, newPlayed);
                    showToast(newPlayed ? 'Marked as watched.' : 'Marked as unwatched.', 'success');
                    if (newPlayed) {
                        setResumeItems(prev => prev.filter(i => i.Id !== item.Id));
                    }
                    const updatePlayed = prev => prev.map(i => i.Id === item.Id ? { ...i, UserData: { ...i.UserData, Played: newPlayed } } : i);
                    setHistoryItems(updatePlayed);
                    setPromoItems(updatePlayed);
                    setCarouselItems(updatePlayed);
                    fetchData(false);
                }
                break;
            }
            default:
                console.log('Action not implemented:', action);
        }
    };

    const toggleSelection = (e, item) => {
        e.preventDefault();
        e.stopPropagation();
        const newSet = new Set(selectedItems);
        const wasSelected = newSet.has(item.Id);

        if (wasSelected) {
            newSet.delete(item.Id);
        } else {
            newSet.add(item.Id);
        }

        setSelectedItems(newSet);
        if (newSet.size === 0) {
            setSelectionMode(null);
        }
    };

    const enterSelectionMode = (section, initialItem) => {
        setSelectionMode(section);
        setSelectedItems(new Set([initialItem.Id]));
    };

    const handleBatchAction = async (action) => {
        if (!selectionMode || selectedItems.size === 0) return;

        const items = Array.from(selectedItems);

        if (action === 'playlist') {
            setListModalType('playlist');
            setListModalItemId(items);
            setListModalOpen(true);
            return;
        }
        if (action === 'collection') {
            setListModalType('collection');
            setListModalItemId(items);
            setListModalOpen(true);
            return;
        }

        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user) return;

            if (action === 'remove') {
                if (selectionMode === 'resume') {
                    await Promise.all(items.map(id => jellyfinService.hideFromResume(id)));
                } else if (selectionMode === 'history') {
                    await Promise.all(items.map(id => {
                        const item = historyItems.find(i => i.Id === id);
                        const targetId = (item && item.Type === 'Episode' && item.SeriesId) ? item.SeriesId : id;
                        return jellyfinService.markPlayed(user.Id, targetId, false);
                    }));
                }
                showToast("Removed selected items", "success");
            } else if (action === 'played') {
                await Promise.all(items.map(id => jellyfinService.markPlayed(user.Id, id, true)));
                showToast("Marked items as played", "success");
            } else if (action === 'unplayed') {
                await Promise.all(items.map(id => jellyfinService.markPlayed(user.Id, id, false)));
                showToast("Marked items as unplayed", "success");
            } else if (action === 'favorite') {
                await Promise.all(items.map(id => jellyfinService.markFavorite(user.Id, id, true)));
                showToast("Added items to favorites", "success");
            } else if (action === 'delete') {
                if (window.confirm(`Are you sure you want to delete these ${items.length} items from your server? This cannot be undone.`)) {
                    await Promise.all(items.map(id => jellyfinService.deleteItem(id)));
                    showToast("Deleted selected items", "success");
                } else {
                    return;
                }
            } else if (action === 'group') {
                await jellyfinService.groupVersions(items);
                showToast("Grouped item versions", "success");
            } else if (action === 'refresh') {
                await Promise.all(items.map(id => jellyfinService.refreshItem(id)));
                showToast("Metadata refresh queued!", "success");
            }

            cancelSelectionMode(() => {
                fetchData(false);
            });
        } catch (error) {
            console.error("Failed to perform batch action", error);
            showToast("Failed to perform action on some items.", "error");
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

    const handleSelectAll = () => {
        if (!selectionMode) return;
        const currentItems = selectionMode === 'resume' ? resumeItems : historyItems;
        const allIds = currentItems.map(item => item.Id);
        const allSelected = allIds.every(id => selectedItems.has(id));

        if (allSelected) {
            setSelectedItems(new Set());
            setSelectionMode(null);
        } else {
            setSelectedItems(new Set(allIds));
        }
    };

    // Legacy context menu for other rows
    // Legacy context menu for other rows
    const getContextMenuOptions = (item, section) => {
        if (!item) return [];

        const options = [];

        if (item.Type === 'Series') {
            // Series Action Sheet options
            options.push({ label: 'Play', icon: 'play_arrow', action: () => handleMenuAction('play', item) });
            options.push({ label: 'Shuffle', icon: 'shuffle', action: () => handleMenuAction('shuffle', item) });

            options.push({ type: 'separator' });

            options.push({ label: 'Select', icon: 'library_add_check', action: () => enterSelectionMode(section || 'media_row', item) });
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
            // Movie/Episode/Other Action Sheet options (Film type / Episode type)
            options.push({ label: 'Play', icon: 'play_arrow', action: () => handleMenuAction('play', item) });

            const playAllAction = section === 'history' ? 'play_all_from_history' : 'play_all_from_here';
            options.push({ label: 'Play all from here', icon: 'play_arrow', action: () => handleMenuAction(playAllAction, item) });

            options.push({ type: 'separator' });

            // Special Section Options
            if (section === 'resume') {
                options.push({ label: 'Remove from Continue Watching', icon: 'close', action: () => handleMenuAction('remove_resume', item) });
                options.push({ type: 'separator' });
            }
            if (section === 'history') {
                options.push({ label: 'Mark Played', icon: 'check', action: () => handleMenuAction('toggle_played', item) });
                options.push({ type: 'separator' });
            }

            options.push({ label: 'Select', icon: 'library_add_check', action: () => enterSelectionMode(section || 'media_row', item) });
            options.push({ label: 'Add to collection', icon: 'playlist_add', action: () => handleMenuAction('add_collection', item) });
            options.push({ label: 'Add to playlist', icon: 'playlist_add', action: () => handleMenuAction('add_playlist', item) });
            options.push({ label: 'Download', icon: 'file_download', action: () => handleMenuAction('download', item) });
            options.push({ label: 'Copy Stream URL', icon: 'content_copy', action: () => handleMenuAction('copy_stream', item) });
            options.push({
                label: item.Type === 'Episode' ? 'Delete Episode' : (item.Type === 'Movie' ? 'Delete Movie' : 'Delete media'),
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

    return (
        <div className="home-page">
            <Navbar />
            <HeroCarousel items={carouselItems} loading={loading} onInfoClick={openModal} />

            <div className="home-content-container" style={{ position: 'relative', zIndex: 10 }}>
                {loading ? (
                    <div style={{ paddingLeft: '4%', paddingRight: '4%', marginTop: '40px' }}>
                        {/* Browse Libraries Row */}
                        <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Browse Libraries</h2>
                        <DraggableRow className="libraries-grid" style={{ overflowX: 'hidden' }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="library-card skeleton" />
                            ))}
                        </DraggableRow>

                        {/* Continue Watching Row */}
                        <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Continue Watching</h2>
                        <DraggableRow className="backdrop-scroll-container">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="backdrop-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div className="backdrop-card-image skeleton" />
                                    <div className="skeleton" style={{ width: '70%', height: '14px', borderRadius: '4px' }} />
                                    <div className="skeleton" style={{ width: '45%', height: '12px', borderRadius: '4px' }} />
                                </div>
                            ))}
                        </DraggableRow>

                        {/* Up Next Row */}
                        <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Up Next</h2>
                        <DraggableRow className="backdrop-scroll-container">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="backdrop-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div className="backdrop-card-image skeleton" />
                                    <div className="skeleton" style={{ width: '70%', height: '14px', borderRadius: '4px' }} />
                                    <div className="skeleton" style={{ width: '45%', height: '12px', borderRadius: '4px' }} />
                                </div>
                            ))}
                        </DraggableRow>

                        {/* Promo Section Skeleton */}
                        <section className="featured-promo-section">
                            <div className="promo3-container" style={{ background: '#121212', borderRadius: '12px', overflow: 'hidden' }}>
                                <div className="promo3-content-wrapper" style={{ pointerEvents: 'none' }}>
                                    {/* Left Side Info */}
                                    <div className="promo3-left-info" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div className="skeleton" style={{ width: '60%', height: '24px', borderRadius: '4px' }} />
                                        <div className="skeleton" style={{ width: '40%', height: '16px', borderRadius: '4px', marginBottom: '16px' }} />
                                        <div className="skeleton" style={{ width: '80%', height: '45px', borderRadius: '4px', marginBottom: '10px' }} />
                                        <div className="skeleton" style={{ width: '60%', height: '16px', borderRadius: '4px' }} />
                                        <div className="skeleton" style={{ width: '100%', height: '14px', borderRadius: '4px' }} />
                                        <div className="skeleton" style={{ width: '90%', height: '14px', borderRadius: '4px', marginBottom: '16px' }} />
                                        <div className="promo3-btn-row" style={{ display: 'flex', gap: '12px' }}>
                                            <div className="skeleton" style={{ width: '130px', height: '42px', borderRadius: '6px' }} />
                                            <div className="skeleton" style={{ width: '130px', height: '42px', borderRadius: '6px' }} />
                                        </div>
                                    </div>
                                    <div className="promo3-right-carousel">
                                        <div className="promo3-cards-scroll" style={{ display: 'flex', gap: '12px' }}>
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="promo3-card skeleton" style={{ flex: '0 0 150px', width: '150px', height: '225px', borderRadius: '10px' }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <>
                        {/* 1. Seerr & Library Navigation */}
                        <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '40px' }}>
                            <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Browse Libraries</h2>
                            <DraggableRow className="libraries-grid">
                                {libraries.map(lib => (
                                    <div
                                        key={lib.Id}
                                        className="library-card"
                                        onClick={(e) => {
                                            navigate(`/library/${lib.Id}`)
                                        }}
                                    >
                                        <img
                                            src={`${jellyfinService.api.basePath}/Items/${lib.Id}/Images/Primary?fillHeight=480&fillWidth=320&quality=90`}
                                            alt={lib.Name}
                                            className="library-card-image"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex'; // Show fallback if image fails
                                            }}
                                            draggable={false}
                                        />
                                        <div className="library-card-content fallback" style={{ display: 'none' }}>
                                            <span className="material-icons library-icon">
                                                {lib.CollectionType === 'movies' ? 'movie' :
                                                    lib.CollectionType === 'tvshows' ? 'tv' : 'folder'}
                                            </span>
                                        </div>
                                        {config.showLibraryTitles && (
                                            <div className="library-card-overlay">
                                                <span className="library-name">{lib.Name}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <JellyseerrCard />
                            </DraggableRow>
                        </section>

                        {/* 2. Continue Watching */}
                        {resumeItems.length > 0 && homePrefs["LegitFlix_HomeSection_resume"] !== "false" && (
                            <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '40px' }}>
                                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Continue Watching</h2>
                                <DraggableRow className="backdrop-scroll-container">
                                    {resumeItems.map(item => {
                                        const played = item.UserData?.PlayedPercentage >= 100 || item.UserData?.Played;
                                        const ticksLeft = item.RunTimeTicks && item.UserData?.PlaybackPositionTicks
                                            ? item.RunTimeTicks - item.UserData.PlaybackPositionTicks
                                            : 0;
                                        const minsLeft = ticksLeft > 0 ? Math.round(ticksLeft / 600000000) : 0;
                                        const isSelected = selectedItems.has(item.Id);
                                        const isSelectionMode = selectionMode === 'resume';

                                        const CardContent = (
                                            <div
                                                className={`backdrop-card ${isSelected ? 'is-selected' : ''}`}
                                                onClick={(e) => {
                                                    if (isSelectionMode) {
                                                        toggleSelection(e, item);
                                                    } else {
                                                        handlePlay(e, item); // Unified play handler
                                                    }
                                                }}
                                                // Removed old onContextMenu
                                                title={`Resume: ${item.Name}`}
                                            >
                                                <div className="backdrop-card-image">
                                                    <img
                                                        src={item.ImageTags?.Backdrop || item.BackdropImageTags?.length > 0
                                                            ? `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?maxWidth=500&quality=90`
                                                            : `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=500`}
                                                        alt={item.Name}
                                                        draggable={false}
                                                        onError={(e) => { e.target.src = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=500`; }}
                                                    />
                                                    {/* Play Overlay (Only show if NOT in selection mode) */}
                                                    {!isSelectionMode && (
                                                        <div className="backdrop-play-overlay is-resume">
                                                            <span className="material-icons" style={{ fontSize: '32px' }}>play_arrow</span>
                                                        </div>
                                                    )}
                                                    {/* Selection Overlay */}
                                                    {isSelectionMode && (
                                                        <div className={`backdrop-selection-overlay ${isSelected ? 'is-selected' : ''}`}>
                                                            {isSelected && <span className="material-icons" style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>check</span>}
                                                        </div>
                                                    )}

                                                    {/* Time-Left or Watched Badge */}
                                                    {played ? (
                                                        <div className="backdrop-badge watched">Watched</div>
                                                    ) : minsLeft > 0 ? (
                                                        <div className="backdrop-badge time-left">{minsLeft}m left</div>
                                                    ) : null}
                                                </div>
                                                {/* Progress Bar */}
                                                {item.UserData && item.RunTimeTicks > 0 && !played && (
                                                    <div className="backdrop-progress-track">
                                                        <div className="backdrop-progress-fill" style={{ width: `${Math.min(100, (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100)}%` }}></div>
                                                    </div>
                                                )}
                                                <div className="backdrop-card-info">
                                                    <span className="backdrop-card-series">{item.SeriesName || ''}</span>
                                                    <span className="backdrop-card-title">
                                                        {item.SeriesName
                                                            ? (item.ParentIndexNumber != null && item.IndexNumber != null
                                                                ? `S${item.ParentIndexNumber} E${item.IndexNumber} – ${item.Name}`
                                                                : item.Name)
                                                            : item.Name}
                                                    </span>
                                                </div>
                                            </div>
                                        );

                                        if (isSelectionMode) {
                                            return <div key={item.Id}>{CardContent}</div>;
                                        }

                                        return (
                                            <div
                                                key={item.Id}
                                                onContextMenu={(e) => handleContextMenu(e, item, 'resume', resumeItems)}
                                            >
                                                {CardContent}
                                            </div>
                                        );
                                    })}
                                </DraggableRow>
                            </section>
                        )}

                        {/* 2.5. Up Next */}
                        {historyItems.length > 0 && homePrefs["LegitFlix_HomeSection_history"] !== "false" && (
                            <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '40px' }}>
                                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Up Next</h2>
                                <DraggableRow className="backdrop-scroll-container">
                                    {historyItems.map(item => {
                                        const isSelected = selectedItems.has(item.Id);
                                        const isSelectionMode = selectionMode === 'history';

                                        const CardContent = (
                                            <div
                                                className={`backdrop-card ${isSelected ? 'is-selected' : ''}`}
                                                onClick={(e) => {
                                                    if (isSelectionMode) toggleSelection(e, item);
                                                    else navigate(`/item/${item.Id}`);
                                                }}
                                                // Removed old onContextMenu
                                                title={item.Name}
                                            >
                                                <div className="backdrop-card-image">
                                                    <img
                                                        src={item.ImageTags?.Backdrop || item.BackdropImageTags?.length > 0
                                                            ? `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?maxWidth=500&quality=90`
                                                            : `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=500`}
                                                        alt={item.Name}
                                                        draggable={false}
                                                        onError={(e) => { e.target.src = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=500`; }}
                                                    />
                                                    {!isSelectionMode && (
                                                        <div className="backdrop-play-overlay is-history">
                                                            <span className="material-icons" style={{ fontSize: '28px' }}>replay</span>
                                                        </div>
                                                    )}
                                                    {isSelectionMode && (
                                                        <div className={`backdrop-selection-overlay ${isSelected ? 'is-selected' : ''}`}>
                                                            {isSelected && <span className="material-icons" style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>check</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="backdrop-card-info">
                                                    <span className="backdrop-card-series">{item.SeriesName || ''}</span>
                                                    <span className="backdrop-card-title">
                                                        {item.SeriesName
                                                            ? (item.ParentIndexNumber != null && item.IndexNumber != null
                                                                ? `S${item.ParentIndexNumber} E${item.IndexNumber} – ${item.Name}`
                                                                : item.Name)
                                                            : item.Name}
                                                    </span>
                                                </div>
                                            </div>
                                        );

                                        if (isSelectionMode) {
                                            return <div key={item.Id}>{CardContent}</div>;
                                        }

                                        return (
                                            <div
                                                key={item.Id}
                                                onContextMenu={(e) => handleContextMenu(e, item, 'history', historyItems)}
                                            >
                                                {CardContent}
                                            </div>
                                        );
                                    })}
                                </DraggableRow>
                            </section>
                        )}

                        {/* Promo Banners */}
                        {promoItems.length > 0 && homePrefs["LegitFlix_HomeSection_promo"] !== "false" && (
                            <section className="featured-promo-section">
                                {(() => {
                                    const activeItem = promoItems[activePromoIndex] || promoItems[0];
                                    const logoUrl = `${jellyfinService.api.basePath}/Items/${activeItem.Id}/Images/Logo?maxHeight=200&maxWidth=450&quality=90`;
                                    const hasLogo = activeItem.ImageTags && activeItem.ImageTags.Logo;

                                    // Format runtime / series stats
                                    let durationText = '';
                                    if (activeItem.Type === 'Series') {
                                        const seasonsCount = activeItem.ChildCount || 0;
                                        const episodesCount = activeItem.RecursiveItemCount || 0;
                                        const seasonsStr = seasonsCount === 1 ? '1 Season' : `${seasonsCount} Seasons`;
                                        const episodesStr = episodesCount === 1 ? '1 Episode' : `${episodesCount} Episodes`;
                                        durationText = `${seasonsStr} • ${episodesStr}`;
                                    } else if (activeItem.RunTimeTicks) {
                                        const totalMinutes = Math.round(activeItem.RunTimeTicks / 600000000);
                                        const hrs = Math.floor(totalMinutes / 60);
                                        const mins = totalMinutes % 60;
                                        durationText = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                                    }

                                    const rating = activeItem.CommunityRating ? activeItem.CommunityRating.toFixed(1) : null;
                                    const genresText = activeItem.Genres ? activeItem.Genres.slice(0, 3).join(' • ') : '';
                                    const isFav = activeItem.UserData?.IsFavorite;
                                    const loopingItems = Array(LOOP_COPIES).fill(promoItems).flat();

                                    return (
                                        <div className="promo3-container">
                                            {/* Static Alternating Backdrop A */}
                                            <div
                                                className={`promo3-backdrop-image ${isAActive ? 'active' : 'inactive'}`}
                                                style={{ backgroundImage: backdropA ? `url('${backdropA}')` : 'none' }}
                                            />
                                            {/* Static Alternating Backdrop B */}
                                            <div
                                                className={`promo3-backdrop-image ${!isAActive ? 'active' : 'inactive'}`}
                                                style={{ backgroundImage: backdropB ? `url('${backdropB}')` : 'none' }}
                                            />
                                            <div className="promo3-overlay-gradient" />

                                            <div className="promo3-content-wrapper">
                                                {/* Left Side: Info */}
                                                <div className="promo3-left-info">
                                                    {hasLogo ? (
                                                        <div
                                                            className="promo3-logo-wrapper"
                                                            onClick={() => {
                                                                if (activeItem.Type === 'Series') navigate(`/series/${activeItem.Id}`);
                                                                else if (activeItem.Type === 'Movie') navigate(`/movie/${activeItem.Id}`);
                                                                else navigate(`/item/${activeItem.Id}`);
                                                            }}
                                                        >
                                                            <img
                                                                src={logoUrl}
                                                                alt={activeItem.Name}
                                                                className="promo3-logo"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <h2
                                                            className="promo3-title clickable"
                                                            onClick={() => {
                                                                if (activeItem.Type === 'Series') navigate(`/series/${activeItem.Id}`);
                                                                else if (activeItem.Type === 'Movie') navigate(`/movie/${activeItem.Id}`);
                                                                else navigate(`/item/${activeItem.Id}`);
                                                            }}
                                                        >
                                                            {activeItem.Name}
                                                        </h2>
                                                    )}

                                                    <div className="promo3-meta-row">
                                                        {rating && <span className="promo3-rating">⭐ {rating}</span>}
                                                        {rating && durationText && <span className="promo3-meta-sep">|</span>}
                                                        {durationText && <span>{durationText}</span>}
                                                        {activeItem.ProductionYear && <span className="promo3-meta-dot">•</span>}
                                                        {activeItem.ProductionYear && <span>{activeItem.ProductionYear}</span>}
                                                        {genresText && <span className="promo3-meta-dot">•</span>}
                                                        <span className="promo3-genres">{genresText}</span>
                                                    </div>

                                                    <p className="promo3-desc">{activeItem.Overview}</p>

                                                    <div className="promo3-btn-row">
                                                        <Button
                                                            variant="ringHover"
                                                            className="promo3-btn-play"
                                                            onClick={(e) => handlePlay(e, activeItem)}
                                                        >
                                                            <span className="material-icons">play_arrow</span>
                                                            <span>Play Now</span>
                                                        </Button>

                                                        <Button
                                                            className={`promo3-btn-fav ${isFav ? 'active' : ''}`}
                                                            onClick={(e) => togglePromoFav(e, activeItem)}
                                                            title={isFav ? 'Favorited' : 'Add to Favorite'}
                                                        >
                                                            <span className="material-icons">{isFav ? 'favorite' : 'favorite_border'}</span>
                                                            <span>{isFav ? 'Favorited' : 'Favorite'}</span>
                                                        </Button>

                                                        <Button
                                                            className="promo3-btn-info"
                                                            onClick={() => openModal(activeItem.Id)}
                                                            title="More Info"
                                                            style={{ minWidth: '42px', padding: '10px 12px' }}
                                                        >
                                                            <span className="material-icons">info_outline</span>
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Right Side: Scrollable Poster Grid */}
                                                <div className="promo3-right-carousel">
                                                    <div
                                                        className="promo3-cards-scroll"
                                                        ref={promoScrollRef}
                                                        onScroll={handlePromoScroll}
                                                    >
                                                        {loopingItems.map((item, idx) => {
                                                            const isCardActive = (idx % promoItems.length) === activePromoIndex;
                                                            const posterUrl = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=420&fillWidth=280&quality=90`;
                                                            const itemRating = item.CommunityRating ? item.CommunityRating.toFixed(1) : null;
                                                            const itemType = item.Type === 'Series' ? 'Series' : 'Movie';

                                                            return (
                                                                <div
                                                                    key={`${item.Id}-${idx}`}
                                                                    className={`promo3-card ${isCardActive ? 'active' : ''}`}
                                                                    onClick={() => selectPromoCard(idx % promoItems.length, idx)}
                                                                >
                                                                    <img src={posterUrl} alt={item.Name} className="promo3-card-img" />
                                                                    <div className="promo3-card-gradient" />
                                                                    <div className="promo3-card-info">
                                                                        <span className="promo3-card-title">{item.Name}</span>
                                                                        <div className="promo3-card-meta">
                                                                            {itemRating && <span>⭐ {itemRating}</span>}
                                                                            {itemRating && <span className="promo3-card-dot">•</span>}
                                                                            <span>{itemType}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {promoItems.length > 3 && (
                                                <button
                                                    className="promo3-scroll-arrow"
                                                    onClick={scrollPromoRight}
                                                    title="Next"
                                                >
                                                    <span className="material-icons">chevron_right</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })()}
                            </section>
                        )}

                        {/* 3. Media Rows (Latest per Library) */}
                        {homePrefs["LegitFlix_HomeSection_latestMedia"] !== "false" && libraries.map(lib => (
                            <MediaRow
                                key={lib.Id}
                                title={`Latest ${lib.Name}`}
                                libraryId={lib.Id}
                                onCardClick={(item, e) => {
                                    if (selectionMode) {
                                        toggleSelection(e, item);
                                    } else {
                                        navigate(`/item/${item.Id}`);
                                    }
                                }}
                                onContextMenu={(e, item, rowItems) => handleContextMenu(e, item, 'latest', rowItems)}
                                selectionMode={selectionMode}
                                selectedItems={selectedItems}
                            />
                        ))}

                        <Footer />
                    </>
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

            <InfoModal
                itemId={modalItem}
                isOpen={!!modalItem}
                onClose={closeModal}
            />

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

            {contextMenu && (
                <LegacyContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    options={getContextMenuOptions(contextMenu.item, contextMenu.section)}
                    onClose={closeContextMenu}
                />
            )}
        </div>
    );
};

export default Home;
