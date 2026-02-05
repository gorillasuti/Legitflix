/* LegitFlix Theme JS v4.0 (Debug & Dynamic Nav)
   - Core: Added console.log debugs to all functions.
   - Nav: Fetches real User Views (Libraries) from API instead of hardcoded links.
   - Fix: Carousel "rapid switch" fixed (Single interval enforcement + Debounce).
   - Fix: Header alignment and loading logic.
*/

// =========================================================================
// 0. IMMEDIATE LOADING SKELETON (Prevents FOUC)
// =========================================================================
(function () {
    console.log('[LF] Injecting Skeleton Loader...');
    const LOADER_CSS = `
        #lf-loader-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #141414;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: opacity 0.5s ease;
            pointer-events: all;
        }
        .lf-loader-logo {
            width: 120px;
            height: auto;
            animation: lf-pulse 2s infinite ease-in-out;
            margin-bottom: 20px;
        }
        /* Material Spinner */
        .lf-spinner {
            width: 40px;
            height: 40px;
            margin: 0 auto;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #E50914;
            border-radius: 50%;
            animation: lf-spin 1s linear infinite;
        }
         @keyframes lf-pulse {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes lf-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    // Inject Styles
    const style = document.createElement('style');
    style.id = 'lf-loader-style';
    style.textContent = LOADER_CSS;
    document.head.appendChild(style);

    // Inject DOM
    const div = document.createElement('div');
    div.id = 'lf-loader-overlay';
    div.innerHTML = `
        <img class="lf-loader-logo" src="https://i.imgur.com/9tbXBxu.png" alt="LegitFlix">
        <div class="lf-spinner"></div>
    `;
    // Prepend to body to ensure it is first
    const body = document.body;
    if (body) {
        body.insertBefore(div, body.firstChild);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.insertBefore(div, document.body.firstChild);
        });
    }

    // Global Removal Function
    window.LF_RemoveLoader = function () {
        const loader = document.getElementById('lf-loader-overlay');
        if (loader && loader.style.opacity !== '0') {
            console.log('[LF] Removing Skeleton Loader...');
            loader.style.opacity = '0';
            loader.style.pointerEvents = 'none'; // Clickthrough immediately
            setTimeout(() => loader.remove(), 500);
        }
    };

    // Safety Timeout (8s max) - increased for slow networks
    setTimeout(() => {
        if (window.LF_RemoveLoader) window.LF_RemoveLoader();
    }, 8000);
})();

console.log('%c LegitFlix: Theme v4.0 Loaded ', 'background: #00AA00; color: white; padding: 2px 5px; border-radius: 3px;');

// --- FORCE SLEEK SCROLLBAR (JS Injection) ---
// User requested "Use JS freely" to fix stubborn scrollbars.
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

    // User Request: "Latest 6 items after promo (3)" -> Fetch 20, Slice in JS (Safer)
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
                    const nextUpUrl = `/Shows/${item.Id}/NextUp?Limit=1&UserId=${auth.UserId}&Fields=UserData`;
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
        // User requested strict text "Sub | Dub" if applicable.
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
        const playOnClick = `window.legitFlixPlay('${actionId}')`;
        const infoOnClick = `window.openInfoModal('${item.Id}')`; // Always open Modal for Series/Movie parent

        // Logo vs Text Logic
        const hasLogo = item.ImageTags && item.ImageTags.Logo;
        const titleHtml = hasLogo
            ? `<img src="/Items/${item.Id}/Images/Logo?maxHeight=200&maxWidth=450&quality=90" class="hero-logo" alt="${title}" />`
            : `<h1 class="hero-title">${title}</h1>`;

        return `
            <div class="hero-slide ${activeClass}" data-index="${index}">
                <div class="hero-backdrop" style="background-image: url('${backdropUrl}')"></div>
                <div class="hero-overlay"></div>
                <div class="hero-content">
                    ${titleHtml}
                    
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
    const logoUrl = 'https://belginux.com/content/images/size/w1200/2024/03/jellyseerr-1.webp';
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
                        // User requested #/list format
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
                // User Request: Advanced - Admin tabs - Sign out
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

// --- LEGACY INIT REMOVED ---
// The hashchange cleanup logic is removed as the new monitor loop handles state.


// --- RENAME SECTIONS (My List->Categories, Next Up->History, Recently Added->Latest) ---
function renameMyList() {
    document.querySelectorAll('.sectionTitle, .sectionTitle-cards').forEach(el => {
        let text = el.innerText.trim();
        const lowerText = text.toLowerCase();
        let newText = null;

        // 1. My List / My Media -> Categories
        if (lowerText === 'my list' || lowerText === 'my media' || lowerText === 'mes médias') {
            newText = 'Categories';
        }
        // 2. Next Up -> History
        else if (lowerText === 'next up' || lowerText === 'continuar viendo') {
            newText = 'History';
        }
        // 3. Recently Added in [Type] -> Latest [Type]
        else if (lowerText.startsWith('recently added in ')) {
            // "Recently Added in " is 18 chars
            const type = text.substring(18);
            newText = `Latest ${type}`;
        }

        if (newText) {
            el.innerText = newText;
            // Also update the link if it exists for tooltip/accessibility
            const parent = el.closest('.sectionHeader, .sectionTitleContainer');
            if (parent) {
                const link = parent.querySelector('a');
                if (link) link.setAttribute('title', newText);
            }
        }
    });
}
// Run initially and on mutation
renameMyList();

// --- FIX MIXED CONTENT CARDS (Convert Thumb->Primary & Backdrop->Portrait) ---
function fixMixedCards() {
    // Find Backdrops that should be Posters (Movies/Series/Libraries)
    const selector = '.overflowBackdropCard[data-type="Movie"], .overflowBackdropCard[data-type="Series"], .overflowBackdropCard[data-type="CollectionFolder"], .overflowBackdropCard[data-type="UserView"]';
    const cards = document.querySelectorAll(selector);

    cards.forEach(card => {
        // 1. Swap Card Class (Backdrop -> Portrait)
        // This fixes dimensions and grid layout
        card.classList.remove('overflowBackdropCard');
        card.classList.add('overflowPortraitCard');

        // 2. Swap Padder Class
        const padder = card.querySelector('.cardPadder-overflowBackdrop');
        if (padder) {
            padder.classList.remove('cardPadder-overflowBackdrop');
            padder.classList.add('cardPadder-overflowPortrait');
        }

        // 3. Swap Image URL (Thumb -> Primary)
        // This gets the correct Poster image from server
        const imgContainer = card.querySelector('.cardImageContainer');
        if (imgContainer) {
            const style = imgContainer.getAttribute('style') || '';
            // Improved Lazy-Loader Fighting Logic
            const swapImage = () => {
                const s = imgContainer.getAttribute('style') || '';
                if (s.includes('Images/Thumb')) {
                    // Replace Thumb with Primary
                    const ns = s.replace(/Images\/Thumb/g, 'Images/Primary');
                    if (s !== ns) imgContainer.setAttribute('style', ns);
                }
            };

            // Run immediately
            swapImage();

            // Observe for lazy loader changes
            if (!imgContainer._observerAttached) {
                new MutationObserver(swapImage).observe(imgContainer, { attributes: true, attributeFilter: ['style'] });
                imgContainer._observerAttached = true;
            }
        }
    });
}

// Run initially and on mutation
renameMyList();
fixMixedCards();
// --- INJECT DYNAMIC PROMO BANNER (Crunchyroll Style) ---
let _promoInjectionInProgress = false; // Guard for race conditions
let _injectedBanner = false; // Track if banner already injected

async function injectPromoBanner() {
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

        // A. Get Resume/History Items to Exclude
        // Resume
        const resumeRes = await fetch(`/Users/${auth.UserId}/Items?Limit=20&Recursive=true&Filters=IsResumable&SortBy=DatePlayed&SortOrder=Descending`, { headers });
        const resumeJson = await resumeRes.json();

        // Next Up
        const nextUpRes = await fetch(`/Shows/NextUp?Limit=20&UserId=${auth.UserId}`, { headers });
        const nextUpJson = await nextUpRes.json();

        // B. Get Candidates (Latest Movies/Series)
        // Limit to 3 strictly. Sort by DateCreated Descending.
        const candidatesRes = await fetch(`/Users/${auth.UserId}/Items?Limit=3&Recursive=true&IncludeItemTypes=Movie,Series&SortBy=DateCreated&SortOrder=Descending&ImageTypeLimit=1&EnableImageTypes=Primary,Backdrop,Thumb,Logo&Fields=Overview,ProductionYear,ImageTags`, { headers });
        const candidatesJson = await candidatesRes.json();

        // C. Select Top 3 (or less)
        const selected = candidatesJson.Items || [];

        if (selected.length === 0) {
            _promoInjectionInProgress = false;
            return;
        }

        // 4. Build HTML
        const item1 = selected[0]; // Hero
        const item2 = selected[1]; // Sub 1 (Optional)
        const item3 = selected[2]; // Sub 2 (Optional)

        console.log('[LegitFlix] Promo Banner Items:', item1.Name, item2?.Name, item3?.Name);

        // Helpers for images
        const getBackdrop = (item) => `/Items/${item.Id}/Images/Backdrop/0?maxWidth=2000`;
        // Revert to Thumb for sub-items
        const getThumb = (item) => `/Items/${item.Id}/Images/Thumb/0?maxWidth=800` || `/Items/${item.Id}/Images/Backdrop/0?maxWidth=800`;
        const getLogo = (item) => `/Items/${item.Id}/Images/Logo/0?maxWidth=400`;

        const getLink = (item) => `#/details?id=${item.Id}&serverId=${auth.ServerId}`;

        const html = `
            <div class="legitflix-promo-container">
                <!-- Top Banner (Item 1) -->
                <div class="promo-item promo-item-large" onclick="location.href='${getLink(item1)}'" style="cursor: pointer;">
                    <img src="${getBackdrop(item1)}" class="promo-bg">
                    <div class="promo-content">
                         ${item1.ImageTags && item1.ImageTags.Logo ? `<img src="${getLogo(item1)}" class="promo-logo" style="display:block;">` : `<h2 class="promo-title">${item1.Name}</h2>`}
                         <button class="btn-watch">WATCH NOW</button>
                    </div>
                </div>
                
                <!-- Bottom Grid (Items 2 & 3) -->
                ${(item2 || item3) ? `
                <div class="promo-grid-row">
                    ${item2 ? `
                    <div class="promo-item promo-item-small" onclick="location.href='${getLink(item2)}'" style="cursor: pointer;">
                         <div class="promo-split">
                             <div class="promo-text">
                                 <h3>${item2.Name}</h3>
                                 <p>${item2.ProductionYear || ''}</p>
                                 <p class="desc">${item2.Overview || ''}</p>
                                 <button class="btn-orange">START WATCHING</button>
                             </div>
                             <img src="${getThumb(item2)}" class="promo-poster" onerror="this.src='${getBackdrop(item2)}'">
                         </div>
                    </div>` : ''}
                    ${item3 ? `
                    <div class="promo-item promo-item-small" onclick="location.href='${getLink(item3)}'" style="cursor: pointer;">
                         <div class="promo-split">
                             <div class="promo-text">
                                 <h3>${item3.Name}</h3>
                                 <p>${item3.ProductionYear || ''}</p>
                                 <p class="desc">${item3.Overview || ''}</p>
                                 <button class="btn-orange">START WATCHING</button>
                             </div>
                             <img src="${getThumb(item3)}" class="promo-poster" onerror="this.src='${getBackdrop(item3)}'">
                         </div>
                    </div>` : ''}
                </div>` : ''}
            </div>
            `;

        // 5. Inject
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
        // This is tricky with body append. we need a check.
        // Simplified: If we hover mainly on the overlay, we keep it.
        // If we leave overlay and card, we close.
        const toElement = e.relatedTarget;
        if (_activeOverlay && !toElement?.closest('.legitflix-hover-overlay') && !toElement?.closest('.card')) {
            closeHoverCard();
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

        } else if (type === 'played') {
            isPlayed = newState; // Update closure var
            if (details.UserData) details.UserData.Played = isPlayed; // Update Cache

            btn.classList.toggle('active', isPlayed);
            iconSpan.textContent = isPlayed ? 'check_circle' : 'check';
            btn.title = isPlayed ? 'Mark Unplayed' : 'Mark Played';

            const method = isPlayed ? 'POST' : 'DELETE';
            fetch(`${server}/Users/${userId}/PlayedItems/${id}?api_key=${token}`, { method });
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

const observer = new MutationObserver((mutations) => {
    checkPageMode(); // Check URL on every mutation (navigation often doesn't trigger reload)
    if (!document.querySelector('.legit-nav-links')) _injectedNav = false;
    renameMyList();
    fixMixedCards();
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
                    <img src="https://i.imgur.com/9tbXBxu.png" alt="LegitFlix" style="height: 16px; width: auto; vertical-align: middle;">
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

        // Check if Home or Login page
        const isHome = window.location.hash.includes('home');
        const isLogin = window.location.hash.includes('login') || document.querySelector('[data-role="page"]#loginPage');

        // Show if we are close to bottom (e.g. within 100px) AND on valid page
        if ((isHome || isLogin) && scrollY + windowHeight >= docHeight - 100) {
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
                            <button class="btn-play-hero" onclick="window.legitFlixPlay('${details.Id}')">
                                <span class="material-icons">play_arrow</span> Play
                            </button>
                            
                            ${hasNativeTrailers ? `
                            <button is="emby-button" 
                                    type="button" 
                                    class="button-flat btnPlayTrailer detailButton emby-button btn-native-trailer" 
                                    title="Play Trailer"
                                    onclick="window.legitFlixPlayTrailer('${details.Id}')"
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
    // ...

    // --- IDLE ANIMATION LOGIC (User Request) ---
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


// --- CONTINUOUS MONITORING ---
// Jellyfin is a SPA; we must check URL changes periodically to inject Heroes
function monitorPageLoop() {
    pollForUI();      // Restore Nav, Prefs, Jellyseerr
    injectMediaBar(); // Handles Home and Detail page logic
    setTimeout(monitorPageLoop, 800);
}

// Start the loop
monitorPageLoop();/**
 * LegitFlix Series Detail Page Revamp
 * Crunchyroll-inspired series page injection module
 * 
 * This module can be loaded directly in the browser for prototyping,
 * or integrated into legitflix-theme.js for production use.
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
    // LOGIN & PROFILE SEQUENCE REVAMP (Full Replacement)
    // =========================================================================

    // 1. styles from prototype
    const LOGIN_REVAMP_CSS = `
        /* FONT IMPORT - OUTFIT */
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        /* Background Video */
        #bgVideo {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 0;
        }

        #bgOverlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 1;
        }

        /* Container Reset */
        /* OVERLAY CONTAINER */
        #lf-login-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 99999;
            background: #141414; /* Fallback */
            display: grid;
            place-items: center;
            box-sizing: border-box;
            padding: 20px;
            overflow: hidden !important; 
        }

        /* Hide Default Header/Footer/Backgrounds on Login - Global override handled by overlay z-index */
        body.lf-login-active .skinHeader, 
        body.lf-login-active .skinFooter, 
        body.lf-login-active .backgroundContainer,
        body.lf-login-active .view {
            display: none !important;
        }

        /* BRANDING */
        .lf-login-brand {
            position: absolute;
            top: 40px;
            left: 40px;
            z-index: 10;
        }
        .lf-login-brand img {
            height: 28px;
            width: auto;
            vertical-align: middle;
        }

        /* GLASSMORPHISM CARD */
        .visualLoginForm {
            position: relative; 
            z-index: 10;
            margin: auto; 
            
            background: rgba(20, 20, 20, 0.65);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6);
            padding: 40px;
            width: 100%;
            max-width: 440px;
            display: flex;
            flex-direction: column;
            align-items: center;
            animation: fadeIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* TYPOGRAPHY */
        .visualLoginForm h1 {
            font-family: 'Outfit', sans-serif !important;
            font-weight: 300 !important;
            color: #ffffff !important;
            font-size: 1.75rem !important;
            margin: 0 0 2rem 0;
            text-align: center;
            letter-spacing: -0.5px;
        }

        /* PROFILES */
        .itemSelectionPanel {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 20px;
            width: 100%;
        }

        .lf-profile-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            width: 100px;
            transition: transform 0.2s ease;
        }
        .lf-profile-card:hover {
            transform: scale(1.05);
        }

        .lf-profile-img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            overflow: hidden;
            margin-bottom: 12px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            transition: border-color 0.2s ease, transform 0.2s ease;
            background: rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.2);
            /* Handle image containment */
            background-size: cover;
            background-position: center;
        }
        
        .lf-profile-card:hover .lf-profile-img {
            border-color: #ff6a00;
            transform: scale(1.05);
        }

        .lf-profile-text {
            font-family: 'Outfit', sans-serif !important;
            font-size: 0.95rem !important;
            font-weight: 300 !important;
            color: #ffffff !important;
            transition: color 0.2s ease;
        }

        /* PASSWORD ENTRY */
        .selectedUserHeader {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 24px;
        }
        .selectedUserImage {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background-color: #333;
            margin-bottom: 12px;
            border: 2px solid #ff6a00;
            background-size: cover;
            background-position: center;
        }
        .selectedUserName {
            font-family: 'Outfit', sans-serif !important;
            font-size: 1.1rem;
            font-weight: 600;
            color: white;
        }

        .inputContainer {
            width: 100%;
            margin-bottom: 20px;
            position: relative;
        }

        .inputLabel {
            font-family: 'Outfit', sans-serif !important;
            font-size: 0.85rem !important;
            color: #e0e0e0 !important;
            margin-bottom: 8px !important;
            display: block !important;
            font-weight: 300 !important;
        }

        .emby-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #fff;
            font-family: 'Outfit', sans-serif !important;
            padding: 14px 16px;
            font-size: 1rem;
            transition: all 0.2s ease;
            box-sizing: border-box;
            outline: none;
        }
        .emby-input:focus {
            background: rgba(255, 255, 255, 0.1);
            border-color: #ff6a00;
            box-shadow: 0 0 0 4px rgba(255, 106, 0, 0.15);
        }

        /* BUTTONS */
        button.raised {
            background: linear-gradient(135deg, #ff6a00 0%, #ff8c00 100%);
            color: white;
            font-family: 'Outfit', sans-serif !important;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 16px 20px;
            border-radius: 12px;
            border: none;
            width: 100%;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 10px;
        }
        button.raised:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(255, 106, 0, 0.35);
            filter: brightness(1.1);
        }

        .button-flat {
            background: transparent;
            border: none;
            color: #e0e0e0;
            font-family: 'Outfit', sans-serif !important;
            font-weight: 300;
            font-size: 0.9rem;
            margin: 0;
            cursor: pointer;
            transition: color 0.2s ease;
        }
        .button-flat:hover {
            color: #ff6a00;
            text-decoration: underline;
        }

        /* QUICK CONNECT */
        .qc-code-display {
            font-family: 'Outfit', sans-serif !important;
            font-size: 2.5rem;
            letter-spacing: 4px;
            font-weight: 700;
            color: #ff6a00;
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 12px;
            border: 1px dashed rgba(255, 255, 255, 0.2);
            margin: 20px 0;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
        }
        .qc-instruction {
            color: #e0e0e0;
            text-align: center;
            font-family: 'Outfit', sans-serif !important;
            font-weight: 300;
            font-size: 0.95rem;
            line-height: 1.5;
            margin-bottom: 20px;
        }

        .hidden { display: none !important; }
    `;

    // 2. Main Logic to Inject
    async function injectLoginRevamp() {
        // Wait for ApiClient if not ready
        if (!window.ApiClient) {
            console.log('[LF] ApiClient not ready, retrying in 100ms...');
            setTimeout(injectLoginRevamp, 100);
            return;
        }

        // Check for existing overlay
        if (document.getElementById('lf-login-wrapper')) return;

        // Mark body
        document.body.classList.add('lf-login-active');

        // Inject CSS if missing
        if (!document.getElementById('lf-login-revamp-style')) {
            const style = document.createElement('style');
            style.id = 'lf-login-revamp-style';
            style.textContent = LOGIN_REVAMP_CSS;
            document.head.appendChild(style);
        }

        log('Injecting Login Revamp Overlay...');

        // Create Container
        const wrapper = document.createElement('div');
        wrapper.id = 'lf-login-wrapper';

        // Fetch Users (Public)
        const users = await fetchPublicUsers();

        // Build Layout
        wrapper.innerHTML = `
            <!-- BG VIDEO -->
            <video id="bgVideo" autoplay loop muted playsinline>
                <source src="https://media.istockphoto.com/id/1404209545/hu/vide%C3%B3/s%C3%A1rga-anim%C3%A1lt-pop-art-h%C3%A1tt%C3%A9r.mp4?s=mp4-640x640-is&k=20&c=EVnDWmq8tDTsHbkhn3ikCDDNT6Do-8rufpdLQ9-X-T4=" type="video/mp4">
            </video>
            <div id="bgOverlay"></div>

            <!-- BRANDING -->
            <div class="lf-login-brand">
                <img src="https://i.imgur.com/9tbXBxu.png" alt="LegitFlix">
            </div>

            <!-- SCENE 1: PROFILE SELECTION -->
            <div id="scene-profiles" class="visualLoginForm">
                <h1>Who's watching?</h1>
                <div class="itemSelectionPanel">
                    ${users.map(u => createProfileCard(u)).join('')}
                </div>
                <button class="button-flat" style="margin-top: 40px;" onclick="window.LF_Login.showManual()">Manual Login</button>
            </div>

             <!-- SCENE 2: PASSWORD ENTRY -->
            <div id="scene-password" class="visualLoginForm hidden">
                <div class="selectedUserHeader">
                    <div class="selectedUserImage" id="selectedUserImg"></div>
                    <div class="selectedUserName" id="selectedUserName">User</div>
                </div>

                <div class="inputContainer">
                    <label class="inputLabel" for="lf-password">Password</label>
                    <input type="password" id="lf-password" class="emby-input" placeholder="Enter your password">
                </div>

                <button class="raised" onclick="window.LF_Login.doLogin()">Sign In</button>

                <div style="display: flex; justify-content: center; gap: 20px; width: 100%; margin-top: 25px; flex-wrap: wrap;">
                    <button class="button-flat" style="font-size: 0.85rem;">Forgot Password?</button>
                    <button class="button-flat" style="font-size: 0.85rem;" onclick="window.LF_Login.showProfiles()">Switch User</button>
                </div>
            </div>

            <!-- SCENE 3: QUICK CONNECT (Simulation) -->
             <div id="scene-quick" class="visualLoginForm hidden">
                 <h1>Quick Connect</h1>
                 <p style="color: #ccc; margin-bottom: 20px;">Enter this code on your device</p>
                 <div class="quick-connect-code">ABCD-1234</div>
                 <button class="button-flat" onclick="window.LF_Login.showManual()">Cancel</button>
             </div>
        `;

        // Append to BODY
        document.body.appendChild(wrapper);

        // Remove Skeleton Loader (if active)
        if (window.LF_RemoveLoader) window.LF_RemoveLoader();

        // Setup Logic
        window.LF_Login = {
            currentUser: null,

            selectUser: function (id, name, hasImage) {
                this.currentUser = { id, name };
                document.getElementById('scene-profiles').classList.add('hidden');
                document.getElementById('scene-password').classList.remove('hidden');

                // Update Password Screen
                document.getElementById('selectedUserName').textContent = name;
                const img = document.getElementById('selectedUserImg');
                if (hasImage) {
                    img.style.backgroundImage = `url('/Users/${id}/Images/Primary?fillHeight=100&fillWidth=100&quality=90')`;
                    img.innerText = '';
                } else {
                    img.style.backgroundImage = 'none';
                    img.style.backgroundColor = '#aa55aa'; // fallback color
                }

                // Focus password
                setTimeout(() => {
                    const pwInput = document.getElementById('lf-password');
                    if (pwInput) pwInput.focus();
                }, 100);
            },

            showProfiles: function () {
                document.querySelectorAll('.visualLoginForm').forEach(el => el.classList.add('hidden'));
                document.getElementById('scene-profiles').classList.remove('hidden');
            },

            showPassword: function () {
                document.querySelectorAll('.visualLoginForm').forEach(el => el.classList.add('hidden'));
                document.getElementById('scene-password').classList.remove('hidden');
            },

            showQuickConnect: function () {
                document.querySelectorAll('.visualLoginForm').forEach(el => el.classList.add('hidden'));
                document.getElementById('scene-quick').classList.remove('hidden');

                // Simulate Code Load (Real API would go here)
                const qc = document.querySelector('.quick-connect-code'); // Updated selector
                if (qc) {
                    qc.innerHTML = '<span class="material-icons" style="animation:spin 1s infinite linear">sync</span>';

                    setTimeout(() => {
                        qc.textContent = Math.floor(1000 + Math.random() * 9000); // Mock
                    }, 1000);
                }
            },

            showManual: function () {
                // Fallback to standard Jellyfin login
                removeLoginOverlay();
            },

            doLogin: async function () {
                const password = document.getElementById('lf-password').value;
                if (!this.currentUser || !this.currentUser.id) return;

                try {
                    console.log('[LF] Attempting login for:', this.currentUser.name);
                    const result = await ApiClient.authenticateUserByName(this.currentUser.name, password);
                    console.log('[LF] Auth Result:', result);
                    console.log('[LF] Current Token:', ApiClient.accessToken());

                    if (result && result.AccessToken) {
                        console.log('[LF] Valid token received. Redirecting to root...');
                        removeLoginOverlay();
                        window.location.href = '/';
                    } else {
                        console.error('[LF] Login call succeeded but no AccessToken in result!');
                        alert('Login error: No access token received.');
                    }
                } catch (e) {
                    console.error('[LF] Login Exception:', e);
                    alert('Login failed: ' + e);
                }
            }
        };

        // Listen for Enter key
        const pw = document.getElementById('lf-password');
        if (pw) {
            pw.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') window.LF_Login.doLogin();
            });
        }
    }

    function removeLoginOverlay() {
        const wrapper = document.getElementById('lf-login-wrapper');
        if (wrapper) wrapper.remove();
        document.body.classList.remove('lf-login-active');
    }

    async function fetchPublicUsers() {
        try {
            const users = await ApiClient.getPublicUsers();
            console.log('[LF] Fetched users:', users);
            return users;
        } catch (e) {
            console.error('[LF] Failed to get users', e);
            return [];
        }
    }

    function createProfileCard(user) {
        const hasImage = user.PrimaryImageTag ? true : false;
        const imageUrl = hasImage
            ? `/Users/${user.Id}/Images/Primary?fillHeight=200&fillWidth=200&quality=90`
            : '';

        const bgStyle = hasImage ? `background-image: url('${imageUrl}')` : 'background-color: #333';
        const initial = hasImage ? '' : (user.Name[0] || '?');

        return `
            <div class="lf-profile-card" onclick="window.LF_Login.selectUser('${user.Id}', '${user.Name}', ${hasImage})">
                <div class="lf-profile-img" style="${bgStyle}">
                    ${initial}
                </div>
                <div class="lf-profile-text">${user.Name}</div>
            </div>
        `;
    }

    // =========================================================================
    // CSS STYLES (Extracted from Seriespage.html)
    // =========================================================================
    const SERIES_DETAIL_CSS = `
                            /* ============================================
                               LEGITFLIX COLOR VARIABLES
                               ============================================ */
                            .lf - series - container {
                        --clr - accent: #ff6a00;
                        --clr - accent - hover: #FF8C00;
                        --clr - bg - main: #141414;
                        --clr - bg - surface: #1f1f1f;
                        --clr - bg - glass: rgba(255, 255, 255, 0.1);
                        --clr - bg - glass - hover: rgba(255, 255, 255, 0.2);
                        --clr - text - main: #ffffff;
                        --clr - text - muted: #bcbcbc;
                        --clr - divider: rgba(255, 255, 255, 0.1);
                        --clr - heart: #e91e63;
                        --font - primary: 'Inter', -apple - system, BlinkMacSystemFont, sans - serif;
                        --font - display: 'Outfit', sans - serif;
                        --radius - sm: 4px;
                        --radius - md: 8px;
                        --radius - lg: 12px;
                        --content - padding: 3 %;
                    }

        .lf - series - container * {
                    margin: 0;
                    padding: 0;
                    box- sizing: border- box;
    }

        /* ============================================
           SERIES HERO SECTION (70vh, 100% width)
           ============================================ */
        .lf - series - hero {
        position: relative;
        width: 100 %;
        height: 70vh;
        min - height: 500px;
        display: flex;
        align - items: flex - end;
        padding: 40px var(--content - padding);
        overflow: hidden;
    }

        .lf - series - hero__backdrop {
        position: absolute;
        inset: 0;
        background - size: cover;
        background - position: center top;
        z - index: 0;
        transition: opacity 0.5s ease;
    }

        .lf - series - hero__trailer {
        position: absolute;
        inset: 0;
        z - index: 1;
        opacity: 0;
        transition: opacity 0.5s ease;
        pointer - events: none;
    }

        .lf - series - hero__trailer.is - playing {
        opacity: 1;
        pointer - events: auto;
    }

        .lf - series - hero__trailer iframe,
        .lf - series - hero__trailer video {
        width: 100 %;
        height: 100 %;
        object - fit: cover;
    }

        .lf - series - hero__backdrop::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear - gradient(to top,
                    var(--clr - bg - main) 0 %,
            rgba(20, 20, 20, 0.85) 25 %,
                rgba(20, 20, 20, 0.4) 60 %,
                    transparent 100 %);
        z - index: 1;
    }

        .lf - series - hero__logo {
        position: absolute;
        bottom: 40px;
        left: var(--content - padding);
        width: 200px;
        max - width: 30 %;
        height: auto;
        object - fit: contain;
        z - index: 5;
        opacity: 0;
        pointer - events: none;
        transition: opacity 0.5s ease;
    }

        .lf - series - hero.is - clean - view.lf - series - hero__logo {
        opacity: 1;
    }

        .lf - series - hero.is - clean - view.lf - series - hero__content {
        opacity: 0;
        pointer - events: none;
        transform: translateY(20px);
    }

        .lf - series - hero__content {
        position: relative;
        z - index: 2;
        display: flex;
        gap: 40px;
        width: 100 %;
        transition: all 0.5s ease;
    }

        .lf - series - hero__poster {
        flex - shrink: 0;
        width: 220px;
        aspect - ratio: 2 / 3;
        object - fit: cover;
        border - radius: var(--radius - lg);
        border: 2px solid rgba(255, 255, 255, 0.15);
        box - shadow: 0 12px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
        margin - top: auto; /* Align to bottom of padded area */
    }

        .lf - series - hero__info {
        flex: 1;
        display: flex;
        flex - direction: column;
        justify - content: flex - start; /* Expand downwards */
        padding - top: 40vh; /* Push content down initially */
        gap: 12px;
    }

        .lf - series - hero__title {
        font - family: var(--font - display);
        font - size: 2.2rem;
        font - weight: 700;
        line - height: 1.2;
        color: var(--clr - text - main);
    }

        .lf - series - hero__meta {
        display: flex;
        align - items: center;
        gap: 16px;
        color: var(--clr - text - muted);
        font - size: 0.9rem;
    }

        .lf - series - hero__rating {
        display: flex;
        align - items: center;
        gap: 4px;
        color: #ffc107;
    }

        .lf - series - hero__details {
        display: flex;
        gap: 3rem;
        align - items: flex - start;
    }

        .lf - series - hero__description {
        flex: 0 0 60 %;
        color: var(--clr - text - muted);
        line - height: 1.6;
        font - size: 0.9rem;
    }

        .lf - series - hero__description - text {
        display: -webkit - box;
        -webkit - line - clamp: 3;
        -webkit - box - orient: vertical;
        overflow: hidden;
        transition: all 0.3s ease;
    }

        .lf - series - hero__description - text.is - expanded {
        -webkit - line - clamp: unset;
        display: block;
    }

        .lf - series - hero__load - more {
        display: inline - flex;
        align - items: center;
        gap: 4px;
        margin - top: 8px;
        padding: 0;
        background: transparent;
        border: none;
        color: var(--clr - accent);
        font - size: 0.85rem;
        font - weight: 500;
        cursor: pointer;
        transition: color 0.2s ease;
    }

        .lf - series - hero__load - more:hover {
        color: var(--clr - accent - hover);
    }

        .lf - series - hero__load - more.material - icons {
        font - size: 18px;
        transition: transform 0.2s ease;
    }

        .lf - series - hero__load - more.is - expanded.material - icons {
        transform: rotate(180deg);
    }

        .lf - series - hero__cast - info {
        flex: 0 0 280px;
        font - size: 0.85rem;
        color: var(--clr - text - muted);
        line - height: 1.8;
    }

        .lf - series - hero__cast - info strong {
        color: var(--clr - text - main);
    }

        .lf - series - hero__actions {
        display: flex;
        gap: 12px;
        margin - bottom: 16px;
    }

        .lf - btn {
        display: inline - flex;
        align - items: center;
        gap: 8px;
        padding: 12px 24px;
        border - radius: var(--radius - md);
        font - family: var(--font - primary);
        font - weight: 600;
        font - size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
    }

        .lf - btn--primary {
        background: var(--clr - accent);
        color: white;
    }

        .lf - btn--primary:hover {
        background: var(--clr - accent - hover);
    }

        .lf - btn--glass {
        background: var(--clr - bg - glass);
        color: white;
        backdrop - filter: blur(10px);
    }

        .lf - btn--glass:hover {
        background: var(--clr - bg - glass - hover);
    }

        .lf - btn--icon - only {
        padding: 12px;
    }

        .lf - btn--heart {
        transition: background 0.2s ease, border - color 0.2s ease;
        border: 1px solid transparent;
    }

        .lf - btn--heart:hover {
        background: var(--clr - bg - glass - hover);
    }

        .lf - btn--heart.material - icons {
        transition: color 0.2s ease;
    }

        .lf - btn--heart.is - liked {
        background: rgba(233, 30, 99, 0.2);
        border - color: var(--clr - heart);
    }

        .lf - btn--heart.is - liked.material - icons {
        color: var(--clr - heart);
    }

        .lf - btn--heart:active {
        transform: scale(0.9);
    }

        .lf - btn - group {
        display: flex;
        align - items: center;
        gap: 8px;
    }

        .lf - mute - btn {
        display: inline - flex;
        align - items: center;
        justify - content: center;
        width: 44px;
        height: 44px; /* Match button height */
        border - radius: 50 %;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
    }

        .lf - mute - btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border - color: white;
    }

        .lf - mute - btn.is - muted {
        opacity: 0.7;
    }

        /* ============================================
           CONTENT SECTIONS
           ============================================ */
        .lf - content - section {
        width: 100 %;
        padding: 30px var(--content - padding);
    }

        .lf - section - divider {
        border: none;
        border - top: 1px solid var(--clr - divider);
        margin: 0 var(--content - padding);
    }

        .lf - section - header {
        display: flex;
        align - items: center;
        justify - content: space - between;
        margin - bottom: 20px;
    }

        .lf - section - title {
        font - family: var(--font - display);
        font - size: 1.3rem;
        font - weight: 600;
        color: var(--clr - text - main);
    }

        /* ============================================
           SEASON SELECTOR
           ============================================ */
        .lf - episodes - header {
        display: flex;
        align - items: center;
        justify - content: space - between;
        margin - bottom: 20px;
    }

        .lf - season - selector {
        position: relative;
        display: inline - block;
    }

        .lf - season - selector__button {
        display: flex;
        align - items: center;
        gap: 6px;
        padding: 8px 14px;
        background: var(--clr - bg - surface);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border - radius: var(--radius - md);
        color: var(--clr - text - main);
        font - family: var(--font - primary);
        font - size: 0.9rem;
        font - weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

        .lf - season - selector__button:hover {
        background: var(--clr - bg - glass - hover);
        border - color: var(--clr - accent);
    }

        .lf - season - selector__button.material - icons {
        font - size: 18px;
        transition: transform 0.2s ease;
    }

        .lf - season - selector.is - open.lf - season - selector__button.material - icons {
        transform: rotate(180deg);
    }

        .lf - season - selector__dropdown {
        position: absolute;
        top: calc(100 % + 6px);
        left: 0;
        min - width: 180px;
        background: var(--clr - bg - surface);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border - radius: var(--radius - md);
        box - shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        z - index: 100;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.2s ease;
    }

        .lf - season - selector.is - open.lf - season - selector__dropdown {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }

        .lf - season - selector__option {
        display: flex;
        align - items: center;
        gap: 10px;
        padding: 10px 14px;
        color: var(--clr - text - muted);
        cursor: pointer;
        transition: all 0.15s ease;
        font - size: 0.85rem;
    }

        .lf - season - selector__option: first - child {
        border - radius: var(--radius - md) var(--radius - md) 0 0;
    }

        .lf - season - selector__option: last - child {
        border - radius: 0 0 var(--radius - md) var(--radius - md);
    }

        .lf - season - selector__option:hover {
        background: var(--clr - bg - glass);
        color: var(--clr - text - main);
    }

        .lf - season - selector__option.is - selected {
        color: var(--clr - accent);
        background: rgba(255, 106, 0, 0.1);
    }

        .lf - season - selector__option - count {
        margin - left: auto;
        font - size: 0.8rem;
        color: var(--clr - text - muted);
        opacity: 0.7;
    }

        /* Filter controls */
        .lf - filter - controls {
        display: flex;
        gap: 10px;
        align - items: center;
    }

        .lf - filter - btn {
        position: relative;
        display: flex;
        align - items: center;
        gap: 6px;
        padding: 8px 14px;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border - radius: var(--radius - md);
        color: var(--clr - text - muted);
        font - size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

        .lf - filter - btn:hover {
        background: var(--clr - bg - glass);
        color: var(--clr - text - main);
    }

        .lf - filter - btn.material - icons {
        font - size: 18px;
    }

        .lf - filter - dropdown {
        position: relative;
        display: inline - block;
    }

        .lf - filter - dropdown__menu {
        position: absolute;
        top: calc(100 % + 6px);
        right: 0;
        min - width: 150px;
        background: var(--clr - bg - surface);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border - radius: var(--radius - md);
        box - shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        z - index: 100;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.2s ease;
    }

        .lf - filter - dropdown.is - open.lf - filter - dropdown__menu {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }

        .lf - filter - dropdown__option {
        display: flex;
        align - items: center;
        gap: 8px;
        padding: 10px 14px;
        color: var(--clr - text - muted);
        cursor: pointer;
        transition: all 0.15s ease;
        font - size: 0.85rem;
    }

        .lf - filter - dropdown__option: first - child {
        border - radius: var(--radius - md) var(--radius - md) 0 0;
    }

        .lf - filter - dropdown__option: last - child {
        border - radius: 0 0 var(--radius - md) var(--radius - md);
    }

        .lf - filter - dropdown__option:hover {
        background: var(--clr - bg - glass);
        color: var(--clr - text - main);
    }

        .lf - filter - dropdown__option.is - selected {
        color: var(--clr - accent);
        background: rgba(255, 106, 0, 0.1);
    }

        .lf - filter - dropdown__option.material - icons {
        font - size: 16px;
    }

        /* Language Selector Split */
        .lf - lang - menu {
        min - width: 220px;
        padding: 10px 0;
    }
        .lf - lang - section {
        padding - bottom: 5px;
    }
        .lf - dropdown - section - title {
        padding: 5px 15px;
        font - size: 0.75rem;
        text - transform: uppercase;
        color: var(--clr - text - muted);
        font - weight: 600;
        letter - spacing: 0.5px;
    }
        .lf - lang - separator {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 5px 0;
    }
        .lf - lang - footer {
        padding: 8px 10px 0 10px;
        border - top: 1px solid rgba(255, 255, 255, 0.1);
        margin - top: 5px;
    }
        .lf - edit - subs - btn {
        width: 100 %;
        display: flex;
        align - items: center;
        justify - content: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--clr - text - main);
        padding: 8px 12px;
        border - radius: var(--radius - sm);
        cursor: pointer;
        font - size: 0.9rem;
        transition: all 0.2s;
        text - decoration: none;
    }
        .lf - edit - subs - btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border - color: rgba(255, 255, 255, 0.3);
    }
        .lf - edit - subs - btn.material - icons {
        font - size: 18px;
    }

        /* ============================================
           EPISODE GRID
           ============================================ */
        .lf - episode - grid {
        display: grid;
        grid - template - columns: repeat(auto - fill, minmax(280px, 1fr));
        gap: 16px;
    }

        .lf - episode - card {
        display: block;
        background: var(--clr - bg - surface);
        border - radius: var(--radius - lg);
        overflow: hidden;
        text - decoration: none;
        color: inherit;
        transition: all 0.25s ease;
        cursor: pointer;
        grid - column: auto!important; /* Force auto placement in grid */
        min - width: 0; /* Prevent grid blowout */
        width: 100 %;
    }

        .lf - episode - card:hover {
        transform: translateY(-4px) scale(1.02);
        box - shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    }

        .lf - episode - card__thumbnail {
        position: relative;
        aspect - ratio: 16 / 9;
        overflow: hidden;
    }

        .lf - episode - card__thumbnail img {
        width: 100 %;
        height: 100 %;
        object - fit: cover;
        transition: transform 0.3s ease;
    }

        .lf - episode - card: hover.lf - episode - card__thumbnail img {
        transform: scale(1.05);
    }

        .lf - episode - card__play - icon {
        position: absolute;
        inset: 0;
        display: flex;
        align - items: center;
        justify - content: center;
        background: rgba(0, 0, 0, 0.4);
        opacity: 0;
        transition: opacity 0.2s ease;
    }

        .lf - episode - card: hover.lf - episode - card__play - icon {
        opacity: 1;
    }

        .lf - episode - card__play - icon.material - icons {
        font - size: 40px;
        color: white;
        background: var(--clr - accent);
        border - radius: 50 %;
        padding: 10px;
    }

        .lf - episode - card__progress {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
    }

        .lf - episode - card__progress - bar {
        height: 100 %;
        background: var(--clr - accent);
        transition: width 0.3s ease;
    }

        .lf - episode - card__badge {
        position: absolute;
        top: 8px;
        left: 8px;
        background: var(--clr - accent);
        color: white;
        font - weight: 700;
        font - size: 0.75rem;
        padding: 3px 8px;
        border - radius: var(--radius - sm);
    }

        .lf - episode - card__duration {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        font - size: 0.7rem;
        padding: 3px 6px;
        border - radius: var(--radius - sm);
    }

        .lf - episode - card__info {
        padding: 12px;
    }

        .lf - episode - card__title {
        font - weight: 600;
        font - size: 0.9rem;
        margin - bottom: 4px;
        display: -webkit - box;
        -webkit - line - clamp: 1;
        -webkit - box - orient: vertical;
        overflow: hidden;
        color: var(--clr - text - main);
    }

        .lf - episode - card__subtitle {
        color: var(--clr - text - muted);
        font - size: 0.8rem;
        display: -webkit - box;
        -webkit - line - clamp: 2;
        -webkit - box - orient: vertical;
        overflow: hidden;
    }

        /* BULK EDIT STYLES */
        .lf - episode - checkbox {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        background: rgba(0, 0, 0, 0.6);
        border: 2px solid rgba(255, 255, 255, 0.5);
        border - radius: 4px;
        display: flex;
        align - items: center;
        justify - content: center;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.2s ease;
        z - index: 10;
        pointer - events: none; /* Let parent handle click */
    }
        
        .lf - episode - checkbox.material - icons {
        font - size: 18px;
        color: white;
        opacity: 0;
        transform: scale(0);
        transition: all 0.2s ease;
    }

        .lf - episode - card.is - selecting - mode.lf - episode - checkbox {
        opacity: 1;
        transform: scale(1);
    }

        .lf - episode - card.is - selected.lf - episode - checkbox {
        background: var(--clr - accent);
        border - color: var(--clr - accent);
    }

        .lf - episode - card.is - selected.lf - episode - checkbox.material - icons {
        opacity: 1;
        transform: scale(1);
    }

        .lf - episode - card.is - selected {
        box - shadow: 0 0 0 2px var(--clr - accent);
    }
        
        .lf - episode - card.is - watched.lf - episode - card__thumbnail {
        opacity: 0.6;
    }

        /* Disable hover play icon in selection mode */
        .lf - episode - card.is - selecting - mode: hover.lf - episode - card__play - icon {
        opacity: 0;
    }

        /* Success Marked State (Green Tick) */
        .lf - episode - card.is - success - marked.lf - episode - checkbox,
        .lf - episode - card.is - watched.lf - episode - checkbox {
        opacity: 1;
        transform: scale(1);
        background: #4caf50;
        border - color: #4caf50;
    }
        .lf - episode - card.is - success - marked.lf - episode - checkbox.material - icons,
        .lf - episode - card.is - watched.lf - episode - checkbox.material - icons {
        opacity: 1;
        transform: scale(1);
    }

        /* Adjust hover behavior for checked items */
         .lf - episode - card.is - watched: hover.lf - episode - card__play - icon {
        /* Allow play icon to show on hover even if watched, to replay */
        opacity: 1;
    }


        /* ============================================
           CAST SECTION
           ============================================ */
        .lf - cast - grid {
        display: flex;
        gap: 16px;
        overflow - x: auto;
        padding: 10px 0;
    }

        .lf - cast - card {
        flex - shrink: 0;
        text - align: center;
        width: 100px;
        cursor: pointer;
    }

        .lf - cast - card__image {
        width: 80px;
        height: 80px;
        border - radius: 50 %;
        object - fit: cover;
        margin - bottom: 8px;
        border: 2px solid var(--clr - bg - surface);
        transition: border - color 0.2s ease, opacity 0.2s ease;
    }

        .lf - cast - card: hover.lf - cast - card__image {
        border - color: rgba(255, 255, 255, 0.4);
        opacity: 0.85;
    }

        .lf - cast - card__name {
        font - size: 0.8rem;
        font - weight: 600;
        margin - bottom: 2px;
        white - space: nowrap;
        overflow: hidden;
        text - overflow: ellipsis;
        transition: color 0.2s ease;
        color: var(--clr - text - main);
    }

        .lf - cast - card: hover.lf - cast - card__name {
        color: var(--clr - text - main);
    }

        .lf - cast - card__role {
        font - size: 0.75rem;
        color: var(--clr - text - muted);
        white - space: nowrap;
        overflow: hidden;
        text - overflow: ellipsis;
    }

        /* ============================================
           MORE LIKE THIS
           ============================================ */
        .lf - similar - grid {
        display: flex;
        gap: 16px;
        overflow - x: auto;
        padding: 10px 0;
    }

        .lf - similar - card {
        flex - shrink: 0;
        width: 150px;
        text - decoration: none;
        color: inherit;
        transition: transform 0.2s ease;
        cursor: pointer;
    }

        .lf - similar - card:hover {
        transform: translateY(-4px);
    }

        .lf - similar - card__poster {
        width: 100 %;
        aspect - ratio: 2 / 3;
        object - fit: cover;
        border - radius: var(--radius - md);
        margin - bottom: 8px;
        transition: box - shadow 0.2s ease;
    }

        .lf - similar - card: hover.lf - similar - card__poster {
        box - shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

        .lf - similar - card__title {
        font - size: 0.85rem;
        font - weight: 500;
        white - space: nowrap;
        overflow: hidden;
        text - overflow: ellipsis;
        transition: color 0.2s ease;
        color: var(--clr - text - main);
    }

        .lf - similar - card: hover.lf - similar - card__title {
        color: var(--clr - accent);
    }

    /* ============================================
       RESPONSIVE
       ============================================ */
    @media(max - width: 900px) {
            .lf - series - hero__details {
            flex - direction: column;
        }

            .lf - series - hero__cast - info {
            flex: 1;
        }
    }

    @media(max - width: 768px) {
            .lf - series - hero {
            padding: 20px var(--content - padding);
            height: auto;
            min - height: 60vh;
        }

            .lf - series - hero__content {
            flex - direction: column;
            align - items: center;
            text - align: center;
        }

            .lf - series - hero__poster {
            width: 140px;
        }

            .lf - series - hero__title {
            font - size: 1.6rem;
        }

            .lf - series - hero__meta {
            justify - content: center;
            flex - wrap: wrap;
        }

            .lf - episode - grid {
            grid - template - columns: 1fr;
        }

            .lf - episodes - header {
            flex - direction: column;
            gap: 12px;
            align - items: flex - start;
        }
    }
    `;

    // =========================================================================
    // CSS INJECTION
    // =========================================================================
    function injectStyles() {
        if (document.getElementById(CONFIG.cssId)) return;

        const style = document.createElement('style');
        style.id = CONFIG.cssId;
        style.textContent = SERIES_DETAIL_CSS;
        document.head.appendChild(style);
        log('CSS injected');
    }

    // =========================================================================
    // UI GENERATORS
    // =========================================================================

    /**
     * Create hero section HTML
     * @param {Object} series - Series data object
     */
    function createHeroSection(series) {
        const backdropUrl = series.backdropUrl || '';
        const posterUrl = series.posterUrl || '';
        const title = series.name || 'Unknown Series';
        const year = series.year || '';
        const rating = series.officialRating || 'TV-14';
        const communityRating = series.communityRating ? series.communityRating.toFixed(1) : '';
        const episodeCount = series.episodeCount || 0;
        const description = series.overview || '';
        const genres = (series.genres || []).slice(0, 3).join(', ');
        const studios = (series.studios || []).slice(0, 2).map(s => s.Name || s).join(', ');
        const cast = (series.people || []).filter(p => p.Type === 'Actor').slice(0, 3).map(p => p.Name).join(', ');

        // Logo Logic: Use pre-calculated or construct from ImageTags
        let logoUrl = series.logoUrl;
        if (!logoUrl && series.ImageTags && series.ImageTags.Logo) {
            logoUrl = `/ Items / ${series.id || series.Id} /Images/Logo ? maxHeight = 200 & maxWidth=500 & quality=90`;
        }

        const titleHtml = logoUrl
            ? `< img src = "${logoUrl}" alt = "${title}" class="lf-series-hero__logo-title" style = "max-width: 200px; max-height: 180px; width: auto; object-fit: contain; margin-bottom: 16px; display: block;" > `
            : `< h1 class="lf-series-hero__title" > ${title}</h1 > `;

        return `
        < section class="lf-series-hero" id = "lfSeriesHero" >
                <div class="lf-series-hero__backdrop" id="lfHeroBackdrop"
                    style="background-image: url('${backdropUrl}');"></div>
                
                <div class="lf-series-hero__trailer" id="lfHeroTrailer">
                    <iframe id="lfTrailerIframe" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                </div>

                <!--(Original Clean View Logo removed slightly to avoid double - up, or we can keep it for transitions) -->
                < !--We'll keep the logic simple: Main Title Slot is now either Text or Logo -->

        < div class="lf-series-hero__content" >
            <img class="lf-series-hero__poster" src="${posterUrl}" alt="${title}">

                <div class="lf-series-hero__info">
                    ${titleHtml}

                    <div class="lf-series-hero__meta">
                        ${year ? `<span>${year}</span><span>•</span>` : ''}
                        <span>${rating}</span>
                        ${communityRating ? `
                                <span>•</span>
                                <div class="lf-series-hero__rating">
                                    <span class="material-icons">star</span>
                                    <span>${communityRating}</span>
                                </div>
                            ` : ''}
                        ${episodeCount ? `<span>•</span><span>${episodeCount} Seasons</span>` : ''}
                    </div>

                    <div class="lf-series-hero__actions">
                        <button class="lf-btn lf-btn--primary" id="lfWatchNowBtn">
                            <span class="material-icons">play_arrow</span>
                            Watch Now
                        </button>
                        <button class="lf-btn lf-btn--glass" id="lfTrailerBtn">
                            <span class="material-icons">theaters</span>
                            Watch Trailer
                        </button>
                        <div class="lf-btn-group">
                            <button class="lf-btn lf-btn--glass lf-btn--icon-only lf-btn--heart" id="lfHeartBtn">
                                <span class="material-icons">favorite_border</span>
                            </button>
                            <button class="lf-mute-btn" id="lfMuteBtn" title="Toggle Mute" style="display: none;">
                                <span class="material-icons">volume_off</span>
                            </button>
                        </div>
                    </div>

                    <div class="lf-series-hero__details">
                        <div class="lf-series-hero__description">
                            <p class="lf-series-hero__description-text" id="lfDescriptionText">${description}</p>
                            <button class="lf-series-hero__load-more" id="lfLoadMoreBtn">
                                <span>Load more</span>
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
            </section >
        `;
    }

    /**
     * Create language selector HTML
     */
    function createLanguageSelector(audioStreams = [], subtitleStreams = [], targetEpisodeId = null) {
        console.log('[DEBUG] createLanguageSelector called with:', { audio: audioStreams.length, subs: subtitleStreams.length, targetId: targetEpisodeId });

        const savedAudio = localStorage.getItem('legitflix-audio-pref') || 'en';
        const savedSub = localStorage.getItem('legitflix-sub-pref') || 'en';

        const mapStreamToOption = (stream) => ({
            code: stream.Language || 'und',
            name: stream.Language || stream.Title || 'Unknown',
            displayTitle: stream.DisplayTitle || stream.Title || stream.Language || 'Unknown'
        });

        const uniqueStreams = (streams) => {
            const seen = new Set();
            if (!streams || streams.length === 0) return [];
            return streams.map(mapStreamToOption).filter(s => {
                if (seen.has(s.code)) return false;
                seen.add(s.code);
                return true;
            });
        };

        const availableAudio = uniqueStreams(audioStreams);
        const availableSubs = uniqueStreams(subtitleStreams);

        // Fallbacks
        const audioOptions = availableAudio.length > 0 ? availableAudio : [{ code: 'en', name: 'English' }];
        const subOptions = availableSubs.length > 0 ? availableSubs : [{ code: 'en', name: 'English' }];

        // Placeholder for old languages array removal
        const languages = [];

        // Helper to create options
        const createOptions = (type, list, current) => list.map(l => `
        < div class="lf-filter-dropdown__option ${l.code === current ? 'is-selected' : ''}"
    data - type="${type}" data - lang="${l.code}" >
        <span>${l.name}</span>
                ${l.code === current ? '<span class="material-icons">check</span>' : ''}
            </div >
        `).join('');

        const html = `
        < div class="lf-filter-dropdown lf-lang-selector" id = "lfLangSelector" >
                <button class="lf-filter-btn" title="Audio & Subtitles">
                    <span class="material-icons">subtitles</span>
                    <span id="lfLangText">Audio & Subs</span>
                    <span class="material-icons">expand_more</span>
                </button>
                <div class="lf-filter-dropdown__menu lf-lang-menu">
                    <div class="lf-lang-section">
                        <div class="lf-dropdown-section-title">Audio</div>
                        ${createOptions('audio', audioOptions, savedAudio)}
                    </div>
                    <div class="lf-lang-separator"></div>
                    <div class="lf-lang-section">
                        <div class="lf-dropdown-section-title">Subtitles</div>
                        ${createOptions('subtitle', subOptions, savedSub)}
                    </div>
                    <div class="lf-lang-footer">
                        <button class="lf-edit-subs-btn" id="lfEditSubsBtn" ${targetEpisodeId ? `data-episode-id="${targetEpisodeId}"` : ''}>
                            <span class="material-icons">edit</span>
                            <span>Edit Subtitles</span>
                        </button>
                    </div>
                </div>
            </div >
        `;
        return html;
    }

    // REMOVED: createSeasonSelector wrapper (Previously caused syntax error)
    // REMOVED: createSeasonSelector, createLanguageSelector logic implementation (replaced with simpler direct player options)
    // NOTE: We might want createLanguageSelector helper back if we want dynamic streams in the player header, but for now we mocked it in createPlayerSection.

    // =========================================================================
    // DATA FETCHING
    // =========================================================================

    /**
     * Fetch all data needed for the Movie page
     */
    async function fetchMovieData(itemId) {
        const userId = window.ApiClient.getCurrentUserId();

        // 1. Get Base Item
        const item = await window.ApiClient.getItem(userId, itemId);

        // Return structured data (similar to Series but simplified)
        return {
            item: item, // Contains people, userdata, media sources usually
            seasons: null,
            episodes: null
        };
    }

    // REMOVED: createEpisodeGrid, createSeasonSelector logic

    // ... Use separate tool call for the Season Selector logic update if I can't reach it here (it's around line 2760) ...
    // Actually, I can replace the function definitions here, but the update logic is far down.
    // I will just update the function definitions first.

    // Wait, if I change createEpisodeGrid now, I break the logic at line 2773 BEFORE I fix it.
    // But valid JS code will be written. It won't break until run.
    // I should try to include the season selector update in the same chunk if possible, or do it immediately after.
    // The file is large (2900 lines). `createEpisodeGrid` is at 1118. `wireUpButtons` is at 2760.
    // I will do two edits. One for the functions, one for the event listener.


    /**
     * Create Player Section (Direct Player)
     * @param {Object} item - Movie Item
     */
    function createPlayerSection(item) {
        // --- RESUME LOGIC ---
        // Just like the hero, we can show resume status here if we want a secondary place,
        // but typically "Direct Player" implies the video itself or a big play container.
        // For this design, let's make a big 90vh wrapper for the video player if we want headers + video.

        // MOCK DATA for Prototype
        const audioOptions = `
        < div class="lf-filter-dropdown__option is-selected" > <span class="material-icons">check</span> English</div >
            `;
        const subOptions = `
            < div class="lf-filter-dropdown__option is-selected" > <span class="material-icons">check</span> English</div >
                `;

        return `
                < hr class="lf-section-divider" >
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
                                                <span class="material-icons">edit</span> Edit Subtitles
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- MARK WATCHED (Moved from Hero) -->
                                <button class="lf-filter-btn" id="lfWatchedBtn" title="Mark Played">
                                    <span class="material-icons">${item.UserData?.Played ? 'check_circle' : 'check_circle_outline'}</span>
                                    <span>${item.UserData?.Played ? 'Played' : 'Mark Played'}</span>
                                </button>
                            </div>
                        </div>

                        <!-- PLAYER WRAPPER (90vh) -->
                        <div class="lf-player-wrapper" style="width: 100%; height: 90vh; background: #000; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center;">

                            <!-- PLACEHOLDER FOR VIDEO PLAYER -->
                            <div class="lf-player-placeholder" style="text-align: center; color: #555;">
                                <span class="material-icons" style="font-size: 64px; opacity: 0.5;">play_circle_outline</span>
                                <p style="margin-top: 10px; font-weight: 500;">Click Play to Start</p>
                            </div>

                            <!--
                            IN PRODUCTION: This div would be replaced or injected with the actual Jellyfin video player logic
                            or an iframe if using external sources. 
                    -->
                        </div>
                    </section>
    `;
    }

    // REMOVED: createEpisodeGrid, createSeasonSelector logic

    // ... Use separate tool call for the Season Selector logic update if I can't reach it here (it's around line 2760) ...
    // Actually, I can replace the function definitions here, but the update logic is far down.
    // I will just update the function definitions first.

    // Wait, if I change createEpisodeGrid now, I break the logic at line 2773 BEFORE I fix it.
    // But valid JS code will be written. It won't break until run.
    // I should try to include the season selector update in the same chunk if possible, or do it immediately after.
    // The file is large (2900 lines). `createEpisodeGrid` is at 1118. `wireUpButtons` is at 2760.
    // I will do two edits. One for the functions, one for the event listener.


    /**
     * Create cast section HTML
     * @param {Array} people - Cast/Crew array
     */
    function createCastSection(people) {
        const actors = people.filter(p => p.Type === 'Actor').slice(0, 15);
        if (actors.length === 0) return '';

        const cards = actors.map(person => {
            const imageUrl = person.imageUrl || '';
            const name = person.Name || 'Unknown';
            const role = person.Role || '';

            return `
        < div class="lf-cast-card" data - person - id="${person.Id}" >
            <img class="lf-cast-card__image" src="${imageUrl}" alt="${name}">
                <div class="lf-cast-card__name">${name}</div>
                <div class="lf-cast-card__role">${role}</div>
            </div>
    `;
        }).join('');

        return `
        < hr class="lf-section-divider" >
            <section class="lf-content-section">
                <div class="lf-section-header">
                    <h2 class="lf-section-title">Cast & Crew</h2>
                </div>
                <div class="lf-cast-grid">${cards}</div>
            </section>
    `;
    }

    /**
     * Create similar items section HTML
     * @param {Array} items - Similar items array
     */
    function createSimilarSection(items) {
        if (!items || items.length === 0) return '';

        const cards = items.slice(0, 12).map(item => {
            const posterUrl = item.posterUrl || '';
            const title = item.Name || 'Unknown';

            return `
        < div class="lf-similar-card" data - item - id="${item.Id}" >
            <img class="lf-similar-card__poster" src="${posterUrl}" alt="${title}">
                <div class="lf-similar-card__title">${title}</div>
            </div>
    `;
        }).join('');

        return `
        < hr class="lf-section-divider" >
            <section class="lf-content-section">
                <div class="lf-section-header">
                    <h2 class="lf-section-title">More Like This</h2>
                </div>
                <div class="lf-similar-grid">${cards}</div>
            </section>
    `;
    }

    // =========================================================================
    // UTILITIES
    // =========================================================================
    function formatDuration(ticks) {
        const minutes = Math.floor(ticks / 600000000);
        const seconds = Math.floor((ticks % 600000000) / 10000000);
        return `${minutes}:${seconds.toString().padStart(2, '0')} `;
    }

    /**
     * Enforce grid styles using MutationObserver to prevent external overrides
     */
    function enforceGridStyles(grid) {
        if (!grid) return;

        const applyParams = () => {
            grid.style.setProperty('display', 'grid', 'important');
            grid.style.setProperty('grid-template-columns', 'repeat(auto-fill, minmax(280px, 1fr))', 'important');
            grid.style.setProperty('gap', '20px', 'important');
            grid.style.setProperty('width', '100%', 'important');
        };

        // Apply immediately
        applyParams();

        // Watch for changes
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                    // Check if our styles were removed/changed (basic check)
                    if (grid.style.display !== 'grid') shouldReapply = true;
                }
            });
            if (shouldReapply) {
                // disconnect momentarily to avoid infinite loop
                observer.disconnect();
                applyParams();
                observer.observe(grid, { attributes: true, attributeFilter: ['style', 'class'] });
            }
        });

        observer.observe(grid, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    // =========================================================================
    // SUBTITLE MANAGER (Custom Implementation)
    // =========================================================================
    const SubtitleManager = {
        modalId: 'lfSubtitleModal',

        async show(episodeId) {
            log('Opening Subtitle Manager for:', episodeId);
            this.injectModal();
            const modal = document.getElementById(this.modalId);

            // Show modal
            modal.classList.remove('hide');
            modal.classList.add('opened');
            modal.dataset.episodeId = episodeId;
            document.body.style.overflow = 'hidden'; // Lock scroll

            // Load initial data for selectors
            // Verify we have seasons access
            const seasonsList = (typeof seasons !== 'undefined') ? seasons :
                (typeof data !== 'undefined' && data.seasons) ? data.seasons :
                    window.LF_CURRENT_SEASONS || [];

            await this.populateSeasons(modal, episodeId, seasonsList);

            // Load subtitles
            await this.loadCurrentSubtitles(episodeId);

            // Setup listeners (if not already)
            if (!modal.dataset.listenersAttached) {
                this.attachListeners(modal);
                modal.dataset.listenersAttached = 'true';
            }
        },

        async populateSeasons(modal, currentEpisodeId, seasonsList) {
            const seasonSelect = modal.querySelector('#lfSubSeasonSelect');
            if (!seasonSelect) return;

            seasonSelect.innerHTML = '';

            seasonsList.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id || s.Id;
                opt.textContent = s.name || s.Name;
                seasonSelect.appendChild(opt);
            });

            // "Fetch season 01 EP 01 as default always" (or smart default)
            // If currentEpisodeId is provided, try to find its season?
            // Since we don't have an easy map, let's try to grab from UI first, then fallback to S1

            const currentUISeasonStr = document.querySelector('.lf-season-selector__option.is-selected')?.dataset.seasonId;

            if (currentUISeasonStr && seasonsList.find(s => (s.id || s.Id) == currentUISeasonStr)) {
                seasonSelect.value = currentUISeasonStr;
                await this.updateEpisodesForSeason(modal, currentUISeasonStr, currentEpisodeId);
            } else if (seasonsList.length > 0) {
                // Default to First Season (S1)
                seasonSelect.value = seasonsList[0].id || seasonsList[0].Id;
                await this.updateEpisodesForSeason(modal, seasonSelect.value, currentEpisodeId || null);
            }
        },

        async updateEpisodesForSeason(modal, seasonId, targetEpisodeId = null) {
            const epSelect = modal.querySelector('#lfSubEpisodeSelect');
            if (!epSelect) return;

            epSelect.innerHTML = '<option>Loading...</option>';
            epSelect.disabled = true;

            // Fetch episodes
            // using fetchEpisodes from global scope, fallback series ID
            const seriesId = (typeof series !== 'undefined' && series.Id) ? series.Id :
                (typeof data !== 'undefined' && data.series) ? (data.series.id || data.series.Id) :
                    window.LF_CURRENT_SERIES ? (window.LF_CURRENT_SERIES.id || window.LF_CURRENT_SERIES.Id) : null;

            if (!seriesId) {
                epSelect.innerHTML = '<option>Error: No Series ID</option>';
                return;
            }

            const eps = await fetchEpisodes(seriesId, seasonId);

            epSelect.innerHTML = '';
            eps.forEach(ep => {
                const opt = document.createElement('option');
                opt.value = ep.id;
                opt.textContent = `${ep.indexNumber}. ${ep.name} `;
                if (ep.id === targetEpisodeId) opt.selected = true;
                epSelect.appendChild(opt);
            });
            epSelect.disabled = false;

            // If no target, select first and trigger load? 
            if (!targetEpisodeId && eps.length > 0) {
                epSelect.value = eps[0].id;
                // Don't auto-load subs here to avoid double fetch if just strictly populating
            }
        },

        injectModal() {
            if (document.getElementById(this.modalId)) return;

            const html = `
        < div id = "${this.modalId}" class="lf-modal-overlay hide" >
                    <div class="dialogContainer">
                        <div class="focuscontainer dialog dialog-fixedSize dialog-small formDialog subtitleEditorDialog opened" 
                             style="animation: 180ms ease-out 0s 1 normal both running scaleup; max-width: 800px; margin: 5vh auto; background: var(--color-background-secondary, #1c1c1c); border-radius: var(--radius-lg, 12px);">
                            
                            <div class="formDialogHeader" style="display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <h3 class="formDialogHeaderTitle" style="margin: 0; font-size: 1.2rem; font-weight: 600;">Subtitles</h3>
                                <button class="btnCancel" tabindex="-1" title="Close" style="background:none; border:none; color:inherit; cursor:pointer; opacity: 0.7;">
                                    <span class="material-icons" aria-hidden="true" style="font-size: 24px;">close</span>
                                </button>
                            </div>

                            <div class="formDialogContent smoothScrollY" style="padding: 20px; max-height: 80vh; overflow-y: auto;">
                                <div class="dialogContentInner dialog-content-centered">
                                    
                                    <!-- EXISTING SUBTITLES -->
                                    <div class="subtitleList" style="margin-bottom:2em">
                                        <h2 style="font-size: 1rem; margin-bottom: 1rem; opacity: 0.8;">My Subtitles</h2>
                                        <div id="lfCurrentSubsList">Loading...</div>
                                    </div>

                                    <!-- SEARCH -->
                                    <h2 style="font-size: 1rem; margin-bottom: 0.5rem; opacity: 0.8; margin-top: 2rem;">Search for Subtitles</h2>
                                    
                                    <!-- NAVIGATION SELECTORS -->
                                    <div class="subtitleNav" style="display: flex; gap: 12px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                        <div style="flex: 1;">
                                            <label style="display: block; font-size: 0.85rem; margin-bottom: 6px; opacity: 0.8;">Season</label>
                                            <select id="lfSubSeasonSelect" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: white; border-radius: 6px; font-size: 0.95rem;">
                                                <option>Loading...</option>
                                            </select>
                                        </div>
                                        <div style="flex: 1;">
                                            <label style="display: block; font-size: 0.85rem; margin-bottom: 6px; opacity: 0.8;">Episode</label>
                                            <select id="lfSubEpisodeSelect" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: white; border-radius: 6px; font-size: 0.95rem;">
                                                <option>Loading...</option>
                                            </select>
                                        </div>
                                    </div>

                                    <!-- TARGET INFO BOX -->
                                    <div id="lfSubtitleTargetInfo" style="background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; font-size: 0.9rem; color: var(--clr-text-muted); border-left: 3px solid var(--clr-accent, #00a4dc);">
                                        Fetching episode info...
                                    </div>

                                    <form class="subtitleSearchForm" style="display: flex; gap: 12px; align-items: flex-end;">
                                        <div class="selectContainer flex-grow" style="flex: 1; display: flex; flex-direction: column; justify-content: space-around; margin-bottom: 0px !important;">
                                            <label class="selectLabel" for="selectLanguage" style="display: block; font-size: 0.85rem; margin-bottom: 6px; opacity: 0.8;">Language</label>
                                            
                                            <!-- STANDARD SELECT (No 'is=emby-select' to avoid truncation/override) -->
                                            <select id="selectLanguage" style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: white; border-radius: 6px; font-size: 1rem; cursor: pointer; appearance: none; -webkit-appearance: none;">
                                                <option value="eng">English</option>
                                                <option value="spa">Spanish</option>
                                                <option value="fre">French</option>
                                                <option value="ger">German</option>
                                                <option value="ita">Italian</option>
                                                <option value="por">Portuguese</option>
                                                <option value="pol">Polish</option>
                                                <option value="rus">Russian</option>
                                                <option value="dut">Dutch</option>
                                                <option value="swe">Swedish</option>
                                                <option value="nor">Norwegian</option>
                                                <option value="fin">Finnish</option>
                                                <option value="da">Danish</option>
                                                <option value="tur">Turkish</option>
                                                <option value="ara">Arabic</option>
                                                <option value="heb">Hebrew</option>
                                                <option value="hun">Hungarian</option>
                                                <option value="cze">Czech</option>
                                                <option value="rom">Romanian</option>
                                                <option value="vie">Vietnamese</option>
                                                <option value="tha">Thai</option>
                                                <option value="chi">Chinese</option>
                                                <option value="jpn">Japanese</option>
                                                <option value="kor">Korean</option>
                                                <option value="gre">Greek</option>
                                                <option value="ind">Indonesian</option>
                                                <option value="may">Malay</option>
                                                <option value="fas">Persian</option>
                                                <option value="ukr">Ukrainian</option>
                                                <option value="hrv">Croatian</option>
                                                <option value="slv">Slovenian</option>
                                                <option value="bul">Bulgarian</option>
                                                <option value="srp">Serbian</option>
                                            </select>
                                        </div>
                                        <button type="submit" class="raised btnSubmit block button-submit emby-button" style="background: var(--clr-accent, #00a4dc); color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 1rem; margin-bottom: 0;">
                                            Search
                                        </button>
                                    </form>

                                    <div class="subtitleResults" id="lfSubtitleSearchResults" style="margin-top: 24px;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <style>
                        .lf-modal-overlay {
                            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                            background: rgba(0,0,0,0.85); z-index: 10000;
                            display: flex; align-items: flex-start; justify-content: center;
                            overflow-y: auto;
                            backdrop-filter: blur(5px);
                        }
                        .lf-modal-overlay.hide { display: none !important; }
                        
                        .listItem { 
                            display: flex; align-items: center; padding: 14px; 
                            background: rgba(255,255,255,0.03);
                            border-radius: 4px;
                            margin-bottom: 4px;
                        }
                        .listItem:hover {
                            background: rgba(255,255,255,0.06);
                        }
                        .listItemBody { flex: 1; margin: 0 16px; }
                        .secondary { font-size: 0.85rem; opacity: 0.6; margin-top: 4px; }
                        
                        .btnDelete { 
                            background: rgba(233, 30, 99, 0.15) !important; 
                            border: 1px solid rgba(233, 30, 99, 0.3) !important; 
                            color: #ff4081 !important; 
                            cursor: pointer; 
                            border-radius: 4px;
                            padding: 8px;
                            display: flex;
                        }
                        .btnDelete:hover { 
                            background: rgba(233, 30, 99, 0.25) !important; 
                        }
                        
                        .btnDownload { 
                            background: rgba(255,255,255,0.1) !important; 
                            border: none !important; 
                            color: white !important; 
                            cursor: pointer; 
                            border-radius: 4px;
                            padding: 8px 16px;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            font-weight: 500;
                            font-size: 0.9rem;
                        }
                        .btnDownload:hover { background: rgba(255,255,255,0.2) !important; }

                        /* Custom Scrollbar for Modal */
                        .smoothScrollY::-webkit-scrollbar { width: 8px; }
                        .smoothScrollY::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                        .smoothScrollY::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
                    </style>
                </div >
        `;
            document.body.insertAdjacentHTML('beforeend', html);
        },

        async loadCurrentSubtitles(episodeId) {
            const listContainer = document.querySelector('#lfCurrentSubsList');
            const infoBox = document.querySelector('#lfSubtitleTargetInfo');

            listContainer.innerHTML = '<div style="padding: 10px; opacity: 0.6;">Fetching subtitles...</div>';

            try {
                const auth = await getAuth();
                const response = await fetch(`/ Users / ${auth.UserId} /Items/${episodeId} `, {
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });
                const data = await response.json();

                // Update Info Box
                if (infoBox) {
                    const seasonName = data.SeasonName || (data.ParentIndexNumber ? `Season ${data.ParentIndexNumber} ` : '');
                    const epNum = data.IndexNumber ? `E${data.IndexNumber} ` : '';
                    const fullCode = (data.ParentIndexNumber && data.IndexNumber)
                        ? `S${String(data.ParentIndexNumber).padStart(2, '0')}E${String(data.IndexNumber).padStart(2, '0')} `
                        : epNum;

                    infoBox.innerHTML = `
        < div style = "font-weight: 600; color: var(--clr-text-main); font-size: 1rem;" > ${data.Name}</div >
            <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 2px;">
                ${data.SeriesName || ''} • ${seasonName} • ${fullCode}
            </div>
    `;
                }

                // Get streams
                const streams = (data.MediaSources?.[0]?.MediaStreams || []).filter(s => s.Type === 'Subtitle');

                if (streams.length === 0) {
                    listContainer.innerHTML = '<div style="padding: 10px; opacity: 0.6;">No subtitles found.</div>';
                    return;
                }

                listContainer.innerHTML = streams.map((s, index) => `
        < div class="listItem" >
                        <span class="material-icons" style="opacity: 0.7;">closed_caption</span>
                        <div class="listItemBody">
                            <div style="font-weight: 500;">${s.DisplayTitle || s.Title || s.Language || 'Unknown'}</div>
                            <div class="secondary">${s.IsExternal ? 'External' : 'Embedded'} • ${s.Codec || ''} • ${s.IsForced ? 'Forced' : 'Default'}</div>
                        </div>
                        ${s.IsExternal ? `
                        <button class="btnDelete" data-index="${s.Index}" title="Delete">
                            <span class="material-icons" style="font-size: 18px;">delete</span>
                        </button>` : ''
                    }
                    </div >
        `).join('');

                // Bind delete buttons
                listContainer.querySelectorAll('.btnDelete').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const index = e.currentTarget.dataset.index;
                        if (confirm('Are you sure you want to delete this subtitle?')) {
                            this.deleteSubtitle(episodeId, index, e.currentTarget);
                        }
                    });
                });

            } catch (e) {
                log('Error loading subtitles:', e);
                listContainer.innerHTML = `< div style = "color: #ff5252;" > Error loading subtitles: ${e.message}</div > `;
                if (infoBox) infoBox.textContent = 'Error loading episode info.';
            }
        },

        async deleteSubtitle(episodeId, subtitleIndex, buttonElement) {
            // Optimistic UI
            if (buttonElement) {
                buttonElement.innerHTML = '<span class="material-icons spinning">sync</span>';
            }

            try {
                const auth = await getAuth();
                // Endpoint: DELETE /Videos/{Id}/Subtitles/{Index}
                const response = await fetch(`/ Videos / ${episodeId} /Subtitles/${subtitleIndex} `, {
                    method: 'DELETE',
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });

                if (!response.ok) {
                    throw new Error(`Delete failed: ${response.statusText} `);
                }

                // Success
                if (buttonElement) {
                    buttonElement.closest('.listItem').style.opacity = '0.5';
                }

                // Refresh list
                setTimeout(() => {
                    this.loadCurrentSubtitles(episodeId);
                }, 1000);

            } catch (e) {
                console.error('Error deleting subtitle:', e);
                if (buttonElement) {
                    buttonElement.innerHTML = '<span class="material-icons" style="color: #ff5252;">error</span>';
                }
                alert('Failed to delete subtitle: ' + e.message);
            }
        },

        async searchSubtitles(episodeId, language) {
            const resultsContainer = document.querySelector('#lfSubtitleSearchResults');
            resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.6;">Searching...</div>';

            try {
                const auth = await getAuth();
                const url = `/ Items / ${episodeId} /RemoteSearch/Subtitles / ${language} `;
                const response = await fetch(url, {
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });
                const data = await response.json(); // Array of RemoteSubtitleInfo

                if (!data || data.length === 0) {
                    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.6;">No results found.</div>';
                    return;
                }

                resultsContainer.innerHTML = data.map(sub => `
        < div class="listItem" >
                        <div class="listItemBody">
                            <div style="font-weight: 500;">${sub.Name}</div>
                            <div class="secondary">
                                <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${sub.Format || 'SRT'}</span>
                                <span style="margin-left: 8px;">${sub.ProviderName || 'Unknown Provider'}</span>
                                <span style="margin-left: 8px;">Downloads: ${sub.DownloadCount || 0}</span>
                            </div>
                        </div>
                        <button class="btnDownload" data-id="${sub.Id}" title="Download">
                            <span class="material-icons">cloud_download</span>
                            <span>Download</span>
                        </button>
                    </div >
        `).join('');

                // Bind download buttons
                resultsContainer.querySelectorAll('.btnDownload').forEach(btn => {
                    btn.addEventListener('click', (e) => this.download(episodeId, e.currentTarget.dataset.id));
                });

            } catch (e) {
                log('Error searching:', e);
                resultsContainer.innerHTML = `< div style = "color: #ff5252;" > Search failed: ${e.message}</div > `;
            }
        },

        async download(episodeId, subtitleId) {
            const resultsContainer = document.querySelector('#lfSubtitleSearchResults');
            // Optimistic UI
            const btn = resultsContainer.querySelector(`button[data - id= "${subtitleId}"]`);
            if (btn) btn.innerHTML = '<span class="material-icons spinning">sync</span>';

            try {
                const auth = await getAuth();
                // Standard Jellyfin download endpoint
                await fetch(`/ Items / ${episodeId} /RemoteSearch/Subtitles / ${subtitleId} `, {
                    method: 'POST',
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });

                if (btn) {
                    btn.innerHTML = '<span class="material-icons" style="color: #4caf50;">check_circle</span>';
                }

                // Refresh list
                setTimeout(() => {
                    this.loadCurrentSubtitles(episodeId);
                }, 1000);

            } catch (e) {
                log('Download error:', e);
                if (btn) btn.innerHTML = '<span class="material-icons" style="color: #ff5252;">error</span>';
            }
        },

        attachListeners(modal) {
            // Navigation Listeners
            const seasonSelect = modal.querySelector('#lfSubSeasonSelect');
            const epSelect = modal.querySelector('#lfSubEpisodeSelect');

            seasonSelect?.addEventListener('change', async (e) => {
                const seasonId = e.target.value;
                // Update episodes list
                await this.updateEpisodesForSeason(modal, seasonId);

                // Select first episode of new season and load
                const newEpId = epSelect.value;
                if (newEpId) {
                    modal.dataset.episodeId = newEpId;
                    this.loadCurrentSubtitles(newEpId);
                }
            });

            epSelect?.addEventListener('change', (e) => {
                const newEpId = e.target.value;
                modal.dataset.episodeId = newEpId;
                this.loadCurrentSubtitles(newEpId);
            });

            // Close (Cancel Button)
            modal.querySelector('.btnCancel').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal(modal);
            });

            // Click outside (Overlay click)
            modal.addEventListener('click', (e) => {
                // Close if the click is NOT inside the dialog content box (.focuscontainer)
                if (!e.target.closest('.focuscontainer')) {
                    this.closeModal(modal);
                }
            });

            // Search
            const form = modal.querySelector('.subtitleSearchForm');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const lang = modal.querySelector('#selectLanguage').value;
                const episodeId = modal.dataset.episodeId;
                this.searchSubtitles(episodeId, lang);
            });
        },

        closeModal(modal) {
            modal.classList.add('hide');
            modal.classList.remove('opened');
            document.body.style.overflow = ''; // Restore scroll
        }
    };

    // Observer setup (keeping the rest of the file)
    // ===================================
    function attachEventListeners(container) {
        console.log('[DEBUG] attachEventListeners called');
        // Season dropdown toggle
        const seasonSelector = container.querySelector('#lfSeasonSelector');
        if (seasonSelector) {
            const button = seasonSelector.querySelector('.lf-season-selector__button:not([disabled])');
            button?.addEventListener('click', () => seasonSelector.classList.toggle('is-open'));
        }

        // Language Selector
        const langSelector = container.querySelector('#lfLangSelector');
        if (langSelector) {
            const btn = langSelector.querySelector('.lf-filter-btn');
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelector('#lfSortDropdown')?.classList.remove('is-open');
                container.querySelector('#lfFilterDropdown')?.classList.remove('is-open');
                langSelector.classList.toggle('is-open');
            });

            // Handle options (Audio/Subtitle)
            langSelector.querySelectorAll('.lf-filter-dropdown__option').forEach(opt => {
                opt.addEventListener('click', function () {
                    const type = this.dataset.type; // 'audio' or 'subtitle'
                    const lang = this.dataset.lang;

                    // Update selected state in UI (per section)
                    const section = this.closest('.lf-lang-section');
                    section.querySelectorAll('.lf-filter-dropdown__option').forEach(o => {
                        o.classList.remove('is-selected');
                        const check = o.querySelector('.material-icons');
                        if (check && check.textContent === 'check') check.remove();
                    });

                    this.classList.add('is-selected');
                    // Add checkmark if not present
                    if (!this.querySelector('.material-icons')) {
                        const check = document.createElement('span');
                        check.className = 'material-icons';
                        check.textContent = 'check';
                        this.appendChild(check);
                    }

                    // Save preference
                    if (type === 'audio') localStorage.setItem('legitflix-audio-pref', lang);
                    if (type === 'subtitle') localStorage.setItem('legitflix-sub-pref', lang);

                    console.log(`[DEBUG] Language selected: ${type} -> ${lang} `);

                    // Actually switch stream?
                    // We might need to reload or notify playback logic vs simple pref save
                    // For now we just update UI as requested
                });
            });

            // Edit Subtitles Button
            const editSubsBtn = langSelector.querySelector('#lfEditSubsBtn');
            editSubsBtn?.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Get target ID (Episode ID)
                // We prefer the button's dataset attribute if available
                const targetId = this.dataset.episodeId || currentSeriesId; // Fallback if needed, though usually incorrect for subs

                console.log('[DEBUG] Edit Subtitles Clicked. Target:', targetId);

                if (targetId) {
                    SubtitleManager.show(targetId);
                } else {
                    console.error('No target ID for subtitle editor');
                }

                langSelector.classList.remove('is-open');
            });

            document.addEventListener('click', (e) => {
                if (!langSelector?.contains(e.target)) langSelector?.classList.remove('is-open');
            });
        }

        // Sort dropdown
        const sortDropdown = container.querySelector('#lfSortDropdown');
        if (sortDropdown) {
            const button = sortDropdown.querySelector('.lf-filter-btn');
            button?.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelector('#lfFilterDropdown')?.classList.remove('is-open');
                container.querySelector('#lfLangSelector')?.classList.remove('is-open');
                sortDropdown.classList.toggle('is-open');
            });

            sortDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(opt => {
                opt.addEventListener('click', function () {
                    const sortType = this.dataset.sort;
                    container.querySelector('#lfSortText').textContent = sortType === 'newest' ? 'Newest' : 'Oldest';

                    sortDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(o => o.classList.remove('is-selected'));
                    this.classList.add('is-selected');
                    sortDropdown.classList.remove('is-open');

                    // Reverse episode grid
                    const grid = container.querySelector('.lf-episode-grid');
                    if (grid) {
                        const cards = Array.from(grid.children);
                        cards.reverse();
                        grid.innerHTML = '';
                        cards.forEach(card => grid.appendChild(card));
                    }
                });
            });
        }

        // Filter dropdown
        const filterDropdown = container.querySelector('#lfFilterDropdown');
        if (filterDropdown) {
            const button = filterDropdown.querySelector('.lf-filter-btn');
            button?.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelector('#lfSortDropdown')?.classList.remove('is-open');
                container.querySelector('#lfLangSelector')?.classList.remove('is-open');
                filterDropdown.classList.toggle('is-open');
            });

            filterDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(opt => {
                opt.addEventListener('click', function () {
                    const filterType = this.dataset.filter;
                    const textMap = { all: 'All', watched: 'Watched', unwatched: 'Unwatched' };
                    container.querySelector('#lfFilterText').textContent = textMap[filterType];

                    filterDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(o => o.classList.remove('is-selected'));
                    this.classList.add('is-selected');
                    filterDropdown.classList.remove('is-open');

                    // Filter episodes
                    // Filter episodes
                    container.querySelectorAll('.lf-episode-card').forEach(card => {
                        const isWatched = card.classList.contains('is-watched');

                        if (filterType === 'all') {
                            card.style.display = '';
                        } else if (filterType === 'watched' && isWatched) {
                            card.style.display = '';
                        } else if (filterType === 'unwatched' && !isWatched) {
                            card.style.display = '';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            });
        }

        // Description expand/collapse
        const loadMoreBtn = container.querySelector('#lfLoadMoreBtn');
        const descText = container.querySelector('#lfDescriptionText');

        if (loadMoreBtn && descText) {
            // Check if text is clamped (overflowing)
            // We use a small tolerance
            if (descText.scrollHeight <= descText.clientHeight + 2) {
                loadMoreBtn.style.display = 'none';
            }

            loadMoreBtn.addEventListener('click', function () {
                const isExpanded = descText.classList.toggle('is-expanded');
                this.classList.toggle('is-expanded', isExpanded);
                this.querySelector('span:first-child').textContent = isExpanded ? 'Show less' : 'Load more';
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!seasonSelector?.contains(e.target)) seasonSelector?.classList.remove('is-open');
            if (!sortDropdown?.contains(e.target)) sortDropdown?.classList.remove('is-open');
            if (!filterDropdown?.contains(e.target)) filterDropdown?.classList.remove('is-open');
        });

        // Season selection UI (Update text & close)
        // Season selection UI (Update text & close)
        // Logic moved to wireUpButtons to prevent duplication and ensure consistency
        // (Deleted legacy block to fix 'tempDiv' null error)
    }

    // =========================================================================
    // MAIN RENDER FUNCTION
    // =========================================================================

    /**
     * Render the complete series detail page
     * @param {Object} data - Object containing series, seasons, episodes, people, similar
     * @param {HTMLElement} targetContainer - Container to inject into
     */
    function renderSeriesDetailPage(data, targetContainer) {
        const { series, seasons, episodes, people, similar, initialSeasonIndex = 0 } = data;

        // Debug initial episodes data
        if (episodes && episodes.length > 0) {
            console.log('[DEBUG] Initial Episodes Data:', episodes[0]);
            if (!episodes[0].MediaSources) console.warn('[DEBUG] No MediaSources in initial episodes!');
        } else {
            console.warn('[DEBUG] No episodes in initial data!');
        }

        injectStyles();

        // Build complete HTML
        const html = `
        < div class="lf-series-container" id = "${CONFIG.containerId}" >
            ${createHeroSection(series)}
                ${createEpisodesSection(seasons, episodes, initialSeasonIndex)}
                ${createCastSection(people)}
                ${createSimilarSection(similar)}
            </div >
        `;

        // Inject into target
        targetContainer.innerHTML = html;

        // Attach event listeners
        const container = document.getElementById(CONFIG.containerId);
        attachEventListeners(container);

        // Enforce grid styles on initial load
        const initialGrid = container.querySelector('.lf-episode-grid');
        if (initialGrid) enforceGridStyles(initialGrid);

        // Parent Observer: Watch for Grid Replacements or Style Changes
        const episodesSection = container.querySelector('#lfEpisodesSection');
        if (episodesSection) {
            const handleMutations = () => {
                // Find the direct parent of episode cards
                const firstCard = episodesSection.querySelector('.lf-episode-card');
                if (firstCard && firstCard.parentElement) {
                    const gridContainer = firstCard.parentElement;

                    // Check if styles are missing or incorrect
                    const computed = window.getComputedStyle(gridContainer);
                    if (computed.display !== 'grid' || gridContainer.style.display !== 'grid') {
                        console.log('[DEBUG] Fixing grid layout on container:', gridContainer.className);
                        enforceGridStyles(gridContainer);
                    }
                }
            };

            const parentObserver = new MutationObserver((mutations) => {
                handleMutations();
            });
            parentObserver.observe(episodesSection, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

            // Should also run immediately in case of race condition
            handleMutations();
        }

        log('Series detail page rendered');
    }

    // =========================================================================
    // API INTEGRATION (For Jellyfin)
    // =========================================================================

    /**
     * Get auth info from Jellyfin
     */
    async function getAuth() {
        if (!window.ApiClient) return null;
        const userId = window.ApiClient.getCurrentUserId();
        if (!userId) return null;
        return {
            UserId: userId,
            AccessToken: window.ApiClient.accessToken(),
            ServerId: window.ApiClient.serverId()
        };
    }

    /**
     * Fetch series details from API
     */
    async function fetchSeriesData(seriesId) {
        const auth = await getAuth();
        if (!auth) return null;

        try {
            // Added MediaSources to fields to get stream info (usually on episodes, but checking series)
            const fields = 'Overview,Genres,Studios,OfficialRating,CommunityRating,ImageTags,BackdropImageTags,People,RemoteTrailers,ChildCount,MediaSources';
            const url = `/ Users / ${auth.UserId} /Items/${seriesId}?Fields = ${fields} `;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const item = await response.json();

            // Transform to our format
            return {
                id: item.Id,
                name: item.Name,
                year: item.ProductionYear ? `${item.ProductionYear}${item.EndDate ? ' - ' + new Date(item.EndDate).getFullYear() : ''} ` : '',
                officialRating: item.OfficialRating || 'TV-14',
                communityRating: item.CommunityRating || 0,
                episodeCount: item.ChildCount || 0,
                overview: item.Overview || '',
                genres: item.Genres || [],
                studios: item.Studios || [],
                backdropUrl: item.BackdropImageTags?.length ? `/ Items / ${item.Id} /Images/Backdrop / 0 ? maxWidth = 1920 & quality=90` : '',
                posterUrl: item.ImageTags?.Primary ? `/ Items / ${item.Id} /Images/Primary ? fillHeight = 350 & fillWidth=240 & quality=96` : '',
                logoUrl: item.ImageTags?.Logo ? `/ Items / ${item.Id} /Images/Logo ? maxWidth = 300 & quality=90` : '',
                people: item.People || [],
                remoteTrailers: item.RemoteTrailers || [],
                isFavorite: item.UserData?.IsFavorite || false,
                userData: item.UserData || {} // Expose full UserData
            };
        } catch (e) {
            log('Error fetching series data:', e);
            return null;
        }
    }

    /**
     * Fetch seasons for a series
     */
    async function fetchSeasons(seriesId) {
        const auth = await getAuth();
        if (!auth) return [];

        try {
            const url = `/ Shows / ${seriesId}/Seasons?UserId=${auth.UserId}&Fields=ItemCounts`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const data = await response.json();

            return (data.Items || []).map(season => ({
                id: season.Id,
                name: season.Name || `Season ${season.IndexNumber}`,
                indexNumber: season.IndexNumber,
                episodeCount: season.ChildCount || season.RecursiveItemCount || 0
            }));
        } catch (e) {
            log('Error fetching seasons:', e);
            return [];
        }
    }

    /**
     * Fetch episodes for a season
     */
    async function fetchEpisodes(seriesId, seasonId) {
        const auth = await getAuth();
        if (!auth) return [];

        try {
            const fields = 'Overview,PrimaryImageAspectRatio,UserData,RunTimeTicks,MediaSources';
            const url = `/Shows/${seriesId}/Episodes?SeasonId=${seasonId}&UserId=${auth.UserId}&Fields=${fields}&_t=${Date.now()}`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const data = await response.json();

            return (data.Items || []).map(ep => ({
                id: ep.Id,
                indexNumber: ep.IndexNumber || 0,
                name: ep.Name || `Episode ${ep.IndexNumber}`,
                overview: ep.Overview || '',
                thumbnailUrl: ep.ImageTags?.Primary ? `/Items/${ep.Id}/Images/Primary?fillHeight=180&fillWidth=320&quality=90` : '',
                runTimeTicks: ep.RunTimeTicks || 0,
                MediaSources: ep.MediaSources || [], // Pass through MediaSources
                userData: {
                    PlayedPercentage: ep.UserData?.PlayedPercentage || 0,
                    Played: ep.UserData?.Played || false
                }
            }));
        } catch (e) {
            log('Error fetching episodes:', e);
            return [];
        }
    }

    /**
     * Fetch similar items
     */
    async function fetchSimilar(seriesId) {
        const auth = await getAuth();
        if (!auth) return [];

        try {
            // Strict type filtering
            const url = `/Items/${seriesId}/Similar?Limit=12&UserId=${auth.UserId}&IncludeItemTypes=Series`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const data = await response.json();

            return (data.Items || []).map(item => ({
                Id: item.Id,
                Name: item.Name,
                posterUrl: item.ImageTags?.Primary ? `/Items/${item.Id}/Images/Primary?fillHeight=225&fillWidth=150&quality=90` : ''
            }));
        } catch (e) {
            log('Error fetching similar:', e);
            return [];
        }
    }

    /**
     * Format people with image URLs
     */
    function formatPeople(people) {
        return people.filter(p => p.Type === 'Actor').slice(0, 15).map(person => ({
            Id: person.Id,
            Name: person.Name,
            Type: person.Type,
            Role: person.Role || '',
            imageUrl: person.PrimaryImageTag ? `/Items/${person.Id}/Images/Primary?fillHeight=100&fillWidth=100&quality=90` : ''
        }));
    }

    /**
     * Get YouTube video ID from URL
     */
    function getYoutubeId(url) {
        if (!url) return null;
        if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        if (url.includes('embed/')) return url.split('embed/')[1].split('?')[0];
        return null;
    }

    /**
     * Build YouTube embed URL
     */
    function buildYoutubeEmbedUrl(videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${videoId}`;
    }

    // =========================================================================
    // PAGE DETECTION & INJECTION
    // =========================================================================

    let isInjecting = false; // Flag to prevent multiple injections
    let currentMovieId = null;

    // Function to check the current URL and inject/remove content
    async function checkUrl() {
        const hash = window.location.hash;

        if (hash.includes('details?id=')) {
            const id = new URLSearchParams(hash.split('?')[1]).get('id');
            if (id) {
                const currentContainer = document.getElementById(CONFIG.containerId);

                // If ID changed or not injected
                if (!currentContainer || currentContainer.dataset.itemId !== id) {
                    if (isInjecting) return; // Prevent double injection

                    if (currentContainer) currentContainer.remove();
                    currentMovieId = id;

                    // Check if it is a movie (simple check, or fetch type)
                    isInjecting = true;
                    // injectMoviePage(id).catch(err => {
                    //    console.error('[LF] Injection failed', err);
                    //    isInjecting = false;
                    // });
                    console.log('[LF] Legacy injection skipped. Handled by Movie Module.');
                }
            }
        } else if (hash.includes('login')) {
            injectLoginRevamp();
        } else {
            removeLoginOverlay();
            currentMovieId = null;
            const container = document.getElementById(CONFIG.containerId);
            if (container) {
                container.remove();
                const detailPage = document.querySelector('.itemDetailPage');
                if (detailPage) detailPage.style.display = '';
            }
            // Ensure loader is gone if we are just navigating normal pages
            if (window.LF_RemoveLoader) window.LF_RemoveLoader();
        }
    }

    /**
     * Inject global style overrides
     */
    function injectOverridesStyles() {
        const styleId = 'lf-movie-overrides';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Force hide original elements */
            .itemDetailPage #itemBackdrop,
            .itemDetailPage .detailPageWrapperContainer, 
            .itemDetailPage .detailRibbon,
            .itemDetailPage .detailPagePrimaryContent,
            .itemDetailPage .detailPagePrimaryContainer,
            .itemDetailPage .detailPageSecondaryContainer {
                display: none !important;
            }

            /* Force background and reset padding on main containers */
            .itemDetailPage,
            .itemDetailPage.page,
            .backgroundContainer,
            [data-role="page"].itemDetailPage {
                background-image: none !important;
                background-color: var(--clr-bg-main, #141414) !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                margin-top: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }

    // MAIN LOGIC
    async function injectMoviePage(itemId) {
        if (!isInjecting) return;

        try {
            log('Injecting movie page for ID:', itemId);
            // Fetch movie data first to check Type
            const [dataWrapper, similar] = await Promise.all([
                fetchMovieData(itemId),
                fetchSimilar(itemId)
            ]);

            if (!dataWrapper) {
                throw new Error('Could not fetch movie data.');
            }

            // Unpack if wrapped (fetchMovieData returns { item: ... })
            const movieItem = dataWrapper.item || dataWrapper;

            // CHECK TYPE: Allow only Movies
            if (movieItem.Type !== 'Movie') {
                console.log('[LF] Item is ' + movieItem.Type + ' (not Movie). Aborting injection.');
                isInjecting = false;
                // Ensure default UI is visible
                const detailPage = document.querySelector('.itemDetailPage');
                if (detailPage) detailPage.style.display = '';
                // Remove our overrides style if it exists
                const overrides = document.getElementById('lf-movie-overrides');
                if (overrides) overrides.remove();
                return;
            }

            // It IS a movie -> Hide default UI
            injectOverridesStyles();
            const detailPage = document.querySelector('.itemDetailPage');
            if (detailPage) detailPage.style.display = 'none';

            // Use the unpacked item for rendering
            const movieData = movieItem;

            // CONTAINER FINDER STRATEGY (Robust)
            let targetContainer = document.querySelector('.pageContainer');
            if (!targetContainer) targetContainer = document.querySelector('.mainAnimatedPages');
            if (!targetContainer) targetContainer = document.querySelector('.skinBody');
            if (!targetContainer) targetContainer = document.body;

            // Create wrapper
            const container = document.createElement('div');
            container.id = CONFIG.containerId;
            container.className = 'lf-movie-container';
            container.dataset.itemId = itemId;

            // Render UI
            let html = createHeroSection(movieData);
            html += createPlayerSection(movieData);

            // Format people for display
            const people = movieData.People ? formatPeople(movieData.People) : [];
            if (people.length > 0) html += createCastSection(people);

            if (similar && similar.length > 0) html += createSimilarSection(similar);

            container.innerHTML = html;

            if (targetContainer) {
                targetContainer.appendChild(container);
            } else {
                console.error('[LF] Critical: No valid parent container found.');
            }

            // Wire up buttons
            let trailerYtId = null;
            if (movieData.RemoteTrailers && movieData.RemoteTrailers.length > 0) {
                trailerYtId = getYoutubeId(movieData.RemoteTrailers[0].Url);
            }
            wireUpButtons(itemId, movieData, trailerYtId);

            isInjecting = false;
            log('Movie detail page injected successfully');
        } catch (e) {
            console.error('Error injecting movie page:', e);
            isInjecting = false;
            // Show original Jellyfin detail page content on error
            const detailPage = document.querySelector('.itemDetailPage');
            if (detailPage) detailPage.style.display = '';
        }
    }

    /**
     * Wire up button functionality
     */
    function wireUpButtons(seriesId, seriesData, trailerYtId) {
        const container = document.getElementById(CONFIG.containerId);
        if (!container) return;

        // Watch Now / Play Button (Simplified for Movie)
        const watchNowBtn = container.querySelector('#lfWatchNowBtn');
        if (watchNowBtn) {
            // Check if played
            const isPlayed = seriesData.UserData?.Played; // Note: fetchMovieData returns pascalCase UserData inside keys? No, fetchMovieData returns camelCase format except UserData is mostly raw.
            // Let's check fetchMovieData implementation. It returns `userData: item.UserData`.
            // So we should access `seriesData.userData.Played`.

            const userData = seriesData.userData || {};
            const isPlayedStat = userData.Played;
            const pct = userData.PlayedPercentage;

            if (isPlayedStat) {
                watchNowBtn.innerHTML = '<span class="material-icons">replay</span> Watch Again';
            } else if (pct && pct > 0) {
                watchNowBtn.innerHTML = `<span class="material-icons">play_arrow</span> Resume ${Math.round(pct)}%`;
            } else {
                watchNowBtn.innerHTML = '<span class="material-icons">play_arrow</span> Play';
            }

            watchNowBtn.addEventListener('click', () => {
                if (window.legitFlixPlay) window.legitFlixPlay(seriesId);
                else window.location.href = `#!/details?id=${seriesId}`; // Fallback navigating to self usually triggers play in some contexts or just does nothing. Ideally calling play API.
            });
        }

        // Trailer button
        const trailerBtn = container.querySelector('#lfTrailerBtn');
        const trailerContainer = container.querySelector('#lfHeroTrailer');
        const trailerIframe = container.querySelector('#lfTrailerIframe');
        const backdrop = container.querySelector('#lfHeroBackdrop');
        const muteBtn = container.querySelector('#lfMuteBtn');

        if (trailerBtn && trailerYtId) {
            trailerBtn.addEventListener('click', () => {
                const isPlaying = trailerContainer.classList.contains('is-playing');
                if (isPlaying) {
                    // Stop
                    trailerIframe.src = '';
                    trailerContainer.classList.remove('is-playing');
                    trailerBtn.innerHTML = '<span class="material-icons">play_circle_filled</span> Watch Trailer';
                    if (backdrop) backdrop.style.opacity = '1';
                    if (muteBtn) muteBtn.style.display = 'none';
                } else {
                    // Play
                    const origin = window.location.origin;
                    const embedUrl = `https://www.youtube.com/embed/${trailerYtId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&controls=0&disablekb=1&playlist=${trailerYtId}&enablejsapi=1&origin=${origin}`;
                    trailerIframe.src = embedUrl;
                    trailerContainer.classList.add('is-playing');
                    trailerBtn.innerHTML = '<span class="material-icons">stop_circle</span> Stop Trailer';
                    if (backdrop) backdrop.style.opacity = '0';
                    if (muteBtn) {
                        muteBtn.style.display = 'flex';
                        muteBtn.classList.add('is-muted');
                        muteBtn.innerHTML = '<span class="material-icons">volume_off</span>';
                    }
                }
            });

            // Mute logic
            if (muteBtn) {
                muteBtn.addEventListener('click', () => {
                    const isMuted = muteBtn.classList.contains('is-muted');
                    const targetOrigin = '*';
                    if (trailerIframe.contentWindow) {
                        const func = isMuted ? 'unMute' : 'mute';
                        trailerIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), targetOrigin);
                        muteBtn.classList.toggle('is-muted');
                        muteBtn.innerHTML = isMuted ? '<span class="material-icons">volume_up</span>' : '<span class="material-icons">volume_off</span>';
                    }
                });
            }
        } else if (trailerBtn) {
            trailerBtn.style.display = 'none';
        }
    }

    /**
     * Start monitoring loop
     */
    function startMonitoring() {
        log('Starting monitor...');
        // Initial check
        checkUrl();

        // Polling fallback
        setInterval(checkUrl, 500);
    }



    // =========================================================================
    // =========================================================================
    // PUBLIC API
    // =========================================================================
    window.LFMovieDetail = {
        // UI generators
        injectStyles,
        renderSeriesDetailPage, // Wrapper reused
        createHeroSection,
        createPlayerSection,
        createCastSection,
        createSimilarSection,

        // API functions
        fetchMovieData,
        fetchSimilar,

        // Page monitoring
        checkUrl,
        startMonitoring,

        // Demo data
        DEMO_DATA: {
            // Simplified Movie Demo Data
            item: {
                Id: 'demo-movie',
                Name: 'Your Lie in April: The Movie',
                Overview: 'Piano prodigy Kosei Arima dominates competitions until tragedy strikes.',
                CommunityRating: 8.9,
                RunTimeTicks: 72000000000, // 2 hours
                ProductionYear: 2016,
                OfficialRating: 'TV-14',
                Genres: ['Drama', 'Romance', 'Music'],
                Studios: [{ Name: 'A-1 Pictures' }],
                People: [
                    { Id: 'p1', Name: 'Kento Yamazaki', Type: 'Actor', Role: 'Kousei Arima' },
                    { Id: 'p2', Name: 'Suzu Hirose', Type: 'Actor', Role: 'Kaori Miyazono' }
                ],
                UserData: { Played: false, PlayedPercentage: 0 }
            },
            similar: {
                Items: [
                    { Id: 's1', Name: 'Orange', posterUrl: '' },
                    { Id: 's2', Name: 'Blue Spring Ride', posterUrl: '' }
                ]
            }
        },

        // Quick demo function for browser testing
        demo: function (targetSelector = 'body') {
            const target = document.querySelector(targetSelector);
            if (!target) {
                console.error('Target not found:', targetSelector);
                return;
            }
            target.style.backgroundColor = '#141414';
            target.style.fontFamily = "'Inter', sans-serif";

            // Inject styles first
            injectStyles();

            // Render
            const html = createHeroSection(this.DEMO_DATA.item) +
                createPlayerSection(this.DEMO_DATA.item) +
                createCastSection(this.DEMO_DATA.item.People) +
                createSimilarSection(this.DEMO_DATA.similar.Items);

            const wrapper = document.createElement('div');
            wrapper.className = 'lf-movie-container';
            wrapper.innerHTML = html;
            target.appendChild(wrapper);

            log('Demo rendered into:', targetSelector);
        }
    };

    // =========================================================================
    // AUTO-START (Only when running on Jellyfin)
    // =========================================================================

    // Check if we're in Jellyfin (ApiClient exists or will exist)
    const checkAndStart = () => {
        if (window.ApiClient) {
            log('Detected Jellyfin environment. Starting monitoring...');
            startMonitoring();
        } else if (window.location.href.includes('file://')) {
            log('Detected local file mode. Call LFMovieDetail.demo() to test.');
        } else {
            // Wait for ApiClient to appear
            setTimeout(checkAndStart, 500);
        }
    };

    // Start after a short delay to let Jellyfin initialize
    if (window.location.href.includes('login') || window.location.hash.includes('login')) {
        injectLoginRevamp();
    }
    setTimeout(checkAndStart, 1000);

    log('Movie Module loaded. Call LFMovieDetail.demo() to test.');

})();/**
 * LegitFlix Series Detail Page Revamp
 * Crunchyroll-inspired series page injection module
 * 
 * This module can be loaded directly in the browser for prototyping,
 * or integrated into legitflix-theme.js for production use.
 */

