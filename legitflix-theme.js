/* LegitFlix Theme JS v4.0 (Debug & Dynamic Nav)
   - Core: Added console.log debugs to all functions.
   - Nav: Fetches real User Views (Libraries) from API instead of hardcoded links.
   - Fix: Carousel "rapid switch" fixed (Single interval enforcement + Debounce).
   - Fix: Header alignment and loading logic.
*/

console.log('%c LegitFlix: Theme v4.0 Loaded ', 'background: #00AA00; color: white; padding: 2px 5px; border-radius: 3px;');

// --- FORCE SLEEK SCROLLBAR (JS Injection) ---
setTimeout(() => {
    try {
        const existing = document.getElementById('legitflix-scrollbar-override');
        if (existing) existing.remove();

        const scrollStyle = document.createElement('style');
        scrollStyle.id = 'legitflix-scrollbar-override';
        scrollStyle.textContent = `
            /* Force Hardware Acceleration for smooth scrolling */
            html, body {
                scroll-behavior: smooth;
            }

            /* Firefox - Global */
            * {
                scrollbar-width: thin !important;
                scrollbar-color: rgba(255, 255, 255, 0.2) transparent !important;
            }

            /* WebKit - Global & Specific Targets */
            ::-webkit-scrollbar,
            *::-webkit-scrollbar,
            .info-modal-content::-webkit-scrollbar,
            .scrollContainer::-webkit-scrollbar {
                width: 6px !important;
                height: 6px !important;
                background: transparent !important;
                display: block !important;
            }

            ::-webkit-scrollbar-track,
            *::-webkit-scrollbar-track,
            .info-modal-content::-webkit-scrollbar-track,
            .scrollContainer::-webkit-scrollbar-track {
                background: transparent !important;
                background-color: transparent !important;
                border-radius: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
            }

            ::-webkit-scrollbar-thumb,
            *::-webkit-scrollbar-thumb,
            .info-modal-content::-webkit-scrollbar-thumb,
            .scrollContainer::-webkit-scrollbar-thumb {
                background-color: rgba(255, 255, 255, 0.15) !important;
                border-radius: 20px !important;
                border: 2px solid transparent !important;
                background-clip: content-box !important;
            }

            ::-webkit-scrollbar-thumb:hover,
            *::-webkit-scrollbar-thumb:hover {
                background-color: rgba(255, 255, 255, 0.4) !important;
            }

            /* KILL ARROWS/BUTTONS - Specific targets + Wildcards */
            ::-webkit-scrollbar-button,
            *::-webkit-scrollbar-button,
            .info-modal-content::-webkit-scrollbar-button,
            .scrollContainer::-webkit-scrollbar-button {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                background: transparent !important;
                border: none !important;
            }
            
            ::-webkit-scrollbar-corner,
            *::-webkit-scrollbar-corner {
                background: transparent !important;
            }
        `;
        document.head.appendChild(scrollStyle);
        console.log('[LegitFlix] Scrollbar styles injected (Delayed).');
    } catch (e) {
        console.warn('[LegitFlix] Failed to inject scrollbar styles:', e);
    }
}, 500); // 500ms delay to override everything

// --- CONFIG ---
const CONFIG = {
    // Only fetch these types for the Hero Carousel
    heroMediaTypes: 'Movie,Series',
    heroLimit: 20
};

// --- LOGGING ---
const logger = {
    log: (msg, ...args) => console.log(`[LegitFlix] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[LegitFlix] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[LegitFlix] ${msg}`, ...args)
};

// --- GLOBAL NAVIGATION HELPER ---
window.legitFlixShowItem = function (id) {
    logger.log('Navigating to item:', id);
    window.top.location.href = `#!/details?id=${id}`;
};

// --- TRAILER & FAV HELPER (v4.0) ---
window.legitFlixPlayTrailer = function (id) {
    logger.log('Play Trailer Clicked:', id);
    if (window.require) {
        window.require(['playbackManager'], (pm) => {
            const apiClient = window.ApiClient;
            apiClient.getItem(apiClient.getCurrentUserId(), id).then(item => {
                pm.playTrailer({ items: [item] });
            });
        });
    } else {
        logger.warn('Require not found, checking global PlaybackManager');
        if (window.PlaybackManager) {
            const userId = window.ApiClient.getCurrentUserId();
            window.ApiClient.getItem(userId, id).then(item => {
                window.PlaybackManager.playTrailer({ items: [item] });
            });
        }
    }
};

window.legitFlixPlay = function (id) {
    logger.log('Play Clicked:', id);
    if (window.require) {
        window.require(['playbackManager'], (pm) => {
            const apiClient = window.ApiClient;
            apiClient.getItem(apiClient.getCurrentUserId(), id).then(item => {
                pm.play({ items: [item] });
            });
        });
    } else if (window.PlaybackManager) {
        const userId = window.ApiClient.getCurrentUserId();
        window.ApiClient.getItem(userId, id).then(item => {
            window.PlaybackManager.play({ items: [item] });
        });
    } else {
        // Fallback: Navigate to item
        window.legitFlixShowItem(id);
    }
};

window.legitFlixToggleFav = async function (id, btn) {
    logger.log('Toggle Fav:', id);
    const auth = await getAuth();
    if (!auth) return;

    // Toggle UI state immediately
    const wasActive = btn.classList.contains('active');
    btn.classList.toggle('active');

    // Support both filled and outlined classes
    const icon = btn.querySelector('.material-icons, .material-icons-outlined');

    if (icon) {
        // Toggle between Filled and Outlined
        icon.textContent = wasActive ? 'bookmark_border' : 'bookmark';
        // Force Filled style if active
        if (!wasActive) {
            icon.classList.remove('material-icons-outlined');
            icon.classList.add('material-icons');
        } else {
            icon.classList.add('material-icons-outlined');
            icon.classList.remove('material-icons');
        }
    }

    try {
        await window.ApiClient.updateFavoriteStatus(auth.UserId, id, !wasActive);
        logger.log('Fav updated successfully');
    } catch (e) {
        logger.error('Fav update failed', e);
        // Revert UI on failure
        btn.classList.toggle('active');
        if (icon) {
            icon.textContent = wasActive ? 'bookmark' : 'bookmark_border';
            if (wasActive) {
                icon.classList.remove('material-icons-outlined');
                icon.classList.add('material-icons');
            } else {
                icon.classList.add('material-icons-outlined');
                icon.classList.remove('material-icons');
            }
        }
    }
};

// --- AUTH HELPER ---
// --- AUTH HELPER ---
async function getAuth() {
    // logger.log('getAuth: Checking for ApiClient...');
    let attempts = 0;

    // Wait for ApiClient AND Valid User ID
    while (attempts < 50) {
        if (window.ApiClient && window.ApiClient.getCurrentUserId()) {
            return {
                UserId: window.ApiClient.getCurrentUserId(),
                AccessToken: window.ApiClient.accessToken(),
                ServerId: window.ApiClient.serverId()
            };
        }
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }

    logger.error('getAuth: ApiClient or UserId timed out.');
    return null;
}

// --- UTILS ---
function shuffleArray(array) {
    logger.log('shuffleArray: Shuffling items', array.length);
    return array.sort(() => Math.random() - 0.5);
}

// --- DATA FETCHING (Dynamic) ---
async function fetchUserViews() {
    logger.log('fetchUserViews: Fetching user libraries...');
    const auth = await getAuth();
    if (!auth) return [];

    try {
        const url = `/Users/${auth.UserId}/Views`;
        const response = await fetch(url, {
            headers: { 'X-Emby-Token': auth.AccessToken }
        });
        const data = await response.json();
        logger.log('fetchUserViews: Success', data.Items);
        return data.Items || [];
    } catch (error) {
        logger.error('fetchUserViews: Error', error);
        return [];
    }
}

// =========================================================================
// CAROUSEL COMPONENT DOCUMENTATION
// 
// Use this guide to locate key carousel functionality:
// 1. Data Fetching: fetchMediaBarItems (Line ~76) - Gets items from API.
// 2. HTML Generation: createMediaBarHTML (Line ~99) - Builds slides.
// 3. Carousel Logic: injectMediaBar (Line ~270) - Handles injection & timer.
// 4. Playback Logic: legitFlixPlay (See below) - Handles Play button click.
// 
// BUG REPORT: The "Play" button on the carousel has issues initiating playback
// directly due to internal Jellyfin `PlaybackManager` being inaccessible in
// theme context. The current solution (V6) uses a workaround:
// -> Navigates to details page -> Auto-clicks the native Play button.
// =========================================================================
async function fetchMediaBarItems(retryCount = 0) {
    logger.log('fetchMediaBarItems: Fetching hero content...');
    const auth = await getAuth();

    // Verify we have valid auth with access token
    if (!auth || !auth.AccessToken || !auth.UserId) {
        if (retryCount < 5) {
            logger.log('fetchMediaBarItems: Auth not ready, retrying in 1s...');
            await new Promise(r => setTimeout(r, 1000));
            return fetchMediaBarItems(retryCount + 1);
        }
        logger.error('fetchMediaBarItems: Auth failed after retries');
        return [];
    }

    const fields = 'PrimaryImageAspectRatio,Overview,BackdropImageTags,ImageTags,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks,Genres,MediaStreams,UserData';

    // "Latest 6 items after promo (3)" -> Fetch 20, Slice in JS (Safer)
    const url = `/Users/${auth.UserId}/Items?IncludeItemTypes=${CONFIG.heroMediaTypes}&Recursive=true&SortBy=DateCreated&SortOrder=Descending&Limit=20&Fields=${fields}&ImageTypeLimit=1&EnableImageTypes=Backdrop,Primary,Logo`;

    try {
        const response = await fetch(url, {
            headers: { 'X-Emby-Token': auth.AccessToken }
        });

        // Check for auth errors
        if (response.status === 401 || response.status === 403) {
            if (retryCount < 5) {
                logger.log('fetchMediaBarItems: Auth error ' + response.status + ', retrying...');
                await new Promise(r => setTimeout(r, 1000));
                return fetchMediaBarItems(retryCount + 1); // Fixed recursion
            }
            logger.error('fetchMediaBarItems: Auth failed with ' + response.status);
            return [];
        }

        const data = await response.json();
        const allItems = data.Items || [];
        logger.log('fetchMediaBarItems: Downloaded items', allItems.length);

        // Safety: If fewer than 3 items, just show what we have (or empty).
        // If > 3, slice 3 to 9 (Next 6).
        const validItems = allItems.length > 3 ? allItems.slice(3, 9) : allItems;

        // --- ENRICHMENT: Fetch NEXT UP for Series ---
        for (const item of validItems) {
            if (item.Type === 'Series') {
                try {
                    const nextUpUrl = `/Shows/NextUp?SeriesId=${item.Id}&Limit=1&UserId=${auth.UserId}&Fields=UserData`;
                    const nextUpRes = await fetch(nextUpUrl, { headers: { 'X-Emby-Token': auth.AccessToken } });
                    if (!nextUpRes.ok) continue; // Skip failing items silently
                    const nextUpData = await nextUpRes.json();
                    if (nextUpData && nextUpData.Items && nextUpData.Items.length > 0) {
                        item._nextUp = nextUpData.Items[0]; // Attach to item for UI
                    }
                } catch (e) {
                    logger.warn('fetchMediaBarItems: Failed to fetch NextUp for ' + item.Id, e);
                }
            }
        }

        return validItems;
    } catch (error) {
        logger.error('fetchMediaBarItems: API Error', error);
        if (retryCount < 3) {
            await new Promise(r => setTimeout(r, 1000));
            return fetchMediaBarItems(retryCount + 1);
        }
        return [];
    }
}

// --- UI GENERATION (HERO CAROUSEL) ---
function createMediaBarHTML(items) {
    logger.log('createMediaBarHTML: Generating HTML for slides');
    if (!items || items.length === 0) return '';

    const slides = items.map((item, index) => {
        // DEBUG: Check Logo availability
        console.log(`[LegitFlix] Carousel Item ${index}: ${item.Name}`, item.ImageTags);

        const backdropUrl = `/Items/${item.Id}/Images/Backdrop/0?maxHeight=1080&quality=96`; // Improved quality
        const activeClass = index === 0 ? 'active' : '';


        // --- METADATA CALCULATIONS ---

        // 1. Sub | Dub Detection
        let audioLangs = new Set();
        let subLangs = new Set();
        if (item.MediaStreams) {
            item.MediaStreams.forEach(stream => {
                if (stream.Type === 'Audio' && stream.Language) audioLangs.add(stream.Language);
                if (stream.Type === 'Subtitle' && stream.Language) subLangs.add(stream.Language);
            });
        }
        // Simple heuristic: If multiple audio, likely Dub? Or if language matches user? 
        // For now, just show "Sub | Dub" if both exist, or specific.
        const hasSub = subLangs.size > 0;
        const hasDub = audioLangs.size > 1; // Assuming >1 audio track (Original + Dub) implies Dub availability
        const subDubText = (hasSub && hasDub) ? 'Sub | Dub' : (hasSub ? 'Sub' : 'Dub');

        // 2. Ends At
        let endsAtHtml = '';
        if (item.RunTimeTicks && item.Type !== 'Series') {
            const ms = item.RunTimeTicks / 10000;
            const endTime = new Date(Date.now() + ms);
            const timeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            endsAtHtml = `<span class="hero-meta-divider">•</span> <span class="hero-meta-text">Ends at ${timeStr}</span>`;
        }

        // 3. Rating
        const ratingStar = item.CommunityRating ? `<span class="hero-meta-divider">•</span> <span class="hero-meta-text">⭐ ${item.CommunityRating.toFixed(1)}</span>` : '';

        // --- DYNAMIC BUTTON LOGIC ---
        let btnText = 'START WATCHING';
        let btnSubText = ''; // For S1 E1 or Percentage
        let actionId = item.Id;

        if (item.Type === 'Series') {
            if (item._nextUp) {
                // Resume Series
                const s = item._nextUp.ParentIndexNumber;
                const e = item._nextUp.IndexNumber;
                btnText = 'CONTINUE';
                btnSubText = `S${s} E${e}`;
                actionId = item._nextUp.Id; // Play the EPISODE, not the Series
            } else {
                // New Series
                btnSubText = 'S1 E1';
            }
        } else {
            // Movie - Resume?
            const ticks = item.UserData?.PlaybackPositionTicks || 0;
            const total = item.RunTimeTicks || 1;
            if (ticks > 0) {
                const pct = Math.round((ticks / total) * 100);
                if (pct > 2 && pct < 90) { // Valid resume range
                    btnText = 'CONTINUE';
                    btnSubText = ` - ${pct}%`;
                }
            }
        }

        const title = item.Name;
        const desc = item.Overview || '';
        const playOnClick = `window.legitFlixPlay('${actionId}', event)`;
        const infoOnClick = `window.openInfoModal('${item.Id}')`; // Always open Modal for Series/Movie parent

        // Optimistic Logo Logic (Fix for First Item): 
        // Assume Logo Exists (Show Logo, Hide Text).
        // If Logo Fails -> Hide Logo, Show Text.
        const logoUrl = `/Items/${item.Id}/Images/Logo?maxHeight=200&maxWidth=450&quality=90`;
        const titleHtml = `
            <img src="${logoUrl}" 
                 class="hero-logo" 
                 alt="${title}" 
                 style="display: block;" 
                 onerror="this.style.display='none'; document.getElementById('ht-${item.Id}').style.display='block';" />
            <h1 class="hero-title" id="ht-${item.Id}" style="display: none;">${title}</h1>
        `;

        return `
            <div class="hero-slide ${activeClass}" data-index="${index}">
                <div class="hero-backdrop" style="background-image: url('${backdropUrl}')"></div>
                <div class="hero-overlay"></div>
                <div class="hero-content">
                    <div class="hero-header-area">
                        ${titleHtml}
                    </div>
                    
                    <div class="hero-meta-line">
                        <span class="hero-badge-age">${item.OfficialRating || '13+'}</span>
                        <span class="hero-meta-divider">•</span>
                        <span class="hero-meta-text">${subDubText}</span>
                        <span class="hero-meta-divider">•</span>
                        <span class="hero-meta-text">${item.Genres ? item.Genres.slice(0, 3).join(', ') : 'Anime'}</span>
                        ${ratingStar}
                        ${endsAtHtml}
                    </div>

                    <p class="hero-desc">${desc}</p>
                    
                    <div class="hero-actions">
                        <button class="btn-hero-primary" onclick="${playOnClick}">
                            <i class="material-icons">play_arrow</i> 
                            <span>${btnText} ${btnSubText}</span>
                        </button>
                        
                        <button class="btn-hero-bookmark" onclick="window.legitFlixToggleFav('${item.Id}', this)" title="Add to Favorites">
                            <span class="material-icons-outlined">bookmark_border</span>
                        </button>

                         <button class="hero-button-info" onclick="${infoOnClick}" title="More Info">
                            <span class="material-icons-outlined">info</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // --- TRACKER HTML ---
    // Note: First indicator starts inactive so we can animate it via JS
    const indicators = items.map((_, i) => `<div class="hero-indicator" data-index="${i}"><div class="fill"></div></div>`).join('');
    const trackerHtml = `<div class="hero-indicators">${indicators}</div>`;

    return `<div id="legit-hero-carousel" class="hero-carousel-container">${slides}${trackerHtml}</div>`;
}

// --- CAROUSEL LOGIC (Fixed & Enhanced) ---
let carouselInterval = null;

function startCarousel() {
    logger.log('startCarousel: Attempting to start...');

    if (carouselInterval) {
        clearInterval(carouselInterval);
        carouselInterval = null;
    }

    const slides = document.querySelectorAll('.hero-slide');
    const indicators = document.querySelectorAll('.hero-indicator');

    if (slides.length === 0) return;

    logger.log(`startCarousel: Starting new interval with ${slides.length} slides.`);

    // Force initial animation for the first slide
    setTimeout(() => {
        if (indicators.length > 0) indicators[0].classList.add('active');
    }, 100);

    let currentIndex = 0;

    const showSlide = (index) => {
        if (slides.length === 0) return;

        // Wrap index
        if (index >= slides.length) index = 0;
        if (index < 0) index = slides.length - 1;

        currentIndex = index;

        // 1. Update Slides
        slides.forEach(s => s.classList.remove('active'));
        slides[currentIndex].classList.add('active');

        // 2. Update Indicators
        if (indicators.length > 0) {
            indicators.forEach((ind, i) => {
                ind.classList.remove('active');
                if (i < currentIndex) {
                    ind.classList.add('completed');
                } else {
                    ind.classList.remove('completed');
                }

                if (i === currentIndex) {
                    ind.classList.add('active');
                    ind.classList.remove('completed');
                }
            });
        }
    };

    const rotate = () => {
        showSlide(currentIndex + 1);
    };

    // Add Click Listeners to Indicators
    indicators.forEach((ind, i) => {
        ind.onclick = () => {
            // Reset Timer on manual interaction (Restart 8s countdown)
            clearInterval(carouselInterval);
            carouselInterval = setInterval(rotate, 8000); // Resume auto-rotate

            // Ensure paused class is removed if it happened to be there
            const container = document.getElementById('legit-hero-carousel');
            if (container) container.classList.remove('carousel-paused');

            showSlide(i);
        };
    });

    carouselInterval = setInterval(rotate, 8000); // 8 seconds per slide
}

// --- NAV HELPER (Fixes appRouter crash) ---
window.legitFlixShowItem = function (itemId) {
    // Match Plugin: Use /#!/details route
    window.top.location.href = `/#!/details?id=${itemId}`;
};

// --- PLAYBACK HELPER (Retry Logic & Force Load) ---
// --- PLAYBACK HELPER (Debug Mode) ---
// --- PLAYBACK HELPER (V6 - Navigate & Auto-Click) ---
// TODO: Fix Direct Playback. 
// Current Issue: API commands (Play, PlayMediaSource) are rejected by client.
// Workaround: Navigate to details page and simulate click on Native Play Button.
window.legitFlixPlay = async function (id) {
    logger.log('legitFlixPlay (V6 Auto-Click): Clicked', id);

    // 1. Navigate to Details Page (Reliable)
    window.legitFlixShowItem(id);

    // 2. Poll for the Native Play Button on the new page and click it
    // Since this is a SPA, the script continues running.
    let attempts = 0;
    const maxAttempts = 40; // 4 seconds

    const clickInterval = setInterval(() => {
        attempts++;
        // Look for the Detail Page Play Button
        // Usually in .mainDetailButtons or just huge play button
        const playBtn = document.querySelector('.detailPage .btnPlay')
            || document.querySelector('.detailButtons .btnPlay')
            || document.querySelector('button[is="emby-playbutton"].detailButton')
            || document.querySelector('.itemDetailPage .playButton');

        if (playBtn) {
            // Verify it belongs to the correct item? 
            // Hard to check, but we just navigated, so assume yes.
            logger.log('legitFlixPlay: Found Detail Play Button. Clicking!', playBtn);
            playBtn.click();
            clearInterval(clickInterval);
        } else if (attempts >= maxAttempts) {
            logger.warn('legitFlixPlay: Could not find Play button on details page. User must click manually.');
            clearInterval(clickInterval);
        }
    }, 100);
};

// --- [REMOVED] Duplicate legacy navigation logic ---

// --- INJECTION & INIT ---
async function injectMediaBar() {
    logger.log('injectMediaBar (Page Monitor): Started');

    const hash = window.location.hash;
    const isHomePage = hash.includes('home') || hash === '' || hash.includes('startup');
    const isDetailPage = hash.includes('details') && hash.includes('id=');

    // --- HOME PAGE LOGIC ---
    if (isHomePage) {
        // Stop if already injected to prevent infinite loops/flashing
        if (document.querySelector('.legit-hero-wrapper')) return;

        // Remove old wrappers (cleanup)
        document.querySelectorAll('.legit-hero-wrapper').forEach(el => el.remove());
        document.querySelectorAll('.hero-carousel-container').forEach(el => el.remove()); // Fallback

        const items = await fetchMediaBarItems();
        if (items.length === 0) return;

        // Attempt injection
        let checkInterval = null; // Declare checkInterval here
        checkInterval = setInterval(() => {
            let container = document.querySelector('.homeSectionsContainer');
            if (!container) container = document.querySelector('.mainAnimatedPages');
            if (!container) container = document.querySelector('#indexPage .pageContent');

            const isReady = container && window.ApiClient;

            // Double check we haven't already injected while waiting
            if (isReady && !document.querySelector('.legit-hero-wrapper')) {
                clearInterval(checkInterval);

                const wrapper = document.createElement('div');
                wrapper.classList.add('legit-hero-wrapper');
                wrapper.innerHTML = createMediaBarHTML(items);

                container.insertBefore(wrapper, container.firstChild);
                container.classList.add('has-legit-hero'); // Enable CSS spacing

                logger.log('injectMediaBar: Injected Home Carousel successfully');
                startCarousel();

            } else if (isReady && document.querySelector('.legit-hero-wrapper')) {
                // Already injected by another thread
                clearInterval(checkInterval);
            }
        }, 1000);

        setTimeout(() => {
            if (checkInterval) clearInterval(checkInterval); // Clear if it was set
            logger.log('injectMediaBar: Timeout reached');
        }, 15000);
    }


}

// --- JELLYSEERR INJECTION ---
function injectJellyseerr() {
    logger.log('injectJellyseerr: Checking...');
    const jellyseerrUrl = 'https://request.legitflix.eu';
    const logoUrl = 'https://i.imgur.com/LAJPiYf_d.webp?maxwidth=760&fidelity=grand';
    const cardId = 'jellyseerr-card';

    // 1. My Media Card
    const container = document.querySelector('.homePage .itemsContainer.scrollSlider');

    // Only inject if container exists and we haven't injected yet
    if (container && !document.querySelector(`#${cardId}`)) {
        console.log('LegitFlix: Injecting Jellyseerr Card...');

        const cardHtml = `
        <div id="${cardId}" data-isfolder="true" class="card overflowBackdropCard card-hoverable card-withuserdata">
            <div class="cardBox cardBox-bottompadded">
                <div class="cardScalable">
                    <div class="cardPadder cardPadder-overflowBackdrop"></div>
                    <a href="${jellyseerrUrl}" target="_blank" class="cardImageContainer coveredImage cardContent itemAction" 
                       aria-label="Jellyseerr" 
                       style="background-image: url('${logoUrl}'); background-size: cover; background-position: center;">
                    </a>
                </div>
                <div class="cardText cardTextCentered cardText-first">
                    <bdi>
                        <a href="${jellyseerrUrl}" target="_blank" class="itemAction textActionButton" title="Jellyseerr">Jellyseerr</a>
                    </bdi>
                </div>
            </div>
        </div>
        `;

        container.insertAdjacentHTML('beforeend', cardHtml);

        // Refresh scroller if possible
        const scroller = container.closest('[is="emby-scroller"]');
        if (scroller && typeof scroller.refreshSize === 'function') {
            setTimeout(() => scroller.refreshSize(), 50);
        }
    }
}

// --- PREFERENCES: FEATURED HEADER ---
// --- PREFERENCES: GAMING PROFILE LAYOUT ---
async function injectFeaturedPrefs() {
    console.log('[LegitFlix] injectFeaturedPrefs: Starting...');

    // 1. Target ANY user preferences page (Menu, Display, Home, Playback, etc.)
    // Multiple pages may exist in DOM simultaneously (client-side routing)
    // We need to find the VISIBLE/ACTIVE one
    let prefsPage = null;
    const allPrefsPages = document.querySelectorAll('.userPreferencesPage');
    for (const page of allPrefsPages) {
        // Check if page is visible (not display:none)
        const style = window.getComputedStyle(page);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
            prefsPage = page;
            break;
        }
    }

    if (!prefsPage) {
        // Debug: Log all pages with data-role="page" to see what's available
        const allPages = document.querySelectorAll('[data-role="page"]');
        console.log('[LegitFlix] injectFeaturedPrefs: No matching page. Available pages:',
            Array.from(allPages).map(p => `${p.id} (${p.className})`).join(', '));
        return;
    }
    console.log('[LegitFlix] injectFeaturedPrefs: Found page:', prefsPage.id || prefsPage.className);

    // Use .readOnlyContent or specific containers based on user HTML
    // Form pages often have the form directly as child, card pages use .readOnlyContent
    const contentContainer = prefsPage.querySelector('.readOnlyContent') ||
        prefsPage.querySelector('.content-primary') ||
        prefsPage.querySelector('form') || // Form-based pages (Display, Playback, etc.)
        prefsPage; // Ultimate fallback: inject into page itself

    if (!contentContainer) {
        console.log('[LegitFlix] injectFeaturedPrefs: No content container found');
        return;
    }
    console.log('[LegitFlix] injectFeaturedPrefs: Found container:', contentContainer.className);

    // Avoid double injection
    if (prefsPage.querySelector('.gaming-profile-header')) {
        console.log('[LegitFlix] injectFeaturedPrefs: Header already exists');
        return;
    }

    // 1. Get User Data
    let user = null;
    try {
        user = await window.ApiClient.getCurrentUser();
    } catch (e) { console.error('Error getting user', e); }
    if (!user) return;

    const hasAvatar = user.PrimaryImageTag;
    const userImageUrl = hasAvatar
        ? `/Users/${user.Id}/Images/Primary?tag=${user.PrimaryImageTag}&quality=90&maxHeight=300`
        : 'https://raw.githubusercontent.com/google/material-design-icons/master/png/action/account_circle/materialicons/48dp/2x/baseline_account_circle_white_48dp.png';

    // 2. Map Links for Tabs - ensure they include userId parameter
    // We try to find existing links to make tabs functional, fallback to standard hashes with userId
    const findLink = (str, defaultHash) => {
        const a = contentContainer.querySelector(`a[href*="${str}"]`);
        return a ? a.getAttribute('href') : `${defaultHash}?userId=${user.Id}`;
    };

    const profileHref = findLink('mypreferencesmenu', '#/mypreferencesmenu');
    const displayHref = findLink('mypreferencesdisplay', '#/mypreferencesdisplay');
    const homeHref = findLink('mypreferenceshome', '#/mypreferenceshome');
    const playbackHref = findLink('mypreferencesplayback', '#/mypreferencesplayback');
    const subtitleHref = findLink('mypreferencessubtitles', '#/mypreferencessubtitles');
    const quickConnectHref = findLink('quickconnect', '#/quickconnect');
    const controlsHref = findLink('mypreferencescontrols', '#/mypreferencescontrols'); // Assuming standard naming

    // HIDE ORIGINAL LINKS
    const hideLink = (str) => {
        const a = contentContainer.querySelector(`a[href*="${str}"]`);
        if (a) a.style.display = 'none';
        const btn = contentContainer.querySelector(`a[href*="${str}"].emby-button`);
        if (btn) btn.style.display = 'none';
        // Hide parent wrapper if clean
        if (a && a.parentElement && a.parentElement.classList.contains('listItem-border')) {
            a.parentElement.style.display = 'none';
        }
    };
    hideLink('userprofile');
    hideLink('mypreferencesdisplay');
    hideLink('mypreferenceshome');
    hideLink('mypreferencesplayback');
    hideLink('mypreferencessubtitles');
    hideLink('quickconnect');
    hideLink('mypreferencescontrols');

    // 3. Build the Header HTML (Tabs ABOVE Banner)
    // Check for Banner (Local Override or Server)
    let bannerStyle = '';
    let bannerClass = '';
    let btnText = 'Add profile banner'; // Default
    let btnIcon = 'add_photo_alternate';

    const localBanner = localStorage.getItem(`LegitFlix_Banner_${user.Id}`);

    // Prioritize Local Selection
    if (localBanner) {
        bannerStyle = `background-image: url('${localBanner}');`;
        // Note: CSS handles size/position now
        bannerClass = 'has-banner';
        btnText = 'Change profile banner';
        btnIcon = 'edit';
    } else if (user.ImageTags && user.ImageTags.Banner) {
        const pBannerUrl = `/Users/${user.Id}/Images/Banner?tag=${user.ImageTags.Banner}&maxHeight=500&v=${Date.now()}`;
        bannerStyle = `background-image: url('${pBannerUrl}');`;
        bannerClass = 'has-banner';
        btnText = 'Change profile banner';
        btnIcon = 'edit';
    } else if (user.BackdropImageTags && user.BackdropImageTags.length > 0) {
        // FALLBACK: If no Banner but has Backdrop (rare for users, but possible)
        const pBannerUrl = `/Users/${user.Id}/Images/Backdrop/0?tag=${user.BackdropImageTags[0]}&maxHeight=500&v=${Date.now()}`;
        bannerStyle = `background-image: url('${pBannerUrl}');`;
        bannerClass = 'has-banner';
        btnText = 'Change profile banner';
        btnIcon = 'edit';
    }

    // Detect if we're on "My Details" page (needs banner/avatar) vs other settings pages
    const isMyDetailsPage = prefsPage.id === 'myPreferencesMenuPage';

    // Build header HTML with conditional banner/avatar sections
    let headerHtml = `
        <div class="gaming-profile-header">
            <h1 class="profile-page-title">Account Settings</h1>
            
            <div class="profile-nav-tabs" style="padding-bottom: 1rem; flex-wrap: wrap;">
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('mypreferencesmenu') ? 'active' : ''}" onclick="location.href='${profileHref}'">My details</a>
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('mypreferencesdisplay') ? 'active' : ''}" onclick="location.href='${displayHref}'">Display</a>
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('mypreferenceshome') ? 'active' : ''}" onclick="location.href='${homeHref}'">Home Screen</a>
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('mypreferencesplayback') ? 'active' : ''}" onclick="location.href='${playbackHref}'">Playback</a>
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('mypreferencessubtitles') ? 'active' : ''}" onclick="location.href='${subtitleHref}'">Subtitles</a>
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('quickconnect') ? 'active' : ''}" onclick="location.href='${quickConnectHref}'">Quick Connect</a>
                
                <!-- Sign Out (Icon) -->
                <a class="profile-tab logout-tab" onclick="document.querySelector('.btnLogout').click()" title="Sign Out">
                    <span class="material-icons">exit_to_app</span>
                </a>
            </div>
    `;

    // Only add banner and avatar on "My Details" page
    if (isMyDetailsPage) {
        headerHtml += `
            <div class="profile-banner ${bannerClass}" style="${bannerStyle}">
                <div class="banner-overlay"></div>
                
                <div class="banner-add-btn" onclick="window.legitFlixOpenBannerPicker()">
                    <span class="material-icons-outlined">${btnIcon}</span>
                    <span class="banner-add-text">${btnText}</span>
                </div>
            </div>

            <!-- Avatar Container (Moved Outside to prevent clipping) -->
            <div class="profile-avatar-container">
                <div class="profile-avatar" style="background-image: url('${userImageUrl}');"></div>
                <div class="avatar-edit-icon" onclick="window.legitFlixOpenAvatarPicker()">
                    <span class="material-icons-outlined" style="font-size: 18px;">mode_edit</span>
                </div>
            </div>
        `;
    }

    headerHtml += `
        </div>
    `;

    // 4. Insert at TOP of content
    contentContainer.insertAdjacentHTML('afterbegin', headerHtml);

    // FETCH & SYNC Remote Banner (Async)
    window.getUserBanner().then(remoteUrl => {
        if (remoteUrl && remoteUrl !== localBanner) {
            console.log('LegitFlix: Remote banner found, updating UI:', remoteUrl);
            const bannerEl = contentContainer.querySelector('.profile-banner');
            if (bannerEl) {
                bannerEl.style.backgroundImage = `url('${remoteUrl}')`;
                bannerEl.classList.add('has-banner');

                const btnTextEl = contentContainer.querySelector('.banner-add-text');
                if (btnTextEl) btnTextEl.textContent = 'Change profile banner';
                const btnIconEl = contentContainer.querySelector('.banner-add-btn .material-icons-outlined');
                if (btnIconEl) btnIconEl.textContent = 'edit';

                // Update Local Cache
                localStorage.setItem(`LegitFlix_Banner_${user.Id}`, remoteUrl);
            }
        }
    });

    // 5. Cleanup Redundant Titles & Buttons
    const oldTitle = contentContainer.querySelector('.headerUsername');
    if (oldTitle) oldTitle.style.display = 'none';

    // Move Sign Out button into Nav (Hide original)
    // Move Sign Out button into Nav (Hide original)
    const oldLogout = contentContainer.querySelector('.btnLogout');
    if (oldLogout) {
        oldLogout.style.display = 'none';
        // Also hide the container "User" section if it's mostly empty or redundant
        const userSection = oldLogout.closest('.userSection');
        if (userSection) {
            // SAFEGUARD: Do NOT hide if this section also contains the password fields!
            const hasPassword = userSection.querySelector('#fldCurrentPassword');
            if (!hasPassword) {
                userSection.style.display = 'none';
            } else {
                console.log('LegitFlix: User section contains password fields! Keeping visible but hiding title.');
                const title = userSection.querySelector('.sectionTitle');
                if (title) title.style.display = 'none';
            }
        }
    }

    // 7. Move Admin Section to Nav
    const adminSection = contentContainer.querySelector('.adminSection');
    const navTabs = contentContainer.querySelector('.profile-nav-tabs');

    if (adminSection && navTabs) {
        // Find links
        const dashboardLink = adminSection.querySelector('a[href*="dashboard"]');
        const metadataLink = adminSection.querySelector('a[href*="metadata"]');

        if (dashboardLink) {
            const tab = document.createElement('a');
            tab.className = 'profile-tab';
            tab.href = dashboardLink.getAttribute('href'); // Use original href (usually #/dashboard)
            // tab.textContent = 'Dashboard'; // Text version
            // Icon version to save space? User said "Move this div inside the nav"
            // Typically Dashboard is important. Let's use Icon + Text or just Text.
            // Given space, sticking to text is safer for clarity, or icon. "Sign Out" is icon.
            // Let's use Icon for Admin items to distinguish them? Or just "Dashboard" text.
            // "Metadata Manager" is long. "Metadata"?

            // Let's use Icons with Tooltips for compactness if many items
            tab.innerHTML = '<span class="material-icons">dashboard</span>';
            tab.title = 'Dashboard';
            // Bind click
            tab.onclick = (e) => { e.preventDefault(); dashboardLink.click(); };

            // Insert before Logout
            const logoutTab = navTabs.querySelector('.logout-tab');
            if (logoutTab) navTabs.insertBefore(tab, logoutTab);
            else navTabs.appendChild(tab);
        }

        if (metadataLink) {
            const tab = document.createElement('a');
            tab.className = 'profile-tab';
            // tab.textContent = 'Metadata';
            tab.innerHTML = '<span class="material-icons">library_books</span>'; // or 'movie_filter'
            tab.title = 'Metadata Manager';
            tab.onclick = (e) => { e.preventDefault(); metadataLink.click(); };

            // Insert before Logout
            const logoutTab = navTabs.querySelector('.logout-tab');
            if (logoutTab) navTabs.insertBefore(tab, logoutTab);
            else navTabs.appendChild(tab);
        }

        // Hide original section
        adminSection.style.display = 'none';
    }

    // 6. Style Password Section as a Card
    // Find the section containing password fields
    const passwordInput = contentContainer.querySelector('#fldCurrentPassword');
    if (passwordInput) {
        console.log('LegitFlix: Found Password Fields. Styling as card...');
        // The detailed section is likely the parent or grandparent
        const passwordSection = passwordInput.closest('.detailSection');
        if (passwordSection) {
            passwordSection.classList.add('profile-settings-card');
            // Ensure instructions/titles inside it are visible/clean
            const sectionTitle = passwordSection.querySelector('h2');
            if (sectionTitle) sectionTitle.style.marginBottom = '20px';
        }
    }
}

// --- POPUP HELPERS ---
// --- POPUP HELPERS ---
window.legitFlixOpenBannerPicker = async function () {
    // Fetch random backdrops
    const auth = await getAuth();
    if (!auth) return;

    window._pendingBannerUrl = null; // Reset pending

    // Create UI
    const popup = document.createElement('div');
    popup.className = 'legit-popup-overlay';
    popup.innerHTML = `
        <div class="legit-popup-content">
            <h2>Select Banner</h2>
            <div class="legit-popup-grid" id="bannerGrid" style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">Loading...</div>
            <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
                <button class="legit-btn-secondary" onclick="document.querySelector('.legit-popup-overlay').remove()">Close</button>
                <button class="legit-btn-primary" id="btnSaveBanner">
                    <span class="material-icons">save</span> Save
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    // Bind Save Button
    const btnSave = popup.querySelector('#btnSaveBanner');
    btnSave.onclick = async () => {
        if (!window._pendingBannerUrl) {
            alert('Please select a banner first.');
            return;
        }
        btnSave.innerHTML = '<span class="material-icons">refresh</span> Saving...';
        btnSave.disabled = true;

        const success = await window.saveUserBanner(window._pendingBannerUrl);
        if (success) {
            document.querySelector('.legit-popup-overlay').remove();
            console.log('LegitFlix: Banner updated successfully!');
            // Update button text on profile
            const bannerBtnText = document.querySelector('.banner-add-text');
            if (bannerBtnText) bannerBtnText.textContent = 'Change profile banner';
        } else {
            btnSave.innerHTML = '<span class="material-icons">error</span> Failed';
            alert('Failed to upload banner. Check console for details.');
            btnSave.disabled = false;
        }
    };

    // Fetch
    try {
        const url = `/Users/${auth.UserId}/Items?Recursive=true&IncludeItemTypes=Movie,Series&ImageTypes=Backdrop&SortBy=Random&Limit=48&Fields=Id,Name`;
        const res = await fetch(url, { headers: { 'X-Emby-Token': auth.AccessToken } });
        const data = await res.json();

        const grid = popup.querySelector('#bannerGrid');
        grid.innerHTML = data.Items.map(item => `
            <div class="banner-option" 
                 onclick="
                    window._pendingBannerUrl = '/Items/${item.Id}/Images/Backdrop/0';
                    document.querySelectorAll('.banner-option').forEach(el => el.classList.remove('selected'));
                    this.classList.add('selected');
                    document.querySelector('.profile-banner').style.backgroundImage='url(/Items/${item.Id}/Images/Backdrop/0?maxHeight=500)';
                    document.querySelector('.profile-banner').classList.add('has-banner');
                 " 
                 style="background-image: url('/Items/${item.Id}/Images/Backdrop/0?maxHeight=200');">
            </div>
        `).join('');
    } catch (e) { console.error(e); }
};

/* --- POPUP LOGIC --- */
window.legitFlixOpenAvatarPicker = function () {
    const popup = document.createElement('div');
    popup.className = 'legit-popup-overlay';

    // REDESIGN: Horizontal, Compact, "Options next to each other"
    popup.innerHTML = `
        <div class="legit-popup-content small" style="text-align:center; padding: 2rem; width: auto; min-width: 400px;">
            <h2 style="margin-bottom: 2rem; font-size: 1.4rem; font-weight: 500;">Change Avatar</h2>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="legit-btn-primary" id="btnOpenGallery" style="flex: 1; padding: 0.5rem !important; flex-direction: row; gap: 8px; border-radius: 8px !important;">
                    <span class="material-icons" style="font-size: 1.75rem; display:block;">grid_view</span>
                    <span style="font-size: 0.9rem !important;">Choose Avatar</span>
                </button>
                
                <button class="legit-btn-accent" id="btnUploadLocal" style="flex: 1; padding: 0.5rem !important; flex-direction: row; gap: 8px; border-radius: 8px !important;">
                    <span class="material-icons" style="font-size: 1.75rem; display:block;">upload_file</span>
                    <span style="font-size: 0.9rem !important;">Upload Image</span>
                </button>
            </div>
            
            <button class="legit-btn-secondary" id="btnClosePopup" style="margin-top: 20px; width: 100%; border: none;">Cancel</button>
        </div>
    `;

    document.body.appendChild(popup);

    // Handlers
    popup.querySelector('#btnOpenGallery').onclick = () => {
        popup.remove();
        if (window.LegitFlixAvatarPicker) window.LegitFlixAvatarPicker.open();
    };

    popup.querySelector('#btnUploadLocal').onclick = () => {
        popup.remove();
        window.triggerNativeUpload();
    };

    const close = () => popup.remove();
    popup.querySelector('#btnClosePopup').onclick = close;
    popup.onclick = (e) => { if (e.target === popup) close(); };
};

// Trigger Native Upload by finding the original (hidden) header image button
// Trigger Native Upload by finding the original input
// Trigger Native Upload by finding the original (hidden) header image button
// Trigger Native Upload by finding the original input
window.triggerNativeUpload = function () {
    console.log('LegitFlix: Triggering Custom Native Upload...');

    // Create hidden input if not exists
    let input = document.getElementById('legitFlixAvatarInput');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'legitFlixAvatarInput';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Close popup
            const popup = document.querySelector('.legit-popup-overlay');
            if (popup) popup.remove();

            // Simple loading feedback
            const btnEdit = document.querySelector('.avatar-edit-icon');
            if (btnEdit) btnEdit.innerHTML = '<span class="material-icons rotating">sync</span>';

            try {
                const userId = window.ApiClient.getCurrentUserId();
                const endpoint = window.ApiClient.getUrl(`/Users/${userId}/Images/Primary`);

                // Use Base64 Upload (Reliable)
                const reader = new FileReader();
                reader.onload = async () => {
                    const rawBase64 = reader.result.split(',')[1];

                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${window.ApiClient.accessToken()}"`,
                            'Content-Type': file.type // e.g. image/jpeg
                        },
                        body: rawBase64
                    });

                    if (res.ok) {
                        location.reload();
                    } else {
                        throw new Error('Upload failed: ' + res.status);
                    }
                };
                reader.readAsDataURL(file);

            } catch (err) {
                console.error(err);
                alert('Upload failed. See console.');
                if (btnEdit) btnEdit.innerHTML = '<span class="material-icons">mode_edit</span>';
            }
        };
    }

    input.click();
};

// Helper to upload backdrop to Jellyfin Server
// Helper to upload backdrop to Jellyfin Server
// Helper to upload external image (avatar or banner) - Unified
window.uploadExternalImage = async function (imageUrl, imageType = 'Banner') {
    try {
        console.log(`LegitFlix: Starting upload for ${imageType}`, imageUrl);
        const userId = await window.ApiClient.getCurrentUserId();
        const accessToken = window.ApiClient.accessToken();

        // 1. Fetch
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`Failed to fetch source image: ${res.status}`);
        const blob = await res.blob();

        // 2. Convert to Base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        const base64Data = await base64Promise;
        const rawBase64 = base64Data.split(',')[1];

        // 3. Upload
        const uploadUrl = window.ApiClient.getUrl(`/Users/${userId}/Images/${imageType}`);

        // DEBUG: Verify Target
        console.log(`LegitFlix DEBUG: Uploading ${imageType} to ${uploadUrl}`);
        if (imageType === 'Backdrop') alert(`LegacyFlix Debug: Uploading Backdrop to:\n${uploadUrl}`);

        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${accessToken}"`,
                'Content-Type': 'image/png'
            },
            body: rawBase64
        });

        if (uploadRes.ok) {
            console.log(`LegitFlix: ${imageType} uploaded successfully.`);
            return true;
        } else {
            console.error('LegitFlix: Upload failed', uploadRes.status, uploadRes.statusText);
            alert('Upload failed: ' + uploadRes.statusText);
            return false;
        }
    } catch (e) {
        console.error('LegitFlix: Error uploading', e);
        alert('Error: ' + e.message);
        return false;
    }
};