(function () {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    const CONFIG = {
        debug: true,
        cssId: 'lf-series-revamp-styles',
        containerId: 'lf-series-detail-container'
    };

    const log = (...args) => CONFIG.debug && console.log('[LF-Series]', ...args);

    // =========================================================================
    // CSS STYLES (Extracted from Seriespage.html)
    // =========================================================================
    const SERIES_DETAIL_CSS = `
        /* ============================================
           LEGITFLIX COLOR VARIABLES
           ============================================ */
        .lf-series-container {
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

        .lf-series-container * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* ============================================
           SERIES HERO SECTION (70vh, 100% width)
           ============================================ */
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
            transition: opacity 0.5s ease;
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

        .lf-series-hero__trailer iframe,
        .lf-series-hero__trailer video {
            width: 100%;
            height: 100%;
            object-fit: cover;
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
            transition: all 0.5s ease;
        }

        .lf-series-hero__poster {
            flex-shrink: 0;
            width: 220px;
            aspect-ratio: 2 / 3;
            object-fit: cover;
            border-radius: var(--radius-lg);
            border: 2px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
            margin-top: auto; /* Align to bottom of padded area */
        }

        .lf-series-hero__info {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-start; /* Expand downwards */
            padding-top: 40vh; /* Push content down initially */
            gap: 12px;
        }

        .lf-series-hero__title {
            font-family: var(--font-display);
            font-size: 2.2rem;
            font-weight: 700;
            line-height: 1.2;
            color: var(--clr-text-main);
        }

        .lf-series-hero__meta {
            display: flex;
            align-items: center;
            gap: 16px;
            color: var(--clr-text-muted);
            font-size: 0.9rem;
        }

        .lf-series-hero__rating {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #ffc107;
        }

        .lf-series-hero__details {
            display: flex;
            gap: 3rem;
            align-items: flex-start;
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
        }

        .lf-series-hero__description-text.is-expanded {
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

        .lf-series-hero__load-more:hover {
            color: var(--clr-accent-hover);
        }

        .lf-series-hero__load-more .material-icons {
            font-size: 18px;
            transition: transform 0.2s ease;
        }

        .lf-series-hero__load-more.is-expanded .material-icons {
            transform: rotate(180deg);
        }

        .lf-series-hero__cast-info {
            flex: 0 0 280px;
            font-size: 0.85rem;
            color: var(--clr-text-muted);
            line-height: 1.8;
        }

        .lf-series-hero__cast-info strong {
            color: var(--clr-text-main);
        }

        .lf-series-hero__actions {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
        }

        .lf-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border-radius: var(--radius-md);
            font-family: var(--font-primary);
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
        }

        .lf-btn--primary {
            background: var(--clr-accent);
            color: white;
        }

        .lf-btn--primary:hover {
            background: var(--clr-accent-hover);
        }

        .lf-btn--glass {
            background: var(--clr-bg-glass);
            color: white;
            backdrop-filter: blur(10px);
        }

        .lf-btn--glass:hover {
            background: var(--clr-bg-glass-hover);
        }

        .lf-btn--icon-only {
            padding: 12px;
        }

        .lf-btn--heart {
            transition: background 0.2s ease, border-color 0.2s ease;
            border: 1px solid transparent;
        }

        .lf-btn--heart:hover {
            background: var(--clr-bg-glass-hover);
        }

        .lf-btn--heart .material-icons {
            transition: color 0.2s ease;
        }

        .lf-btn--heart.is-liked {
            background: rgba(233, 30, 99, 0.2);
            border-color: var(--clr-heart);
        }

        .lf-btn--heart.is-liked .material-icons {
            color: var(--clr-heart);
        }

        .lf-btn--heart:active {
            transform: scale(0.9);
        }

        .lf-btn-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .lf-mute-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px; /* Match button height */
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .lf-mute-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: white;
        }

        .lf-mute-btn.is-muted {
            opacity: 0.7;
        }

        /* ============================================
           CONTENT SECTIONS
           ============================================ */
        .lf-content-section {
            width: 100%;
            padding: 30px var(--content-padding);
        }

        .lf-section-divider {
            border: none;
            border-top: 1px solid var(--clr-divider);
            margin: 0 var(--content-padding);
        }

        .lf-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .lf-section-title {
            font-family: var(--font-display);
            font-size: 1.3rem;
            font-weight: 600;
            color: var(--clr-text-main);
        }

        /* ============================================
           SEASON SELECTOR
           ============================================ */
        .lf-episodes-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .lf-season-selector {
            position: relative;
            display: inline-block;
        }

        .lf-season-selector__button {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: var(--clr-bg-surface);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            color: var(--clr-text-main);
            font-family: var(--font-primary);
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .lf-season-selector__button:hover {
            background: var(--clr-bg-glass-hover);
            border-color: var(--clr-accent);
        }

        .lf-season-selector__button .material-icons {
            font-size: 18px;
            transition: transform 0.2s ease;
        }

        .lf-season-selector.is-open .lf-season-selector__button .material-icons {
            transform: rotate(180deg);
        }

        .lf-season-selector__dropdown {
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            min-width: 180px;
            background: var(--clr-bg-surface);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
        }

        .lf-season-selector.is-open .lf-season-selector__dropdown {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .lf-season-selector__option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            color: var(--clr-text-muted);
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 0.85rem;
        }

        .lf-season-selector__option:first-child {
            border-radius: var(--radius-md) var(--radius-md) 0 0;
        }

        .lf-season-selector__option:last-child {
            border-radius: 0 0 var(--radius-md) var(--radius-md);
        }

        .lf-season-selector__option:hover {
            background: var(--clr-bg-glass);
            color: var(--clr-text-main);
        }

        .lf-season-selector__option.is-selected {
            color: var(--clr-accent);
            background: rgba(255, 106, 0, 0.1);
        }

        .lf-season-selector__option-count {
            margin-left: auto;
            font-size: 0.8rem;
            color: var(--clr-text-muted);
            opacity: 0.7;
        }

        /* Filter controls */
        .lf-filter-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }

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

        .lf-filter-btn:hover {
            background: var(--clr-bg-glass);
            color: var(--clr-text-main);
        }

        .lf-filter-btn .material-icons {
            font-size: 18px;
        }

        .lf-filter-dropdown {
            position: relative;
            display: inline-block;
        }

        .lf-filter-dropdown__menu {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            min-width: 150px;
            background: var(--clr-bg-surface);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
        }

        .lf-filter-dropdown.is-open .lf-filter-dropdown__menu {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .lf-filter-dropdown__option {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            color: var(--clr-text-muted);
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 0.85rem;
        }

        .lf-filter-dropdown__option:first-child {
            border-radius: var(--radius-md) var(--radius-md) 0 0;
        }

        .lf-filter-dropdown__option:last-child {
            border-radius: 0 0 var(--radius-md) var(--radius-md);
        }

        .lf-filter-dropdown__option:hover {
            background: var(--clr-bg-glass);
            color: var(--clr-text-main);
        }

        .lf-filter-dropdown__option.is-selected {
            color: var(--clr-accent);
            background: rgba(255, 106, 0, 0.1);
        }

        .lf-filter-dropdown__option .material-icons {
            font-size: 16px;
        }

        /* Language Selector Split */
        .lf-lang-menu {
            min-width: 220px;
            padding: 10px 0;
        }
        .lf-lang-section {
            padding-bottom: 5px;
        }
        .lf-dropdown-section-title {
            padding: 5px 15px;
            font-size: 0.75rem;
            text-transform: uppercase;
            color: var(--clr-text-muted);
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .lf-lang-separator {
            height: 1px;
            background: rgba(255,255,255,0.1);
            margin: 5px 0;
        }
        .lf-lang-footer {
            padding: 8px 10px 0 10px;
            border-top: 1px solid rgba(255,255,255,0.1);
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
        .lf-edit-subs-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.3);
        }
        .lf-edit-subs-btn .material-icons {
             font-size: 18px;
        }

        /* ============================================
           EPISODE GRID
           ============================================ */
        .lf-episode-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
        }

        .lf-episode-card {
            display: block;
            background: var(--clr-bg-surface);
            border-radius: var(--radius-lg);
            overflow: hidden;
            text-decoration: none;
            color: inherit;
            transition: all 0.25s ease;
            cursor: pointer;
            grid-column: auto !important; /* Force auto placement in grid */
            min-width: 0; /* Prevent grid blowout */
            width: 100%;
        }

        .lf-episode-card:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        }

        .lf-episode-card__thumbnail {
            position: relative;
            aspect-ratio: 16 / 9;
            overflow: hidden;
        }

        .lf-episode-card__thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .lf-episode-card:hover .lf-episode-card__thumbnail img {
            transform: scale(1.05);
        }

        .lf-episode-card__play-icon {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.4);
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .lf-episode-card:hover .lf-episode-card__play-icon {
            opacity: 1;
        }

        .lf-episode-card__play-icon .material-icons {
            font-size: 40px;
            color: white;
            background: var(--clr-accent);
            border-radius: 50%;
            padding: 10px;
        }

        .lf-episode-card__progress {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
        }

        .lf-episode-card__progress-bar {
            height: 100%;
            background: var(--clr-accent);
            transition: width 0.3s ease;
        }

        .lf-episode-card__badge {
            position: absolute;
            top: 8px;
            left: 8px;
            background: var(--clr-accent);
            color: white;
            font-weight: 700;
            font-size: 0.75rem;
            padding: 3px 8px;
            border-radius: var(--radius-sm);
        }

        .lf-episode-card__duration {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 0.7rem;
            padding: 3px 6px;
            border-radius: var(--radius-sm);
        }

        .lf-episode-card__info {
            padding: 12px;
        }

        .lf-episode-card__title {
            font-weight: 600;
            font-size: 0.9rem;
            margin-bottom: 4px;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            color: var(--clr-text-main);
        }

        .lf-episode-card__subtitle {
            color: var(--clr-text-muted);
            font-size: 0.8rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* BULK EDIT STYLES */
        .lf-episode-checkbox {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            background: rgba(0, 0, 0, 0.6);
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: scale(0.8);
            transition: all 0.2s ease;
            z-index: 10;
            pointer-events: none; /* Let parent handle click */
        }
        
        .lf-episode-checkbox .material-icons {
            font-size: 18px;
            color: white;
            opacity: 0;
            transform: scale(0);
            transition: all 0.2s ease;
        }

        .lf-episode-card.is-selecting-mode .lf-episode-checkbox {
            opacity: 1;
            transform: scale(1);
        }

        .lf-episode-card.is-selected .lf-episode-checkbox {
            background: var(--clr-accent);
            border-color: var(--clr-accent);
        }

        .lf-episode-card.is-selected .lf-episode-checkbox .material-icons {
            opacity: 1;
            transform: scale(1);
        }

        .lf-episode-card.is-selected {
            box-shadow: 0 0 0 2px var(--clr-accent);
        }
        
        .lf-episode-card.is-watched .lf-episode-card__thumbnail {
             opacity: 0.6;
        }
        
        /* Disable hover play icon in selection mode */
        .lf-episode-card.is-selecting-mode:hover .lf-episode-card__play-icon {
            opacity: 0;
        }

        /* Success Marked State (Green Tick) */
        .lf-episode-card.is-success-marked .lf-episode-checkbox,
        .lf-episode-card.is-watched .lf-episode-checkbox {
            opacity: 1;
            transform: scale(1);
            background: #4caf50;
            border-color: #4caf50;
        }
        .lf-episode-card.is-success-marked .lf-episode-checkbox .material-icons,
        .lf-episode-card.is-watched .lf-episode-checkbox .material-icons {
            opacity: 1;
            transform: scale(1);
        }

        /* Adjust hover behavior for checked items */
         .lf-episode-card.is-watched:hover .lf-episode-card__play-icon {
             /* Allow play icon to show on hover even if watched, to replay */
            opacity: 1;
        }


        /* ============================================
           CAST SECTION
           ============================================ */
        .lf-cast-grid {
            display: flex;
            gap: 16px;
            overflow-x: auto;
            padding: 10px 0;
        }

        .lf-cast-card {
            flex-shrink: 0;
            text-align: center;
            width: 100px;
            cursor: pointer;
        }

        .lf-cast-card__image {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            margin-bottom: 8px;
            border: 2px solid var(--clr-bg-surface);
            transition: border-color 0.2s ease, opacity 0.2s ease;
        }

        .lf-cast-card:hover .lf-cast-card__image {
            border-color: rgba(255, 255, 255, 0.4);
            opacity: 0.85;
        }

        .lf-cast-card__name {
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.2s ease;
            color: var(--clr-text-main);
        }

        .lf-cast-card:hover .lf-cast-card__name {
            color: var(--clr-text-main);
        }

        .lf-cast-card__role {
            font-size: 0.75rem;
            color: var(--clr-text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* ============================================
           MORE LIKE THIS
           ============================================ */
        .lf-similar-grid {
            display: flex;
            gap: 16px;
            overflow-x: auto;
            padding: 10px 0;
        }

        .lf-similar-card {
            flex-shrink: 0;
            width: 150px;
            text-decoration: none;
            color: inherit;
            transition: transform 0.2s ease;
            cursor: pointer;
        }

        .lf-similar-card:hover {
            transform: translateY(-4px);
        }

        .lf-similar-card__poster {
            width: 100%;
            aspect-ratio: 2/3;
            object-fit: cover;
            border-radius: var(--radius-md);
            margin-bottom: 8px;
            transition: box-shadow 0.2s ease;
        }

        .lf-similar-card:hover .lf-similar-card__poster {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .lf-similar-card__title {
            font-size: 0.85rem;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.2s ease;
            color: var(--clr-text-main);
        }

        .lf-similar-card:hover .lf-similar-card__title {
            color: var(--clr-accent);
        }

        /* ============================================
           RESPONSIVE
           ============================================ */
        @media (max-width: 900px) {
            .lf-series-hero__details {
                flex-direction: column;
            }

            .lf-series-hero__cast-info {
                flex: 1;
            }
        }

        @media (max-width: 768px) {
            .lf-series-hero {
                padding: 20px var(--content-padding);
                height: auto;
                min-height: 60vh;
            }

            .lf-series-hero__content {
                flex-direction: column;
                align-items: center;
                text-align: center;
            }

            .lf-series-hero__poster {
                width: 140px;
            }

            .lf-series-hero__title {
                font-size: 1.6rem;
            }

            .lf-series-hero__meta {
                justify-content: center;
                flex-wrap: wrap;
            }

            .lf-episode-grid {
                grid-template-columns: 1fr;
            }

            .lf-episodes-header {
                flex-direction: column;
                gap: 12px;
                align-items: flex-start;
            }
        }
    `;

    // =========================================================================
    // CSS INJECTION
    // =========================================================================
    function injectStyles() {
        if (document.getElementById(CONFIG.cssId)) return;

        const style = document.createElement('style');
        style.id = CONFIG.cssId;
        style.textContent = SERIES_DETAIL_CSS;
        document.head.appendChild(style);
        log('CSS injected');
    }

    // =========================================================================
    // UI GENERATORS
    // =========================================================================

    /**
     * Create hero section HTML
     * @param {Object} series - Series data object
     */
    function createHeroSection(series) {
        const backdropUrl = series.backdropUrl || '';
        const posterUrl = series.posterUrl || '';
        const title = series.name || 'Unknown Series';
        const year = series.year || '';
        const rating = series.officialRating || 'TV-14';
        const communityRating = series.communityRating ? series.communityRating.toFixed(1) : '';
        const episodeCount = series.episodeCount || 0;
        const description = series.overview || '';
        const genres = (series.genres || []).slice(0, 3).join(', ');
        const studios = (series.studios || []).slice(0, 2).map(s => s.Name || s).join(', ');
        const cast = (series.people || []).filter(p => p.Type === 'Actor').slice(0, 3).map(p => p.Name).join(', ');

        // Logo Logic: Use pre-calculated or construct from ImageTags
        let logoUrl = series.logoUrl;
        if (!logoUrl && series.ImageTags && series.ImageTags.Logo) {
            logoUrl = `/Items/${series.id || series.Id}/Images/Logo?maxHeight=200&maxWidth=500&quality=90`;
        }

        const titleHtml = logoUrl
            ? `<img src="${logoUrl}" alt="${title}" class="lf-series-hero__logo-title" style="max-width: 200px; max-height: 180px; width: auto; object-fit: contain; margin-bottom: 16px; display: block;">`
            : `<h1 class="lf-series-hero__title">${title}</h1>`;

        return `
            <section class="lf-series-hero" id="lfSeriesHero">
                <div class="lf-series-hero__backdrop" id="lfHeroBackdrop"
                    style="background-image: url('${backdropUrl}');"></div>
                
                <div class="lf-series-hero__trailer" id="lfHeroTrailer">
                    <iframe id="lfTrailerIframe" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                </div>

                <!-- (Original Clean View Logo removed slightly to avoid double-up, or we can keep it for transitions) -->
                <!-- We'll keep the logic simple: Main Title Slot is now either Text or Logo -->

                <div class="lf-series-hero__content">
                    <img class="lf-series-hero__poster" src="${posterUrl}" alt="${title}">

                    <div class="lf-series-hero__info">
                        ${titleHtml}

                        <div class="lf-series-hero__meta">
                            ${year ? `<span>${year}</span><span>•</span>` : ''}
                            <span>${rating}</span>
                            ${communityRating ? `
                                <span>•</span>
                                <div class="lf-series-hero__rating">
                                    <span class="material-icons">star</span>
                                    <span>${communityRating}</span>
                                </div>
                            ` : ''}
                            ${episodeCount ? `<span>•</span><span>${episodeCount} Seasons</span>` : ''}
                        </div>

                        <div class="lf-series-hero__actions">
                            <button class="lf-btn lf-btn--primary" id="lfWatchNowBtn">
                                <span class="material-icons">play_arrow</span>
                                Watch Now
                            </button>
                            <button class="lf-btn lf-btn--glass" id="lfTrailerBtn">
                                <span class="material-icons">theaters</span>
                                Watch Trailer
                            </button>
                            <div class="lf-btn-group">
                                <button class="lf-btn lf-btn--glass lf-btn--icon-only lf-btn--heart" id="lfHeartBtn">
                                    <span class="material-icons">favorite_border</span>
                                </button>
                                <button class="lf-mute-btn" id="lfMuteBtn" title="Toggle Mute" style="display: none;">
                                    <span class="material-icons">volume_off</span>
                                </button>
                            </div>
                        </div>

                        <div class="lf-series-hero__details">
                            <div class="lf-series-hero__description">
                                <p class="lf-series-hero__description-text" id="lfDescriptionText">${description}</p>
                                <button class="lf-series-hero__load-more" id="lfLoadMoreBtn">
                                    <span>Load more</span>
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

    /**
     * Create language selector HTML
     */
    function createLanguageSelector(audioStreams = [], subtitleStreams = [], targetEpisodeId = null) {
        console.log('[DEBUG] createLanguageSelector called with:', { audio: audioStreams.length, subs: subtitleStreams.length, targetId: targetEpisodeId });

        const savedAudio = localStorage.getItem('legitflix-audio-pref') || 'en';
        const savedSub = localStorage.getItem('legitflix-sub-pref') || 'en';

        const mapStreamToOption = (stream) => ({
            code: stream.Language || 'und',
            name: stream.Language || stream.Title || 'Unknown',
            displayTitle: stream.DisplayTitle || stream.Title || stream.Language || 'Unknown'
        });

        const uniqueStreams = (streams) => {
            const seen = new Set();
            if (!streams || streams.length === 0) return [];
            return streams.map(mapStreamToOption).filter(s => {
                if (seen.has(s.code)) return false;
                seen.add(s.code);
                return true;
            });
        };

        const availableAudio = uniqueStreams(audioStreams);
        const availableSubs = uniqueStreams(subtitleStreams);

        // Fallbacks
        const audioOptions = availableAudio.length > 0 ? availableAudio : [{ code: 'en', name: 'English' }];
        const subOptions = availableSubs.length > 0 ? availableSubs : [{ code: 'en', name: 'English' }];

        // Placeholder for old languages array removal
        const languages = [];

        // Helper to create options
        const createOptions = (type, list, current) => list.map(l => `
            <div class="lf-filter-dropdown__option ${l.code === current ? 'is-selected' : ''}" 
                 data-type="${type}" data-lang="${l.code}">
                <span>${l.name}</span>
                ${l.code === current ? '<span class="material-icons">check</span>' : ''}
            </div>
        `).join('');

        const html = `
            <div class="lf-filter-dropdown lf-lang-selector" id="lfLangSelector">
                <button class="lf-filter-btn" title="Audio & Subtitles">
                    <span class="material-icons">subtitles</span>
                    <span id="lfLangText">Audio & Subs</span>
                    <span class="material-icons">expand_more</span>
                </button>
                <div class="lf-filter-dropdown__menu lf-lang-menu">
                    <div class="lf-lang-section">
                        <div class="lf-dropdown-section-title">Audio</div>
                        ${createOptions('audio', audioOptions, savedAudio)}
                    </div>
                    <div class="lf-lang-separator"></div>
                    <div class="lf-lang-section">
                        <div class="lf-dropdown-section-title">Subtitles</div>
                        ${createOptions('subtitle', subOptions, savedSub)}
                    </div>
                    <div class="lf-lang-footer">
                        <button class="lf-edit-subs-btn" id="lfEditSubsBtn" ${targetEpisodeId ? `data-episode-id="${targetEpisodeId}"` : ''}>
                            <span class="material-icons">edit</span>
                            <span>Edit Subtitles</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        return html;
    }

    /**
     * Create season selector HTML
     * @param {Array} seasons - Array of season objects
     * @param {number} selectedIndex - Currently selected season index
     */
    function createSeasonSelector(seasons, selectedIndex = 0) {
        const selectedSeason = seasons[selectedIndex];
        const selectedText = selectedSeason?.name || 'Season 1';

        const options = seasons.map((season, i) => `
            <div class="lf-season-selector__option ${i === selectedIndex ? 'is-selected' : ''}" 
                 data-season-id="${season.id}" data-season-index="${i}">
                <span>${season.name}</span>
                ${season.episodeCount > 0 ? `<span class="lf-season-selector__option-count">${season.episodeCount} ep</span>` : ''}
            </div>
        `).join('');

        return `
            <div class="lf-season-selector" id="lfSeasonSelector">
                <button class="lf-season-selector__button ${seasons.length <= 1 ? 'is-disabled' : ''}" 
                        ${seasons.length <= 1 ? 'disabled' : ''}>
                    <span id="lfSelectedSeasonText">${selectedText}</span>
                    <span class="material-icons">expand_more</span>
                </button>
                <div class="lf-season-selector__dropdown">${options}</div>
            </div>
        `;
    }

    /**
     * Create episode grid HTML
     * @param {Array} episodes - Array of episode objects
     */
    function createEpisodeGrid(episodes) {
        return episodes.map(ep => {
            const thumbUrl = ep.thumbnailUrl || '';
            const episodeNum = ep.indexNumber || 0;
            const title = ep.name || `Episode ${episodeNum}`;
            const overview = ep.overview || '';
            const duration = ep.runTimeTicks ? formatDuration(ep.runTimeTicks) : '';
            const progress = ep.userData?.PlayedPercentage || 0;
            const hasProgress = progress > 0;
            const isPlayed = ep.userData?.Played;

            return `
                <div class="lf-episode-card ${isPlayed ? 'is-watched' : ''}" data-episode-id="${ep.id}">
                    <div class="lf-episode-card__thumbnail">
                        <img src="${thumbUrl}" alt="${title}">
                        <div class="lf-episode-card__play-icon">
                            <span class="material-icons">play_arrow</span>
                        </div>
                        <div class="lf-episode-checkbox">
                            <span class="material-icons">check</span>
                        </div>
                        <span class="lf-episode-card__badge">E${episodeNum}</span>
                        ${duration ? `<span class="lf-episode-card__duration">${duration}</span>` : ''}
                        ${hasProgress ? `
                            <div class="lf-episode-card__progress">
                                <div class="lf-episode-card__progress-bar" style="width: ${progress}%;"></div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="lf-episode-card__info">
                        <h3 class="lf-episode-card__title">${title}</h3>
                        <p class="lf-episode-card__subtitle">${overview}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Create episodes section HTML
     * @param {Array} seasons - Season data for selector
     * @param {Array} episodes - Episodes for current season
     * @param {number} selectedSeasonIndex - Index of currently selected season
     */
    function createEpisodesSection(seasons, episodes, selectedSeasonIndex = 0) {
        // ... (truncated for brevity, keeping identifying logic same) ...
        // Find first unwatched episode logic...
        let targetEpisode = null;
        if (episodes && episodes.length > 0) {
            targetEpisode = episodes.find(e => !e.userData?.Played) || episodes[0];
        }

        let audioStreams = [];
        let subtitleStreams = [];
        let targetEpisodeId = null;

        if (targetEpisode && targetEpisode.MediaSources && targetEpisode.MediaSources.length > 0) {
            targetEpisodeId = targetEpisode.id;
            const source = targetEpisode.MediaSources[0];
            if (source.MediaStreams) {
                audioStreams = source.MediaStreams.filter(s => s.Type === 'Audio');
                subtitleStreams = source.MediaStreams.filter(s => s.Type === 'Subtitle');
            }
        }

        return `
            <hr class="lf-section-divider">
            <section class="lf-content-section" id="lfEpisodesSection">
                <div class="lf-episodes-header">
                    ${createSeasonSelector(seasons, selectedSeasonIndex)}
                    <div class="lf-filter-controls">
                        ${createLanguageSelector(audioStreams, subtitleStreams, targetEpisodeId)}
                        
                        <!-- Bulk Edit Button -->
                        <button class="lf-filter-btn" id="lfBulkActionBtn" title="Bulk Edit">
                            <span class="material-icons">done_all</span>
                            <span id="lfBulkActionText">Mark Season Watched</span>
                        </button>

                        <div class="lf-filter-dropdown" id="lfSortDropdown">
                            <button class="lf-filter-btn">
                                <span class="material-icons">sort</span>
                                <span id="lfSortText">Newest</span>
                            </button>
                            <div class="lf-filter-dropdown__menu">
                                <div class="lf-filter-dropdown__option is-selected" data-sort="newest">
                                    <span class="material-icons">arrow_downward</span>
                                    Newest First
                                </div>
                                <div class="lf-filter-dropdown__option" data-sort="oldest">
                                    <span class="material-icons">arrow_upward</span>
                                    Oldest First
                                </div>
                            </div>
                        </div>
                        <div class="lf-filter-dropdown" id="lfFilterDropdown">
                            <button class="lf-filter-btn">
                                <span class="material-icons">filter_list</span>
                                <span id="lfFilterText">All</span>
                            </button>
                            <div class="lf-filter-dropdown__menu">
                                <div class="lf-filter-dropdown__option is-selected" data-filter="all">
                                    <span class="material-icons">check</span>
                                    All Episodes
                                </div>
                                <div class="lf-filter-dropdown__option" data-filter="unwatched">
                                    <span class="material-icons">visibility_off</span>
                                    Unwatched
                                </div>
                                <div class="lf-filter-dropdown__option" data-filter="watched">
                                    <span class="material-icons">visibility</span>
                                    Watched
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="lf-episode-grid">${createEpisodeGrid(episodes)}</div>
            </section>
        `;
    }

    // ... Use separate tool call for the Season Selector logic update if I can't reach it here (it's around line 2760) ...
    // Actually, I can replace the function definitions here, but the update logic is far down.
    // I will just update the function definitions first.

    // Wait, if I change createEpisodeGrid now, I break the logic at line 2773 BEFORE I fix it.
    // But valid JS code will be written. It won't break until run.
    // I should try to include the season selector update in the same chunk if possible, or do it immediately after.
    // The file is large (2900 lines). `createEpisodeGrid` is at 1118. `wireUpButtons` is at 2760.
    // I will do two edits. One for the functions, one for the event listener.


    /**
     * Create cast section HTML
     * @param {Array} people - Cast/Crew array
     */
    function createCastSection(people) {
        const actors = people.filter(p => p.Type === 'Actor').slice(0, 15);
        if (actors.length === 0) return '';

        const cards = actors.map(person => {
            const imageUrl = person.imageUrl || '';
            const name = person.Name || 'Unknown';
            const role = person.Role || '';

            return `
                <div class="lf-cast-card" data-person-id="${person.Id}">
                    <img class="lf-cast-card__image" src="${imageUrl}" alt="${name}">
                    <div class="lf-cast-card__name">${name}</div>
                    <div class="lf-cast-card__role">${role}</div>
                </div>
            `;
        }).join('');

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

    /**
     * Create similar items section HTML
     * @param {Array} items - Similar items array
     */
    function createSimilarSection(items) {
        if (!items || items.length === 0) return '';

        const cards = items.slice(0, 12).map(item => {
            const posterUrl = item.posterUrl || '';
            const title = item.Name || 'Unknown';

            return `
                <div class="lf-similar-card" data-item-id="${item.Id}">
                    <img class="lf-similar-card__poster" src="${posterUrl}" alt="${title}">
                    <div class="lf-similar-card__title">${title}</div>
                </div>
            `;
        }).join('');

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
    // UTILITIES
    // =========================================================================
    function formatDuration(ticks) {
        const minutes = Math.floor(ticks / 600000000);
        const seconds = Math.floor((ticks % 600000000) / 10000000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Enforce grid styles using MutationObserver to prevent external overrides
     */
    function enforceGridStyles(grid) {
        if (!grid) return;

        const applyParams = () => {
            grid.style.setProperty('display', 'grid', 'important');
            grid.style.setProperty('grid-template-columns', 'repeat(auto-fill, minmax(280px, 1fr))', 'important');
            grid.style.setProperty('gap', '20px', 'important');
            grid.style.setProperty('width', '100%', 'important');
        };

        // Apply immediately
        applyParams();

        // Watch for changes
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                    // Check if our styles were removed/changed (basic check)
                    if (grid.style.display !== 'grid') shouldReapply = true;
                }
            });
            if (shouldReapply) {
                // disconnect momentarily to avoid infinite loop
                observer.disconnect();
                applyParams();
                observer.observe(grid, { attributes: true, attributeFilter: ['style', 'class'] });
            }
        });

        observer.observe(grid, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    // =========================================================================
    // SUBTITLE MANAGER (Custom Implementation)
    // =========================================================================
    const SubtitleManager = {
        modalId: 'lfSubtitleModal',

        async show(episodeId) {
            log('Opening Subtitle Manager for:', episodeId);
            this.injectModal();
            const modal = document.getElementById(this.modalId);

            // Show modal
            modal.classList.remove('hide');
            modal.classList.add('opened');
            modal.dataset.episodeId = episodeId;
            document.body.style.overflow = 'hidden'; // Lock scroll

            // Load initial data for selectors
            // Verify we have seasons access
            const seasonsList = (typeof seasons !== 'undefined') ? seasons :
                (typeof data !== 'undefined' && data.seasons) ? data.seasons :
                    window.LF_CURRENT_SEASONS || [];

            await this.populateSeasons(modal, episodeId, seasonsList);

            // Load subtitles
            await this.loadCurrentSubtitles(episodeId);

            // Setup listeners (if not already)
            if (!modal.dataset.listenersAttached) {
                this.attachListeners(modal);
                modal.dataset.listenersAttached = 'true';
            }
        },

        async populateSeasons(modal, currentEpisodeId, seasonsList) {
            const seasonSelect = modal.querySelector('#lfSubSeasonSelect');
            if (!seasonSelect) return;

            seasonSelect.innerHTML = '';

            seasonsList.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id || s.Id;
                opt.textContent = s.name || s.Name;
                seasonSelect.appendChild(opt);
            });

            // "Fetch season 01 EP 01 as default always" (or smart default)
            // If currentEpisodeId is provided, try to find its season?
            // Since we don't have an easy map, let's try to grab from UI first, then fallback to S1

            const currentUISeasonStr = document.querySelector('.lf-season-selector__option.is-selected')?.dataset.seasonId;

            if (currentUISeasonStr && seasonsList.find(s => (s.id || s.Id) == currentUISeasonStr)) {
                seasonSelect.value = currentUISeasonStr;
                await this.updateEpisodesForSeason(modal, currentUISeasonStr, currentEpisodeId);
            } else if (seasonsList.length > 0) {
                // Default to First Season (S1)
                seasonSelect.value = seasonsList[0].id || seasonsList[0].Id;
                await this.updateEpisodesForSeason(modal, seasonSelect.value, currentEpisodeId || null);
            }
        },

        async updateEpisodesForSeason(modal, seasonId, targetEpisodeId = null) {
            const epSelect = modal.querySelector('#lfSubEpisodeSelect');
            if (!epSelect) return;

            epSelect.innerHTML = '<option>Loading...</option>';
            epSelect.disabled = true;

            // Fetch episodes
            // using fetchEpisodes from global scope, fallback series ID
            const seriesId = (typeof series !== 'undefined' && series.Id) ? series.Id :
                (typeof data !== 'undefined' && data.series) ? (data.series.id || data.series.Id) :
                    window.LF_CURRENT_SERIES ? (window.LF_CURRENT_SERIES.id || window.LF_CURRENT_SERIES.Id) : null;

            if (!seriesId) {
                epSelect.innerHTML = '<option>Error: No Series ID</option>';
                return;
            }

            const eps = await fetchEpisodes(seriesId, seasonId);

            epSelect.innerHTML = '';
            eps.forEach(ep => {
                const opt = document.createElement('option');
                opt.value = ep.id;
                opt.textContent = `${ep.indexNumber}. ${ep.name}`;
                if (ep.id === targetEpisodeId) opt.selected = true;
                epSelect.appendChild(opt);
            });
            epSelect.disabled = false;

            // If no target, select first and trigger load? 
            if (!targetEpisodeId && eps.length > 0) {
                epSelect.value = eps[0].id;
                // Don't auto-load subs here to avoid double fetch if just strictly populating
            }
        },

        injectModal() {
            if (document.getElementById(this.modalId)) return;

            const html = `
                <div id="${this.modalId}" class="lf-modal-overlay hide">
                    <div class="dialogContainer">
                        <div class="focuscontainer dialog dialog-fixedSize dialog-small formDialog subtitleEditorDialog opened" 
                             style="animation: 180ms ease-out 0s 1 normal both running scaleup; max-width: 800px; margin: 5vh auto; background: var(--color-background-secondary, #1c1c1c); border-radius: var(--radius-lg, 12px);">
                            
                            <div class="formDialogHeader" style="display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <h3 class="formDialogHeaderTitle" style="margin: 0; font-size: 1.2rem; font-weight: 600;">Subtitles</h3>
                                <button class="btnCancel" tabindex="-1" title="Close" style="background:none; border:none; color:inherit; cursor:pointer; opacity: 0.7;">
                                    <span class="material-icons" aria-hidden="true" style="font-size: 24px;">close</span>
                                </button>
                            </div>

                            <div class="formDialogContent smoothScrollY" style="padding: 20px; max-height: 80vh; overflow-y: auto;">
                                <div class="dialogContentInner dialog-content-centered">
                                    
                                    <!-- EXISTING SUBTITLES -->
                                    <div class="subtitleList" style="margin-bottom:2em">
                                        <h2 style="font-size: 1rem; margin-bottom: 1rem; opacity: 0.8;">My Subtitles</h2>
                                        <div id="lfCurrentSubsList">Loading...</div>
                                    </div>

                                    <!-- SEARCH -->
                                    <h2 style="font-size: 1rem; margin-bottom: 0.5rem; opacity: 0.8; margin-top: 2rem;">Search for Subtitles</h2>
                                    
                                    <!-- NAVIGATION SELECTORS -->
                                    <div class="subtitleNav" style="display: flex; gap: 12px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                        <div style="flex: 1;">
                                            <label style="display: block; font-size: 0.85rem; margin-bottom: 6px; opacity: 0.8;">Season</label>
                                            <select id="lfSubSeasonSelect" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: white; border-radius: 6px; font-size: 0.95rem;">
                                                <option>Loading...</option>
                                            </select>
                                        </div>
                                        <div style="flex: 1;">
                                            <label style="display: block; font-size: 0.85rem; margin-bottom: 6px; opacity: 0.8;">Episode</label>
                                            <select id="lfSubEpisodeSelect" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: white; border-radius: 6px; font-size: 0.95rem;">
                                                <option>Loading...</option>
                                            </select>
                                        </div>
                                    </div>

                                    <!-- TARGET INFO BOX -->
                                    <div id="lfSubtitleTargetInfo" style="background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; font-size: 0.9rem; color: var(--clr-text-muted); border-left: 3px solid var(--clr-accent, #00a4dc);">
                                        Fetching episode info...
                                    </div>

                                    <form class="subtitleSearchForm" style="display: flex; gap: 12px; align-items: flex-end;">
                                        <div class="selectContainer flex-grow" style="flex: 1; display: flex; flex-direction: column; justify-content: space-around; margin-bottom: 0px !important;">
                                            <label class="selectLabel" for="selectLanguage" style="display: block; font-size: 0.85rem; margin-bottom: 6px; opacity: 0.8;">Language</label>
                                            
                                            <!-- STANDARD SELECT (No 'is=emby-select' to avoid truncation/override) -->
                                            <select id="selectLanguage" style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: white; border-radius: 6px; font-size: 1rem; cursor: pointer; appearance: none; -webkit-appearance: none;">
                                                <option value="eng">English</option>
                                                <option value="spa">Spanish</option>
                                                <option value="fre">French</option>
                                                <option value="ger">German</option>
                                                <option value="ita">Italian</option>
                                                <option value="por">Portuguese</option>
                                                <option value="pol">Polish</option>
                                                <option value="rus">Russian</option>
                                                <option value="dut">Dutch</option>
                                                <option value="swe">Swedish</option>
                                                <option value="nor">Norwegian</option>
                                                <option value="fin">Finnish</option>
                                                <option value="da">Danish</option>
                                                <option value="tur">Turkish</option>
                                                <option value="ara">Arabic</option>
                                                <option value="heb">Hebrew</option>
                                                <option value="hun">Hungarian</option>
                                                <option value="cze">Czech</option>
                                                <option value="rom">Romanian</option>
                                                <option value="vie">Vietnamese</option>
                                                <option value="tha">Thai</option>
                                                <option value="chi">Chinese</option>
                                                <option value="jpn">Japanese</option>
                                                <option value="kor">Korean</option>
                                                <option value="gre">Greek</option>
                                                <option value="ind">Indonesian</option>
                                                <option value="may">Malay</option>
                                                <option value="fas">Persian</option>
                                                <option value="ukr">Ukrainian</option>
                                                <option value="hrv">Croatian</option>
                                                <option value="slv">Slovenian</option>
                                                <option value="bul">Bulgarian</option>
                                                <option value="srp">Serbian</option>
                                            </select>
                                        </div>
                                        <button type="submit" class="raised btnSubmit block button-submit emby-button" style="background: var(--clr-accent, #00a4dc); color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 1rem; margin-bottom: 0;">
                                            Search
                                        </button>
                                    </form>

                                    <div class="subtitleResults" id="lfSubtitleSearchResults" style="margin-top: 24px;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <style>
                        .lf-modal-overlay {
                            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                            background: rgba(0,0,0,0.85); z-index: 10000;
                            display: flex; align-items: flex-start; justify-content: center;
                            overflow-y: auto;
                            backdrop-filter: blur(5px);
                        }
                        .lf-modal-overlay.hide { display: none !important; }
                        
                        .listItem { 
                            display: flex; align-items: center; padding: 14px; 
                            background: rgba(255,255,255,0.03);
                            border-radius: 4px;
                            margin-bottom: 4px;
                        }
                        .listItem:hover {
                            background: rgba(255,255,255,0.06);
                        }
                        .listItemBody { flex: 1; margin: 0 16px; }
                        .secondary { font-size: 0.85rem; opacity: 0.6; margin-top: 4px; }
                        
                        .btnDelete { 
                            background: rgba(233, 30, 99, 0.15) !important; 
                            border: 1px solid rgba(233, 30, 99, 0.3) !important; 
                            color: #ff4081 !important; 
                            cursor: pointer; 
                            border-radius: 4px;
                            padding: 8px;
                            display: flex;
                        }
                        .btnDelete:hover { 
                            background: rgba(233, 30, 99, 0.25) !important; 
                        }
                        
                        .btnDownload { 
                            background: rgba(255,255,255,0.1) !important; 
                            border: none !important; 
                            color: white !important; 
                            cursor: pointer; 
                            border-radius: 4px;
                            padding: 8px 16px;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            font-weight: 500;
                            font-size: 0.9rem;
                        }
                        .btnDownload:hover { background: rgba(255,255,255,0.2) !important; }

                        /* Custom Scrollbar for Modal */
                        .smoothScrollY::-webkit-scrollbar { width: 8px; }
                        .smoothScrollY::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                        .smoothScrollY::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
                    </style>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        },

        async loadCurrentSubtitles(episodeId) {
            const listContainer = document.querySelector('#lfCurrentSubsList');
            const infoBox = document.querySelector('#lfSubtitleTargetInfo');

            listContainer.innerHTML = '<div style="padding: 10px; opacity: 0.6;">Fetching subtitles...</div>';

            try {
                const auth = await getAuth();
                const response = await fetch(`/Users/${auth.UserId}/Items/${episodeId}`, {
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });
                const data = await response.json();

                // Update Info Box
                if (infoBox) {
                    const seasonName = data.SeasonName || (data.ParentIndexNumber ? `Season ${data.ParentIndexNumber}` : '');
                    const epNum = data.IndexNumber ? `E${data.IndexNumber}` : '';
                    const fullCode = (data.ParentIndexNumber && data.IndexNumber)
                        ? `S${String(data.ParentIndexNumber).padStart(2, '0')}E${String(data.IndexNumber).padStart(2, '0')}`
                        : epNum;

                    infoBox.innerHTML = `
                        <div style="font-weight: 600; color: var(--clr-text-main); font-size: 1rem;">${data.Name}</div>
                        <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 2px;">
                            ${data.SeriesName || ''} • ${seasonName} • ${fullCode}
                        </div>
                    `;
                }

                // Get streams
                const streams = (data.MediaSources?.[0]?.MediaStreams || []).filter(s => s.Type === 'Subtitle');

                if (streams.length === 0) {
                    listContainer.innerHTML = '<div style="padding: 10px; opacity: 0.6;">No subtitles found.</div>';
                    return;
                }

                listContainer.innerHTML = streams.map((s, index) => `
                    <div class="listItem">
                        <span class="material-icons" style="opacity: 0.7;">closed_caption</span>
                        <div class="listItemBody">
                            <div style="font-weight: 500;">${s.DisplayTitle || s.Title || s.Language || 'Unknown'}</div>
                            <div class="secondary">${s.IsExternal ? 'External' : 'Embedded'} • ${s.Codec || ''} • ${s.IsForced ? 'Forced' : 'Default'}</div>
                        </div>
                        ${s.IsExternal ? `
                        <button class="btnDelete" data-index="${s.Index}" title="Delete">
                            <span class="material-icons" style="font-size: 18px;">delete</span>
                        </button>` : ''}
                    </div>
                `).join('');

                // Bind delete buttons
                listContainer.querySelectorAll('.btnDelete').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const index = e.currentTarget.dataset.index;
                        if (confirm('Are you sure you want to delete this subtitle?')) {
                            this.deleteSubtitle(episodeId, index, e.currentTarget);
                        }
                    });
                });

            } catch (e) {
                log('Error loading subtitles:', e);
                listContainer.innerHTML = `<div style="color: #ff5252;">Error loading subtitles: ${e.message}</div>`;
                if (infoBox) infoBox.textContent = 'Error loading episode info.';
            }
        },

        async deleteSubtitle(episodeId, subtitleIndex, buttonElement) {
            // Optimistic UI
            if (buttonElement) {
                buttonElement.innerHTML = '<span class="material-icons spinning">sync</span>';
            }

            try {
                const auth = await getAuth();
                // Endpoint: DELETE /Videos/{Id}/Subtitles/{Index}
                const response = await fetch(`/Videos/${episodeId}/Subtitles/${subtitleIndex}`, {
                    method: 'DELETE',
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });

                if (!response.ok) {
                    throw new Error(`Delete failed: ${response.statusText}`);
                }

                // Success
                if (buttonElement) {
                    buttonElement.closest('.listItem').style.opacity = '0.5';
                }

                // Refresh list
                setTimeout(() => {
                    this.loadCurrentSubtitles(episodeId);
                }, 1000);

            } catch (e) {
                console.error('Error deleting subtitle:', e);
                if (buttonElement) {
                    buttonElement.innerHTML = '<span class="material-icons" style="color: #ff5252;">error</span>';
                }
                alert('Failed to delete subtitle: ' + e.message);
            }
        },

        async searchSubtitles(episodeId, language) {
            const resultsContainer = document.querySelector('#lfSubtitleSearchResults');
            resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.6;">Searching...</div>';

            try {
                const auth = await getAuth();
                const url = `/Items/${episodeId}/RemoteSearch/Subtitles/${language}`;
                const response = await fetch(url, {
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });
                const data = await response.json(); // Array of RemoteSubtitleInfo

                if (!data || data.length === 0) {
                    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.6;">No results found.</div>';
                    return;
                }

                resultsContainer.innerHTML = data.map(sub => `
                    <div class="listItem">
                        <div class="listItemBody">
                            <div style="font-weight: 500;">${sub.Name}</div>
                            <div class="secondary">
                                <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${sub.Format || 'SRT'}</span>
                                <span style="margin-left: 8px;">${sub.ProviderName || 'Unknown Provider'}</span>
                                <span style="margin-left: 8px;">Downloads: ${sub.DownloadCount || 0}</span>
                            </div>
                        </div>
                        <button class="btnDownload" data-id="${sub.Id}" title="Download">
                            <span class="material-icons">cloud_download</span>
                            <span>Download</span>
                        </button>
                    </div>
                `).join('');

                // Bind download buttons
                resultsContainer.querySelectorAll('.btnDownload').forEach(btn => {
                    btn.addEventListener('click', (e) => this.download(episodeId, e.currentTarget.dataset.id));
                });

            } catch (e) {
                log('Error searching:', e);
                resultsContainer.innerHTML = `<div style="color: #ff5252;">Search failed: ${e.message}</div>`;
            }
        },

        async download(episodeId, subtitleId) {
            const resultsContainer = document.querySelector('#lfSubtitleSearchResults');
            // Optimistic UI
            const btn = resultsContainer.querySelector(`button[data-id="${subtitleId}"]`);
            if (btn) btn.innerHTML = '<span class="material-icons spinning">sync</span>';

            try {
                const auth = await getAuth();
                // Standard Jellyfin download endpoint
                await fetch(`/Items/${episodeId}/RemoteSearch/Subtitles/${subtitleId}`, {
                    method: 'POST',
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });

                if (btn) {
                    btn.innerHTML = '<span class="material-icons" style="color: #4caf50;">check_circle</span>';
                }

                // Refresh list
                setTimeout(() => {
                    this.loadCurrentSubtitles(episodeId);
                }, 1000);

            } catch (e) {
                log('Download error:', e);
                if (btn) btn.innerHTML = '<span class="material-icons" style="color: #ff5252;">error</span>';
            }
        },

        attachListeners(modal) {
            // Navigation Listeners
            const seasonSelect = modal.querySelector('#lfSubSeasonSelect');
            const epSelect = modal.querySelector('#lfSubEpisodeSelect');

            seasonSelect?.addEventListener('change', async (e) => {
                const seasonId = e.target.value;
                // Update episodes list
                await this.updateEpisodesForSeason(modal, seasonId);

                // Select first episode of new season and load
                const newEpId = epSelect.value;
                if (newEpId) {
                    modal.dataset.episodeId = newEpId;
                    this.loadCurrentSubtitles(newEpId);
                }
            });

            epSelect?.addEventListener('change', (e) => {
                const newEpId = e.target.value;
                modal.dataset.episodeId = newEpId;
                this.loadCurrentSubtitles(newEpId);
            });

            // Close (Cancel Button)
            modal.querySelector('.btnCancel').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal(modal);
            });

            // Click outside (Overlay click)
            modal.addEventListener('click', (e) => {
                // Close if the click is NOT inside the dialog content box (.focuscontainer)
                if (!e.target.closest('.focuscontainer')) {
                    this.closeModal(modal);
                }
            });

            // Search
            const form = modal.querySelector('.subtitleSearchForm');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const lang = modal.querySelector('#selectLanguage').value;
                const episodeId = modal.dataset.episodeId;
                this.searchSubtitles(episodeId, lang);
            });
        },

        closeModal(modal) {
            modal.classList.add('hide');
            modal.classList.remove('opened');
            document.body.style.overflow = ''; // Restore scroll
        }
    };

    // Observer setup (keeping the rest of the file)
    // ===================================
    function attachEventListeners(container) {
        console.log('[DEBUG] attachEventListeners called');
        // Season dropdown toggle
        const seasonSelector = container.querySelector('#lfSeasonSelector');
        if (seasonSelector) {
            const button = seasonSelector.querySelector('.lf-season-selector__button:not([disabled])');
            button?.addEventListener('click', () => seasonSelector.classList.toggle('is-open'));
        }

        // Language Selector
        const langSelector = container.querySelector('#lfLangSelector');
        if (langSelector) {
            const btn = langSelector.querySelector('.lf-filter-btn');
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelector('#lfSortDropdown')?.classList.remove('is-open');
                container.querySelector('#lfFilterDropdown')?.classList.remove('is-open');
                langSelector.classList.toggle('is-open');
            });

            // Handle options (Audio/Subtitle)
            langSelector.querySelectorAll('.lf-filter-dropdown__option').forEach(opt => {
                opt.addEventListener('click', function () {
                    const type = this.dataset.type; // 'audio' or 'subtitle'
                    const lang = this.dataset.lang;

                    // Update selected state in UI (per section)
                    const section = this.closest('.lf-lang-section');
                    section.querySelectorAll('.lf-filter-dropdown__option').forEach(o => {
                        o.classList.remove('is-selected');
                        const check = o.querySelector('.material-icons');
                        if (check && check.textContent === 'check') check.remove();
                    });

                    this.classList.add('is-selected');
                    // Add checkmark if not present
                    if (!this.querySelector('.material-icons')) {
                        const check = document.createElement('span');
                        check.className = 'material-icons';
                        check.textContent = 'check';
                        this.appendChild(check);
                    }

                    // Save preference
                    if (type === 'audio') localStorage.setItem('legitflix-audio-pref', lang);
                    if (type === 'subtitle') localStorage.setItem('legitflix-sub-pref', lang);

                    console.log(`[DEBUG] Language selected: ${type} -> ${lang}`);

                    // Actually switch stream?
                    // We might need to reload or notify playback logic vs simple pref save
                    // For now we just update UI as requested
                });
            });

            // Edit Subtitles Button
            const editSubsBtn = langSelector.querySelector('#lfEditSubsBtn');
            editSubsBtn?.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Get target ID (Episode ID)
                // We prefer the button's dataset attribute if available
                const targetId = this.dataset.episodeId || currentSeriesId; // Fallback if needed, though usually incorrect for subs

                console.log('[DEBUG] Edit Subtitles Clicked. Target:', targetId);

                if (targetId) {
                    SubtitleManager.show(targetId);
                } else {
                    console.error('No target ID for subtitle editor');
                }

                langSelector.classList.remove('is-open');
            });

            document.addEventListener('click', (e) => {
                if (!langSelector?.contains(e.target)) langSelector?.classList.remove('is-open');
            });
        }

        // Sort dropdown
        const sortDropdown = container.querySelector('#lfSortDropdown');
        if (sortDropdown) {
            const button = sortDropdown.querySelector('.lf-filter-btn');
            button?.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelector('#lfFilterDropdown')?.classList.remove('is-open');
                container.querySelector('#lfLangSelector')?.classList.remove('is-open');
                sortDropdown.classList.toggle('is-open');
            });

            sortDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(opt => {
                opt.addEventListener('click', function () {
                    const sortType = this.dataset.sort;
                    container.querySelector('#lfSortText').textContent = sortType === 'newest' ? 'Newest' : 'Oldest';

                    sortDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(o => o.classList.remove('is-selected'));
                    this.classList.add('is-selected');
                    sortDropdown.classList.remove('is-open');

                    // Reverse episode grid
                    const grid = container.querySelector('.lf-episode-grid');
                    if (grid) {
                        const cards = Array.from(grid.children);
                        cards.reverse();
                        grid.innerHTML = '';
                        cards.forEach(card => grid.appendChild(card));
                    }
                });
            });
        }

        // Filter dropdown
        const filterDropdown = container.querySelector('#lfFilterDropdown');
        if (filterDropdown) {
            const button = filterDropdown.querySelector('.lf-filter-btn');
            button?.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelector('#lfSortDropdown')?.classList.remove('is-open');
                container.querySelector('#lfLangSelector')?.classList.remove('is-open');
                filterDropdown.classList.toggle('is-open');
            });

            filterDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(opt => {
                opt.addEventListener('click', function () {
                    const filterType = this.dataset.filter;
                    const textMap = { all: 'All', watched: 'Watched', unwatched: 'Unwatched' };
                    container.querySelector('#lfFilterText').textContent = textMap[filterType];

                    filterDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(o => o.classList.remove('is-selected'));
                    this.classList.add('is-selected');
                    filterDropdown.classList.remove('is-open');

                    // Filter episodes
                    // Filter episodes
                    container.querySelectorAll('.lf-episode-card').forEach(card => {
                        const isWatched = card.classList.contains('is-watched');

                        if (filterType === 'all') {
                            card.style.display = '';
                        } else if (filterType === 'watched' && isWatched) {
                            card.style.display = '';
                        } else if (filterType === 'unwatched' && !isWatched) {
                            card.style.display = '';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            });
        }

        // Description expand/collapse
        const loadMoreBtn = container.querySelector('#lfLoadMoreBtn');
        const descText = container.querySelector('#lfDescriptionText');

        if (loadMoreBtn && descText) {
            // Check if text is clamped (overflowing)
            // We use a small tolerance
            if (descText.scrollHeight <= descText.clientHeight + 2) {
                loadMoreBtn.style.display = 'none';
            }

            loadMoreBtn.addEventListener('click', function () {
                const isExpanded = descText.classList.toggle('is-expanded');
                this.classList.toggle('is-expanded', isExpanded);
                this.querySelector('span:first-child').textContent = isExpanded ? 'Show less' : 'Load more';
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!seasonSelector?.contains(e.target)) seasonSelector?.classList.remove('is-open');
            if (!sortDropdown?.contains(e.target)) sortDropdown?.classList.remove('is-open');
            if (!filterDropdown?.contains(e.target)) filterDropdown?.classList.remove('is-open');
        });

        // Season selection UI (Update text & close)
        // Season selection UI (Update text & close)
        // Logic moved to wireUpButtons to prevent duplication and ensure consistency
        // (Deleted legacy block to fix 'tempDiv' null error)
    }

    // =========================================================================
    // MAIN RENDER FUNCTION
    // =========================================================================

    /**
     * Render the complete series detail page
     * @param {Object} data - Object containing series, seasons, episodes, people, similar
     * @param {HTMLElement} targetContainer - Container to inject into
     */
    function renderSeriesDetailPage(data, targetContainer) {
        const { series, seasons, episodes, people, similar, initialSeasonIndex = 0 } = data;

        // Debug initial episodes data
        if (episodes && episodes.length > 0) {
            console.log('[DEBUG] Initial Episodes Data:', episodes[0]);
            if (!episodes[0].MediaSources) console.warn('[DEBUG] No MediaSources in initial episodes!');
        } else {
            console.warn('[DEBUG] No episodes in initial data!');
        }

        injectStyles();

        // Build complete HTML
        const html = `
            <div class="lf-series-container" id="${CONFIG.containerId}">
                ${createHeroSection(series)}
                ${createEpisodesSection(seasons, episodes, initialSeasonIndex)}
                ${createCastSection(people)}
                ${createSimilarSection(similar)}
            </div>
        `;

        // Inject into target
        targetContainer.innerHTML = html;

        // Attach event listeners
        const container = document.getElementById(CONFIG.containerId);
        attachEventListeners(container);

        // Enforce grid styles on initial load
        const initialGrid = container.querySelector('.lf-episode-grid');
        if (initialGrid) enforceGridStyles(initialGrid);

        // Parent Observer: Watch for Grid Replacements or Style Changes
        const episodesSection = container.querySelector('#lfEpisodesSection');
        if (episodesSection) {
            const handleMutations = () => {
                // Find the direct parent of episode cards
                const firstCard = episodesSection.querySelector('.lf-episode-card');
                if (firstCard && firstCard.parentElement) {
                    const gridContainer = firstCard.parentElement;

                    // Check if styles are missing or incorrect
                    const computed = window.getComputedStyle(gridContainer);
                    if (computed.display !== 'grid' || gridContainer.style.display !== 'grid') {
                        console.log('[DEBUG] Fixing grid layout on container:', gridContainer.className);
                        enforceGridStyles(gridContainer);
                    }
                }
            };

            const parentObserver = new MutationObserver((mutations) => {
                handleMutations();
            });
            parentObserver.observe(episodesSection, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

            // Should also run immediately in case of race condition
            handleMutations();
        }

        log('Series detail page rendered');
    }

    // =========================================================================
    // API INTEGRATION (For Jellyfin)
    // =========================================================================

    /**
     * Get auth info from Jellyfin
     */
    async function getAuth() {
        if (!window.ApiClient) return null;
        const userId = window.ApiClient.getCurrentUserId();
        if (!userId) return null;
        return {
            UserId: userId,
            AccessToken: window.ApiClient.accessToken(),
            ServerId: window.ApiClient.serverId()
        };
    }

    /**
     * Fetch series details from API
     */
    async function fetchSeriesData(seriesId) {
        const auth = await getAuth();
        if (!auth) return null;

        try {
            // Added MediaSources to fields to get stream info (usually on episodes, but checking series)
            const fields = 'Overview,Genres,Studios,OfficialRating,CommunityRating,ImageTags,BackdropImageTags,People,RemoteTrailers,ChildCount,MediaSources';
            const url = `/Users/${auth.UserId}/Items/${seriesId}?Fields=${fields}`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const item = await response.json();

            // Transform to our format
            return {
                id: item.Id,
                name: item.Name,
                year: item.ProductionYear ? `${item.ProductionYear}${item.EndDate ? ' - ' + new Date(item.EndDate).getFullYear() : ''}` : '',
                officialRating: item.OfficialRating || 'TV-14',
                communityRating: item.CommunityRating || 0,
                episodeCount: item.ChildCount || 0,
                overview: item.Overview || '',
                genres: item.Genres || [],
                studios: item.Studios || [],
                backdropUrl: item.BackdropImageTags?.length ? `/Items/${item.Id}/Images/Backdrop/0?maxWidth=1920&quality=90` : '',
                posterUrl: item.ImageTags?.Primary ? `/Items/${item.Id}/Images/Primary?fillHeight=350&fillWidth=240&quality=96` : '',
                logoUrl: item.ImageTags?.Logo ? `/Items/${item.Id}/Images/Logo?maxWidth=300&quality=90` : '',
                people: item.People || [],
                remoteTrailers: item.RemoteTrailers || [],
                isFavorite: item.UserData?.IsFavorite || false,
                userData: item.UserData || {} // Expose full UserData
            };
        } catch (e) {
            log('Error fetching series data:', e);
            return null;
        }
    }

    /**
     * Fetch seasons for a series
     */
    async function fetchSeasons(seriesId) {
        const auth = await getAuth();
        if (!auth) return [];

        try {
            const url = `/Shows/${seriesId}/Seasons?UserId=${auth.UserId}&Fields=ItemCounts`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const data = await response.json();

            return (data.Items || []).map(season => ({
                id: season.Id,
                name: season.Name || `Season ${season.IndexNumber}`,
                indexNumber: season.IndexNumber,
                episodeCount: season.ChildCount || season.RecursiveItemCount || 0
            }));
        } catch (e) {
            log('Error fetching seasons:', e);
            return [];
        }
    }

    /**
     * Fetch episodes for a season
     */
    async function fetchEpisodes(seriesId, seasonId) {
        const auth = await getAuth();
        if (!auth) return [];

        try {
            const fields = 'Overview,PrimaryImageAspectRatio,UserData,RunTimeTicks,MediaSources';
            const url = `/Shows/${seriesId}/Episodes?SeasonId=${seasonId}&UserId=${auth.UserId}&Fields=${fields}&_t=${Date.now()}`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const data = await response.json();

            return (data.Items || []).map(ep => ({
                id: ep.Id,
                indexNumber: ep.IndexNumber || 0,
                name: ep.Name || `Episode ${ep.IndexNumber}`,
                overview: ep.Overview || '',
                thumbnailUrl: ep.ImageTags?.Primary ? `/Items/${ep.Id}/Images/Primary?fillHeight=180&fillWidth=320&quality=90` : '',
                runTimeTicks: ep.RunTimeTicks || 0,
                MediaSources: ep.MediaSources || [], // Pass through MediaSources
                userData: {
                    PlayedPercentage: ep.UserData?.PlayedPercentage || 0,
                    Played: ep.UserData?.Played || false
                }
            }));
        } catch (e) {
            log('Error fetching episodes:', e);
            return [];
        }
    }

    /**
     * Fetch similar items
     */
    async function fetchSimilar(seriesId) {
        const auth = await getAuth();
        if (!auth) return [];

        try {
            // Strict type filtering
            const url = `/Items/${seriesId}/Similar?Limit=12&UserId=${auth.UserId}&IncludeItemTypes=Series`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const data = await response.json();

            return (data.Items || []).map(item => ({
                Id: item.Id,
                Name: item.Name,
                posterUrl: item.ImageTags?.Primary ? `/Items/${item.Id}/Images/Primary?fillHeight=225&fillWidth=150&quality=90` : ''
            }));
        } catch (e) {
            log('Error fetching similar:', e);
            return [];
        }
    }

    /**
     * Format people with image URLs
     */
    function formatPeople(people) {
        return people.filter(p => p.Type === 'Actor').slice(0, 15).map(person => ({
            Id: person.Id,
            Name: person.Name,
            Type: person.Type,
            Role: person.Role || '',
            imageUrl: person.PrimaryImageTag ? `/Items/${person.Id}/Images/Primary?fillHeight=100&fillWidth=100&quality=90` : ''
        }));
    }

    /**
     * Get YouTube video ID from URL
     */
    function getYoutubeId(url) {
        if (!url) return null;
        if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        if (url.includes('embed/')) return url.split('embed/')[1].split('?')[0];
        return null;
    }

    /**
     * Build YouTube embed URL
     */
    function buildYoutubeEmbedUrl(videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${videoId}`;
    }

    // =========================================================================
    // PAGE DETECTION & INJECTION
    // =========================================================================

    let currentSeriesId = null;
    let isInjecting = false;

    /**
     * Check if we're on a Series detail page
     */
    function isSeriesDetailPage() {
        const hash = window.location.hash;
        return hash.includes('details') && hash.includes('id=');
    }

    /**
     * Get series ID from URL
     */
    function getSeriesIdFromUrl() {
        const hash = window.location.hash;
        const match = hash.match(/id=([a-f0-9]+)/i);
        return match ? match[1] : null;
    }

    /**
     * Inject global style overrides to forcefully hide elements and fix background
     */
    function injectOverridesStyles() {
        const styleId = 'lf-series-overrides';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Force hide original elements */
            .itemDetailPage #itemBackdrop,
            .itemDetailPage .detailPageWrapperContainer,
            .itemDetailPage .detailRibbon,
            .itemDetailPage .detailPagePrimaryContent,
            .itemDetailPage .detailPagePrimaryContainer,
            .itemDetailPage .detailPageSecondaryContainer,
            .itemDetailPage .detailImageContainer,
            .itemDetailPage #listChildrenCollapsible,
            .itemDetailPage #childrenCollapsible,
            .itemDetailPage .nextUpSection,
            .itemDetailPage #castCollapsible,
            .itemDetailPage #guestCastCollapsible,
            .itemDetailPage #similarCollapsible,
            .itemDetailPage .itemDetailsCastSection,
            .itemDetailPage .similarSection,
            .itemDetailPage #additionalPartsCollapsible,
            .itemDetailPage #specialsCollapsible,
            .itemDetailPage #musicVideosCollapsible,
            .itemDetailPage #scenesCollapsible,
            .itemDetailPage .moreFromSeasonSection,
            .itemDetailPage .moreFromArtistSection,
            .itemDetailPage .programGuideSection,
            .itemDetailPage #seriesTimerScheduleSection,
            .itemDetailPage #seriesScheduleSection,
            .itemDetailPage #lyricsSection {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }

            /* Force background and reset padding on main containers */
            .itemDetailPage,
            .itemDetailPage.page,
            .backgroundContainer,
            [data-role="page"].itemDetailPage {
                background-image: none !important;
                background-color: var(--clr-bg-main, #141414) !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                margin-top: 0 !important;
            }

            /* Ensure wrapper starts at top */
            #${CONFIG.containerId}-wrapper {
                position: relative;
                z-index: 10;
                width: 100%;
                min-height: 100vh;
                background-color: var(--clr-bg-main, #141414);
            }
        `;
        document.head.appendChild(style);
        log('Injected global style overrides');
    }

    /**
     * Remove style overrides
     */
    function removeOverridesStyles() {
        const style = document.getElementById('lf-series-overrides');
        if (style) style.remove();
    }

    /**
     * Hide original Jellyfin page elements
     */
    function hideOriginalElements() {
        injectOverridesStyles();

        // Also manually clear any inline styles on the main container just in case
        const itemDetailPage = document.querySelector('.itemDetailPage');
        if (itemDetailPage) {
            itemDetailPage.style.backgroundImage = 'none';
            itemDetailPage.style.backgroundColor = 'var(--clr-bg-main, #141414)';
            itemDetailPage.style.padding = '0';
        }
    }

    /**
     * Main injection function - monitors for series pages and injects our UI
     */
    async function monitorSeriesDetailPage() {
        if (!isSeriesDetailPage()) {
            // Clean up if we left the page
            if (currentSeriesId) {
                currentSeriesId = null;
                const container = document.getElementById(CONFIG.containerId);
                if (container) container.remove();
                removeOverridesStyles(); // Remove our custom styles
            }
            return;
        }

        const seriesId = getSeriesIdFromUrl();
        if (!seriesId || seriesId === currentSeriesId || isInjecting) return;

        // Wait for page container
        const detailPage = document.querySelector('.itemDetailPage') ||
            document.querySelector('[data-type="Series"]') ||
            document.querySelector('.detailPageContent');
        if (!detailPage) return;

        // Check if it's actually a Series (not Movie/Episode)
        const typeElement = document.querySelector('[data-type]');
        const itemType = typeElement?.dataset?.type;

        // We need to verify this is a Series via API since DOM may not be reliable
        const auth = await getAuth();
        if (!auth) return;

        try {
            const checkUrl = `/Users/${auth.UserId}/Items/${seriesId}`;
            const checkRes = await fetch(checkUrl, { headers: { 'X-Emby-Token': auth.AccessToken } });
            const itemData = await checkRes.json();

            if (itemData.Type !== 'Series') {
                return; // Not a series, don't inject
            }
        } catch (e) {
            return;
        }

        isInjecting = true;
        currentSeriesId = seriesId;
        log('Detected Series page:', seriesId);

        try {
            // Fetch all data (Plus NextUp for auto-season select)
            const [seriesData, seasons, similar, nextUpRes] = await Promise.all([
                fetchSeriesData(seriesId),
                fetchSeasons(seriesId),
                fetchSimilar(seriesId),
                // Fetch 1 item from NextUp to get the SeasonId
                fetch(`/Shows/NextUp?SeriesId=${seriesId}&UserId=${auth.UserId}&Limit=1&Fields=SeasonId,SeasonName`, {
                    headers: { 'X-Emby-Token': auth.AccessToken }
                })
                    .then(r => {
                        if (r.ok) return r.json();
                        throw new Error(r.statusText);
                    })
                    .catch(e => {
                        log('[Auto-Season] NextUp fetch failed:', e);
                        return {};
                    })
            ]);

            if (!seriesData || seasons.length === 0) {
                log('Failed to fetch series data');
                isInjecting = false;
                return;
            }

            // --- AUTO-SELECT SEASON LOGIC ---
            let targetSeasonIndex = 0;
            let targetSeason = seasons[0];

            if (nextUpRes && nextUpRes.Items && nextUpRes.Items.length > 0) {
                const nextUpItem = nextUpRes.Items[0];
                const nextUpSeasonId = nextUpItem.SeasonId;
                const nextUpSeasonName = nextUpItem.SeasonName;

                log('[Auto-Season] NextUp Found:', nextUpItem.Name, '| SeasonId:', nextUpSeasonId, '| SeasonName:', nextUpSeasonName);

                // Strategy 1: Find by ID (Exact)
                let foundIndex = seasons.findIndex(s => s.id === nextUpSeasonId);

                // Strategy 2: Find by Name (Fallback)
                if (foundIndex === -1 && nextUpSeasonName) {
                    log('[Auto-Season] ID match failed. Trying Name match...');
                    foundIndex = seasons.findIndex(s => s.name === nextUpSeasonName);
                }

                if (foundIndex !== -1) {
                    targetSeasonIndex = foundIndex;
                    targetSeason = seasons[foundIndex];
                    log(`[Auto-Season] SUCCESS: Selected "${targetSeason.name}" (Index: ${foundIndex})`);
                } else {
                    log('[Auto-Season] FAILED: Could not find matching season in list:', seasons);
                }
            } else {
                log('[Auto-Season] No NextUp item returned by API.');
            }

            // Expose vars globally for SubtitleManager fallback
            window.LF_CURRENT_SEASONS = seasons;
            window.LF_CURRENT_SERIES = seriesData;

            // Fetch episodes for the TARGET season
            const episodes = await fetchEpisodes(seriesId, targetSeason.id);

            // Format people for display
            const people = formatPeople(seriesData.people);

            // Store trailer info for button
            let trailerYtId = null;
            if (seriesData.remoteTrailers && seriesData.remoteTrailers.length > 0) {
                trailerYtId = getYoutubeId(seriesData.remoteTrailers[0].Url);
            }

            // Find or create injection point
            let targetContainer = document.querySelector('.itemDetailPage .view-content') ||
                document.querySelector('.itemDetailPage') ||
                detailPage;

            // Hide original elements
            hideOriginalElements();

            // Create wrapper if not exists
            let wrapper = document.getElementById(CONFIG.containerId + '-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = CONFIG.containerId + '-wrapper';
                // Insert at the TOP of the detail page
                targetContainer.insertBefore(wrapper, targetContainer.firstChild);
            }

            // Render our UI with initialSeasonIndex
            renderSeriesDetailPage({
                series: seriesData,
                seasons: seasons,
                episodes: episodes,
                people: people,
                similar: similar,
                initialSeasonIndex: targetSeasonIndex
            }, wrapper);

            // Wire up dynamic buttons after render
            wireUpButtons(seriesId, seriesData, trailerYtId, seasons);

            log('Series detail page injected successfully');
        } catch (e) {
            log('Error injecting series page:', e);
        } finally {
            isInjecting = false;
        }
    }

    /**
     * Wire up button functionality
     */
    function wireUpButtons(seriesId, seriesData, trailerYtId, seasons) {
        const container = document.getElementById(CONFIG.containerId);
        if (!container) return;

        // Watch Now button - plays first unwatched episode
        // Watch Now button - dynamic states
        const watchNowBtn = container.querySelector('#lfWatchNowBtn');
        if (watchNowBtn) {

            // Logic to determine state and text
            const updateWatchButton = async (retryCount = 0) => {
                log('[WatchBtn] updateWatchButton called. Retry:', retryCount);

                const auth = await getAuth();
                if (!auth) {
                    if (retryCount < 3) {
                        setTimeout(() => updateWatchButton(retryCount + 1), 500);
                    }
                    return;
                }

                try {
                    // Check Series Played Status
                    let isSeriesPlayed = seriesData.userData?.Played || false;

                    // Fetch Next Up - CORRECTED ENDPOINT
                    const nextUpUrl = `/Shows/NextUp?SeriesId=${seriesId}&Limit=1&UserId=${auth.UserId}`;
                    const nextUpRes = await fetch(nextUpUrl, { headers: { 'X-Emby-Token': auth.AccessToken } });

                    var nextUpData;
                    if (!nextUpRes.ok) {
                        nextUpData = { Items: [] };
                    } else {
                        nextUpData = await nextUpRes.json();
                    }

                    if (nextUpData.Items && nextUpData.Items.length > 0) {
                        const nextEp = nextUpData.Items[0];

                        // STATE 2: Continue Watching
                        // Even if series is "Played" (re-watching), NextUp takes precedence if it exists?
                        // Actually if Series is Played, NextUp is usually empty UNLESS user started rewatching.
                        // So if we have NextUp, we continue.

                        // Check if it's literally the first episode and unplayed? 
                        // S1 E1 (IndexNumber 1, ParentIndexNumber 1) AND PlayedPercentage < 5
                        const isStart = nextEp.ParentIndexNumber === 1 && nextEp.IndexNumber === 1 && (!nextEp.UserData?.PlayedPercentage || nextEp.UserData.PlayedPercentage < 5);

                        log('[WatchBtn] Next item found. isStart?', isStart);

                        if (isStart && !isSeriesPlayed) {
                            // DATA STATE 1: Not Started
                            watchNowBtn.innerHTML = '<span class="material-icons">play_arrow</span> Watch Now';
                        } else {
                            // DATA STATE 2: Continue Watching
                            const sNum = nextEp.ParentIndexNumber;
                            const eNum = nextEp.IndexNumber;
                            watchNowBtn.innerHTML = `<span class="material-icons">play_arrow</span> Continue Watching S${sNum} : E${eNum}`;

                            // Store ID for quick access
                            watchNowBtn.dataset.nextId = nextEp.Id;
                        }
                    } else {
                        // No Next Up
                        if (isSeriesPlayed) {
                            // DATA STATE 3: Watch Again
                            log('[WatchBtn] No NextUp + Played = Watch Again');
                            watchNowBtn.innerHTML = '<span class="material-icons">replay</span> Watch Again';
                            watchNowBtn.dataset.isReplay = 'true';
                        } else {
                            // Fallback: Watch Now (Start)
                            log('[WatchBtn] No NextUp + Not Played = Watch Now');
                            watchNowBtn.innerHTML = '<span class="material-icons">play_arrow</span> Watch Now';
                        }
                    }

                } catch (e) {
                    log('Error updating watch button:', e);
                }
            };

            // Run immediately
            updateWatchButton();

            // Click Handler
            watchNowBtn.addEventListener('click', async () => {
                log('Watch Now clicked');
                const auth = await getAuth();
                if (!auth) return;

                // Optimistic use of cached ID
                if (watchNowBtn.dataset.nextId) {
                    if (window.legitFlixPlay) window.legitFlixPlay(watchNowBtn.dataset.nextId);
                    else window.location.href = `#!/details?id=${watchNowBtn.dataset.nextId}`;
                    return;
                }

                // If Replay, start from beginning
                if (watchNowBtn.dataset.isReplay === 'true') {
                    // Get first episode
                    const firstSeason = seasons[0];
                    const episodes = await fetchEpisodes(seriesId, firstSeason.id);
                    if (episodes.length > 0) {
                        const epId = episodes[0].id;
                        if (window.legitFlixPlay) window.legitFlixPlay(epId);
                        else window.location.href = `#!/details?id=${epId}`;
                    }
                    return;
                }

                try {
                    // Fallback fetch (same as before) logic
                    const nextUpUrl = `/Shows/${seriesId}/NextUp?Limit=1&UserId=${auth.UserId}`;
                    const nextUpRes = await fetch(nextUpUrl, { headers: { 'X-Emby-Token': auth.AccessToken } });
                    const nextUpData = await nextUpRes.json();

                    let episodeId = null;
                    if (nextUpData.Items && nextUpData.Items.length > 0) {
                        episodeId = nextUpData.Items[0].Id;
                    } else {
                        // Play first episode
                        const firstSeason = seasons[0];
                        const episodes = await fetchEpisodes(seriesId, firstSeason.id);
                        if (episodes.length > 0) {
                            episodeId = episodes[0].id;
                        }
                    }

                    if (episodeId) {
                        if (window.legitFlixPlay) {
                            window.legitFlixPlay(episodeId);
                        } else {
                            window.location.href = `#!/details?id=${episodeId}`;
                        }
                    }
                } catch (e) {
                    log('Error playing:', e);
                }
            });
        }

        // Trailer button
        const trailerBtn = container.querySelector('#lfTrailerBtn');
        const trailerContainer = container.querySelector('#lfHeroTrailer');
        const trailerIframe = container.querySelector('#lfTrailerIframe');
        const backdrop = container.querySelector('#lfHeroBackdrop');

        const muteBtn = container.querySelector('#lfMuteBtn');

        if (trailerBtn && trailerYtId) {
            let hideUITimeout;
            const heroSection = container.querySelector('#lfSeriesHero');

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
                if (trailerContainer.classList.contains('is-playing')) {
                    startHideTimer();
                }
            };

            // Interaction listener to wake up UI
            heroSection?.addEventListener('mousemove', resetHideTimer);
            heroSection?.addEventListener('click', resetHideTimer);

            // YouTube Blocking Detection
            let blockedTimeout;
            let messageHandler;

            const showBlockedModal = () => {
                const modalId = 'lfBlockedModal';
                if (document.getElementById(modalId)) return;

                const html = `
                    <div id="${modalId}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 11000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
                        <div style="background: #1c1c1c; padding: 30px; border-radius: 12px; max-width: 400px; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                            <span class="material-icons" style="font-size: 48px; color: #ff5252; margin-bottom: 20px;">block</span>
                            <h3 style="font-size: 1.2rem; margin-bottom: 10px; color: white;">Content blocked by browser</h3>
                            <p style="color: rgba(255,255,255,0.7); margin-bottom: 24px; line-height: 1.5;">The trailer cannot be played because your browser blocked it. This usually happens due to tracking protection or ad blockers affecting the YouTube player.</p>
                            <button id="lfCloseBlockedBtn" style="background: var(--clr-accent, #00a4dc); color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', html);
                document.getElementById('lfCloseBlockedBtn').addEventListener('click', () => {
                    document.getElementById(modalId).remove();
                    // Also stop the trailer state
                    if (trailerBtn.click) trailerBtn.click(); // Trigger stop logic
                });
            };

            trailerBtn.addEventListener('click', () => {
                const isPlaying = trailerContainer.classList.contains('is-playing');

                if (isPlaying) {
                    // STOP TRAILER
                    trailerIframe.src = '';
                    trailerContainer.classList.remove('is-playing');
                    heroSection?.classList.remove('is-clean-view');
                    clearTimeout(hideUITimeout);

                    // Clear detection logic
                    clearTimeout(blockedTimeout);
                    if (messageHandler) window.removeEventListener('message', messageHandler);
                    document.getElementById('lfTrailerHelpBtn')?.remove();

                    if (backdrop) backdrop.style.opacity = '1';

                    // Reset Button
                    trailerBtn.innerHTML = `
                        <span class="material-icons">play_circle_filled</span>
                        <span>Watch Trailer</span>
                     `;

                    // Hide Mute
                    if (muteBtn) {
                        muteBtn.style.display = 'none';
                        muteBtn.classList.remove('is-muted');
                    }
                } else {
                    // PLAY TRAILER
                    log('Trailer clicked, YT ID:', trailerYtId);
                    if (trailerIframe && trailerContainer) {
                        // Update Iframe Attributes (Exact match)
                        trailerIframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
                        trailerIframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

                        const origin = window.location.origin;
                        // Embed URL with Origin for API reliability
                        const embedUrl = `https://www.youtube.com/embed/${trailerYtId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${trailerYtId}&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;

                        trailerIframe.src = embedUrl;
                        trailerContainer.classList.add('is-playing');
                        if (backdrop) backdrop.style.opacity = '0';

                        // Start Clean Mode Timer
                        startHideTimer();

                        // Update Button Text
                        trailerBtn.innerHTML = `
                            <span class="material-icons">stop_circle</span>
                            <span>Stop Trailer</span>
                        `;

                        // Show mute button explicity and force display
                        if (muteBtn) {
                            muteBtn.style.display = 'flex';
                            muteBtn.style.zIndex = '100'; // Ensure visibility
                            muteBtn.classList.add('is-muted');
                            muteBtn.innerHTML = '<span class="material-icons">volume_off</span>';
                        }

                        // Setup Blocking Detection
                        // If we don't get ANY message from the iframe in 5s, assume blocked
                        let receivedMessage = false;

                        messageHandler = (event) => {
                            // YouTube API sends messages as JSON strings
                            if (typeof event.data === 'string') {
                                // We accept any valid-looking JSON message from the player
                                // Common events: infoDelivery, initialDelivery, onReady, apiInfo
                                if (event.data.includes('"event"') || event.data.includes('"id"')) {
                                    receivedMessage = true;
                                    clearTimeout(blockedTimeout);
                                }
                            }
                        };
                        window.addEventListener('message', messageHandler);

                        blockedTimeout = setTimeout(() => {
                            // If playing but no API message, show a help button instead of blocking modal
                            // This avoids false positives where the video plays but API messages are blocked/delayed
                            if (!receivedMessage && trailerContainer.classList.contains('is-playing')) {
                                log('Possible block detected: No YT API message received in 4s. Showing help button.');
                                showTrailerHelpBtn();
                            }
                        }, 4000); // Reduced to 4s
                    }
                }
            });

            // Help Button Helper
            const showTrailerHelpBtn = () => {
                if (document.getElementById('lfTrailerHelpBtn')) return;

                const btn = document.createElement('button');
                btn.id = 'lfTrailerHelpBtn';
                btn.innerHTML = '<span class="material-icons">help_outline</span> <span>Trouble playing?</span>';
                btn.className = 'lf-btn lf-btn--glass';
                Object.assign(btn.style, {
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    zIndex: '100',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    opacity: '0',
                    transition: 'opacity 0.3s ease'
                });

                // Append to container (ensure relative positioning)
                trailerContainer.appendChild(btn);

                // Fade in
                requestAnimationFrame(() => btn.style.opacity = '1');

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showBlockedModal();
                });
            };

            // Mute Button Logic
            if (muteBtn) {
                muteBtn.addEventListener('click', () => {
                    const isMuted = muteBtn.classList.contains('is-muted');
                    // Need to post message to correct origin
                    const targetOrigin = '*';
                    if (trailerIframe.contentWindow) {
                        if (isMuted) {
                            trailerIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), targetOrigin);
                            muteBtn.classList.remove('is-muted');
                            muteBtn.innerHTML = '<span class="material-icons">volume_up</span>';
                        } else {
                            trailerIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), targetOrigin);
                            muteBtn.classList.add('is-muted');
                            muteBtn.innerHTML = '<span class="material-icons">volume_off</span>';
                        }
                    }
                });
            }

        } else if (trailerBtn && !trailerYtId) {
            // No trailer available - hide or disable button
            trailerBtn.style.opacity = '0.5';
            trailerBtn.style.pointerEvents = 'none';
            trailerBtn.title = 'No trailer available';
        }

        // Heart/Favorite button
        const heartBtn = container.querySelector('#lfHeartBtn');
        if (heartBtn) {
            // Set initial state
            if (seriesData.isFavorite) {
                heartBtn.classList.add('is-liked');
                heartBtn.querySelector('.material-icons').textContent = 'favorite';
            }

            heartBtn.addEventListener('click', async function () {
                const icon = this.querySelector('.material-icons');
                const wasLiked = this.classList.contains('is-liked');

                // Optimistic UI update
                this.classList.toggle('is-liked');
                icon.textContent = this.classList.contains('is-liked') ? 'favorite' : 'favorite_border';

                // Call API
                try {
                    const auth = await getAuth();
                    if (auth && window.ApiClient) {
                        await window.ApiClient.updateFavoriteStatus(auth.UserId, seriesId, !wasLiked);
                        log('Favorite updated:', !wasLiked);
                    }
                } catch (e) {
                    // Revert on error
                    this.classList.toggle('is-liked');
                    icon.textContent = wasLiked ? 'favorite' : 'favorite_border';
                    log('Error updating favorite:', e);
                }
            });
        }

        // Playback helper
        const playItem = (itemId) => {
            if (window.PlaybackManager) {
                window.PlaybackManager.play({
                    items: [itemId],
                    startPositionTicks: 0
                });
            } else if (window.legitFlixPlay) {
                window.legitFlixPlay(itemId);
            } else {
                window.location.href = `#!/details?id=${itemId}`;
            }
        };

        // Helper to refresh current season
        const refreshCurrentSeason = async () => {
            const activeSeason = container.querySelector('.lf-season-selector__option.is-selected');
            const seasonId = activeSeason ? activeSeason.dataset.seasonId : (seriesData.seasons[0]?.id || '');
            if (seasonId) activeSeason.click();
        };

        // BULK EDIT STATE
        let isSelectionMode = false;
        const selectedEpisodes = new Set();
        const bulkBtn = container.querySelector('#lfBulkActionBtn');
        const bulkText = container.querySelector('#lfBulkActionText');
        const bulkIcon = bulkBtn?.querySelector('.material-icons');

        if (bulkBtn) bulkBtn.style.display = 'flex';

        // Toggle Mode
        const toggleSelectionMode = (forceState) => {
            isSelectionMode = forceState !== undefined ? forceState : !isSelectionMode;

            if (isSelectionMode) {
                container.classList.add('is-selection-mode');
                container.querySelectorAll('.lf-episode-card').forEach(c => c.classList.add('is-selecting-mode'));
                if (bulkText) bulkText.textContent = `Mark Selected (${selectedEpisodes.size})`;
                updateBulkButtonState(); // Call helper to set initial text
                if (bulkIcon) bulkIcon.textContent = 'check_circle';
                if (bulkBtn) bulkBtn.classList.add('lf-btn--primary');
            } else {
                container.classList.remove('is-selection-mode');
                container.querySelectorAll('.lf-episode-card').forEach(c => {
                    c.classList.remove('is-selecting-mode');
                    c.classList.remove('is-selected');
                });
                selectedEpisodes.clear();
                if (bulkText) bulkText.textContent = 'Mark Season Watched';

                // Revert to Season Button State
                updateSeasonButtonState();
                if (bulkBtn) bulkBtn.classList.remove('lf-btn--primary');
            }
        };

        // Helper to update Season Button (Instant Action)
        const updateSeasonButtonState = () => {
            if (isSelectionMode || !bulkText) return;

            const cards = container.querySelectorAll('.lf-episode-card');
            if (cards.length === 0) return;

            let allWatched = true;
            cards.forEach(card => {
                if (!card.classList.contains('is-watched')) allWatched = false;
            });

            if (allWatched) {
                bulkText.textContent = 'Mark Season Unwatched';
                bulkBtn.dataset.seasonAction = 'unwatch';
                if (bulkIcon) bulkIcon.textContent = 'remove_done';
            } else {
                bulkText.textContent = 'Mark Season Watched';
                bulkBtn.dataset.seasonAction = 'watch';
                if (bulkIcon) bulkIcon.textContent = 'done_all';
            }
        };

        // Helper to update button text based on selection state
        const updateBulkButtonState = () => {
            if (!bulkText) return;

            // Check if all selected are already watched
            let allWatched = true;
            if (selectedEpisodes.size > 0) {
                for (let id of selectedEpisodes) {
                    const card = container.querySelector(`.lf-episode-card[data-episode-id="${id}"]`);
                    // Check our class or data attribute if present (using class is easiest sync)
                    if (!card.classList.contains('is-watched')) {
                        allWatched = false;
                        break;
                    }
                }

                if (allWatched) {
                    bulkText.textContent = `Mark Unwatched (${selectedEpisodes.size})`;
                    bulkBtn.dataset.actionType = 'unwatch';
                    if (bulkIcon) bulkIcon.textContent = 'remove_circle_outline';
                } else {
                    bulkText.textContent = `Mark Watched (${selectedEpisodes.size})`;
                    bulkBtn.dataset.actionType = 'watch';
                    if (bulkIcon) bulkIcon.textContent = 'check_circle';
                }
            } else {
                // Nothing selected fallback
                updateSeasonButtonState(); // Revert to season state if 0 selected? 
                // Actually logic says toggleSelection(false) if 0 size in click, but here strictly update text.
            }
        };

        // Card Selection Logic
        const toggleCardSelection = (card, id) => {
            if (selectedEpisodes.has(id)) {
                selectedEpisodes.delete(id);
                card.classList.remove('is-selected');
            } else {
                selectedEpisodes.add(id);
                card.classList.add('is-selected');
            }
            updateBulkButtonState();
        };

        // Bulk Action Listener
        if (bulkBtn) {
            bulkBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const auth = await getAuth();
                if (!auth || !window.ApiClient) {
                    // Error
                    return;
                }

                if (!isSelectionMode) {
                    // "Mark Season Watched/Unwatched" INSTANT ACTION
                    const allCards = container.querySelectorAll('.lf-episode-card');
                    if (allCards.length === 0) return;

                    const seasonAction = bulkBtn.dataset.seasonAction || 'watch';
                    bulkText.textContent = 'Updating...';

                    try {
                        const updates = Array.from(allCards).map(card => {
                            const itemId = card.dataset.episodeId;

                            if (seasonAction === 'unwatch') {
                                // Optimistic: remove watched state immediately
                                card.classList.remove('is-watched');
                                card.classList.remove('is-success-marked');
                                return window.ApiClient.markUnplayed(auth.UserId, itemId);
                            } else {
                                // Optimistic: add success mark
                                card.classList.add('is-success-marked');
                                return window.ApiClient.markPlayed(auth.UserId, itemId, new Date());
                            }
                        });

                        await Promise.all(updates);
                        if (bulkText) bulkText.textContent = 'Done!';

                        setTimeout(() => {
                            refreshCurrentSeason();
                            // Logic inside refresh/season change will reset text via updateSeasonButtonState
                        }, 1000);
                    } catch (e) {
                        // Error
                        allCards.forEach(c => c.classList.remove('is-success-marked'));
                    }
                } else {
                    // BULK SELECTION ACTION
                    if (selectedEpisodes.size === 0) {
                        toggleSelectionMode(false);
                        return;
                    }

                    const actionType = bulkBtn.dataset.actionType || 'watch';
                    bulkText.textContent = 'Updating...';

                    try {
                        const updates = Array.from(selectedEpisodes).map(itemId => {
                            if (actionType === 'unwatch') {
                                return window.ApiClient.markUnplayed(auth.UserId, itemId);
                            } else {
                                return window.ApiClient.markPlayed(auth.UserId, itemId, new Date());
                            }
                        });

                        // Optimistic UI
                        selectedEpisodes.forEach(id => {
                            const card = container.querySelector(`.lf-episode-card[data-episode-id="${id}"]`);
                            if (card) {
                                if (actionType === 'unwatch') {
                                    card.classList.remove('is-watched');
                                    card.classList.remove('is-success-marked');
                                } else {
                                    card.classList.add('is-success-marked');
                                    card.classList.add('is-watched');
                                }
                            }
                        });

                        await Promise.all(updates);

                        if (bulkText) bulkText.textContent = 'Done!';
                        setTimeout(() => {
                            toggleSelectionMode(false);
                            refreshCurrentSeason();
                        }, 1000);
                    } catch (e) {
                        // Error
                        if (bulkText) bulkText.textContent = 'Error!';
                        // Remove success marks
                        selectedEpisodes.forEach(id => {
                            const card = container.querySelector(`.lf-episode-card[data-episode-id="${id}"]`);
                            if (card) card.classList.remove('is-success-marked');
                        });
                    }
                }
            });
        }

        // Initial state check
        updateSeasonButtonState();


        // Click Outside to Exit Selection Mode
        document.addEventListener('click', (e) => {
            if (isSelectionMode) {
                // If click is NOT inside a card AND NOT the bulk button
                const isCard = e.target.closest('.lf-episode-card');
                const isBtn = e.target.closest('#lfBulkActionBtn');
                const isSeasonOption = e.target.closest('.lf-season-selector__option');

                if (!isCard && !isBtn && !isSeasonOption) {
                    toggleSelectionMode(false);
                }
            }
        });

        // Episode card clicks - play or select
        const attachCardListeners = () => {
            container.querySelectorAll('.lf-episode-card').forEach(card => {
                let longPressTimer;
                let preventClick = false;

                const startLongPress = () => {
                    preventClick = false;
                    longPressTimer = setTimeout(() => {
                        preventClick = true;
                        if (!isSelectionMode) {
                            toggleSelectionMode(true);
                        }
                        const id = card.dataset.episodeId;
                        if (!selectedEpisodes.has(id)) {
                            toggleCardSelection(card, id);
                            if (navigator.vibrate) navigator.vibrate(50);
                        }
                    }, 600);
                };

                const cancelLongPress = () => {
                    clearTimeout(longPressTimer);
                };

                // Mouse events
                card.addEventListener('mousedown', startLongPress);
                card.addEventListener('mouseup', cancelLongPress);
                card.addEventListener('mouseleave', cancelLongPress);

                // Touch events
                card.addEventListener('touchstart', startLongPress, { passive: true });
                card.addEventListener('touchend', cancelLongPress);
                card.addEventListener('touchmove', cancelLongPress, { passive: true });

                card.addEventListener('click', function (e) {
                    if (preventClick) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }

                    const episodeId = this.dataset.episodeId;

                    if (isSelectionMode) {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCardSelection(this, episodeId);
                    } else {
                        // Play Mode
                        log('Episode clicked:', episodeId);
                        playItem(episodeId);
                    }
                });
            });
        };
        attachCardListeners();

        // Similar item clicks - navigate to item
        container.querySelectorAll('.lf-similar-card').forEach(card => {
            card.addEventListener('click', function () {
                const itemId = this.dataset.itemId;
                log('Similar clicked:', itemId);
                window.location.href = `#!/details?id=${itemId}`;
            });
        });

        // Season selector - reload episodes when changed
        const seasonOptions = container.querySelectorAll('.lf-season-selector__option');
        seasonOptions.forEach(opt => {
            opt.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();

                const seasonId = this.dataset.seasonId;
                const seasonIndex = parseInt(this.dataset.seasonIndex);
                log('Season changed:', seasonId);

                // Update UI selection
                seasonOptions.forEach(o => o.classList.remove('is-selected'));
                this.classList.add('is-selected');

                const selectorBtnText = container.querySelector('#lfSelectedSeasonText');
                if (selectorBtnText) {
                    selectorBtnText.textContent = this.querySelector('span').textContent;
                }

                // IMPROVEMENT: Close dropdown immediately
                const seasonSelector = container.querySelector('#lfSeasonSelector');
                if (seasonSelector) seasonSelector.classList.remove('is-open');

                // If in selection mode, exit it on season change?
                if (typeof isSelectionMode !== 'undefined' && isSelectionMode) toggleSelectionMode(false);

                // Fetch new episodes
                const episodes = await fetchEpisodes(seriesId, seasonId);

                // Re-render episode grid
                const episodeGrid = container.querySelector('.lf-episode-grid');
                if (episodeGrid) {
                    // Update content directly (createEpisodeGrid now returns just cards)
                    episodeGrid.innerHTML = createEpisodeGrid(episodes);

                    // Re-attach click handlers using shared function
                    if (typeof attachCardListeners === 'function') {
                        attachCardListeners();
                    }

                    // Update Season Button State based on new episodes
                    updateSeasonButtonState();
                }
            });
        });
    }

    /**
     * Start monitoring loop
     */
    function startMonitoring() {
        // Run immediately
        monitorSeriesDetailPage();

        // Then check periodically for SPA navigation
        setInterval(() => {
            monitorSeriesDetailPage();
        }, 1000);
    }

    // =========================================================================
    // DEMO DATA (For browser prototyping)
    // =========================================================================
    const DEMO_DATA = {
        series: {
            id: '43b07d8c75320ca4542a2ea375ed8095',
            name: 'Your Lie in April',
            year: '2014 - 2015',
            officialRating: 'TV-PG',
            communityRating: 8.6,
            episodeCount: 22,
            overview: "Piano prodigy Arima Kosei dominated the competition and all child musicians knew his name. But after his mother, who was also his instructor, passed away, he had a mental breakdown while performing at a recital that resulted in him no longer being able to hear the sound of his piano even though his hearing was perfectly fine. Even two years later, Kosei hasn't touched the piano and views the world in monotone, without any flair or color. He was content living out his life with his good friends Tsubaki and Watari until one day, a free-spirited violinist named Kaori changed everything.",
            genres: ['Drama', 'Romance', 'Music'],
            studios: [{ Name: 'A-1 Pictures' }],
            backdropUrl: 'https://stream.legitflix.eu/Items/43b07d8c75320ca4542a2ea375ed8095/Images/Backdrop/0?tag=1027162ed5999b669a9b22983261de30&maxWidth=1920&quality=80',
            posterUrl: 'https://stream.legitflix.eu/Items/43b07d8c75320ca4542a2ea375ed8095/Images/Primary?fillHeight=350&fillWidth=240&quality=96&tag=68e1bad239ac7faf99052b2fd3304c72',
            people: [
                { Name: 'Natsuki Hanae', Type: 'Actor', Role: 'Kousei Arima' },
                { Name: 'Risa Taneda', Type: 'Actor', Role: 'Kaori Miyazono' },
                { Name: 'Ayane Sakura', Type: 'Actor', Role: 'Tsubaki Sawabe' }
            ]
        },
        seasons: [
            { id: 's1', name: 'Season 1', episodeCount: 22 },
            { id: 's2', name: 'Season 2', episodeCount: 24 },
            { id: 's3', name: 'Specials', episodeCount: 2 }
        ],
        episodes: [
            { id: 'e1', indexNumber: 1, name: 'Monotone/Colorful', overview: 'Piano prodigy Kosei Arima dominates competitions until tragedy strikes.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000, userData: { PlayedPercentage: 75 } },
            { id: 'e2', indexNumber: 2, name: 'Friend A', overview: 'Kaori asks Kosei to be her accompanist at a competition.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000 },
            { id: 'e3', indexNumber: 3, name: 'Inside Spring', overview: 'Kosei struggles as he faces the piano again after years.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000 },
            { id: 'e4', indexNumber: 4, name: 'Departure', overview: 'The competition day arrives and Kosei must overcome his fears.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000 },
            { id: 'e5', indexNumber: 5, name: 'Gray Skies', overview: 'A defining moment that will change Kosei\'s life forever.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000 },
            { id: 'e6', indexNumber: 6, name: 'On the Way Home', overview: 'Kosei reflects on his performance and what lies ahead.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000 }
        ],
        people: [
            { Id: 'p1', Name: 'Natsuki Hanae', Type: 'Actor', Role: 'Kousei Arima', imageUrl: 'https://stream.legitflix.eu/Items/52cf6b71865912d687416fd9efe30e77/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p2', Name: 'Risa Taneda', Type: 'Actor', Role: 'Kaori Miyazono', imageUrl: 'https://stream.legitflix.eu/Items/a04645001ff80f055512f906137bab8d/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p3', Name: 'Ayane Sakura', Type: 'Actor', Role: 'Tsubaki Sawabe', imageUrl: 'https://stream.legitflix.eu/Items/efc9b3bea54cc5e1eea1c27dfb7f35bf/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p4', Name: 'Ryota Osaka', Type: 'Actor', Role: 'Ryouta Watari', imageUrl: 'https://stream.legitflix.eu/Items/c41402b5f1002a24c825ddd8b706bbb9/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p5', Name: 'Ai Kayano', Type: 'Actor', Role: 'Nagi Aiza', imageUrl: 'https://stream.legitflix.eu/Items/8da0c7a7ffcc3ffb559fd05c1f241fb4/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p6', Name: 'Saori Hayami', Type: 'Actor', Role: 'Emi Igawa', imageUrl: 'https://stream.legitflix.eu/Items/72fb92f7d43121d3715ad608118426fd/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p7', Name: 'Yuki Kaji', Type: 'Actor', Role: 'Takeshi Aiza', imageUrl: 'https://stream.legitflix.eu/Items/491d9d793c6fdd08d7bbde585d398c14/Images/Primary?fillHeight=100&fillWidth=100&quality=96' }
        ],
        similar: [
            { Id: 's1', Name: 'Golden Time', posterUrl: 'https://stream.legitflix.eu/Items/9bcd2a047bc849520b0221b95355d765/Images/Primary?fillHeight=225&fillWidth=150&quality=96' },
            { Id: 's2', Name: 'Akame ga Kill!', posterUrl: 'https://stream.legitflix.eu/Items/b2556b9c04d84cb2773a4910c484fafd/Images/Primary?fillHeight=225&fillWidth=150&quality=96' },
            { Id: 's3', Name: 'Anohana', posterUrl: 'https://stream.legitflix.eu/Items/9bcd2a047bc849520b0221b95355d765/Images/Primary?fillHeight=225&fillWidth=150&quality=96' },
            { Id: 's4', Name: 'Clannad', posterUrl: 'https://stream.legitflix.eu/Items/b2556b9c04d84cb2773a4910c484fafd/Images/Primary?fillHeight=225&fillWidth=150&quality=96' },
            { Id: 's5', Name: 'Violet Evergarden', posterUrl: 'https://stream.legitflix.eu/Items/9bcd2a047bc849520b0221b95355d765/Images/Primary?fillHeight=225&fillWidth=150&quality=96' },
            { Id: 's6', Name: 'Toradora!', posterUrl: 'https://stream.legitflix.eu/Items/b2556b9c04d84cb2773a4910c484fafd/Images/Primary?fillHeight=225&fillWidth=150&quality=96' }
        ]
    };

    // =========================================================================
    // PUBLIC API
    // =========================================================================
    window.LFSeriesDetail = {
        // UI generators
        injectStyles,
        renderSeriesDetailPage,
        createHeroSection,
        createSeasonSelector,
        createEpisodeGrid,
        createEpisodesSection,
        createCastSection,
        createSimilarSection,

        // API functions
        fetchSeriesData,
        fetchSeasons,
        fetchEpisodes,
        fetchSimilar,

        // Page monitoring
        monitorSeriesDetailPage,
        startMonitoring,

        // Demo data
        DEMO_DATA,

        // Quick demo function for browser testing
        demo: function (targetSelector = 'body') {
            const target = document.querySelector(targetSelector);
            if (!target) {
                console.error('Target not found:', targetSelector);
                return;
            }
            target.style.backgroundColor = '#141414';
            target.style.fontFamily = "'Inter', sans-serif";
            renderSeriesDetailPage(DEMO_DATA, target);
            log('Demo rendered into:', targetSelector);
        }
    };

    // =========================================================================
    // AUTO-START (Only when running on Jellyfin)
    // =========================================================================

    // Check if we're in Jellyfin (ApiClient exists or will exist)
    const checkAndStart = () => {
        if (window.ApiClient) {
            log('Detected Jellyfin environment. Starting monitoring...');
            startMonitoring();
        } else if (window.location.href.includes('file://')) {
            log('Detected local file mode. Call LFSeriesDetail.demo() to test.');
        } else {
            // Wait for ApiClient to appear
            setTimeout(checkAndStart, 500);
        }
    };

    // Start after a short delay to let Jellyfin initialize
    setTimeout(checkAndStart, 1000);

    log('Module loaded. Call LFSeriesDetail.demo() to test, or it will auto-start on Jellyfin.');
})();
/**
 * LegitFlix Movie Detail Page Revamp
 * Implements the "Direct Player" layout from movie_detail_revamp.html
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
    // CSS STYLES (From movie_detail_revamp.html)
    // =========================================================================
    const MOVIE_DETAIL_CSS = `
        .lf-movie-container {
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

        .lf-movie-container * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        .lf-movie-container {
            width: 100%;
            overflow-x: hidden;
            background-color: var(--clr-bg-main);
            color: var(--clr-text-main);
            font-family: var(--font-primary);
        }

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
        
        /* TRAILER OVERLAY (Added from Series Logic) */
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

        .lf-series-hero__content {
            position: relative;
            z-index: 2;
            display: flex;
            gap: 40px;
            width: 100%;
            align-items: flex-end;
            transition: opacity 0.5s ease;
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
            padding-bottom: 20px;
        }
        
        .lf-series-hero__title { /* Fallback if no logo */
            font-family: var(--font-display);
            font-size: 3rem;
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 10px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        .lf-series-hero__logo-title {
            max-width: 450px;
            max-height: 180px;
            width: auto;
            object-fit: contain;
            display: block;
            margin-bottom: 10px;
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

        .lf-series-hero__rating {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #ffc107;
        }
        
        .lf-meta-badge {
            background: rgba(255,255,255,0.15);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8em;
            color: #fff;
            font-weight: 600;
        }

        .lf-series-hero__actions {
            display: flex;
            gap: 12px;
            margin-top: 16px;
        }

        /* BUTTONS */
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

        .lf-btn--primary:hover {
            background: var(--clr-accent-hover);
        }

        .lf-btn--glass {
            background: var(--clr-bg-glass);
            color: white;
            backdrop-filter: blur(10px);
        }

        .lf-btn--glass:hover {
            background: var(--clr-bg-glass-hover);
        }

        .lf-btn--icon-only {
            padding: 10px;
        }

        .lf-btn--heart {
            transition: all 0.2s ease;
            border: 1px solid transparent;
        }

        .lf-btn--heart:hover {
            background: var(--clr-bg-glass-hover);
        }

        .lf-btn--heart.is-liked {
            background: rgba(233, 30, 99, 0.2);
            border-color: var(--clr-heart);
        }

        .lf-btn--heart.is-liked .material-icons {
            color: var(--clr-heart);
        }
        
        /* Mute Button (From Series) */
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

        /* DESCRIPTION & DETAILS SIDEBAR */
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

        .lf-series-hero__load-more:hover {
            color: var(--clr-accent-hover);
        }
        
        .lf-series-hero__load-more .material-icons {
             transition: transform 0.2s;
             font-size: 18px;
        }

        .lf-series-hero__load-more.expanded .material-icons {
            transform: rotate(180deg);
        }

        /* METADATA SIDEBAR */
        .lf-series-hero__cast-info {
            flex: 1;
            font-size: 0.85rem;
            color: var(--clr-text-muted);
            line-height: 1.8;
            padding-top: 5px;
        }

        .lf-series-hero__cast-info strong {
            color: var(--clr-text-main);
        }

        /* CONTENT SECTIONS */
        .lf-content-section {
            width: 100%;
            padding: 30px var(--content-padding);
        }

        .lf-section-divider {
            border: none;
            border-top: 1px solid var(--clr-divider);
            margin: 0 var(--content-padding);
        }

        /* SECTION HEADER */
        .lf-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }
        
        .lf-section-header--large-gap {
            margin-bottom: 32px;
        }

        .lf-section-title {
            font-family: var(--font-display);
            font-size: 1.3rem;
            font-weight: 600;
            color: var(--clr-text-main);
            margin: 0;
        }

        .lf-filter-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        /* FILTER BUTTONS & DROPDOWNS */
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

        .lf-filter-btn:hover {
            background: var(--clr-bg-glass);
            color: var(--clr-text-main);
        }
        
        .lf-filter-btn.is-selected {
            background: rgba(255, 255, 255, 0.1);
            color: var(--clr-accent);
            border-color: rgba(255, 106, 0, 0.3);
        }

        .lf-filter-dropdown {
            position: relative;
            display: inline-block;
        }

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
        
        .lf-filter-dropdown.is-open .lf-filter-dropdown__menu,
        .lf-filter-dropdown:hover .lf-filter-dropdown__menu {
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
        
        /* PLAYER WRAPPER */
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
        
        .lf-player-overlay:hover .lf-big-play-btn {
             transform: scale(1.1);
             box-shadow: 0 0 50px rgba(255, 107, 0, 0.6);
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

        .lf-big-play-btn .material-icons {
             font-size: 48px; color: white;
        }

        .lf-player-iframe {
            width: 100%;
            height: 100%;
            border: none;
        }

        /* GRIDS */
        .lf-cast-grid,
        .lf-similar-grid {
            display: flex;
            flex-wrap: nowrap;
            gap: 16px;
            overflow-x: auto;
            padding-bottom: 20px;
        }
        
        .lf-cast-grid::-webkit-scrollbar, .lf-similar-grid::-webkit-scrollbar { height: 8px; }
        .lf-cast-grid::-webkit-scrollbar-thumb, .lf-similar-grid::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }

        .lf-cast-card {
            width: 120px;
            flex-shrink: 0;
            text-align: center;
            cursor: pointer;
        }

        .lf-cast-image {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 8px;
            transition: border-color 0.2s;
        }
        .lf-cast-card:hover .lf-cast-image { border-color: rgba(255, 255, 255, 0.4); }

        .lf-cast-name { font-weight: 600; font-size: 0.9rem; color: #fff; }
        .lf-cast-role { font-size: 0.8rem; color: #aaa; }

        .lf-similar-card {
            width: 180px;
            flex-shrink: 0;
            cursor: pointer;
            transition: transform 0.2s;
        }
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

    function removeStyles() {
        const style = document.getElementById(CONFIG.cssId);
        if (style) style.remove();
    }

    // =========================================================================
    // HELPER FUNCTIONS (Duplicated from Series to be standalone)
    // =========================================================================
    function getYoutubeId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    function formatPeople(people) {
        if (!people) return [];
        return people.map(p => ({
            Id: p.Id,
            Name: p.Name,
            Role: p.Role,
            Type: p.Type,
            PrimaryImageTag: p.PrimaryImageTag
        }));
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

        // Sub/Dub detection
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
            <section class="lf-series-hero" id="lfHeroSection">
                <div class="lf-series-hero__backdrop" style="background-image: url('${backdropUrl}');"></div>
                
                <!-- TRAILER CONTAINER -->
                <div class="lf-series-hero__trailer" id="lfHeroTrailer">
                    <iframe id="lfTrailerIframe" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>

                <div class="lf-series-hero__content">
                    <img class="lf-series-hero__poster" src="${posterUrl}" alt="${title}" onerror="this.src='/web/assets/img/default-movie.png'">
                    
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
                            ${endsAtStr ? `<span class="separator">•</span><span class="lf-meta-badge">Ends at ${endsAtStr}</span>` : ''}
                            ${subDubText ? `<span class="separator">•</span><span class="lf-meta-badge">${subDubText}</span>` : ''}
                        </div>

                        <div class="lf-series-hero__actions">
                            <button class="lf-btn lf-btn--primary" id="lfPlayBtn">
                                <span class="material-icons">${playButtonIcon}</span>
                                ${playButtonText}
                            </button>
                            
                            <button class="lf-btn lf-btn--glass" id="lfTrailerBtn">
                                <span class="material-icons">videocam</span>
                                Trailer
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
                                    <span>Read More</span>
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
        const isWatched = item.UserData && item.UserData.Played;
        const watchClass = isWatched ? 'is-selected' : '';
        const watchIcon = isWatched ? 'check_circle' : 'check_circle_outline';

        // Mock options (Real implementation would iterate MediaStreams)
        const audioOptions = `<div class="lf-filter-dropdown__option is-selected"><span>English</span><span class="material-icons">check</span></div>`;
        const subOptions = `<div class="lf-filter-dropdown__option is-selected"><span>English</span><span class="material-icons">check</span></div>`;

        return `
            <hr class="lf-section-divider">
            <section class="lf-content-section">
                <!-- HEADER WITH CONTROLS -->
                <div class="lf-section-header">
                    <h2 class="lf-section-title">${item.Name}</h2>

                    <div class="lf-filter-controls">
                        <!-- Audio/Sub Selector -->
                        <div class="lf-filter-dropdown" id="lfLangDropdown">
                            <button class="lf-filter-btn" title="Audio & Subtitles" id="lfLangBtn">
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

                        <!-- Mark Watched Button -->
                        <button class="lf-filter-btn ${watchClass}" id="lfWatchedBtn" title="Mark as Watched">
                            <span class="material-icons">${watchIcon}</span>
                            <span>Mark Watched</span>
                        </button>
                    </div>
                </div>

                <div class="lf-player-wrapper">
                    <div class="lf-player-overlay" id="lfPlayerOverlay">
                        <div class="lf-big-play-btn">
                            <span class="material-icons">play_arrow</span>
                        </div>
                    </div>
                    <!-- Using Backdrop as placeholder for now, click will launch Player or Iframe can load content -->
                    <div id="lfPlayerPlaceholder" style="width:100%; height:100%; background: url('/Items/${item.Id}/Images/Backdrop/0') center/cover;"></div>
                </div>
            </section>
        `;
    }

    function createCastSection(people) {
        if (!people || people.length === 0) return '';

        // Only Actors
        const actors = people.filter(p => p.Type === 'Actor');
        if (actors.length === 0) return '';

        const cards = actors.map(person => `
            <div class="lf-cast-card" onclick="window.legitFlixShowItem('${person.Id}')">
                <img class="lf-cast-image" src="${person.PrimaryImageTag ? `/Items/${person.Id}/Images/Primary?maxHeight=200&maxWidth=200` : '/web/assets/img/default-avatar.png'}" alt="${person.Name}">
                <div class="lf-cast-name">${person.Name}</div>
                <div class="lf-cast-role">${person.Role || ''}</div>
            </div>
        `).join('');

        return `
            <hr class="lf-section-divider">
            <section class="lf-content-section">
                <div class="lf-section-header lf-section-header--large-gap">
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
                <div class="lf-section-header lf-section-header--large-gap">
                    <h2 class="lf-section-title">More Like This</h2>
                </div>
                <div class="lf-similar-grid">${cards}</div>
            </section>
        `;
    }

    // =========================================================================
    // EVENTS
    // =========================================================================
    function wireUpMovieEvents(container, item, trailerYtId) {
        // --- Play Main ---
        const playBtn = container.querySelector('#lfPlayBtn');
        const overlay = container.querySelector('#lfPlayerOverlay');
        const doPlay = () => {
            if (window.legitFlixPlay) window.legitFlixPlay(item.Id);
            else console.warn('legitFlixPlay not found');
        };

        playBtn?.addEventListener('click', doPlay);
        overlay?.addEventListener('click', doPlay);

        // --- Favorites ---
        const heartBtn = container.querySelector('#lfHeartBtn');
        heartBtn?.addEventListener('click', () => {
            const isLiked = heartBtn.classList.toggle('is-liked');
            const icon = heartBtn.querySelector('.material-icons');
            if (icon) icon.textContent = isLiked ? 'favorite' : 'favorite_border';
            if (window.legitFlixToggleFav) window.legitFlixToggleFav(item.Id, heartBtn);
        });

        // --- Watched ---
        const watchedBtn = container.querySelector('#lfWatchedBtn');
        watchedBtn?.addEventListener('click', () => {
            const isSelected = watchedBtn.classList.toggle('is-selected');
            const icon = watchedBtn.querySelector('.material-icons');
            if (icon) icon.textContent = isSelected ? 'check_circle' : 'check_circle_outline';
            if (window.legitFlixTogglePlayed) window.legitFlixTogglePlayed(item.Id, watchedBtn);
        });

        // --- Trailer ---
        const trailerBtn = container.querySelector('#lfTrailerBtn');
        if (trailerYtId && trailerBtn) {
            const trailerContainer = container.querySelector('#lfHeroTrailer');
            const iframe = container.querySelector('#lfTrailerIframe');
            const backdrop = container.querySelector('.lf-series-hero__backdrop'); // Visual bg
            const muteBtn = container.querySelector('#lfMuteBtn');

            trailerBtn.addEventListener('click', () => {
                const isPlaying = trailerContainer.classList.contains('is-playing');
                if (isPlaying) {
                    // Stop
                    trailerContainer.classList.remove('is-playing');
                    iframe.src = '';
                    trailerBtn.innerHTML = '<span class="material-icons">videocam</span> Trailer';
                    if (backdrop) backdrop.style.opacity = '1';
                    if (muteBtn) muteBtn.style.display = 'none';
                } else {
                    // Play
                    const origin = window.location.origin;
                    const embedUrl = `https://www.youtube.com/embed/${trailerYtId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&controls=0&disablekb=1&playlist=${trailerYtId}&enablejsapi=1&origin=${origin}`;
                    iframe.src = embedUrl;
                    trailerContainer.classList.add('is-playing');
                    trailerBtn.innerHTML = '<span class="material-icons">stop_circle</span> Stop';
                    if (backdrop) backdrop.style.opacity = '0';
                    if (muteBtn) {
                        muteBtn.style.display = 'flex';
                        muteBtn.classList.add('is-muted');
                        muteBtn.innerHTML = '<span class="material-icons">volume_off</span>';
                    }
                }
            });

            // Mute logic
            if (muteBtn) {
                muteBtn.addEventListener('click', () => {
                    const isMuted = muteBtn.classList.contains('is-muted');
                    const targetOrigin = '*';
                    if (iframe.contentWindow) {
                        const func = isMuted ? 'unMute' : 'mute';
                        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), targetOrigin);
                        muteBtn.classList.toggle('is-muted');
                        muteBtn.innerHTML = isMuted ? '<span class="material-icons">volume_up</span>' : '<span class="material-icons">volume_off</span>';
                    }
                });
            }

        } else if (trailerBtn) {
            trailerBtn.style.display = 'none';
        }

        // --- Read More ---
        const descText = container.querySelector('#lfDescriptionText');
        const moreBtn = container.querySelector('#lfLoadMoreBtn');
        if (descText && descText.scrollHeight > descText.clientHeight + 10) {
            moreBtn.style.display = 'inline-flex';
            moreBtn.addEventListener('click', () => {
                const expanded = descText.classList.toggle('expanded');
                moreBtn.classList.toggle('expanded');
                moreBtn.querySelector('span').textContent = expanded ? 'Less' : 'Read More';
            });
        }

        // --- Dropdown ---
        const langDropdown = container.querySelector('#lfLangDropdown');
        const langBtn = container.querySelector('#lfLangBtn');
        if (langBtn && langDropdown) {
            langBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                langDropdown.classList.toggle('is-open');
            });
            document.addEventListener('click', (e) => {
                if (!langDropdown.contains(e.target)) langDropdown.classList.remove('is-open');
            });
        }
    }


    // =========================================================================
    // MAIN RENDER LOGIC
    // =========================================================================
    function renderMovieDetailPage(data, targetContainer) {
        injectStyles();
        const { item, similar } = data;

        const html = `
             <div class="lf-movie-container" id="${CONFIG.containerId}">
                  ${createHeroSection(item)}
                  ${createPlayerSection(item)}
                  ${createCastSection(item.People)}
                  ${createSimilarSection(similar ? similar.Items : [])}
             </div>
         `;

        targetContainer.innerHTML = html;

        // Wire events
        const container = document.getElementById(CONFIG.containerId);
        let trailerId = null;
        if (item.RemoteTrailers && item.RemoteTrailers.length > 0) {
            trailerId = getYoutubeId(item.RemoteTrailers[0].Url);
        }
        wireUpMovieEvents(container, item, trailerId);

        log('Movie Detail Page Rendered');
    }

    // =========================================================================
    // API
    // =========================================================================
    async function fetchMovieData(itemId) {
        if (!window.ApiClient) return null;
        const userId = window.ApiClient.getCurrentUserId();
        const item = await window.ApiClient.getItem(userId, itemId);
        return item;
    }

    async function fetchSimilar(itemId) {
        if (!window.ApiClient) return null;
        const userId = window.ApiClient.getCurrentUserId();
        return await window.ApiClient.getSimilarItems(itemId, { Limit: 10, UserId: userId });
    }

    // =========================================================================
    // MONITORING
    // =========================================================================
    let isInjecting = false;
    let currentMovieId = null;

    async function monitorMovieDetailPage() {
        const detailPage = document.querySelector('.itemDetailPage');
        if (!detailPage) {
            if (currentMovieId) {
                currentMovieId = null;
                removeStyles();
            }
            return;
        }

        // Check ID from URL
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.split('?')[1]);
        const id = params.get('id');

        if (!id || id === currentMovieId || isInjecting) return;

        // Verify it is a MOVIE
        // We do this via API because DOM might be stale or slow
        isInjecting = true;
        try {
            // Quick fetch to check type
            const item = await fetchMovieData(id);
            if (!item || item.Type !== 'Movie') {
                isInjecting = false;
                return; // Abort if not Movie
            }

            log('Detected Movie:', id);
            currentMovieId = id;

            // Fetch similar too
            const similar = await fetchSimilar(id);

            // Hide default
            // Strategy: We inject INTO the view, replacing standard content
            // or hide standard content and append ours.
            // Best strategy for single page apps:

            // 1. Hide original children
            const children = Array.from(detailPage.children);
            children.forEach(c => c.style.display = 'none');

            // 2. Render ours
            renderMovieDetailPage({ item, similar }, detailPage);

            // 3. Watch for navigation away (MutationObserver handled by Theme usually, but we check via polling in Theme)

        } catch (e) {
            console.error('[LF-Movie] Fetch failed', e);
        } finally {
            isInjecting = false;
        }
    }

    // =========================================================================
    // EXPORT
    // =========================================================================
    window.LFMovieDetail = {
        renderMovieDetailPage,
        monitorMovieDetailPage,
        fetchMovieData
    };

    log('Movie Module Loaded');

})();