// --- DISPLAY PREFS HELPER (Persistent Banner) ---
window.saveUserBanner = async function (bannerUrl) {
    try {
        const userId = window.ApiClient.getCurrentUserId();
        // Use a unique ID for our theme settings
        const prefsId = 'legitflix-theme-config';
        const client = 'LegitFlix';

        // 1. Get Current
        const getUrl = window.ApiClient.getUrl(`/DisplayPreferences/${prefsId}?userId=${userId}&client=${client}`);
        let currentPrefs = {};
        try {
            const res = await fetch(getUrl, {
                headers: {
                    'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${window.ApiClient.accessToken()}"`
                }
            });
            if (res.ok) currentPrefs = await res.json();
            else currentPrefs = { Id: prefsId, CustomPrefs: {} }; // Init if new
        } catch (e) { currentPrefs = { Id: prefsId, CustomPrefs: {} }; }

        // 2. Update
        if (!currentPrefs.CustomPrefs) currentPrefs.CustomPrefs = {};
        currentPrefs.CustomPrefs.BannerUrl = bannerUrl;

        // 3. Save
        const postUrl = window.ApiClient.getUrl(`/DisplayPreferences/${prefsId}?userId=${userId}&client=${client}`);
        await fetch(postUrl, {
            method: 'POST',
            headers: {
                'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${window.ApiClient.accessToken()}"`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentPrefs)
        });

        // 4. Update LocalStorage for instant access on this device
        localStorage.setItem(`LegitFlix_Banner_${userId}`, bannerUrl);

        console.log('LegitFlix: Banner saved to DisplayPrefs:', bannerUrl);
        return true;
    } catch (e) {
        console.error('LegitFlix: Failed to save banner pref', e);
        return false;
    }
};

window.getUserBanner = async function () {
    try {
        const userId = window.ApiClient.getCurrentUserId();
        const prefsId = 'legitflix-theme-config';
        const client = 'LegitFlix';
        const getUrl = window.ApiClient.getUrl(`/DisplayPreferences/${prefsId}?userId=${userId}&client=${client}`);

        const res = await fetch(getUrl, {
            headers: {
                'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${window.ApiClient.accessToken()}"`
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.CustomPrefs ? data.CustomPrefs.BannerUrl : null;
    } catch (e) { return null; }
};

/* --- CUSTOM AVATAR PICKER (Netflix Style) --- */
window.LegitFlixAvatarPicker = {
    repoBase: 'https://raw.githubusercontent.com/kalibrado/js-avatars-images/refs/heads/main',
    allImages: [],
    selectedUrl: null,

    open: async function () {
        // Simple Loading Indicator
        const loader = document.createElement('div');
        loader.className = 'legit-popup-overlay';
        loader.innerHTML = '<div style="color:white; font-size:24px; font-weight:bold;">Loading Avatars...</div>';
        document.body.appendChild(loader);

        try {
            const res = await fetch(`${this.repoBase}/images_metadata.json`);
            if (!res.ok) throw new Error('Network error');
            this.allImages = await res.json();

            loader.remove();
            this.selectedUrl = null; // Reset selection
            this.renderModal();
        } catch (e) {
            loader.remove();
            console.error('Failed to load avatars', e);
            alert('Failed to load avatars. Please check console.');
        }
    },

    renderModal: function () {
        const categories = [...new Set(this.allImages.map(img => img.folder))].sort();

        const overlay = document.createElement('div');
        overlay.className = 'legit-popup-overlay';
        overlay.style.backdropFilter = 'blur(15px)';
        overlay.style.background = 'rgba(0, 0, 0, 0.85)';
        overlay.style.zIndex = '99999';

        const style = document.createElement('style');
        style.innerHTML = `
            .lf-picker-modal {
                width: 90vw; height: 85vh;
                background: #141414;
                color: #fff;
                display: flex; flex-direction: column;
                border-radius: 12px;
                box-shadow: 0 0 80px rgba(0,0,0,0.9);
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                overflow: hidden;
                position: relative;
            }
            .lf-picker-header {
                padding: 20px 30px;
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 2px solid #222;
                background: linear-gradient(to bottom, #222, #141414);
                z-index: 10;
                gap: 20px;
            }
            .lf-picker-title { 
                font-size: 1.5rem; 
                font-weight: 600; 
                margin: 0; 
                color: #e5e5e5;
                white-space: nowrap;
            }
            
            .lf-picker-controls { 
                display: flex; gap: 15px; align-items: center; 
                flex: 1; justify-content: flex-end;
            }
            
            /* Stylized Inputs to match theme */
            .lf-control-input {
                background: rgba(255, 255, 255, 0.1); 
                border: 1px solid rgba(255, 255, 255, 0.2); 
                color: white;
                padding: 10px 15px; 
                border-radius: 4px; 
                font-size: 0.95rem;
                transition: all 0.2s;
            }
            .lf-control-input:focus { 
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.5); 
                outline: none; 
            }
            .lf-control-input option {
                background: #222;
                color: white;
            }
            
            .lf-search-input { width: 250px; }
            .lf-category-select { cursor: pointer; }

            .lf-picker-close {
                background: transparent; border: none; color: #fff;
                font-size: 28px; cursor: pointer; opacity: 0.6;
                transition: opacity 0.2s;
                margin-left: 10px;
                line-height: 1;
                display: flex; align-items: center;
            }
            .lf-picker-close:hover { opacity: 1; }

            .lf-picker-grid {
                flex: 1; overflow-y: auto;
                padding: 30px;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
                gap: 25px;
                justify-content: center;
                align-content: start;
            }
            
            .lf-picker-item {
                aspect-ratio: 1;
                border-radius: 50%;
                background-size: cover; background-position: center;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                border: 4px solid transparent;
                position: relative;
            }
            .lf-picker-item:hover {
                transform: scale(1.1);
                border-color: rgba(255,255,255,0.5);
                box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                z-index: 2;
            }
            .lf-picker-item.selected {
                border-color: #182737; /* Theme Color */
                transform: scale(1.1);
                box-shadow: 0 0 20px rgba(0, 164, 220, 0.6);
                z-index: 3;
            }

            .lf-picker-footer {
                padding: 20px 30px;
                background: #1a1a1a;
                border-top: 1px solid #333;
                display: flex; justify-content: flex-end; gap: 15px;
            }
            
            /* Footer Buttons */
            .lf-btn {
                padding: 8px 12px; border-radius: 6px; 
                font-weight: 600; font-size: 1rem; cursor: pointer; border: none;
                transition: all 0.2s;
            }
            .lf-btn-cancel { background: transparent; color: #aaa; border: 1px solid #444; }
            .lf-btn-cancel:hover { color: white; border-color: white; }
            
            .lf-btn-save { 
                background: var(--clr-accent); color: white; 
                opacity: 0.5; pointer-events: none; /* Disabled by default */
            }
            .lf-btn-save.active { opacity: 1; pointer-events: auto; }
            .lf-btn-save:hover { background: var(--clr-accent-hover); }

            @media (max-width: 768px) {
                .lf-picker-header { flex-direction: column; align-items: flex-start; gap: 15px; padding: 15px; }
                .lf-picker-controls { width: 100%; flex-wrap: wrap; }
                .lf-search-input { width: 100%; }
                .lf-picker-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); padding: 15px; gap: 15px; }
            }
        `;
        overlay.appendChild(style);

        const modal = document.createElement('div');
        modal.className = 'lf-picker-modal';

        const catOptions = categories.map(c => `<option value="${c}">${c}</option>`).join('');

        modal.innerHTML = `
            <div class="lf-picker-header">
                <h1 class="lf-picker-title">Select your avatar</h1>
                
                <div class="lf-picker-controls">
                    <input type="text" class="lf-control-input lf-search-input" id="lfAvatarSearch" placeholder="Search...">
                    <select class="lf-control-input lf-category-select" id="lfAvatarFilter">
                        <option value="All">All Categories</option>
                        ${catOptions}
                    </select>
                </div>
                
                <button class="lf-picker-close" id="lfPickerClose">
                    <span class="material-icons">close</span>
                </button>
            </div>
            
            <div class="lf-picker-grid" id="lfPickerGrid"></div>
            
            <div class="lf-picker-footer">
                <button class="lf-btn lf-btn-cancel" id="lfBtnCancel">Cancel</button>
                <button class="lf-btn lf-btn-save" id="lfBtnSave">Save Avatar</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Elements
        const searchInput = modal.querySelector('#lfAvatarSearch');
        const filterSelect = modal.querySelector('#lfAvatarFilter');
        const grid = modal.querySelector('#lfPickerGrid');
        const closeBtn = modal.querySelector('#lfPickerClose');
        const cancelBtn = modal.querySelector('#lfBtnCancel');
        const saveBtn = modal.querySelector('#lfBtnSave');

        // Handlers
        const close = () => overlay.remove();
        closeBtn.onclick = close;
        cancelBtn.onclick = close;

        saveBtn.onclick = () => this.saveAvatar(saveBtn);

        const refreshGrid = () => {
            const query = searchInput.value.toLowerCase();
            const cat = filterSelect.value;

            const filtered = this.allImages.filter(img => {
                const matchesSearch = img.name.toLowerCase().includes(query) || img.folder.toLowerCase().includes(query);
                const matchesCat = cat === 'All' || img.folder === cat;
                return matchesSearch && matchesCat;
            });

            this.renderGridItems(grid, filtered);
        };

        searchInput.oninput = refreshGrid;
        filterSelect.onchange = refreshGrid;

        // Initial Render
        this.renderGridItems(grid, this.allImages);
    },

    renderGridItems: function (container, images) {
        // Limit render count for performance
        const displayImages = images.slice(0, 500);

        const html = displayImages.map(img => `
            <div class="lf-picker-item" 
                 title="${img.name}" 
                 style="background-image: url('${img.url}')"
                 data-url="${img.url}">
            </div>
        `).join('');

        container.innerHTML = html;

        // View More Indicator if truncated
        if (images.length > 500) {
            container.insertAdjacentHTML('beforeend', '<div style="grid-column: 1/-1; text-align:center; padding:20px; color:#aaa;">(Only showing first 500 results. Use search to filter.)</div>');
        }



        // Add Selection Logic
        const items = container.querySelectorAll('.lf-picker-item');
        items.forEach(item => {
            item.onclick = () => {
                // Deselect all
                container.querySelectorAll('.lf-picker-item.selected').forEach(el => el.classList.remove('selected'));
                // Select clicked
                item.classList.add('selected');

                // Update State
                this.selectedUrl = item.dataset.url;

                // Enable Save
                const saveBtn = document.querySelector('#lfBtnSave');
                if (saveBtn) saveBtn.classList.add('active');
            };
        });
    },

    saveAvatar: async function (btn) {
        if (!this.selectedUrl) return;

        btn.textContent = "Saving...";
        btn.classList.remove('active'); // Disable double click

        const success = await window.uploadExternalImage(this.selectedUrl, 'Primary');

        if (success) {
            location.reload();
        } else {
            alert('Update failed. Please try again.');
            btn.textContent = "Save Avatar";
            btn.classList.add('active');
        }
    }
};




// --- INIT & ROBUSTNESS ---
// We use a polling mechanism to ensure the UI is ready before injecting.
// This is more reliable than Observers for the initial load.

let _injectedNav = false;
let _injectedHero = false;
let _injectedJelly = false;

// =========================================================================
// MODERN SEARCH MODAL LOGIC
// =========================================================================

let _searchDebounce = null;

function createSearchModal() {
    if (document.querySelector('.legit-search-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'legit-search-overlay';

    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) closeSearchModal();
    };

    const modal = document.createElement('div');
    modal.className = 'legit-search-modal';

    // Header / Input
    const header = document.createElement('div');
    header.className = 'legit-search-header';

    const icon = document.createElement('span');
    icon.className = 'material-icons legit-search-icon';
    icon.textContent = 'search';

    const input = document.createElement('input');
    input.className = 'legit-search-input';
    input.type = 'text';
    input.placeholder = 'Search movies, shows, people...';
    input.autocomplete = 'off';

    input.oninput = (e) => {
        const query = e.target.value;
        if (_searchDebounce) clearTimeout(_searchDebounce);
        _searchDebounce = setTimeout(() => performSearch(query), 300);
    };

    // ESC Hint + Close Area
    const closeContainer = document.createElement('div');
    closeContainer.className = 'legit-search-actions';
    closeContainer.onclick = closeSearchModal; // Click area closes too

    const escBadge = document.createElement('span');
    escBadge.className = 'legit-search-esc';
    escBadge.textContent = 'esc';

    const closeText = document.createElement('span');
    closeText.className = 'legit-search-close-text';
    closeText.textContent = 'Close';

    closeContainer.appendChild(escBadge);
    closeContainer.appendChild(closeText);

    header.appendChild(icon);
    header.appendChild(input);
    header.appendChild(closeContainer);

    // Quick Access Categories
    const categories = document.createElement('div');
    categories.className = 'legit-search-categories';
    categories.id = 'legit-search-categories';

    // Results container
    const results = document.createElement('div');
    results.className = 'legit-search-results';
    results.id = 'legit-search-results';
    results.innerHTML = '<div class="legit-no-results">Type to search...</div>';

    modal.appendChild(header);
    modal.appendChild(categories);
    modal.appendChild(results);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    return { overlay, input, results };
}

function openSearchModal() {
    let elements = createSearchModal();
    if (!elements) {
        // Already exists
        const overlay = document.querySelector('.legit-search-overlay');
        const input = document.querySelector('.legit-search-input');
        const results = document.querySelector('#legit-search-results');
        elements = { overlay, input, results };
    }

    // Force reflow
    elements.overlay.offsetHeight;
    elements.overlay.classList.add('visible');

    setTimeout(() => {
        elements.input.focus();
    }, 50);

    // Add ESC listener
    document.addEventListener('keydown', handleSearchEsc);

    // Load categories
    populateSearchCategories();
}

async function populateSearchCategories() {
    const container = document.getElementById('legit-search-categories');
    // Allow refreshing if empty, but don't duplicate
    if (!container || container.childElementCount > 0) return;

    try {
        if (!window.ApiClient) return;
        const userId = window.ApiClient.getCurrentUserId();
        const views = await window.ApiClient.getUserViews({}, userId);

        if (views && views.Items) {
            views.Items.forEach(view => {
                const pill = document.createElement('button');
                pill.className = 'legit-search-category-pill';
                pill.textContent = view.Name;
                pill.onclick = () => {
                    const serverId = view.ServerId || window.ApiClient.serverId();
                    window.location.hash = `#!/list?parentId=${view.Id}&serverId=${serverId}`;
                    closeSearchModal();
                };
                container.appendChild(pill);
            });
        }
    } catch (e) {
        console.error('Error loading search categories', e);
    }
}

function closeSearchModal() {
    const overlay = document.querySelector('.legit-search-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }
    document.removeEventListener('keydown', handleSearchEsc);
}

function handleSearchEsc(e) {
    if (e.key === 'Escape') closeSearchModal();
}

async function performSearch(query) {
    const resultsContainer = document.querySelector('#legit-search-results');
    if (!resultsContainer) return;

    if (!query || query.length < 2) {
        resultsContainer.innerHTML = '<div class="legit-no-results">Type to search...</div>';
        return;
    }

    if (!window.ApiClient) {
        resultsContainer.innerHTML = '<div class="legit-no-results">Error: API not ready</div>';
        return;
    }

    try {
        const userId = window.ApiClient.getCurrentUserId();
        // Use Search/Hints for quick results or Items for full
        const result = await window.ApiClient.getSearchHints({
            userId: userId,
            searchTerm: query,
            limit: 20,
            includeItemTypes: "Movie,Series,BoxSet,MusicAlbum,MusicArtist,Person",
            mediaTypes: "Video,Audio"
        });

        renderSearchResults(result.SearchHints || []);

    } catch (e) {
        console.error('Search failed:', e);
        resultsContainer.innerHTML = '<div class="legit-no-results">Search failed.</div>';
    }
}

function renderSearchResults(items) {
    const container = document.querySelector('#legit-search-results');
    if (!container) return;

    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="legit-no-results">No results found</div>';
        return;
    }

    items.forEach(item => {
        const el = document.createElement('a');
        el.className = 'legit-search-result-item';
        // Go to item
        // Go to item
        if (item.ItemId) {
            // Match Plugin: Use /#!/details route via helper
            el.onclick = (e) => {
                e.preventDefault();
                closeSearchModal();
                window.legitFlixShowItem(item.ItemId);
            };
        }

        // Image
        const thumb = document.createElement('div');
        if (item.PrimaryImageAspectRatio) {
            const imgUrl = window.ApiClient.getUrl(`/Items/${item.ItemId}/Images/Primary?maxHeight=60&maxWidth=40&quality=90`);
            thumb.className = 'legit-result-thumb';
            thumb.style.backgroundImage = `url('${imgUrl}')`;
        } else {
            thumb.className = 'legit-result-icon';
            thumb.innerHTML = '<span class="material-icons">movie</span>';
        }

        // Info
        const info = document.createElement('div');
        info.className = 'legit-result-info';

        const title = document.createElement('div');
        title.className = 'legit-result-title';
        title.textContent = item.Name;

        const meta = document.createElement('div');
        meta.className = 'legit-result-meta';

        // Type Tag
        const typeEl = document.createElement('span');
        typeEl.className = 'legit-result-tag';
        typeEl.textContent = item.Type;
        meta.appendChild(typeEl);

        // Year
        if (item.ProductionYear) {
            const yearEl = document.createElement('span');
            yearEl.textContent = item.ProductionYear;
            meta.appendChild(yearEl);
        }

        info.appendChild(title);
        info.appendChild(meta);

        el.appendChild(thumb);
        el.appendChild(info);
        container.appendChild(el);
    });
}

// Navigation: Hamburger + Logo + Dynamic Links (Left) + Drawer Menu (Right)
async function injectCustomNav() {
    // === LEFT SIDE: Hamburger + Logo + Dynamic Nav Links ===
    const headerLeft = document.querySelector('.headerLeft');
    if (headerLeft && !headerLeft.querySelector('.legit-nav-container')) {
        // Clear existing content
        headerLeft.innerHTML = '';

        // Create container for our nav
        const navContainer = document.createElement('div');
        navContainer.className = 'legit-nav-container';

        // 1. Hamburger menu button (far left)
        const hamburger = document.createElement('button');
        hamburger.className = 'legit-hamburger-menu paper-icon-button-light';
        hamburger.innerHTML = '<span class="material-icons">menu</span>';
        hamburger.setAttribute('title', 'Menu');
        hamburger.onclick = () => {
            document.querySelector('.mainDrawer')?.classList.toggle('is-visible');
        };
        navContainer.appendChild(hamburger);

        // 2. LEGITFLIX logo
        const logo = document.createElement('a');
        logo.className = 'legit-nav-logo';
        logo.href = '#/home';
        logo.innerHTML = '<img src="https://i.imgur.com/9tbXBxu.png" alt="LEGITFLIX" class="logo-img">';
        navContainer.appendChild(logo);

        // 3. Dynamic nav links from API
        const navLinks = document.createElement('div');
        navLinks.className = 'legit-nav-links';

        try {
            if (window.ApiClient) {
                const userId = window.ApiClient.getCurrentUserId();
                const views = await window.ApiClient.getUserViews({}, userId);

                // Create link for each library
                if (views && views.Items) {
                    views.Items.forEach(view => {
                        const link = document.createElement('a');
                        link.className = 'nav-link';

                        const serverId = view.ServerId || window.ApiClient.serverId();
                        link.href = `#!/list?parentId=${view.Id}&serverId=${serverId}`;

                        // Map collection types to icons
                        const iconMap = {
                            'movies': 'movie',
                            'tvshows': 'tv',
                            'music': 'library_music',
                            'books': 'book',
                            'photos': 'photo_library',
                            'livetv': 'live_tv',
                            'homevideos': 'video_library',
                            'musicvideos': 'music_video',
                            'mixed': 'video_library'
                        };

                        const iconName = iconMap[view.CollectionType?.toLowerCase()] || 'video_library';

                        link.innerHTML = `
                            <span class="material-icons">${iconName}</span>
                            <span>${view.Name}</span>
                        `;

                        navLinks.appendChild(link);
                    });
                }
            }
        } catch (e) {
            console.error('[LegitFlix] Failed to load nav links:', e);
        }

        navContainer.appendChild(navLinks);
        headerLeft.appendChild(navContainer);
    }

    // === RIGHT SIDE: Drawer Menu ===
    const headerRight = document.querySelector('.headerRight');
    if (!headerRight) return;

    // Check if already modified
    if (headerRight.querySelector('.legit-nav-drawer')) return;

    // Find all buttons except the user profile button
    const buttons = Array.from(headerRight.querySelectorAll('button'));
    const profileButton = buttons.find(btn => btn.classList.contains('headerUserButton'));

    // Get the 4 icon buttons (everything except profile)
    const iconButtons = buttons.filter(btn => btn !== profileButton);

    if (iconButtons.length === 0) return;

    // Create drawer toggle button (hamburger menu)
    const drawerToggle = document.createElement('button');
    drawerToggle.className = 'legit-nav-drawer-toggle paper-icon-button-light';
    drawerToggle.innerHTML = '<span class="material-icons">more_vert</span>';
    drawerToggle.setAttribute('title', 'More');

    // Create drawer container
    const drawer = document.createElement('div');
    drawer.className = 'legit-nav-drawer';

    // Sort buttons: Search, Cast, SyncPlay, Player, Others
    const getOrder = (btn) => {
        const txt = (btn.getAttribute('title') || btn.getAttribute('aria-label') || btn.className || '').toLowerCase();
        if (txt.includes('search')) return 1;
        if (txt.includes('cast') || txt.includes('play on')) return 2;
        if (txt.includes('syncplay') || txt.includes('group')) return 3;
        if (txt.includes('player') || txt.includes('remote') || txt.includes('queue')) return 4;
        return 10;
    };

    iconButtons.sort((a, b) => getOrder(a) - getOrder(b));

    // Move icon buttons into drawer and add text labels
    iconButtons.forEach(btn => {
        // Get button title or aria-label for text
        const label = btn.getAttribute('title') || btn.getAttribute('aria-label') || 'Menu';

        // Add text label if not already present
        if (!btn.querySelector('.drawer-btn-text')) {
            const textSpan = document.createElement('span');
            textSpan.className = 'drawer-btn-text';
            textSpan.textContent = label;
            btn.appendChild(textSpan);
        }

        // INTERCEPT SEARCH: Check if this is the search button
        const isSearch = btn.classList.contains('headerSearchButton') ||
            btn.querySelector('.search') ||
            (btn.getAttribute('data-id') === 'search') ||
            (label && label.toLowerCase().includes('search'));

        if (isSearch) {
            // CLONE BUTTON to strip existing Jellyfin event listeners (fixes double navigation)
            const clone = btn.cloneNode(true);
            clone.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openSearchModal();
                // Close drawer if open
                document.querySelector('.legit-nav-drawer')?.classList.remove('open');
            };
            drawer.appendChild(clone);

            // Remove original button since we cloned it
            if (btn.parentNode) btn.parentNode.removeChild(btn);
        } else {
            drawer.appendChild(btn);
        }
    });

    // Inject Dashboard Link for Admins (with retry since user may not be ready)
    const addDashboardButton = async (retries = 5) => {
        if (!window.ApiClient) return;

        try {
            const user = await window.ApiClient.getCurrentUser();
            if (!user && retries > 0) {
                // User not ready yet, retry after delay
                setTimeout(() => addDashboardButton(retries - 1), 500);
                return;
            }

            if (user && user.Policy && user.Policy.IsAdministrator) {
                // Check if button already exists
                if (drawer.querySelector('[title="Dashboard"]')) return;

                const dashBtn = document.createElement('button');
                dashBtn.className = 'paper-icon-button-light headerButton';
                dashBtn.setAttribute('title', 'Dashboard');

                dashBtn.onclick = () => {
                    window.location.hash = '#/dashboard';
                    document.querySelector('.legit-nav-drawer')?.classList.remove('open');
                };

                dashBtn.innerHTML = `
                    <span class="material-icons">dashboard</span>
                    <span class="drawer-btn-text">Dashboard</span>
                `;

                drawer.appendChild(dashBtn);
                console.log('[LegitFlix] Dashboard button added for admin');
            }
        } catch (e) {
            if (retries > 0) {
                setTimeout(() => addDashboardButton(retries - 1), 500);
            } else {
                console.error('[LegitFlix] Admin check failed after retries:', e);
            }
        }
    };

    addDashboardButton();

    // Insert drawer toggle before profile button
    if (profileButton) {
        profileButton.parentNode.insertBefore(drawerToggle, profileButton);
    } else {
        headerRight.appendChild(drawerToggle);
    }

    // Add drawer to header
    headerRight.appendChild(drawer);

    // Toggle functionality
    drawerToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.classList.toggle('open');
    });

    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (!drawer.contains(e.target) && e.target !== drawerToggle) {
            drawer.classList.remove('open');
        }
    });
}

async function pollForUI() {
    const isReady = window.ApiClient && document.body;
    if (!isReady) return;

    // 1. Try Inject Nav
    if (!_injectedNav && document.querySelector('.headerLeft')) {
        try {
            await injectCustomNav();
            _injectedNav = true; // Set flag only if successful
        } catch (e) {
            logger.error('Nav Injection failed', e);
        }
    }

    // 2. Try Inject Hero (Home Page Only) - exclude settings pages
    const hashLower = window.location.hash.toLowerCase();
    const isHome = (hashLower === '' || hashLower === '#/' || hashLower.includes('/home') || hashLower.includes('startup'))
        && !hashLower.includes('preferences');
    const sections = document.querySelector('.homeSectionsContainer') || document.querySelector('.mainAnimatedPages');

    if (isHome && sections && !_injectedHero) {
        try {
            await injectMediaBar();
            // injectMediaBar handles its own success flag internally if items found
            _injectedHero = true;
        } catch (e) {
            logger.error('Hero Injection failed', e);
        }
    }

    // 3. Try Inject Jellyseerr (Home Page Only)
    if (isHome && document.querySelector('.homePage .itemsContainer.scrollSlider') && !_injectedJelly) {
        try {
            injectJellyseerr();
            if (document.querySelector('#jellyseerr-card')) _injectedJelly = true;
        } catch (e) {
            logger.error('Jellyseerr Injection failed', e);
        }
    }

    // 4. Try Inject Preferences Header (Prefs Page Only)
    // FIX: URL hash is often lowercase, check broadly
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('preferences') || hash.includes('quickconnect')) {
        try {
            injectFeaturedPrefs();

            // --- JELLYFIN ENHANCED PLUGIN INTEGRATION ---
            // Look for the "Advanced Settings (Jellyfin Enhanced)" button injected by another plugin
            const enhancedBtn = document.getElementById('jellyfinEnhancedUserPrefsLink');
            const navTabs = document.querySelector('.profile-nav-tabs');

            if (enhancedBtn && navTabs && !navTabs.querySelector('.tab-enhanced')) {
                console.log('LegitFlix: Found Jellyfin Enhanced Plugin button. Moving to Tabs...');

                // Create Tab
                const tab = document.createElement('a');
                tab.className = 'profile-tab tab-enhanced';
                tab.textContent = 'Advanced'; // Shorter name

                // Copy behavior
                tab.onclick = (e) => {
                    e.preventDefault();
                    // update active state manually since it's not a hash change
                    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    enhancedBtn.click();
                };

                // Insert BEFORE Admin Tabs (Dashboard/Metadata) if present, else Logout
                const dashboardTab = navTabs.querySelector('a[href*="dashboard"]');
                const metadataTab = navTabs.querySelector('a[href*="metadata"]');
                const logoutTab = navTabs.querySelector('.logout-tab');

                // Target the first one found
                const targetTab = dashboardTab || metadataTab || logoutTab;

                if (targetTab) {
                    navTabs.insertBefore(tab, targetTab);
                } else {
                    navTabs.appendChild(tab);
                }

                // Hide original row
                enhancedBtn.style.display = 'none';
            }
            // ---------------------------------------------
        } catch (e) {
            console.error('Prefs Header injection failed', e);
        }
    }

    // 5. Ensure Password Form exists (Custom Injection)
    if (window.ensurePasswordForm) window.ensurePasswordForm();
}

// Helper to Inject Password Form (if valid container doesn't have it)
window.ensurePasswordForm = function () {
    // Only on "My Details" page (mypreferencesmenu), not other settings pages
    const hash = window.location.hash.toLowerCase();
    if (!hash.includes('mypreferencesmenu')) return;

    // Check if we already have it
    if (document.getElementById('customPasswordForm')) return;

    // Check if native form exists (if so, we just style it)
    const nativeForm = document.querySelector('#fldCurrentPassword');
    if (nativeForm) {
        if (window.stylePasswordSection) window.stylePasswordSection();
        return;
    }

    // Attempt to inject at the end of the content
    const content = document.querySelector('.page-content') || document.querySelector('.content-primary') || document.querySelector('[data-type="userprofile"]');
    // For custom page, maybe #myPreferencesMenuPage ? 
    // The user said: "I'm trying to move them out here: https://stream.legitflix.eu/web/#/mypreferencesmenu"
    // Does this page have a specific container? Likely created by our script or a plugin.
    // If we can find the profile header we injected, we can append after it.
    const header = document.querySelector('.gaming-profile-header');

    if (header && header.parentElement) {
        console.log('LegitFlix: Native password form missing. Injecting Custom Form...');

        const formHtml = `
            <div id="customPasswordForm" class="profile-settings-card">
                <h2>Change Password</h2>
                <form onsubmit="event.preventDefault();">
                    <div class="legit-form-group">
                        <label class="legit-form-label" for="txtCurrentPassword">Current Password</label>
                        <input type="password" id="txtCurrentPassword" class="legit-form-input" autocomplete="current-password">
                    </div>
                    <div class="legit-form-group">
                        <label class="legit-form-label" for="txtNewPassword">New Password</label>
                        <input type="password" id="txtNewPassword" class="legit-form-input" autocomplete="new-password">
                    </div>
                    <div class="legit-form-group">
                        <label class="legit-form-label" for="txtNewPasswordConfirm">Confirm New Password</label>
                        <input type="password" id="txtNewPasswordConfirm" class="legit-form-input" autocomplete="new-password">
                    </div>
                    <div style="margin-top:20px;">
                        <button id="btnSavePassword" class="legit-btn-primary">Save Password</button>
                        <div id="passwordMsg" style="margin-top:10px; font-weight:bold;"></div>
                    </div>
                </form>
            </div>
        `;

        // Insert after header
        header.insertAdjacentHTML('afterend', formHtml);

        // Bind Logic
        setTimeout(() => {
            const btn = document.getElementById('btnSavePassword');
            if (btn) {
                btn.onclick = async () => {
                    const current = document.getElementById('txtCurrentPassword').value;
                    const newPw = document.getElementById('txtNewPassword').value;
                    const confirm = document.getElementById('txtNewPasswordConfirm').value;
                    const msg = document.getElementById('passwordMsg');

                    if (!current || !newPw) {
                        msg.textContent = 'Please fill in all fields.';
                        msg.style.color = 'orange';
                        return;
                    }
                    if (newPw !== confirm) {
                        msg.textContent = 'New passwords do not match.';
                        msg.style.color = 'red';
                        return;
                    }

                    try {
                        btn.disabled = true;
                        btn.textContent = 'Projecting...';

                        // Use Jellyfin API (ApiClient.updatePassword(current, new))
                        // Note: ApiClient might expect just (new) if simple, but usually (current, new)
                        // Checking usage: ApiClient.updatePassword(current, new)
                        // If not available, we use UserService.

                        const userId = window.ApiClient.getCurrentUserId();
                        const url = window.ApiClient.getUrl(`/Users/${userId}/Password`);

                        await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${window.ApiClient.accessToken()}"`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                CurrentPw: current,
                                NewPw: newPw
                            })
                        }).then(res => {
                            if (!res.ok) throw new Error('Failed to update password: ' + res.status + ' ' + res.statusText);
                        });

                        msg.textContent = 'Password updated successfully.';
                        msg.style.color = 'lightgreen';
                        // Clear fields
                        document.getElementById('txtCurrentPassword').value = '';
                        document.getElementById('txtNewPassword').value = '';
                        document.getElementById('txtNewPasswordConfirm').value = '';
                    } catch (e) {
                        console.error(e);
                        msg.textContent = 'Error: ' + (e.message || 'Failed to update.');
                        msg.style.color = 'red';
                    } finally {
                        btn.disabled = false;
                        btn.textContent = 'Save Password';
                    }
                };
            }
        }, 100);
    }
};



// Run initially and on mutation
renameMyList();
fixMixedCards();
// --- INJECT DYNAMIC PROMO BANNER (Crunchyroll Style) ---
let _promoInjectionInProgress = false; // Guard for race conditions
let _injectedBanner = false; // Track if banner already injected

async function injectPromoBanner() {
    // RESET CHECK: If flag says injected, but element is missing (SPA navigation cleared it), reset flag.
    if (_injectedBanner && !document.querySelector('.legitflix-promo-container')) {
        _injectedBanner = false;
    }

    if (_promoInjectionInProgress || _injectedBanner) return;

    // Strict Home Page Check (Relaxed for root)
    const hash = window.location.hash.toLowerCase();
    // Allow 'home', 'index', or empty/root '#!/'
    if (!hash.includes('home') && !hash.endsWith('/web/index.html') && hash !== '#!/' && hash !== '' && hash !== '#/') {
        return;
    }

    const homeSections = document.querySelector('.homeSectionsContainer');
    if (!homeSections && !document.querySelector('.verticalSection')) return;

    _promoInjectionInProgress = true;

    try {
        // 2. Find Injection Point: After "History" section
        // Strategy A: Find by Title
        const titles = Array.from(document.querySelectorAll('.sectionTitle, .sectionTitle-cards'));
        let historyTitle = titles.find(t => {
            const txt = t.innerText.toLowerCase();
            return txt.includes('history') || txt.includes('next up') || txt.includes('continuar');
        });

        let historySection = null;
        if (historyTitle) {
            historySection = historyTitle.closest('.verticalSection');
        }

        // Strategy B: Fallback to known class
        if (!historySection) {
            historySection = document.querySelector('.verticalSection.section5');
        }

        if (!historySection) {
            _promoInjectionInProgress = false; // Reset so we can try again later
            return;
        }


        // 3. Fetch Data
        const auth = await getAuth();
        if (!auth) {
            _promoInjectionInProgress = false;
            return;
        }
        const headers = { 'X-Emby-Token': auth.AccessToken, 'Accept': 'application/json' };

        // A. Get Candidates (Latest Movies/Series) - Limit to 3 strictly. Sort by DateCreated Descending.
        const candidatesRes = await fetch(`/Users/${auth.UserId}/Items?Limit=3&Recursive=true&IncludeItemTypes=Movie,Series&SortBy=DateCreated&SortOrder=Descending&ImageTypeLimit=1&EnableImageTypes=Primary,Backdrop,Thumb,Logo&Fields=Overview,ProductionYear,ImageTags`, { headers });
        const candidatesJson = await candidatesRes.json();

        // C. Select Top 3 (or less)
        const selected = candidatesJson.Items || [];

        if (selected.length === 0) {
            _promoInjectionInProgress = false;
            return;
        }

        // 4. PRELOAD IMAGES (Strict Loading)
        const item1 = selected[0]; // Hero
        const item2 = selected[1]; // Sub 1 (Optional)
        const item3 = selected[2]; // Sub 2 (Optional)

        console.log('[LegitFlix] Promo Banner Candidates:', item1.Name, item2?.Name, item3?.Name);

        // Helpers for images
        const getBackdrop = (item) => `/Items/${item.Id}/Images/Backdrop/0?maxWidth=2000`;
        const getThumb = (item) => `/Items/${item.Id}/Images/Thumb/0?maxWidth=800` || `/Items/${item.Id}/Images/Backdrop/0?maxWidth=800`;
        const getLogo = (item) => `/Items/${item.Id}/Images/Logo/0?maxWidth=400`;
        const getLink = (item) => `#/details?id=${item.Id}&serverId=${auth.ServerId}`;

        const getMetaHtml = (item) => {
            let endsAtHtml = '';
            if (item.RunTimeTicks && item.Type !== 'Series') {
                const ms = item.RunTimeTicks / 10000;
                const endTime = new Date(Date.now() + ms);
                const timeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                endsAtHtml = `<span class="hero-meta-divider">•</span> <span class="hero-meta-text">Ends at ${timeStr}</span>`;
            }
            const ratingStar = item.CommunityRating ? `<span class="hero-meta-divider">•</span> <span class="hero-meta-text">⭐ ${item.CommunityRating.toFixed(1)}</span>` : '';
            const genres = item.Genres ? `<span class="hero-meta-divider">•</span> <span class="hero-meta-text">${item.Genres.slice(0, 2).join(', ')}</span>` : '';

            return `
             <div class="hero-meta-line" style="margin-bottom: 8px; font-size: 0.8rem;">
                <span class="hero-badge-age">${item.OfficialRating || '13+'}</span>
                ${genres}
                ${ratingStar}
                ${endsAtHtml}
             </div>`;
        };

        // Create Image Objects to preload (with Timeout)
        const preloadImage = (src) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const timeout = setTimeout(() => {
                    img.src = ''; // Cancel
                    reject(new Error('Image Load Timeout'));
                }, 4000); // 4s timeout

                img.onload = () => { clearTimeout(timeout); resolve(src); };
                img.onerror = () => { clearTimeout(timeout); reject(src); };
                img.src = src;
            });
        };

        const mainBgUrl = getBackdrop(item1);

        // Wait for MAIN background strictly
        try {
            await preloadImage(mainBgUrl);
            console.log('[LegitFlix] Promo Banner Main Image Loaded');
        } catch (e) {
            console.warn('[LegitFlix] Promo Banner Main Image Failed to load. Skipping Injection.');
            _promoInjectionInProgress = false;
            return;
        }

        // 5. Build HTML
        const html = `
            <div class="legitflix-promo-container">
                <!-- Top Banner (Item 1) -->
                <div class="promo-item promo-item-large" onclick="window.legitFlixPlay('${item1.Id}', event)" style="cursor: pointer;">
                    <img src="${mainBgUrl}" class="promo-bg">
                    <div class="promo-content">
                     ${item1.ImageTags && item1.ImageTags.Logo ? `<img src="${getLogo(item1)}" class="promo-logo" style="display:block;">` : `<h2 class="promo-title">${item1.Name}</h2>`}
                     <p class="promo-desc">${item1.Overview || ''}</p>
                     <div class="promo-actions">
                         <button class="btn-watch" onclick="window.legitFlixPlay('${item1.Id}', event);">WATCH NOW</button>
                         <button class="btn-info" onclick="window.openInfoModal('${item1.Id}'); event.stopPropagation();">
                            <span class="material-icons" style="font-size: 1.2rem;">info</span> More Info
                         </button>
                     </div>
                </div>
            </div>
                
                <!-- Bottom Grid (Items 2 & 3) -->
                ${(item2 || item3) ? `
                <div class="promo-grid-row">
                    ${item2 ? `
                    <div class="promo-item promo-item-small" onclick="window.legitFlixPlay('${item2.Id}', event)" style="cursor: pointer;">
                         <div class="promo-split">
                             <div class="promo-text">
                                 ${item2.ImageTags && item2.ImageTags.Logo ? `<img src="${getLogo(item2)}" class="promo-logo-small" style="display:block; max-height: 80px; width: 75%; margin-bottom: 8px;">` : `<h3>${item2.Name}</h3>`}
                                 ${getMetaHtml(item2)}
                                 <p class="desc">${item2.Overview || ''}</p>
                                 <div class="promo-small-actions" style="display: flex; gap: 10px; margin-top: auto; align-items: flex-end">
                                     <button class="btn-watch" onclick="window.legitFlixPlay('${item2.Id}', event);">Watch Now</button>
                                     <button class="btn-info-circle" onclick="window.openInfoModal('${item2.Id}'); event.stopPropagation();" title="More Info" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3); background: transparent; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                        <span class="material-icons">info</span>
                                     </button>
                                 </div>
                             </div>
                             <img src="${getThumb(item2)}" class="promo-poster" onerror="this.src='${getBackdrop(item2)}'">
                         </div>
                    </div>` : ''}
                    ${item3 ? `
                    <div class="promo-item promo-item-small" onclick="window.legitFlixPlay('${item3.Id}', event)" style="cursor: pointer;">
                         <div class="promo-split">
                             <div class="promo-text">
                                 ${item3.ImageTags && item3.ImageTags.Logo ? `<img src="${getLogo(item3)}" class="promo-logo-small" style="display:block; max-height: 80px; width: 75%; margin-bottom: 8px;">` : `<h3>${item3.Name}</h3>`}
                                 ${getMetaHtml(item3)}
                                 <p class="desc">${item3.Overview || ''}</p>
                                 <div class="promo-small-actions" style="display: flex; gap: 10px; margin-top: auto; align-items: flex-end">
                                     <button class="btn-watch" onclick="window.legitFlixPlay('${item3.Id}', event);">Watch Now</button>
                                     <button class="btn-info-circle" onclick="window.openInfoModal('${item3.Id}'); event.stopPropagation();" title="More Info" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3); background: transparent; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                        <span class="material-icons">info</span>
                                     </button>
                                 </div>
                             </div>
                             <img src="${getThumb(item3)}" class="promo-poster" onerror="this.src='${getBackdrop(item3)}'">
                         </div>
                    </div>` : ''}
                </div>` : ''}
            </div>
            `;

        // 6. Inject
        historySection.insertAdjacentHTML('afterend', html);
        console.log('[LegitFlix] Promo Banner Injected Successfully');
        // Done!
        _injectedBanner = true; // Mark as injected
        _promoInjectionInProgress = false; // Reset after successful injection

    } catch (e) {
        console.error('[LegitFlix] Error building promo banner:', e);
        _promoInjectionInProgress = false; // Reset on error
    }
}

// --- HOVER CARD LOGIC (Body Append + Native Button Move) ---
// Cache for item details to avoid repeated API calls
// LIMITED to 50 items to prevent memory leaks
const _cardCache = new Map();
const CACHE_MAX_SIZE = 50;

function limitCacheSize() {
    if (_cardCache.size > CACHE_MAX_SIZE) {
        // Remove oldest entries (first added)
        const keysToDelete = [];
        let count = 0;
        for (const key of _cardCache.keys()) {
            if (count < _cardCache.size - CACHE_MAX_SIZE) {
                keysToDelete.push(key);
                count++;
            } else {
                break;
            }
        }
        keysToDelete.forEach(k => _cardCache.delete(k));
        console.log('[LegitFlix] Cache pruned:', keysToDelete.length, 'items');
    }
}

let _hoverTimer = null;
let _activeOverlay = null;
let _borrowedButton = null; // Track moved button
let _originalParent = null;

function setupHoverCards() {
    console.log('[LegitFlix] setupHoverCards: Initialized');
    // Delegate mouseover to body but filter for cards
    document.body.addEventListener('mouseover', (e) => {
        // Disable on edit/admin pages
        if (window.location.href.includes('edititem') || window.location.href.includes('metadata')) return;

        // Disable on Details Pages (Native Hover Mode)
        if (document.body.classList.contains('native-hover-mode')) return;

        const card = e.target.closest('.card, .overflowPortraitCard, .overflowBackdropCard');
        // Only target cards with an ID and strictly media items (not folders/collections if possible, but mostly items)
        if (!card || !card.dataset.id) return;

        // DEBUG: Log card detection
        console.log('[LegitFlix] Hover: Card detected', card.dataset.id, card.dataset.type);

        // --- FILTERING LOGIC ---
        // 1. Exclude "Categories" (Folders)
        if (card.dataset.type === 'CollectionFolder' || card.dataset.type === 'UserView') {
            console.log('[LegitFlix] Hover: Excluded (folder)');
            return;
        }

        // 2. Exclude "Continue Watching", "History" (Next Up), "My Media"
        const section = card.closest('.verticalSection');
        if (section) {
            const titleEl = section.querySelector('.sectionTitle');
            if (titleEl) {
                const t = titleEl.innerText.toLowerCase();
                if (t.includes('continue') || t.includes('resume') || t.includes('history') || t.includes('next up') || t.includes('categories')) {
                    console.log('[LegitFlix] Hover: Excluded (section:', t, ')');
                    return;
                }
            }
        }

        if (card.classList.contains('card-flat') || card.classList.contains('chapterCard') || card.closest('.visualCardBox')) {
            console.log('[LegitFlix] Hover: Excluded (card type)');
            return;
        }

        // EXCLUSION: Image Editor & Dialogs
        if (card.classList.contains('imageEditorCard') || card.closest('.dialog') || card.closest('.formDialog')) {
            console.log('[LegitFlix] Hover: Excluded (dialog)');
            return;
        }

        // Avoid re-triggering if already showing or bad target
        if (_activeOverlay && _activeOverlay.dataset.sourceId === card.dataset.id) return;

        // Clear any pending timer
        if (_hoverTimer) clearTimeout(_hoverTimer);

        console.log('[LegitFlix] Hover: Will create card for', card.dataset.id);
        // Set delay (Instant - 50ms to prevent accidental flickers)
        _hoverTimer = setTimeout(() => {
            createHoverCard(card, card.dataset.id);
        }, 50);
    });

    document.body.addEventListener('mouseout', (e) => {
        // Check if we left the card AND the overlay
        const toElement = e.relatedTarget;

        // FIX: Close if we leave to something that isn't the overlay AND
        // (isn't a card OR is a DIFFERENT card than the active one)
        const toOverlay = toElement?.closest('.legitflix-hover-overlay');
        const toCard = toElement?.closest('.card');

        if (_activeOverlay && !toOverlay) {
            // If not going to a card, OR going to a different card
            if (!toCard || (toCard.dataset.id !== _activeOverlay.dataset.sourceId)) {
                closeHoverCard();
            }
        }
    });

    // Also listen on overlay leave
    document.body.addEventListener('mouseout', (e) => {
        if (e.target.closest('.legitflix-hover-overlay')) {
            const toElement = e.relatedTarget;
            // If moving back to origin card, technically ok, but usually we cover it.
            if (!_activeOverlay) return;
            // If left overlay and not going to origin card
            const originId = _activeOverlay.dataset.sourceId;
            const originCard = document.querySelector(`.card[data-id="${originId}"]`);

            if (!toElement?.closest('.legitflix-hover-overlay') && toElement !== originCard && !originCard?.contains(toElement)) {
                closeHoverCard();
            }
        }
    });
}

function closeHoverCard() {
    if (_hoverTimer) clearTimeout(_hoverTimer);

    if (_activeOverlay) {
        const overlay = _activeOverlay;
        _activeOverlay = null;

        // 1. Restore Native Button
        if (_borrowedButton && _originalParent) {
            // Restore style
            _borrowedButton.style.position = '';
            _borrowedButton.style.bottom = '';
            _borrowedButton.style.left = '';
            _borrowedButton.style.margin = ''; // Reset margin too
            _originalParent.appendChild(_borrowedButton);
            _borrowedButton = null;
            _originalParent = null;
        }

        overlay.classList.remove('is-loaded');
        setTimeout(() => overlay.remove(), 50); // Faster removal
    }
}

// --- SELECTION MODE DETECTION ---
function isSelectionMode() {
    return document.querySelector('.selectionCommandsPanel') !== null ||
        document.querySelector('.itemSelectionPanel') !== null;
}

function startSelectionMonitor() {
    // Monitor body for addition/removal of selection panels
    const observer = new MutationObserver(() => {
        if (isSelectionMode()) {
            document.body.classList.add('legitflix-selection-mode');
        } else {
            document.body.classList.remove('legitflix-selection-mode');
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    if (isSelectionMode()) document.body.classList.add('legitflix-selection-mode');
}
startSelectionMonitor();

async function createHoverCard(card, id) {
    // Selection Mode Check
    if (isSelectionMode()) {
        console.log('[LegitFlix] createHoverCard: Aborted (Selection Mode Active)');
        return;
    }

    console.log('[LegitFlix] createHoverCard: Starting for', id);

    // PRE-FETCH CHECK: If no longer hovering, abort immediately
    if (!card.matches(':hover')) {
        console.log('[LegitFlix] createHoverCard: Aborted (not hovering)');
        return;
    }

    closeHoverCard(); // Close existing

    let details = _cardCache.get(id);
    if (!details) {
        console.log('[LegitFlix] createHoverCard: Fetching details from API...');
        try {
            const auth = await getAuth();
            if (!auth) {
                console.log('[LegitFlix] createHoverCard: No auth, aborting');
                return;
            }
            const headers = { 'X-Emby-Token': auth.AccessToken || auth.token, 'Accept': 'application/json' };
            // Use auth.user or auth.UserId if getAuth returns differently depending on version
            const userId = auth.UserId || auth.user;
            console.log('[LegitFlix] createHoverCard: Fetching /Users/' + userId + '/Items/' + id);
            const res = await fetch(`${auth.server || ''}/Users/${userId}/Items/${id}`, { headers });
            details = await res.json();
            _cardCache.set(id, details);
            limitCacheSize(); // Prevent memory leak
            console.log('[LegitFlix] createHoverCard: Got details', details.Name);
        } catch (e) {
            console.error('[LegitFlix] createHoverCard: Fetch error', e);
            return;
        }
    } else {
        console.log('[LegitFlix] createHoverCard: Using cached details for', details.Name);
    }

    // POST-FETCH CHECK: Critical check to prevent "stuck" card if mouse left during await
    if (!card.matches(':hover')) {
        console.log('[LegitFlix] createHoverCard: Aborted after fetch (not hovering)');
        return;
    }

    if (!details) {
        console.log('[LegitFlix] createHoverCard: No details, aborting');
        return;
    }

    console.log('[LegitFlix] createHoverCard: Building overlay...');

    // Position Logic
    // Use .cardBox for visual alignment (ignores outer padding/margins of .card)
    const visualTarget = card.querySelector('.cardBox') || card;
    const rect = visualTarget.getBoundingClientRect();

    // Scale Factor (Reduced from 1.15 to 1.05 as requested "larger than needed")
    const scale = 1.05;
    const width = rect.width * scale;
    // const height = rect.height * scale; // Let height be auto/content based

    // Create Overlay
    const overlay = document.createElement('div');
    overlay.className = 'legitflix-hover-overlay'; // Base class
    overlay.dataset.sourceId = id; // Track source

    // Positioning is handled by CSS (top: 0; left: 0; width: 100%; min-height: 100%)
    // The overlay is appended to the card which has position: relative

    const rating = details.CommunityRating ? `${details.CommunityRating.toFixed(1)} <span class="material-icons star-icon">star</span>` : '';
    const year = details.ProductionYear || '';
    const seasonCount = details.ChildCount ? `${details.ChildCount} Seasons` : '';
    // Unplayed count for series
    const unplayed = details.UserData && details.UserData.UnplayedItemCount ? `${details.UserData.UnplayedItemCount} Unplayed` : '';
    const duration = details.RunTimeTicks ? Math.round(details.RunTimeTicks / 600000000) + 'm' : '';
    const desc = details.Overview || '';

    // State
    let isPlayed = details.UserData?.Played || false;
    let isFav = details.UserData?.IsFavorite || false;

    const iconPlayed = isPlayed ? 'check_circle' : 'check';
    const classPlayed = isPlayed ? 'active' : '';

    const iconFav = isFav ? 'favorite' : 'favorite_border';
    const classFav = isFav ? 'active' : '';

    // Layout: Title -> Rating -> Season -> Unplayed -> Plot -> (Flex Body) -> Footer (Bottom)
    overlay.innerHTML = `
            <div class="hover-body">
                <h3 class="hover-title">${details.Name}</h3>
                
                <div class="hover-row hover-rating">${rating}</div>
                
                ${seasonCount ? `<div class="hover-row hover-seasons">${seasonCount}</div>` : ''}
                
                ${unplayed ? `<div class="hover-row hover-unplayed">${unplayed}</div>` : (duration ? `<div class="hover-row">${duration}</div>` : '')}
                
                <p class="hover-desc">${desc}</p>
            </div>
            
            <div class="hover-footer">
                 <div class="hover-native-btn-slot"></div>
                 <div class="hover-icon-row">
                    <button class="hover-icon-btn action-check ${classPlayed}" title="${isPlayed ? 'Mark Unplayed' : 'Mark Played'}">
                        <span class="material-icons">${iconPlayed}</span>
                    </button>
                    <button class="hover-icon-btn action-fav ${classFav}" title="${isFav ? 'Unfavorite' : 'Favorite'}">
                        <span class="material-icons">${iconFav}</span>
                    </button>
                    <button class="hover-icon-btn action-info" title="Information"><span class="material-icons">info</span></button>
                    <button class="hover-icon-btn action-more" title="More"><span class="material-icons">more_vert</span></button>
                </div>
            </div>
        `;

    // --- Click Handling ---

    // API Helpers
    const toggleState = async (type, currentState, btn) => {
        const auth = await getAuth();
        if (!auth) return;

        const userId = auth.UserId || auth.user;
        const token = auth.AccessToken || auth.token;
        const server = auth.server || ''; // Relative path usually works if empty, but safer

        if (!userId || !token) return;

        const newState = !currentState;
        const iconSpan = btn.querySelector('.material-icons');

        // Optimistic UI Update & Cache Sync
        if (type === 'fav') {
            isFav = newState; // Update closure var
            if (details.UserData) details.UserData.IsFavorite = isFav; // Update Cache

            btn.classList.toggle('active', isFav);
            iconSpan.textContent = isFav ? 'favorite' : 'favorite_border';
            btn.title = isFav ? 'Unfavorite' : 'Favorite';

            const method = isFav ? 'POST' : 'DELETE';
            fetch(`${server}/Users/${userId}/FavoriteItems/${id}?api_key=${token}`, { method });

            // Realtime Update
            if (window.legitFlixUpdateIndicators) window.legitFlixUpdateIndicators(id, 'fav', isFav);

        } else if (type === 'played') {
            isPlayed = newState; // Update closure var
            if (details.UserData) details.UserData.Played = isPlayed; // Update Cache

            btn.classList.toggle('active', isPlayed);
            iconSpan.textContent = isPlayed ? 'check_circle' : 'check';
            btn.title = isPlayed ? 'Mark Unplayed' : 'Mark Played';

            const method = isPlayed ? 'POST' : 'DELETE';
            fetch(`${server}/Users/${userId}/PlayedItems/${id}?api_key=${token}`, { method });

            // Realtime Update
            if (window.legitFlixUpdateIndicators) window.legitFlixUpdateIndicators(id, 'played', isPlayed);
        }
    };

    // 1. Click Overlay -> Navigate (simulating left click on card)
    overlay.addEventListener('click', (e) => {
        // Prevent if clicking buttons/interactive elements
        if (e.target.closest('button') || e.target.closest('.hover-native-btn-slot')) return;
        window.legitFlixShowItem(id);
    });

    // 2. Button Logic
    const btnCheck = overlay.querySelector('.action-check');
    const btnFav = overlay.querySelector('.action-fav');
    const btnInfo = overlay.querySelector('.action-info');

    if (btnCheck) {
        btnCheck.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            toggleState('played', isPlayed, btnCheck);
        });
    }
    if (btnFav) {
        btnFav.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            toggleState('fav', isFav, btnFav);
        });
    }

    if (btnInfo) {
        btnInfo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.openInfoModal) {
                window.openInfoModal(id);
            }
        });
    }

    // 3. Hijack Native Menu Button (The "More" action)
    // 3. Hijack Native Menu Button (The "More" action)
    const customMoreBtn = overlay.querySelector('.action-more');
    // Strict Selector: Look for data-action="menu" OR iterate button contents
    let nativeMenu = card.querySelector('.cardOverlayButton[data-action="menu"]');

    if (!nativeMenu) {
        // Fallback: Find button with more_vert icon if data-action absent
        const buttons = card.querySelectorAll('.cardOverlayButton');
        for (const btn of buttons) {
            if (btn.innerHTML.includes('more_vert') || btn.innerHTML.includes('dots-vertical')) {
                nativeMenu = btn;
                break;
            }
        }
    }

    if (nativeMenu && customMoreBtn) {
        // Confirm it is NOT a play button
        if (!nativeMenu.classList.contains('cardOverlayFab') && !nativeMenu.getAttribute('data-action')?.includes('play')) {
            // PROXY CLICK: Don't move the button (it breaks events). Click it remotely.
            customMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                nativeMenu.click();
            });
        }
    }

    // Info -> Do Nothing (as requested "YET")

    // Info -> Do Nothing (as requested "YET")
    // Check/Fav -> Can implement later or leave as no-op for now.
    // For now they just stop propagation so they don't trigger nav.

    if (document.body.contains(card)) {
        console.log('[LegitFlix] createHoverCard: Appending overlay to card...');
        card.appendChild(overlay);
        _activeOverlay = overlay;
        console.log('[LegitFlix] createHoverCard: Overlay appended. In DOM?', document.body.contains(overlay));

        // Move Native Play Button
        const nativeFab = card.querySelector('.cardOverlayFab-primary');
        // If we are attaching to card, nativeFab is inside card.
        // But we want to move it INSIDE the overlay (child of card).
        if (nativeFab) {
            _borrowedButton = nativeFab;
            _originalParent = nativeFab.parentNode;

            const slot = overlay.querySelector('.hover-native-btn-slot');
            slot.appendChild(nativeFab);
        }

        requestAnimationFrame(() => {
            overlay.classList.add('is-loaded');
            console.log('[LegitFlix] createHoverCard: is-loaded class added. Overlay classes:', overlay.className);
        });
    } else {
        console.log('[LegitFlix] createHoverCard: Card not in body, cannot append overlay');
    }
}

// --- GLOBAL HELPERS (Moved out of setupHoverCards for scope access) ---

// 1. RENAME SECTIONS
function renameMyList() {
    document.querySelectorAll('.sectionTitle, .sectionTitle-cards').forEach(el => {
        let text = el.innerText.trim();
        const lowerText = text.toLowerCase();
        let newText = null;

        if (lowerText === 'my list' || lowerText === 'my media' || lowerText === 'mes médias') {
            newText = 'Categories';
        } else if (lowerText === 'next up' || lowerText === 'continuar viendo') {
            newText = 'History';
        } else if (lowerText.startsWith('recently added in ')) {
            const type = text.substring(18);
            newText = `Latest ${type}`;
        }

        if (newText) {
            el.innerText = newText;
            const parent = el.closest('.sectionHeader, .sectionTitleContainer');
            if (parent) {
                const link = parent.querySelector('a');
                if (link) link.setAttribute('title', newText);
            }

            // Add specific class for styling
            if (newText === 'Categories') {
                const section = el.closest('.verticalSection');
                if (section) section.classList.add('legitflix-categories-section');
            }
        }
    });
}

// 2. FIX MIXED CONTENT CARDS (Layout Fix)
function fixMixedCards() {
    const selector = '.overflowBackdropCard[data-type="Movie"], .overflowBackdropCard[data-type="Series"]';
    const cards = document.querySelectorAll(selector);

    cards.forEach(card => {
        card.classList.remove('overflowBackdropCard');
        card.classList.add('overflowPortraitCard');

        const padder = card.querySelector('.cardPadder-overflowBackdrop');
        if (padder) {
            padder.classList.remove('cardPadder-overflowBackdrop');
            padder.classList.add('cardPadder-overflowPortrait');
        }

        const imgContainer = card.querySelector('.cardImageContainer');
        if (imgContainer) {
            const style = imgContainer.getAttribute('style') || '';
            const swapImage = () => {
                const s = imgContainer.getAttribute('style') || '';
                if (s.includes('Images/Thumb')) {
                    const ns = s.replace(/Images\/Thumb/g, 'Images/Primary');
                    if (s !== ns) imgContainer.setAttribute('style', ns);
                }
            };
            swapImage();
            if (!imgContainer._observerAttached) {
                new MutationObserver(swapImage).observe(imgContainer, { attributes: true, attributeFilter: ['style'] });
                imgContainer._observerAttached = true;
            }
        }
    });
}

// 3. FIX LATEST EPISODES (Convert Episode -> Series in Latest Sections)
async function fixLatestEpisodes() {
    // Only target sections that are likely "Latest" (Vertical/Poster grids)
    const sections = document.querySelectorAll('.verticalSection, .sectionTitleContainer');

    for (const section of sections) {
        // Find title
        const titleEl = section.querySelector('.sectionTitle') || section; // fallback
        const title = titleEl.innerText.toLowerCase();

        // Check if it's a "Latest" section (and NOT Continue Watching/Next Up)
        // "Latest Anime" -> yes. "Recently Added" -> yes.
        const isLatest = (title.includes('latest') || title.includes('recently')) &&
            !title.includes('continue') &&
            !title.includes('next up') &&
            !title.includes('history');

        if (isLatest) {
            // Find Episode cards in this section
            // Look for card siblings in itemsContainer
            const container = section.closest('.verticalSection')?.querySelector('.itemsContainer')
                || section.nextElementSibling; // usually itemsContainer is next sibling

            if (container) {
                const episodeCards = container.querySelectorAll('.card[data-type="Episode"]');

                for (const card of episodeCards) {
                    if (card.getAttribute('data-fixed-episode')) continue;
                    card.setAttribute('data-fixed-episode', 'true'); // Mark processed

                    const episodeId = card.getAttribute('data-id');

                    try {
                        // Fetch Item to get Series Info
                        const userId = window.ApiClient.getCurrentUserId();
                        const item = await window.ApiClient.getItem(userId, episodeId);

                        if (item && item.SeriesId) {
                            // CONVERT TO SERIES CARD

                            // 1. Update ID & Type
                            card.setAttribute('data-id', item.SeriesId);
                            card.setAttribute('data-type', 'Series');

                            // 2. Update Image (Series Primary)
                            const imgContainer = card.querySelector('.cardImageContainer');
                            if (imgContainer) {
                                // Force Poster Ratio (CSS handles this globally now, but ensure image is correct)
                                const imgUrl = `/Items/${item.SeriesId}/Images/Primary?maxHeight=400&maxWidth=300&quality=90`;
                                imgContainer.style.backgroundImage = `url('${imgUrl}')`;
                            }

                            // 3. Update Title (Series Name)
                            // Usually cardText contains episode name "S1:E22 - ...".
                            // We want "Your Lie in April" (item.SeriesName)
                            const titleDiv = card.querySelector('.cardText');
                            if (titleDiv) {
                                titleDiv.innerText = item.SeriesName || item.Name;
                            }

                            // 4. Update Link
                            const link = card.querySelector('.itemAction');
                            if (link && item.SeriesId) {
                                const newUrl = `#!/details?id=${item.SeriesId}`;
                                link.setAttribute('href', newUrl);
                                link.onclick = (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.location.href = newUrl;
                                    return false;
                                };
                            }

                            // 5. Cleanup Overlay (Remove Play Button overlay if present intended for episode)
                            // Series cards usually just open details, manual play button logic might interfere
                            const overlay = card.querySelector('.hover-overlay, .cardOverlayFab');
                            if (overlay) overlay.style.display = 'none';
                        }
                    } catch (e) {
                        console.error('[LegitFlix] fixLatestEpisodes error:', e);
                    }
                }
            }
        }
    }
}


// Call setup
try {
    setupHoverCards();
    console.log('[LegitFlix] setupHoverCards: Call completed successfully');
} catch (err) {
    console.error('[LegitFlix] setupHoverCards FAILED:', err);
}

// Helper to tag sections where we want native hover
function tagNativeSections() {
    const sections = document.querySelectorAll('.verticalSection');
    sections.forEach(s => {
        const titleEl = s.querySelector('.sectionTitle');
        if (titleEl) {
            const t = titleEl.innerText.toLowerCase();
            if (t.includes('continue') || t.includes('resume') || t.includes('history') || t.includes('next up') || t.includes('categories')) {
                s.classList.add('native-hover-section');
            }
        }
    });
}

// Helper to detect Page Type (Details vs Home)
function checkPageMode() {
    const hash = window.location.hash.toLowerCase();
    // If on details page, enable native hover mode globally
    if (hash.includes('details')) {
        document.body.classList.add('native-hover-mode');
    } else {
        document.body.classList.remove('native-hover-mode');
    }
}

// --- AUGMENT LATEST SECTIONS (Append to Native) ---
let _viewsCache = null;

async function augmentLatestSections() {
    // Only run on Home/Index
    const hash = window.location.hash.toLowerCase();
    if (!hash.includes('home') && !hash.endsWith('/web/index.html') && hash !== '#!/' && hash !== '' && hash !== '#/') return;

    // 1. Fetch Views (Libraries) ONCE
    if (!_viewsCache) {
        try {
            const userId = window.ApiClient.getCurrentUserId();
            const viewsRes = await fetch(window.ApiClient.getUrl(`/Users/${userId}/Views`), {
                headers: { 'X-Emby-Token': window.ApiClient.accessToken() }
            });
            const viewsData = await viewsRes.json();
            _viewsCache = viewsData.Items || [];
        } catch (e) {
            console.error('[LegitFlix] Error fetching views:', e);
            return;
        }
    }

    // 2. Scan Sections
    const sections = document.querySelectorAll('.verticalSection');
    for (const section of sections) {

        // GUARDIAN CHECK: Verify if native code overwrote our changes
        const isAugmented = section.getAttribute('data-augmented-latest');
        if (isAugmented) {
            const cont = section.querySelector('.itemsContainer');
            // Dynamic threshold: If we expected 10 items, don't reset just because it's < 20
            const expected = parseInt(section.getAttribute('data-expected-count') || '20');
            const threshold = Math.min(20, expected);

            // If container exists but has fewer items than our threshold, it implies a Reset (or empty).
            if (cont && cont.children.length < threshold) {
                console.log(`[LegitFlix] Detected native overwrite in ${section.innerText.split('\n')[0]} (Count: ${cont.children.length} < ${threshold})`);
                section.removeAttribute('data-augmented-latest');
                // Fall through to re-process immediately
            } else {
                continue; // Still healthy, skip this section
            }
        }

        const titleEl = section.querySelector('.sectionTitle');
        if (!titleEl) continue;

        let titleText = titleEl.innerText.trim();
        let libName = null;

        // Parse Title (e.g. "Latest Anime", "Recently Added in TV")
        if (titleText.startsWith('Latest ')) {
            libName = titleText.substring(7);
        } else if (titleText.startsWith('Recently Added in ')) {
            libName = titleText.substring(18);
        }

        if (!libName) continue;

        // Find Matching Library
        let library = _viewsCache.find(l => l.Name.toLowerCase() === libName.toLowerCase());

        // ROBUSTNESS: If library not found, maybe cache is stale (new library added)?
        if (!library && !window._legitFlixViewsRefreshed) {
            console.log(`[LegitFlix] Library "${libName}" not found in cache. Refreshing views...`);
            try {
                const userId = window.ApiClient.getCurrentUserId();
                const viewsRes = await fetch(window.ApiClient.getUrl(`/Users/${userId}/Views`), {
                    headers: { 'X-Emby-Token': window.ApiClient.accessToken() }
                });
                const viewsData = await viewsRes.json();
                _viewsCache = viewsData.Items; // Update Global Cache
                window._legitFlixViewsRefreshed = true; // Only try once per reload to avoid loops

                // Retry finding library
                library = _viewsCache.find(l => l.Name.toLowerCase() === libName.toLowerCase());
            } catch (e) {
                console.error('[LegitFlix] Failed to refresh views:', e);
            }
        }

        if (!library) continue; // Still not found, skip

        section.setAttribute('data-augmented-latest', 'true');

        try {
            console.log(`[LegitFlix] Augmenting Latest Section [v3]: ${libName} (${library.Id})`);

            // 3. Fetch Custom Data (100 items, DateCreated Desc, No Filters)
            const userId = window.ApiClient.getCurrentUserId();
            if (!userId) {
                console.warn('[LegitFlix] augmentLatestSections: No API Client or User ID. Skipping.');
                continue;
            }
            // Build Query
            const query = new URLSearchParams({
                UserId: userId,
                ParentId: library.Id,
                Recursive: 'true',
                SortBy: 'DateCreated',
                SortOrder: 'Descending',
                Limit: '100', // REQUESTED: Even more items
                Fields: 'PrimaryImageAspectRatio,ProductionYear,Overview',
                EnableImageTypes: 'Primary,Backdrop,Thumb',
                ImageTypeLimit: '1',
                IncludeItemTypes: 'Movie,Series', // Hardcoded filter for Mixed Content
                Filters: 'IsFolder%3Dfalse' // Ensure no folders
            });

            // NO extra query.append needed now

            const itemsUrl = window.ApiClient.getUrl(`/Users/${userId}/Items?${query.toString()}`);


            const itemsRes = await fetch(itemsUrl, { headers: { 'X-Emby-Token': window.ApiClient.accessToken() } });
            const itemsData = await itemsRes.json();

            if (itemsData.Items && itemsData.Items.length > 0) {
                const nativeContainer = section.querySelector('.itemsContainer');

                // Retry finding container if missing (rendering race condition)
                if (!nativeContainer) {
                    section.removeAttribute('data-augmented-latest');
                    continue;
                }

                // Store expected count for Guardian check
                section.setAttribute('data-expected-count', itemsData.Items.length);

                // Ensure native container handles overflow
                nativeContainer.style.display = 'flex';
                nativeContainer.style.flexDirection = 'row';
                nativeContainer.style.overflowX = 'auto';
                nativeContainer.style.flexWrap = 'nowrap'; // Force horizontal



                // Get Template from existing card (native look)
                // Use first child even if hidden, or check children length
                const templateCard = nativeContainer.querySelector('.card');
                if (!templateCard) continue; // Can't clone if empty

                // CLEAR CONTAINER (To remove native filtered list and replace with our full list)
                nativeContainer.innerHTML = '';

                itemsData.Items.forEach(item => {
                    // Clone
                    const card = templateCard.cloneNode(true);
                    card.style.display = ''; // Ensure visible if template was hidden

                    // Update Data Attributes
                    card.setAttribute('data-id', item.Id);
                    card.setAttribute('data-type', item.Type);

                    // Update Image (DIRECT - NO LAZY LOADING for reliability)
                    const imgContainer = card.querySelector('.cardImageContainer');
                    if (imgContainer) {
                        const imgUrl = `/Items/${item.Id}/Images/Primary?maxHeight=400&maxWidth=300&quality=90`;

                        // REMOVE Lazy attributes to prevent native interference
                        imgContainer.removeAttribute('data-src');
                        imgContainer.classList.remove('lazy', 'lazy-hidden', 'blurhashed');

                        // FIX: Prevent collapse by sizing parent
                        const scalable = card.querySelector('.cardScalable');
                        if (scalable) {
                            scalable.style.cssText = 'aspect-ratio: 2/3 !important; display: flex !important; position: relative !important; width: 100% !important;';
                        }

                        // Force styles
                        imgContainer.setAttribute('style', `background-image: url('${imgUrl}'); background-size: cover; background-position: center; position: absolute !important; width: 100% !important; height: 100% !important; display: block !important;`);

                        // Clear any existing indicators (clone artifacts)
                        const existingIndicators = imgContainer.querySelectorAll('.playedIndicator, .countIndicator, .indicator, .legit-indicator');
                        existingIndicators.forEach(el => el.remove());

                        // INJECT CUSTOM INDICATORS
                        // 1. Favorite (Orange Bookmark - Top Right)
                        if (item.UserData && item.UserData.IsFavorite) {
                            const favInd = document.createElement('div');
                            favInd.className = 'legit-indicator fav';
                            favInd.innerHTML = '<span class="material-icons">bookmark</span>';
                            imgContainer.appendChild(favInd);
                        }

                        // 2. Played (Green Check - Top Left)
                        if (item.UserData && item.UserData.Played) {
                            const playedInd = document.createElement('div');
                            playedInd.className = 'legit-indicator played';
                            playedInd.innerHTML = '<span class="material-icons">check_circle</span>';
                            imgContainer.appendChild(playedInd);
                        }

                        // Remove blocking overlays
                        const padder = card.querySelector('.cardPadder');
                        if (padder) padder.style.display = 'none';
                        const icon = card.querySelector('.cardImageIcon');
                        if (icon) icon.style.display = 'none';
                        const canvas = card.querySelector('canvas'); // Blurhash
                        if (canvas) canvas.remove();

                        // Add Watched Indicator
                        const isPlayed = item.UserData && item.UserData.Played;
                        if (isPlayed) {
                            const ind = document.createElement('div');
                            ind.className = 'playedIndicator';
                            ind.style.cssText = "position: absolute; top: 0.5em; right: 0.5em; background: #00A4DC; color: white; border-radius: 50%; width: 1.5em; height: 1.5em; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 5px rgba(0,0,0,0.5);";
                            ind.innerHTML = '<i class="material-icons" style="font-size: 1em;">check</i>';
                            imgContainer.appendChild(ind);
                        }
                    }

                    // Update Text
                    const texts = card.querySelectorAll('.cardText');
                    // Usually first is Title, second is Year/Details
                    if (texts.length > 0) texts[0].innerText = item.Name;
                    if (texts.length > 1) texts[1].innerText = item.ProductionYear || '';

                    // Update Link
                    const link = card.querySelector('.cardContent') || card;
                    if (link.tagName === 'A') {
                        link.setAttribute('href', `#!/details?id=${item.Id}`);
                        link.onclick = (e) => {
                            e.preventDefault();
                            window.location.href = `#!/details?id=${item.Id}`;
                            return false;
                        };
                    } else {
                        // Sometimes link is nested
                        const nestedLink = card.querySelector('a');
                        if (nestedLink) {
                            nestedLink.setAttribute('href', `#!/details?id=${item.Id}`);
                            nestedLink.onclick = (e) => {
                                e.preventDefault();
                                window.location.href = `#!/details?id=${item.Id}`;
                                return false;
                            };
                        }
                    }

                    // Cleanup any "Episode" specific classes if template was wrong type (rare in Latest)
                    card.classList.remove('overflowBackdropCard');
                    card.classList.add('overflowPortraitCard');

                    // Append
                    nativeContainer.appendChild(card);
                });

                // ATTACH PROTECTION OBSERVER (AFTER SETUP): If native code clears this container, we re-run.
                // We do this LAST so we don't trigger ourselves when we cleared the container a moment ago.
                if (!nativeContainer.dataset.protected) {
                    nativeContainer.dataset.protected = 'true';
                    const fetchedCount = itemsData.Items.length;

                    const protector = new MutationObserver(() => {
                        // Dynamic Threshold from fetched count
                        const threshold = Math.min(20, fetchedCount);

                        // Only trigger if children count is distressingly low (indicating native reset)
                        // AND we are not currently empty (which might happen during a valid re-render)
                        if (nativeContainer.children.length > 0 && nativeContainer.children.length < threshold) {
                            console.log(`[LegitFlix] Container nuked by native code (Count: ${nativeContainer.children.length} < ${threshold}). Re-triggering augment.`);
                            section.removeAttribute('data-augmented-latest');
                            nativeContainer.dataset.protected = ''; // Clear flag
                            protector.disconnect();
                        }
                    });
                    protector.observe(nativeContainer, { childList: true });
                }

            } else {
                section.removeAttribute('data-augmented-latest'); // Retry/Revert
            }

        } catch (err) {
            console.error('[LegitFlix] Failed to augment section:', libName, err);
            section.removeAttribute('data-augmented-latest');
        }
    }
}

function createCustomCard(item) {
    const card = document.createElement('div');
    // Use standard classes for styling inheritance
    card.className = 'card scalableCard card-hoverable overflowPortraitCard';
    card.dataset.id = item.Id;
    card.dataset.type = item.Type;
    card.style.minWidth = '14vw'; // Ensure decent size
    card.style.maxWidth = '14vw';

    // Image, Link & Indicators
    const imgUrl = `/Items/${item.Id}/Images/Primary?maxHeight=400&maxWidth=300&quality=90`;
    const linkUrl = `#!/details?id=${item.Id}`;

    const isPlayed = item.UserData && item.UserData.Played;
    const playedHtml = isPlayed ?
        `<div class="playedIndicator" style="position: absolute; top: 0.5em; right: 0.5em; background: #00A4DC; color: white; border-radius: 50%; width: 1.5em; height: 1.5em; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 5px rgba(0,0,0,0.5);"><i class="material-icons" style="font-size: 1em;">check</i></div>`
        : '';

    const unplayedCount = item.UserData && item.UserData.UnplayedItemCount;
    const countHtml = (unplayedCount && !isPlayed) ?
        `<div class="countIndicator" style="position:absolute; top:0.5em; right:0.5em; background:#cc3333; color:white; border-radius:50%; width:1.5em; height:1.5em; display:flex; align-items:center; justify-content:center; font-size:0.8em; font-weight:bold;">${unplayedCount}</div>`
        : '';

    card.innerHTML = `
        <div class="cardBox visualCardBox">
            <div class="cardScalable">
                <div class="cardPadder cardPadder-overflowPortrait"></div>
                <a class="cardContent cardImageContainer" href="${linkUrl}" style="background-image: url('${imgUrl}'); background-size: cover; background-position: center;">
                    ${playedHtml}
                    ${countHtml}
                </a>
            </div>
            <div class="cardFooter">
                <div class="cardText centered cardText-first" style="text-align: left; padding-top: 5px;">${item.Name}</div>
                <div class="cardText centered cardText-secondary" style="text-align: left;">${item.ProductionYear || ''}</div>
            </div>
        </div>
    `;

    const a = card.querySelector('a');
    a.onclick = (e) => {
        e.preventDefault();
        window.location.href = linkUrl;
        return false;
    };

    return card;
}

const observer = new MutationObserver((mutations) => {
    checkPageMode(); // Check URL on every mutation (navigation often doesn't trigger reload)
    if (!document.querySelector('.legit-nav-links')) _injectedNav = false;

    // Call global helpers
    if (typeof renameMyList === 'function') renameMyList();
    if (typeof fixMixedCards === 'function') fixMixedCards();
    if (typeof fixLatestEpisodes === 'function') fixLatestEpisodes();
    if (typeof augmentLatestSections === 'function') augmentLatestSections(); // AUGMENT: Native Append Mode

    injectPromoBanner();
    tagNativeSections();
});
observer.observe(document.body, { childList: true, subtree: true });
// Dynamic Header Blur Logic
function initNavScroll() {
    console.log('[LegitFlix] initNavScroll: Starting...');
    let header = document.querySelector('.skinHeader');
    console.log('[LegitFlix] initNavScroll: Header found?', !!header);

    // If header not found yet, wait for it
    if (!header) {
        console.log('[LegitFlix] initNavScroll: Header not ready, will retry...');
        setTimeout(initNavScroll, 500); // Retry after 500ms
        return;
    }

    const onScroll = () => {
        // Try multiple scroll sources (Jellyfin uses different containers)
        let scrollTop = 0;

        // Check common scroll containers in Jellyfin
        const scrollContainer = document.querySelector('.mainAnimatedPages')
            || document.querySelector('.page.type-interior')
            || document.querySelector('[data-role="page"].active')
            || document.scrollingElement
            || document.body;

        if (scrollContainer) {
            scrollTop = scrollContainer.scrollTop;
        }

        // Also check window scroll as fallback
        if (scrollTop === 0) {
            scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        }

        const threshold = window.innerHeight * 0.1; // 10vh

        // DEBUG: Log every 10th scroll event to avoid spam
        if (Math.random() < 0.1) {
            console.log('[LegitFlix] Scroll: top=' + scrollTop + ', threshold=' + Math.round(threshold) + ', container=' + (scrollContainer?.className || 'window'));
        }

        if (scrollTop > threshold) {
            header.classList.add('legitflix-nav-scrolled');
        } else {
            header.classList.remove('legitflix-nav-scrolled');
        }
    };

    // Attach to window with capture to catch all scrolls
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });

    // Also attach to known scroll containers directly
    const containers = document.querySelectorAll('.mainAnimatedPages, .page, [data-role="page"]');
    console.log('[LegitFlix] initNavScroll: Attaching to', containers.length, 'containers');
    containers.forEach(c => c.addEventListener('scroll', onScroll, { passive: true }));

    // MutationObserver to attach to new pages
    const pageObserver = new MutationObserver(() => {
        document.querySelectorAll('.page:not([data-scroll-listener])').forEach(page => {
            page.setAttribute('data-scroll-listener', 'true');
            page.addEventListener('scroll', onScroll, { passive: true });
            console.log('[LegitFlix] Attached scroll listener to new page');
        });
    });
    pageObserver.observe(document.body, { childList: true, subtree: true });

    // Run once
    onScroll();
    console.log('[LegitFlix] initNavScroll: Complete');
}

// --- CUSTOM FOOTER ---
function injectCustomFooter() {
    if (document.querySelector('.legitflix-theme-footer')) return;

    const footer = document.createElement('div');
    footer.className = 'legitflix-theme-footer';
    // Add Logo + Text
    footer.innerHTML = `
            <div class="footer-content">
                <div class="footer-logo">
                    <span class="logo-text-legit">Legit</span><span class="logo-text-flix">Flix</span>
                </div>
                <div class="footer-divider"></div>
                <div class="footer-author">Created by <strong>Dani</strong></div>
            </div>
        `;
    document.body.appendChild(footer);

    // Scroll Monitor for Footer (Show only at bottom)
    const onScrollFooter = () => {
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;

        // Show if we are close to bottom (e.g. within 100px)
        if (scrollY + windowHeight >= docHeight - 100) {
            footer.classList.add('visible');
        } else {
            footer.classList.remove('visible');
        }
    };

    window.addEventListener('scroll', onScrollFooter, { passive: true });
}

// --- INFO MODAL (Netflix Style) ---
window.openInfoModal = async function (id) {
    console.log('[LegitFlix] Opening Info Modal for:', id);

    // Remove existing modal if any
    const existing = document.querySelector('.legitflix-info-modal');
    if (existing) existing.remove();

    const auth = await getAuth();
    if (!auth) return;

    const userId = ApiClient.getCurrentUserId();

    // Fetch Extended Details
    const details = await (await fetch(`/Users/${userId}/Items/${id}?Fields=RemoteTrailers,People,Studios,Genres,Overview,ProductionYear,OfficialRating,RunTimeTicks,Tags,ImageTags`, {
        headers: { 'X-Emby-Token': auth.AccessToken || auth }
    })).json();

    if (!details) return;

    // --- TRAILER LOGIC (Hybrid: Youtube Embed + Native Fallback) ---

    // 1. Helper: Extract YT ID
    const getYoutubeId = (url) => {
        if (!url) return null;
        if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        if (url.includes('embed/')) return url.split('embed/')[1].split('?')[0];
        return null;
    };

    let mainTrailerUrl = null;
    let mainVidId = null;
    let allTrailers = [];
    let backdropUrl = `/Items/${details.Id}/Images/Backdrop/0?quality=90&maxWidth=1920`;

    // 2. Collect Remote Trailers (Metadata Fallback)
    if (details.RemoteTrailers) {
        details.RemoteTrailers.forEach(t => {
            const vid = getYoutubeId(t.Url);
            if (vid) allTrailers.push({ title: 'Main Trailer', id: vid, type: 'Movie' });
        });
    }

    // 3. Collect Season Trailers (for Series)
    if (details.Type === 'Series') {
        try {
            const seasonRes = await fetch(`/Users/${userId}/Items?ParentId=${details.Id}&IncludeItemTypes=Season&Fields=RemoteTrailers`, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const seasons = await seasonRes.json();
            if (seasons.Items) {
                seasons.Items.forEach(s => {
                    if (s.RemoteTrailers) {
                        s.RemoteTrailers.forEach(t => {
                            const vid = getYoutubeId(t.Url);
                            if (vid) allTrailers.push({ title: s.Name, id: vid });
                        });
                    }
                });
            }
        } catch (e) { console.log('Season fetch failed', e); }
    }

    // 4. Select Main Video (Priority: Season 1 > First)
    if (allTrailers.length > 0) {
        mainVidId = allTrailers[0].id; // Default
        const s1 = allTrailers.find(t => t.title === 'Season 1');
        if (s1) mainVidId = s1.id;

        // Standard YouTube Embed (With Ads/Cookies/Strict Policy for max compatibility)
        // Added params to strip UI: autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${mainVidId}
        mainTrailerUrl = `https://www.youtube.com/embed/${mainVidId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${mainVidId}`;
    }

    // 5. Native Native Check (for Button)
    let hasNativeTrailers = (details.LocalTrailerCount && details.LocalTrailerCount > 0);
    let hasRemoteTrailers = (details.RemoteTrailers && details.RemoteTrailers.length > 0);

    // --- METADATA ---
    const year = details.ProductionYear || '';
    const rating = details.OfficialRating || '';
    const duration = details.RunTimeTicks ? Math.round(details.RunTimeTicks / 600000000) + 'm' : '';
    const genres = details.Genres ? details.Genres.join(', ') : '';
    const desc = details.Overview || 'No description available.';

    // People
    const people = details.People || [];
    const cast = people.slice(0, 10).map(p => p.Name).join(', '); // More cast for About
    const director = people.filter(p => p.Type === 'Director').map(p => p.Name).join(', ');
    const writers = people.filter(p => p.Type === 'Writer').map(p => p.Name).join(', ');
    const tags = details.Tags ? details.Tags.join(', ') : '';

    // Logo
    const hasLogo = details.ImageTags && details.ImageTags.Logo;
    const logoHtml = hasLogo
        ? `<img src="/Items/${details.Id}/Images/Logo?maxHeight=140&maxWidth=400&quality=90" class="info-logo" alt="${details.Name}" />`
        : `<h1 class="info-title-text">${details.Name}</h1>`;

    // --- TRAILERS SECTION HTML ---
    // --- SWITCH TRAILER HELPER ---
    window.legitFlixSwitchTrailer = function (vidId) {
        const iframe = document.getElementById('mainInfoIframe');
        const container = document.querySelector('.info-video-container');
        const fallback = document.querySelector('.info-backdrop-fallback');

        if (iframe) {
            // Standard YouTube Embed (With Ads/Cookies/Strict Policy)
            // Updated with stripped UI params
            iframe.src = `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${vidId}`;
            container.classList.remove('no-video');
            container.classList.add('has-video');
        }
    };

    // --- TRAILERS GRID HTML ---
    let trailersHtml = '';
    if (allTrailers.length > 0) {
        // Generate Grid
        const cards = allTrailers.map(t => {
            const img = `https://img.youtube.com/vi/${t.id}/mqdefault.jpg`;
            // Switch Video as requested
            return `
                    <div class="trailer-card" onclick="window.legitFlixSwitchTrailer('${t.id}')">
                        <div class="trailer-thumb">
                            <img src="${img}" alt="${t.title}" loading="lazy">
                            <div class="play-overlay"><span class="material-icons">play_circle_outline</span></div>
                        </div>
                        <div class="trailer-title">${t.title}</div>
                    </div>
                `;
        }).join('');

        trailersHtml = `
                <div class="info-trailers-section">
                    <h3>Trailers & More</h3>
                    <div class="trailers-grid">
                        ${cards}
                    </div>
                </div>
            `;
    }

    // --- MODAL HTML ---
    const modal = document.createElement('div');
    modal.className = 'legitflix-info-modal';
    modal.innerHTML = `
            <div class="info-modal-backdrop"></div>
            <div class="info-modal-content">
                <button class="btn-close-modal"><span class="material-icons">close</span></button>
                
                <div class="info-video-container ${mainTrailerUrl ? 'has-video' : 'no-video'}">
                    <div class="iframe-wrapper">
                         ${mainTrailerUrl
            ? `<iframe id="mainInfoIframe" class="info-video-iframe" src="${mainTrailerUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
            : `<div class="info-backdrop-fallback" style="background-image: url('${backdropUrl}')"></div>`
        }
                    </div>
                    
                    ${mainTrailerUrl ? `
                    <div class="video-mute-overlay">
                        <button class="btn-mute-toggle"><span class="material-icons">volume_off</span></button>
                    </div>` : ''}
                    
                    <div class="video-overlay-gradient"></div>

                    <div class="info-hero-content">
                        ${logoHtml}
                        
                        <div class="info-actions">
                            <button class="btn-play-hero" onclick="window.legitFlixPlay('${details.Id}', event)">
                                <span class="material-icons">play_arrow</span> Play
                            </button>
                            
                            ${hasNativeTrailers ? `
                            <button is="emby-button" 
                                    type="button" 
                                    class="button-flat btnPlayTrailer detailButton emby-button btn-native-trailer" 
                                    title="Play Trailer"
                                    onclick="window.legitFlixPlayTrailer('${details.Id}', event)"
                                    data-item-id="${details.Id}">
                                <div class="detailButton-content">
                                    <span class="material-icons detailButton-icon theaters" aria-hidden="true"></span>
                                    <span>Trailer</span>
                                </div>
                            </button>` : ''}

                             <button class="btn-my-list ${details.UserData?.IsFavorite ? 'active' : ''}" 
                                     id="btnInfoFav"
                                     onclick="window.legitFlixToggleFav('${details.Id}', this)">
                                <span class="material-icons">${details.UserData?.IsFavorite ? 'check' : 'add'}</span> My List
                            </button>
                        </div>
                    </div>
                </div>

                <div class="info-details-container">
                    <div class="info-col-left" style="flex: 1;">
                        <div class="info-meta-row">
                            <span class="info-year">${year}</span>
                            ${rating ? `<span class="info-rating">${rating}</span>` : ''}
                            <span class="info-duration">${duration}</span>
                            <span class="info-quality">HD</span>
                        </div>
                        <p class="info-desc">${desc}</p>
                    </div>
                    
                    <!-- Moved detailed metadata to bottom section as requested -->
                </div>
                
                ${trailersHtml}

                <!-- NEW: About Section (Bottom) -->
                <div class="info-about-section">
                    <h3>About ${details.Name}</h3>
                    
                    ${director ? `<div class="about-row"><span class="label">Director:</span> <span class="value">${director}</span></div>` : ''}
                    ${cast ? `<div class="about-row"><span class="label">Cast:</span> <span class="value">${cast}</span></div>` : ''}
                    ${writers ? `<div class="about-row"><span class="label">Writers:</span> <span class="value">${writers}</span></div>` : ''}
                    ${genres ? `<div class="about-row"><span class="label">Genres:</span> <span class="value">${genres}</span></div>` : ''}
                    ${tags ? `<div class="about-row"><span class="label">This title is:</span> <span class="value">${tags}</span></div>` : ''}
                    
                    <div class="about-row maturity-row">
                        <span class="label">Maturity Rating:</span>
                        <div class="maturity-box">
                             <span class="rating-badge">${rating || 'NR'}</span>
                             <span class="rating-text">Recommended for ages ${rating ? rating.replace(/\D/g, '') + '+' : 'all'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
    document.body.classList.add('legitflix-no-scroll'); // LOCK SCROLL

    // Add Visible Class for Animation
    requestAnimationFrame(() => modal.classList.add('visible'));

    // --- EVENTS ---

    // Helper to switch video
    // Helper to switch video (ALREADY DEFINED ABOVE - Removing Duplicate)
    // window.legitFlixSwitchTrailer = ... (Removed to fix ReferenceError)

    // CLOSE
    const close = () => {
        modal.classList.remove('visible');
        document.body.classList.remove('legitflix-no-scroll'); // UNLOCK SCROLL
        setTimeout(() => modal.remove(), 300);
    };
    modal.querySelector('.info-modal-backdrop').onclick = close;
    modal.querySelector('.btn-close-modal').onclick = close;

    // Mute Logic
    if (mainTrailerUrl) {
        const btnMute = modal.querySelector('.btn-mute-toggle');
        if (btnMute) {
            let isMuted = true;
            const iframe = modal.querySelector('iframe');
            // Enable JS API if not already
            if (!iframe.src.includes('enablejsapi')) iframe.src += "&enablejsapi=1";

            btnMute.onclick = () => {
                isMuted = !isMuted;
                btnMute.querySelector('span').textContent = isMuted ? 'volume_off' : 'volume_up';
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: isMuted ? 'mute' : 'unMute', args: [] }), '*');
            };
        }
    }

    // Fav Button

    // --- IDLE ANIMATION LOGIC  ---
    const heroContent = modal.querySelector('.info-hero-content');
    const videoContainer = modal.querySelector('.info-video-container');
    let idleTimer;

    const startIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (heroContent) heroContent.classList.add('idle');
        }, 5000); // 5 seconds as requested
    };

    const resetIdle = () => {
        if (heroContent) heroContent.classList.remove('idle');
        startIdleTimer();
    };

    if (videoContainer) {
        videoContainer.addEventListener('mousemove', resetIdle);
        videoContainer.addEventListener('click', resetIdle); // Reset on click too
        startIdleTimer(); // Start initially
    }
}


// (Moved init calls to end of file)





// --- INITIALIZATION ---
try {
    injectCustomFooter();
    initNavScroll();
} catch (e) {
    console.error('LegitFlix Init Error:', e);
}

// --- LOAD SERIES DETAIL REVAMP MODULE ---
// This dynamically loads the series-detail-revamp.js module
// --- REALTIME INDICATOR UPDATER ---
window.legitFlixUpdateIndicators = function (id, type, isActive) {
    console.log(`[LegitFlix] Realtime Update: ${id} - ${type} = ${isActive}`);
    // Find all cards for this item
    const cards = document.querySelectorAll(`.card[data-id="${id}"]`);
    cards.forEach(card => {
        // 1. Update Image Container Indicators
        const imgContainer = card.querySelector('.cardImageContainer');
        if (imgContainer) {
            // Remove existing specific indicator
            const selector = type === 'fav' ? '.legit-indicator.fav' : '.legit-indicator.played';
            const existing = imgContainer.querySelector(selector);
            if (existing) existing.remove();

            // Add if active
            if (isActive) {
                const ind = document.createElement('div');
                if (type === 'fav') {
                    ind.className = 'legit-indicator fav';
                    ind.innerHTML = '<span class="material-icons">bookmark</span>';
                } else {
                    ind.className = 'legit-indicator played';
                    ind.innerHTML = '<span class="material-icons">check_circle</span>';
                }
                imgContainer.appendChild(ind);
            }
        }
    });
};

(function loadSeriesDetailModule() {
    // Check if already loaded
    if (window.LFSeriesDetail) {
        console.log('[LegitFlix] Series Detail module already loaded.');
        return;
    }

    // Get the base path from the current script
    const scripts = document.querySelectorAll('script[src*="legitflix"]');
    let basePath = '';
    scripts.forEach(script => {
        const src = script.src;
        if (src.includes('legitflix-theme.js')) {
            basePath = src.replace('legitflix-theme.js', '');
        }
    });

    // Fallback paths to try
    const pathsToTry = [
        basePath + 'series-detail-revamp.js',
        '/web/Legitflix/series-detail-revamp.js',
        '/Legitflix/series-detail-revamp.js',
        './series-detail-revamp.js'
    ];

    function tryLoadScript(paths, index) {
        if (index >= paths.length) {
            console.warn('[LegitFlix] Could not load series-detail-revamp.js from any path.');
            return;
        }

        const script = document.createElement('script');
        script.src = paths[index];
        script.onload = () => {
            console.log('[LegitFlix] Series Detail module loaded from:', paths[index]);
        };
        script.onerror = () => {
            console.log('[LegitFlix] Failed to load from:', paths[index], '- trying next...');
            tryLoadScript(paths, index + 1);
        };
        document.head.appendChild(script);
    }

    tryLoadScript(pathsToTry, 0);

    // --- LOAD MOVIE DETAIL MODULE ---
    const moviePaths = [
        basePath + 'movie-detail-revamp.js',
        '/web/Legitflix/movie-detail-revamp.js',
        '/Legitflix/movie-detail-revamp.js',
        './movie-detail-revamp.js'
    ];
    tryLoadScript(moviePaths, 0); // Reusing the same helper is fine if scoped properly, else need new closures or logic. 
    // Wait, tryLoadScript is defined inside the IIFE above. To reuse it, I should duplicate the loader block OR make it shared.
    // The previous IIFE closed at line 3951. 'tryLoadScript' is not valid here if I append outside.
    // Ah, I should look at where I am inserting.
    // The previous loader was inside `(function() { ... })()`.
    // I should probably insert this *inside* that IIFE or creating a new one.
    // Creating a new IIFE is safer.
})();

(function () {
    // Duplicate Loader for Movie Module (Separate Scope to avoid conflicts)
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    let basePath = '';
    if (currentScript.src) {
        basePath = currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);
    }

    function load(paths, index) {
        if (index >= paths.length) return;
        const script = document.createElement('script');
        script.src = paths[index];
        script.onload = () => console.log('[LegitFlix] Movie Module Loaded');
        script.onerror = () => load(paths, index + 1);
        document.head.appendChild(script);
    }

    load([
        basePath + 'movie-detail-revamp.js',
        '/web/Legitflix/movie-detail-revamp.js',
        'movies-detail-revamp.js'
    ], 0);

})();

// --- SECTION TAGGER ---
function tagNativeHoverSections() {
    // Broader list of targets (case-insensitive checking below)
    const targets = ['continue watching', 'next up', 'history', 'latest', 'recently played', 'up next'];

    document.querySelectorAll('.verticalSection').forEach(section => {
        if (section.classList.contains('native-hover-section')) return;

        let matched = false;

        // Check ID
        const testId = (section.getAttribute('data-test-id') || '').toLowerCase();
        if (testId.includes('continue-watching') || testId.includes('next-up') || testId.includes('history')) {
            matched = true;
        }

        // Check Header Title
        if (!matched) {
            const titleEl = section.querySelector('.sectionTitle');
            if (titleEl) {
                const title = titleEl.textContent.toLowerCase();
                if (targets.some(t => title.includes(t))) {
                    matched = true;
                }
            }
        }

        if (matched) {
            section.classList.add('native-hover-section');
        }
    });
}

// --- CONTINUOUS MONITORING ---
// Jellyfin is a SPA; we must check URL changes periodically to inject Heroes
function monitorPageLoop() {
    pollForUI();      // Restore Nav, Prefs, Jellyseerr
    injectMediaBar(); // Handles Home and Detail page logic
    tagNativeHoverSections(); // Restore "Remove" buttons for specific sections

    // Series Detail monitoring now handled by the loaded module (LFSeriesDetail.startMonitoring)
    // The module auto-starts when it detects ApiClient

    setTimeout(monitorPageLoop, 800);
}

// Start the loop
monitorPageLoop();

// --- PLAYBACK HELPER (Direct Play via Jellyfin Internals) ---
// --- PLAYBACK HELPER (Navigation Fallback Strategy) ---
window.legitFlixPlay = function (itemId, event) {
    if (event) {
        // Prevent container clicks
        event.preventDefault();
        event.stopPropagation();
    }
    console.log('[LegitFlix] legitFlixPlay: Requesting playback for', itemId);

    // 1. Try Global Manager (if exposed)
    const deepLinkPlay = () => {
        // Fallback: Navigate to Details with Auto-Play param
        console.log('[LegitFlix] legitFlixPlay: Manager not found. Using Navigation Fallback.');
        const currentHash = window.location.hash;
        if (currentHash.includes(itemId) && currentHash.includes('startPlaying=true')) {
            window.location.reload();
        } else {
            // Use /#!/details format which is standard for Jellyfin Web
            window.location.hash = `#!/details?id=${itemId}&startPlaying=true`;
        }
    };

    if (window.playbackManager) {
        window.playbackManager.play({ ids: [itemId] });
    } else if (window.Jellyfin && window.Jellyfin.playbackManager) {
        window.Jellyfin.playbackManager.play({ ids: [itemId] });
    } else {
        // 2. Try Require (Last ditch)
        if (typeof require !== 'undefined') {
            require(['playbackManager'], function (playbackManager) {
                if (playbackManager) {
                    playbackManager.play({ ids: [itemId] });
                } else {
                    deepLinkPlay();
                }
            }, function (err) {
                deepLinkPlay();
            });
        } else {
            deepLinkPlay();
        }
    }
};

window.legitFlixPlayTrailer = function (itemId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    window.location.hash = `#!/details?id=${itemId}`;
};

// --- AUTO-PLAY CHECKER ---
function checkAutoPlay() {
    if (window.location.hash.includes('&startPlaying=true')) {
        // Find Native Play/Resume Button
        // Try multiple selectors
        const btn = document.querySelector('.btnPlay') ||
            document.querySelector('.btnResume') ||
            document.querySelector('[data-type="Episode"] .itemAction[data-action="play"]') ||
            document.querySelector('[is="emby-playbutton"]');

        if (btn) {
            console.log('[LegitFlix] Auto-Play: Button found! Clicking...');
            btn.click();

            // Cleanup URL
            const cleanUrl = window.location.hash.replace('&startPlaying=true', '');
            history.replaceState(null, '', cleanUrl);
        }
    }
}
setInterval(checkAutoPlay, 800); // Check periodically


// --- EPISODE CLICK INTERCEPTION (Direct Play for Episode Rows) ---
// Hijack clicks on episode list items to skip the detail screen and play immediately
// --- CLICK INTERCEPTION (Episode Rows & Main Play Buttons) ---
document.addEventListener('click', function (e) {
    // A. Episode Rows (List Items)
    const episodeItem = e.target.closest('.listItem[data-type="Episode"], .card[data-type="Episode"]');

    if (episodeItem) {
        const id = episodeItem.getAttribute('data-id');
        if (!id) return;

        // Ignore interactive children, Selection Mode, or Menu Buttons
        if (e.target.closest('.customCheckbox') ||
            e.target.closest('.itemAction') ||
            e.target.closest('.cardOverlayButton') ||
            e.target.closest('.listViewDragHandle') ||
            e.target.closest('.btn-more') ||
            e.target.closest('[data-action="menu"]') || // Ignore standard Menu triggers
            e.target.closest('.listItemButton') || // Ignore List Item Menu buttons
            e.target.closest('.with-selection') ||
            document.querySelector('.selectionCommandsPanel:not(.hide)')
        ) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        console.log('[LegitFlix] Episode Click Intercepted: Playing', id);
        window.legitFlixPlay(id);
        return;
    }

    // B. Main "Play" / "Resume" Buttons (Detail Pages)
    // Target standard Jellyfin play buttons if they aren't working naturally
    const playBtn = e.target.closest('.btnPlay, .btnResume, .btn-play-hero');
    if (playBtn) {
        // Check if it has an Item ID context (usually data-id or data-itemid)
        let id = playBtn.getAttribute('data-id') || playBtn.getAttribute('data-itemid');

        // If no ID on button, try to find it in the parent container (Detail Page context)
        if (!id) {
            const container = playBtn.closest('[data-id], [data-itemid]');
            if (container) id = container.getAttribute('data-id') || container.getAttribute('data-itemid');
        }

        if (id) {
            console.log('[LegitFlix] Play Button Intercepted: Playing', id);
            e.preventDefault();
            e.stopPropagation();
            window.legitFlixPlay(id);
        }
    }
}, true); // Capture phase

/* =========================================================================
   IMPORTED MODULE: MOVIE DETAIL REVAMP
   ========================================================================= */

/**
 * LegitFlix Movie Detail Page Revamp
 * Implements a "Direct Player" layout with Series-style Trailer/Hero features.
 */

(function () {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    const CONFIG = {
        debug: true,
        cssId: 'lf-movie-revamp-styles',
        containerId: 'lf-movie-detail-container'
    };

    const log = (...args) => CONFIG.debug && console.log('[LF-Movie]', ...args);

    // =========================================================================
    // CSS STYLES (Merged Movie + Series Features)
    // =========================================================================
    const MOVIE_DETAIL_CSS = `
        /* ============================================
           LEGITFLIX SHARED STYLES
           ============================================ */
        :root {
            --clr-accent: #ff6a00;
            --clr-accent-hover: #FF8C00;
            --clr-bg-main: #141414;
            --clr-bg-surface: #1f1f1f;
            --clr-bg-glass: rgba(255, 255, 255, 0.1);
            --clr-bg-glass-hover: rgba(255, 255, 255, 0.2);
            --clr-text-main: #ffffff;
            --clr-text-muted: #bcbcbc;
            --clr-divider: rgba(255, 255, 255, 0.1);
            --clr-heart: #e91e63;
            --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            --font-display: 'Outfit', sans-serif;
            --radius-sm: 4px;
            --radius-md: 8px;
            --radius-lg: 12px;
            --content-padding: 3%;
        }

        .lf-movie-container {
            width: 100%;
            overflow-x: hidden;
            position: relative;
            background-color: var(--clr-bg-main);
            color: var(--clr-text-main);
            font-family: var(--font-primary);
        }

        .lf-movie-container * { box-sizing: border-box; }

        /* HERO SECTION */
        .lf-series-hero {
            position: relative;
            width: 100%;
            height: 70vh;
            min-height: 500px;
            display: flex;
            align-items: flex-end;
            padding: 40px var(--content-padding);
            overflow: hidden;
        }

        .lf-series-hero__backdrop {
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center top;
            z-index: 0;
        }

        .lf-series-hero__backdrop::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(to top,
                    var(--clr-bg-main) 0%,
                    rgba(20, 20, 20, 0.85) 25%,
                    rgba(20, 20, 20, 0.4) 60%,
                    transparent 100%);
            z-index: 1;
        }

        .lf-series-hero__trailer {
            position: absolute;
            inset: 0;
            z-index: 1;
            opacity: 0;
            transition: opacity 0.5s ease;
            pointer-events: none;
        }

        .lf-series-hero__trailer.is-playing {
            opacity: 1;
            pointer-events: auto;
        }

        .lf-series-hero__trailer iframe {
            width: 100%;
            height: 100%;
            border: none;
        }

        .lf-series-hero.is-clean-view .lf-series-hero__content {
            opacity: 0;
            pointer-events: none;
            transform: translateY(20px);
        }

        .lf-series-hero__content {
            position: relative;
            z-index: 2;
            display: flex;
            gap: 40px;
            width: 100%;
            align-items: flex-end;
        }

        .lf-series-hero__poster {
            flex-shrink: 0;
            width: 220px;
            aspect-ratio: 2 / 3;
            object-fit: cover;
            border-radius: var(--radius-lg);
            border: 2px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .lf-series-hero__info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }

        .lf-series-hero__logo {
            position: absolute;
            bottom: 40px;
            left: var(--content-padding);
            width: 200px;
            max-width: 30%;
            height: auto;
            object-fit: contain;
            z-index: 5;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.5s ease;
        }

        .lf-series-hero.is-clean-view .lf-series-hero__logo {
            opacity: 1;
        }

        .lf-series-hero.is-clean-view .lf-series-hero__content {
            opacity: 0;
            pointer-events: none;
            transform: translateY(20px);
        }

        .lf-series-hero__content {
            position: relative;
            z-index: 2;
            display: flex;
            gap: 40px;
            width: 100%;
            align-items: flex-end;
            transition: all 0.5s ease;
        }



        .lf-series-hero__meta {
            display: flex;
            align-items: center;
            gap: 16px;
            color: var(--clr-text-muted);
            font-size: 0.95rem;
            flex-wrap: wrap;
        }

        .lf-series-hero__meta span.separator {
            margin: 0 4px;
            color: var(--clr-divider);
        }

        .lf-meta-badge {
            background: rgba(255,255,255,0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.85rem;
        }

        .lf-series-hero__rating {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #ffc107;
        }

        /* ACTIONS & BUTTONS */
        .lf-series-hero__actions {
            display: flex;
            gap: 12px;
            margin-top: 16px;
        }

        .lf-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: var(--radius-md);
            font-family: var(--font-primary);
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            text-decoration: none;
        }

        .lf-btn--primary {
            background: var(--clr-accent);
            color: white;
        }
        .lf-btn--primary:hover { background: var(--clr-accent-hover); }

        .lf-btn--glass {
            background: var(--clr-bg-glass);
            color: white;
            backdrop-filter: blur(10px);
        }
        .lf-btn--glass:hover { background: var(--clr-bg-glass-hover); }

        .lf-btn--icon-only { padding: 10px; } 

        /* Heart Active State */
        .lf-btn--heart {
            transition: background 0.2s ease, border-color 0.2s ease;
            border: 1px solid transparent;
        }
        .lf-btn--heart:hover { background: var(--clr-bg-glass-hover); }
        .lf-btn--heart.is-liked {
            background: rgba(233, 30, 99, 0.2);
            border-color: var(--clr-heart);
        }
        .lf-btn--heart.is-liked .material-icons { color: var(--clr-heart); }

        /* Mute Button */
        .lf-mute-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .lf-mute-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: white; }
        .lf-mute-btn.is-muted { opacity: 0.7; }

        /* LAYOUT & SIDEBAR */
        .lf-series-hero__details {
            display: flex;
            gap: 3rem;
            align-items: flex-start;
            margin-top: 10px;
        }

        .lf-series-hero__description {
            flex: 0 0 60%;
            color: var(--clr-text-muted);
            line-height: 1.6;
            font-size: 0.9rem;
        }

        .lf-series-hero__description-text {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            transition: all 0.3s ease;
            margin: 0;
        }
        .lf-series-hero__description-text.expanded {
            -webkit-line-clamp: unset;
            display: block;
        }

        .lf-series-hero__load-more {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-top: 8px;
            padding: 0;
            background: transparent;
            border: none;
            color: var(--clr-accent);
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            transition: color 0.2s ease;
        }
        .lf-series-hero__load-more:hover { color: var(--clr-accent-hover); }
        .lf-series-hero__load-more .material-icons { transition: transform 0.2s ease; font-size: 18px; }
        .lf-series-hero__load-more.expanded .material-icons { transform: rotate(180deg); }

        .lf-series-hero__cast-info {
            flex: 1;
            font-size: 0.85rem;
            color: var(--clr-text-muted);
            line-height: 1.8;
            padding-top: 5px;
        }
        .lf-series-hero__cast-info strong { color: var(--clr-text-main); }


        /* CONTENT SECTIONS */
        .lf-content-section {
            width: 100%;
            padding: 30px var(--content-padding);
        }

        /* DIVIDER STYLE */
        .lf-section-divider {
            border: none;
            border-top: 1px solid var(--clr-divider);
            margin: 0 var(--content-padding);
            display: block;
            width: auto;
        }

        .lf-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }

        .lf-section-title {
            font-family: var(--font-display);
            font-size: 1.3rem; 
            font-weight: 600;
            color: var(--clr-text-main);
            margin: 0;
        }

        .lf-filter-controls { display: flex; gap: 10px; align-items: center; }

        /* DROPDOWNS */
        .lf-filter-btn {
            position: relative;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            color: var(--clr-text-muted);
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .lf-filter-btn:hover { background: var(--clr-bg-glass); color: var(--clr-text-main); }
        .lf-filter-btn .material-icons { font-size: 18px; }
        
        /* WATCHED BUTTON SPECIFIC */
        .lf-filter-btn.is-selected {
            background: rgba(255, 255, 255, 0.1);
            color: var(--clr-accent);
            border-color: rgba(255, 106, 0, 0.3);
        }
        .lf-filter-btn.is-selected .material-icons {
            color: var(--clr-accent);
        }

        .lf-filter-dropdown { position: relative; display: inline-block; }

        .lf-filter-dropdown__menu {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            min-width: 220px;
            background: var(--clr-bg-surface);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
            pointer-events: none;
        }
        .lf-filter-dropdown:hover .lf-filter-dropdown__menu, 
        .lf-filter-dropdown.is-open .lf-filter-dropdown__menu {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
            pointer-events: auto;
        }

        .lf-lang-menu { padding: 10px 0; }
        .lf-lang-section { padding-bottom: 5px; }
        .lf-dropdown-section-title {
            padding: 5px 15px;
            font-size: 0.75rem;
            text-transform: uppercase;
            color: var(--clr-text-muted);
            font-weight: 600;
        }
        .lf-lang-separator {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 5px 0;
        }

        .lf-filter-dropdown__option {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            color: var(--clr-text-muted);
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.15s ease;
        }
        .lf-filter-dropdown__option:hover { background: var(--clr-bg-glass); color: var(--clr-text-main); }
        .lf-filter-dropdown__option.is-selected {
            color: var(--clr-accent);
            background: rgba(255, 106, 0, 0.1);
        }

        .lf-lang-footer {
            padding: 8px 10px 0 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 5px;
        }
        .lf-edit-subs-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--clr-text-main);
            padding: 8px 12px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
            text-decoration: none;
        }
        .lf-edit-subs-btn:hover { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.3); }
        .lf-edit-subs-btn .material-icons { font-size: 18px; }

        /* PLAYER WRAPPER (90vh) */
        .lf-player-wrapper {
            width: 100%;
            height: 90vh;
            background: black;
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            position: relative;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .lf-player-overlay {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.8) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
        }
        .lf-big-play-btn {
            width: 90px;
            height: 90px;
            background: var(--clr-accent);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 30px rgba(255, 107, 0, 0.4);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .lf-player-overlay:hover .lf-big-play-btn {
            transform: scale(1.1);
            box-shadow: 0 0 50px rgba(255, 107, 0, 0.6);
        }
        .lf-big-play-btn .material-icons { font-size: 48px; color: white; }
        .lf-player-iframe { width: 100%; height: 100%; border: none; }

        /* GRIDS */
        .lf-cast-grid,
        .lf-similar-grid {
            display: flex;
            flex-wrap: nowrap;
            gap: 16px;
            overflow-x: auto;
            padding-bottom: 20px;
        }
        .lf-cast-grid::-webkit-scrollbar,
        .lf-similar-grid::-webkit-scrollbar { height: 8px; }
        .lf-cast-grid::-webkit-scrollbar-thumb,
        .lf-similar-grid::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }

        .lf-cast-card { width: 120px; flex-shrink: 0; text-align: center; cursor: pointer; }
        .lf-cast-image {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 8px;
            transition: border-color 0.2s;
            aspect-ratio: 1/1;
        }
        .lf-cast-card:hover .lf-cast-image { border-color: rgba(255, 255, 255, 0.4); }
        .lf-cast-name { font-weight: 600; font-size: 0.9rem; color: #fff; }
        .lf-cast-role { font-size: 0.8rem; color: #aaa; }

        .lf-similar-card { width: 180px; flex-shrink: 0; cursor: pointer; transition: transform 0.2s; }
        .lf-similar-card:hover { transform: translateY(-4px); }
        .lf-similar-poster {
            width: 100%;
            aspect-ratio: 2/3;
            border-radius: 8px;
            margin-bottom: 8px;
        }
        .lf-similar-title { font-size: 0.9rem; text-align: center; color: #fff; }

        /* RESPONSIVE */
        @media (max-width: 900px) {
            .lf-series-hero__details { flex-direction: column; gap: 20px; }
            .lf-series-hero__description { flex: auto; max-width: 100%; }
        }
        @media (max-width: 768px) {
            .lf-series-hero { height: auto; min-height: 60vh; padding: 20px; }
            .lf-series-hero__content { flex-direction: column; align-items: center; text-align: center; }
            .lf-series-hero__poster { width: 140px; margin-bottom: 20px; }
            .lf-series-hero__info { padding-top: 0; }
            .lf-series-hero__meta { justify-content: center; }
            .lf-series-hero__actions { justify-content: center; }
            .lf-player-wrapper { height: 40vh; }
        }
    `;

    // =========================================================================
    // CSS INJECTION
    // =========================================================================
    function injectStyles() {
        if (document.getElementById(CONFIG.cssId)) return;
        const style = document.createElement('style');
        style.id = CONFIG.cssId;
        style.textContent = MOVIE_DETAIL_CSS;
        document.head.appendChild(style);
        log('CSS injected');
    }

    // =========================================================================
    // UI GENERATORS
    // =========================================================================

    function createHeroSection(item) {
        // Safe accessors
        const backdropUrl = `/Items/${item.Id}/Images/Backdrop/0?maxHeight=1080&quality=80`;
        const posterUrl = `/Items/${item.Id}/Images/Primary?maxHeight=400&maxWidth=300&quality=90`;
        const title = item.Name || 'Unknown Movie';
        const year = item.ProductionYear || '';
        const rating = item.OfficialRating || '';
        const communityRating = item.CommunityRating ? item.CommunityRating.toFixed(1) : '';

        // Time logic
        let durationStr = '';
        let endsAtStr = '';
        if (item.RunTimeTicks) {
            const totalMins = Math.round(item.RunTimeTicks / 600000000);
            const hrs = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

            const endDate = new Date(Date.now() + (item.RunTimeTicks / 10000));
            endsAtStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        // Sub/Dub
        let audioLangs = new Set();
        let subLangs = new Set();
        if (item.MediaStreams) {
            item.MediaStreams.forEach(stream => {
                if (stream.Type === 'Audio' && stream.Language) audioLangs.add(stream.Language);
                if (stream.Type === 'Subtitle' && stream.Language) subLangs.add(stream.Language);
            });
        }
        const hasSub = subLangs.size > 0;
        const hasDub = audioLangs.size > 1;
        const subDubText = (hasSub && hasDub) ? 'Sub | Dub' : (hasSub ? 'Sub' : (hasDub ? 'Dub' : ''));

        // Description & Metadata
        const description = item.Overview || '';
        const genres = (item.Genres || []).slice(0, 3).join(', ');
        const studios = (item.Studios || []).slice(0, 2).map(s => s.Name || s).join(', ');
        const cast = (item.People || []).filter(p => p.Type === 'Actor').slice(0, 3).map(p => p.Name).join(', ');

        // Logo
        let logoUrl = '';
        if (item.ImageTags && item.ImageTags.Logo) {
            logoUrl = `/Items/${item.Id}/Images/Logo?maxHeight=200&maxWidth=500&quality=90`;
        }
        const titleHtml = logoUrl
            ? `<img src="${logoUrl}" alt="${title}" class="lf-series-hero__logo-title">`
            : `<h1 class="lf-series-hero__title">${title}</h1>`;

        // Icons
        const isFav = item.UserData && item.UserData.IsFavorite;
        const favIcon = isFav ? 'favorite' : 'favorite_border';
        const favClass = isFav ? 'is-liked' : '';

        // Play Button State (Resume vs Play)
        let playButtonText = 'Play';
        let playButtonIcon = 'play_arrow';
        if (item.UserData && item.UserData.PlaybackPositionTicks > 0) {
            const pct = Math.round((item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100);
            if (pct < 95) {
                playButtonText = `Continue from ${pct}%`;
            } else {
                playButtonIcon = 'replay';
                playButtonText = 'Watch Again';
            }
        }

        return `
            <section class="lf-series-hero" id="lfSeriesHero">
                <div class="lf-series-hero__backdrop" id="lfHeroBackdrop" style="background-image: url('${backdropUrl}');"></div>
                
                <!-- TRAILER CONTAINER -->
                <div class="lf-series-hero__trailer" id="lfHeroTrailer">
                    <iframe id="lfTrailerIframe" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                </div>

                ${logoUrl ? `<img src="${logoUrl}" alt="${title}" class="lf-series-hero__logo">` : ''}

                <div class="lf-series-hero__content">
                    <img class="lf-series-hero__poster" src="${posterUrl}" alt="${title}">
                    
                    <div class="lf-series-hero__info">
                        ${titleHtml}
                        
                        <div class="lf-series-hero__meta">
                            ${year ? `<span>${year}</span><span class="separator">•</span>` : ''}
                            ${rating ? `<span>${rating}</span><span class="separator">•</span>` : ''}
                            <div class="lf-series-hero__rating">
                                <span class="material-icons">star</span>
                                <span>${communityRating}</span>
                            </div>
                            ${durationStr ? `<span class="separator">•</span><span>${durationStr}</span>` : ''}
                            ${endsAtStr ? `<span class="lf-meta-badge">Ends at ${endsAtStr}</span>` : ''}
                            ${subDubText ? `<span class="separator">•</span><span class="lf-meta-badge">${subDubText}</span>` : ''}
                        </div>

                        <div class="lf-series-hero__actions">
                            <button class="lf-btn lf-btn--primary" id="lfPlayBtn">
                                <span class="material-icons">${playButtonIcon}</span>
                                ${playButtonText}
                            </button>
                            
                            <!-- SWAPPED: Trailer Middle, Heart Last -->
                            <button class="lf-btn lf-btn--glass" id="lfTrailerBtn">
                                <span class="material-icons">theaters</span>
                                Watch Trailer
                            </button>

                            <button class="lf-btn lf-btn--glass lf-btn--icon-only lf-btn--heart ${favClass}" id="lfHeartBtn" title="Toggle Favorites">
                                <span class="material-icons">${favIcon}</span>
                            </button>

                            <button class="lf-mute-btn" id="lfMuteBtn" title="Toggle Mute" style="display: none;">
                                <span class="material-icons">volume_off</span>
                            </button>
                        </div>

                        <div class="lf-series-hero__details">
                            <div class="lf-series-hero__description">
                                <p class="lf-series-hero__description-text" id="lfDescriptionText">${description}</p>
                                <button class="lf-series-hero__load-more" id="lfLoadMoreBtn" style="display:none">
                                    <span>Read more</span>
                                    <span class="material-icons">expand_more</span>
                                </button>
                            </div>
                            <div class="lf-series-hero__cast-info">
                                ${cast ? `<div><strong>Starring:</strong> ${cast}</div>` : ''}
                                ${genres ? `<div><strong>Genres:</strong> ${genres}</div>` : ''}
                                ${studios ? `<div><strong>Studio:</strong> ${studios}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function createPlayerSection(item) {
        // Watched State for Header
        const isPlayed = item.UserData && item.UserData.Played;
        const playedIcon = isPlayed ? 'check_circle' : 'check_circle_outline';
        const playedClass = isPlayed ? 'is-selected' : '';

        // Simple mock of Audio/Subs for now, or we could parse media streams
        // Using static list logic as placeholder for prototype, same as Series module
        const audioOptions = `
            <div class="lf-filter-dropdown__option is-selected"><span class="material-icons">check</span> English</div>
        `;
        const subOptions = `
             <div class="lf-filter-dropdown__option is-selected"><span class="material-icons">check</span> English</div>
        `;

        return `
            <hr class="lf-section-divider">
            <section class="lf-content-section" id="lfDirectPlayer">
                 <div class="lf-section-header">
                    <h2 class="lf-section-title">${item.Name}</h2>
                    
                    <div class="lf-filter-controls">
                        <!-- AUDIO / SUBS -->
                        <div class="lf-filter-dropdown" id="lfLangDropdown">
                            <button class="lf-filter-btn" id="lfLangBtn" title="Audio & Subtitles">
                                <span class="material-icons">subtitles</span>
                                <span>Audio & Subs</span>
                                <span class="material-icons">expand_more</span>
                            </button>
                            <div class="lf-filter-dropdown__menu lf-lang-menu">
                                <div class="lf-lang-section">
                                    <div class="lf-dropdown-section-title">Audio</div>
                                    ${audioOptions}
                                </div>
                                <div class="lf-lang-separator"></div>
                                <div class="lf-lang-section">
                                    <div class="lf-dropdown-section-title">Subtitles</div>
                                    ${subOptions}
                                </div>
                                <div class="lf-lang-footer">
                                    <button class="lf-edit-subs-btn" id="lfEditSubsBtn">
                                        <span class="material-icons">edit</span>
                                        <span>Edit Subtitles</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- WATCHED TOGGLE -->
                        <button class="lf-filter-btn ${playedClass}" id="lfWatchedBtn" title="Mark as Watched">
                            <span class="material-icons">${playedIcon}</span>
                            <span>Mark Watched</span>
                        </button>
                    </div>
                </div>
                
                <div class="lf-player-wrapper">
                    <div class="lf-player-overlay" onclick="window.legitFlixPlay('${item.Id}')">
                         <div class="lf-big-play-btn">
                             <span class="material-icons">play_arrow</span>
                         </div>
                    </div>
                    <div style="width:100%; height:100%; background: url('/Items/${item.Id}/Images/Backdrop/0') center/cover; opacity: 0.3;"></div>
                </div>
            </section>
        `;
    }

    function createCastSection(people) {
        const actors = people.filter(p => p.Type === 'Actor');
        if (actors.length === 0) return '';
        const cards = actors.map(person => `
            <div class="lf-cast-card" onclick="window.legitFlixShowItem('${person.Id}')">
                <img class="lf-cast-image" src="${person.PrimaryImageTag ? `/Items/${person.Id}/Images/Primary?maxHeight=200&maxWidth=200` : '/web/assets/img/default-avatar.png'}" alt="${person.Name}">
                <div class="lf-cast-name">${person.Name}</div>
                <div class="lf-cast-role">${person.Role || 'Actor'}</div>
            </div>
        `).join('');

        return `
            <hr class="lf-section-divider">
            <section class="lf-content-section">
                <div class="lf-section-header">
                    <h2 class="lf-section-title">Cast & Crew</h2>
                </div>
                <div class="lf-cast-grid">${cards}</div>
            </section>
        `;
    }

    function createSimilarSection(items) {
        if (!items || items.length === 0) return '';
        const cards = items.slice(0, 10).map(item => `
            <div class="lf-similar-card" onclick="window.legitFlixShowItem('${item.Id}')">
                <img class="lf-similar-poster" src="/Items/${item.Id}/Images/Primary?maxHeight=300&maxWidth=200" alt="${item.Name}">
                <div class="lf-similar-title">${item.Name}</div>
            </div>
        `).join('');

        return `
             <hr class="lf-section-divider">
            <section class="lf-content-section">
                <div class="lf-section-header">
                     <h2 class="lf-section-title">More Like This</h2>
                </div>
                <div class="lf-similar-grid">${cards}</div>
            </section>
        `;
    }

    // =========================================================================
    // EVENTS & LOGIC
    // =========================================================================

    function wireUpEvents(container, item) {
        // --- Play Button ---
        const playBtn = container.querySelector('#lfPlayBtn');
        playBtn?.addEventListener('click', () => window.legitFlixPlay(item.Id));

        // --- Heart Button ---
        const heartBtn = container.querySelector('#lfHeartBtn');
        heartBtn?.addEventListener('click', () => {
            // Optimistic UI
            const isLiked = heartBtn.classList.toggle('is-liked');
            const icon = heartBtn.querySelector('.material-icons');
            if (icon) icon.textContent = isLiked ? 'favorite' : 'favorite_border';
            window.legitFlixToggleFav(item.Id, heartBtn); // Async call in background
        });

        // --- Watched Button ---
        const watchedBtn = container.querySelector('#lfWatchedBtn');
        watchedBtn?.addEventListener('click', () => {
            // Optimistic UI
            const isSelected = watchedBtn.classList.toggle('is-selected');
            const icon = watchedBtn.querySelector('.material-icons');
            if (icon) icon.textContent = isSelected ? 'check_circle' : 'check_circle_outline';
            window.legitFlixTogglePlayed(item.Id, watchedBtn);
        });

        // --- Dropdown Logic ---
        const langBtn = container.querySelector('#lfLangBtn');
        const langDropdown = container.querySelector('#lfLangDropdown');
        langBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('is-open');
        });
        document.addEventListener('click', (e) => {
            if (!langDropdown?.contains(e.target)) langDropdown?.classList.remove('is-open');
        });

        // --- Edit Subtitles ---
        const editSubsBtn = container.querySelector('#lfEditSubsBtn');
        editSubsBtn?.addEventListener('click', () => {
            console.log('[LF] Edit Subtitles clicked for', item.Id);
            // In future: Open SubtitleManager.show(item.Id)
            alert('Edit Subtitles feature coming soon!');
        });

        // --- Read More Logic ---
        const descText = container.querySelector('#lfDescriptionText');
        const loadMoreBtn = container.querySelector('#lfLoadMoreBtn');
        if (descText && loadMoreBtn) {
            // Check overflow with tolerance
            if (descText.scrollHeight > descText.clientHeight + 2) {
                loadMoreBtn.style.display = 'inline-flex';
            }
            loadMoreBtn.addEventListener('click', function () {
                const isExpanded = descText.classList.toggle('expanded');
                this.classList.toggle('expanded', isExpanded);
                this.querySelector('span:first-child').textContent = isExpanded ? 'Show Less' : 'Read More';
            });
        }

        // --- TRAILER LOGIC ---
        const trailerBtn = container.querySelector('#lfTrailerBtn');
        const trailerContainer = container.querySelector('#lfHeroTrailer');
        const trailerIframe = container.querySelector('#lfTrailerIframe');
        const heroSection = container.querySelector('#lfSeriesHero');
        const backdrop = container.querySelector('#lfHeroBackdrop');
        const muteBtn = container.querySelector('#lfMuteBtn');

        const trailerYtId = (item.RemoteTrailers && item.RemoteTrailers.length > 0)
            ? getYoutubeId(item.RemoteTrailers[0].Url)
            : null;

        if (trailerBtn && trailerYtId) {
            let hideUITimeout;
            let blockedTimeout;
            let messageHandler;

            const startHideTimer = () => {
                clearTimeout(hideUITimeout);
                hideUITimeout = setTimeout(() => {
                    if (trailerContainer.classList.contains('is-playing')) {
                        heroSection?.classList.add('is-clean-view');
                    }
                }, 5000);
            };

            const resetHideTimer = () => {
                heroSection?.classList.remove('is-clean-view');
                if (trailerContainer.classList.contains('is-playing')) startHideTimer();
            };

            heroSection?.addEventListener('mousemove', resetHideTimer);
            heroSection?.addEventListener('click', resetHideTimer);

            trailerBtn.addEventListener('click', () => {
                const isPlaying = trailerContainer.classList.contains('is-playing');
                if (isPlaying) {
                    // STOP
                    trailerIframe.src = '';
                    trailerContainer.classList.remove('is-playing');
                    heroSection.classList.remove('is-clean-view');
                    clearTimeout(hideUITimeout);
                    clearTimeout(blockedTimeout);
                    if (messageHandler) window.removeEventListener('message', messageHandler);
                    document.getElementById('lfTrailerHelpBtn')?.remove();
                    if (backdrop) backdrop.style.opacity = '1';

                    trailerBtn.innerHTML = '<span class="material-icons">theaters</span> Watch Trailer';
                    muteBtn.style.display = 'none';
                    muteBtn.classList.remove('is-muted');
                } else {
                    // PLAY
                    log('Playing trailer:', trailerYtId);
                    const origin = window.location.origin;
                    const embedUrl = `https://www.youtube.com/embed/${trailerYtId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${trailerYtId}&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;

                    trailerIframe.src = embedUrl;
                    trailerContainer.classList.add('is-playing');
                    heroSection.classList.add('is-clean-view');
                    if (backdrop) backdrop.style.opacity = '0';

                    startHideTimer();

                    trailerBtn.innerHTML = '<span class="material-icons">stop_circle</span> Stop Trailer';

                    muteBtn.style.display = 'flex';
                    muteBtn.innerHTML = '<span class="material-icons">volume_off</span>';
                    muteBtn.classList.add('is-muted');

                    // Blocking Detection
                    let receivedMessage = false;
                    messageHandler = (e) => {
                        if (typeof e.data === 'string' && (e.data.includes('"event"') || e.data.includes('"id"'))) {
                            receivedMessage = true;
                            clearTimeout(blockedTimeout);
                        }
                    };
                    window.addEventListener('message', messageHandler);

                    blockedTimeout = setTimeout(() => {
                        if (!receivedMessage && trailerContainer.classList.contains('is-playing')) {
                            showTrailerHelpBtn(trailerContainer);
                        }
                    }, 4000);
                }
            });

            // Mute Logic
            muteBtn.addEventListener('click', () => {
                const isMuted = muteBtn.classList.contains('is-muted');
                const func = isMuted ? 'unMute' : 'mute'; // YouTube API commands
                trailerIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');

                if (isMuted) {
                    muteBtn.classList.remove('is-muted');
                    muteBtn.innerHTML = '<span class="material-icons">volume_up</span>';
                } else {
                    muteBtn.classList.add('is-muted');
                    muteBtn.innerHTML = '<span class="material-icons">volume_off</span>';
                }
            });

        } else if (trailerBtn) {
            trailerBtn.style.opacity = '0.5';
            trailerBtn.style.pointerEvents = 'none';
            trailerBtn.innerHTML = 'No Trailer';
        }
    }

    function showTrailerHelpBtn(container) {
        if (document.getElementById('lfTrailerHelpBtn')) return;
        const btn = document.createElement('button');
        btn.id = 'lfTrailerHelpBtn';
        btn.innerHTML = '<span class="material-icons">help_outline</span> <span>Trouble playing?</span>';
        btn.className = 'lf-btn lf-btn--glass';
        Object.assign(btn.style, {
            position: 'absolute', bottom: '20px', right: '20px', zIndex: '100',
            padding: '8px 16px', fontSize: '0.85rem', opacity: '0', transition: 'opacity 0.3s ease'
        });
        container.appendChild(btn);
        requestAnimationFrame(() => btn.style.opacity = '1');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            alert('Your browser may be blocking the trailer. Try disabling ad blockers for this site.');
            // Or inject proper modal like Series page if wanted, using alert for simple JS proto now.
        });
    }

    function getYoutubeId(url) {
        if (!url) return null;
        if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        return null;
    }

    // =========================================================================
    // MAIN LOGIC
    // =========================================================================

    async function injectMoviePage(itemId) {
        if (document.getElementById(CONFIG.containerId)) return;

        const userId = window.ApiClient.getCurrentUserId();
        const item = await window.ApiClient.getItem(userId, itemId);

        if (!item || item.Type !== 'Movie') return;

        log('Injecting Movie Page for:', item.Name);
        injectStyles();

        const detailPage = document.querySelector('.itemDetailPage');
        if (detailPage) {
            detailPage.classList.add('hide');
            detailPage.style.display = 'none';
        }

        const container = document.createElement('div');
        container.id = CONFIG.containerId;
        container.className = 'lf-movie-container';
        container.dataset.itemId = itemId; // Fix: Set itemId to prevent re-injection loop

        let html = createHeroSection(item);
        html += createPlayerSection(item);

        if (item.People && item.People.length > 0) {
            html += createCastSection(item.People);
        }

        try {
            const similarRes = await window.ApiClient.getSimilarItems(itemId, { Limit: 12, UserId: userId });
            if (similarRes && similarRes.Items) {
                html += createSimilarSection(similarRes.Items);
            }
        } catch (e) { log('Error fetching similar:', e); }

        container.innerHTML = html;
        document.querySelector('.pageContainer').appendChild(container);

        // WIRE UP
        wireUpEvents(container, item);
        isInjecting = false; // Reset lock
    }

    let isInjecting = false; // Lock flag

    function checkUrl() {
        const hash = window.location.hash;
        if (hash.includes('details?id=')) {
            const id = new URLSearchParams(hash.split('?')[1]).get('id');
            if (id) {
                const currentContainer = document.getElementById(CONFIG.containerId);
                // If ID changed or not injected
                if (!currentContainer || currentContainer.dataset.itemId !== id) {
                    if (isInjecting) return; // Prevent double injection

                    if (currentContainer) currentContainer.remove();

                    isInjecting = true;
                    injectMoviePage(id).catch(err => {
                        console.error('[LF] Injection failed', err);
                        isInjecting = false;
                    });
                }
            }
        } else {
            const container = document.getElementById(CONFIG.containerId);
            if (container) {
                container.remove();
                const detailPage = document.querySelector('.itemDetailPage');
                if (detailPage) detailPage.style.display = '';
            }
        }
    }

    window.LFMovieDetail = {
        init: () => {
            log('Module Loaded');
            setInterval(checkUrl, 500);
        }
    };

    window.LFMovieDetail.init();

})();
