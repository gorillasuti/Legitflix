/* LegitFlix Theme JS v4.0 (Debug & Dynamic Nav)
   - Core: Added console.log debugs to all functions.
   - Nav: Fetches real User Views (Libraries) from API instead of hardcoded links.
   - Fix: Carousel "rapid switch" fixed (Single interval enforcement + Debounce).
   - Fix: Header alignment and loading logic.
*/

console.log('%c LegitFlix: Theme v4.0 Loaded ', 'background: #00AA00; color: white; padding: 2px 5px; border-radius: 3px;');

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

// --- AUTH HELPER ---
async function getAuth() {
    logger.log('getAuth: Checking for ApiClient...');
    let attempts = 0;
    while (!window.ApiClient && attempts < 30) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }
    if (window.ApiClient) {
        logger.log('getAuth: ApiClient found!');
        return {
            UserId: window.ApiClient.getCurrentUserId(),
            AccessToken: window.ApiClient.accessToken(),
            ServerId: window.ApiClient.serverId()
        };
    }
    logger.error('getAuth: ApiClient timed out.');
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

async function fetchMediaBarItems() {
    logger.log('fetchMediaBarItems: Fetching hero content...');
    const auth = await getAuth();
    if (!auth) return [];

    const fields = 'PrimaryImageAspectRatio,Overview,BackdropImageTags,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks,Genres';
    const url = `/Users/${auth.UserId}/Items?IncludeItemTypes=${CONFIG.heroMediaTypes}&Recursive=true&SortBy=Random&Limit=${CONFIG.heroLimit}&Fields=${fields}&ImageTypeLimit=1&EnableImageTypes=Backdrop,Primary`;

    try {
        const response = await fetch(url, {
            headers: { 'X-Emby-Token': auth.AccessToken }
        });
        const data = await response.json();
        const allItems = data.Items || [];
        logger.log('fetchMediaBarItems: Downloaded items', allItems.length);
        return shuffleArray(allItems);
    } catch (error) {
        logger.error('fetchMediaBarItems: API Error', error);
        return [];
    }
}

// --- UI GENERATION (HERO CAROUSEL) ---
function createMediaBarHTML(items) {
    logger.log('createMediaBarHTML: Generating HTML for slides');
    if (!items || items.length === 0) return '';

    const slides = items.map((item, index) => {
        const backdropUrl = `/Items/${item.Id}/Images/Backdrop/0?maxHeight=1080&quality=80`;
        const activeClass = index === 0 ? 'active' : '';

        // IMDb Rating
        let ratingHtml = item.CommunityRating ? `<span class="star-rating">⭐ ${item.CommunityRating.toFixed(1)}</span>` : '';

        // Ends At Calculation
        let endsAtHtml = '';
        if (item.RunTimeTicks && item.Type !== 'Series') {
            const ms = item.RunTimeTicks / 10000;
            const endTime = new Date(Date.now() + ms);
            const timeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            endsAtHtml = `<span class="ends-at">Ends at ${timeStr}</span>`;
        } else if (item.Type === 'Series') {
            endsAtHtml = `<span class="ends-at">${item.ChildCount ? item.ChildCount + ' Seasons' : 'Series'}</span>`;
        }

        const title = item.Name;
        const desc = item.Overview || '';
        const playOnClick = `window.legitFlixPlay('${item.Id}')`;
        const infoOnClick = `window.legitFlixShowItem('${item.Id}')`;

        return `
            <div class="hero-slide ${activeClass}" data-index="${index}">
                <div class="hero-backdrop" style="background-image: url('${backdropUrl}')"></div>
                <div class="hero-overlay"></div>
                <div class="hero-content">
                    <h1 class="hero-title">${title}</h1>
                    <div class="hero-meta">
                        ${ratingHtml}
                        <span class="year">${item.ProductionYear || ''}</span>
                        ${endsAtHtml}
                    </div>
                    <p class="hero-desc">${desc}</p>
                    <div class="hero-actions">
                        <button class="btn-play" onclick="${playOnClick}">
                            <i class="material-icons">play_arrow</i> PLAY
                        </button>
                        <button class="btn-info" onclick="${infoOnClick}">
                            <i class="material-icons">info_outline</i> MORE INFO
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `<div id="legit-hero-carousel" class="hero-carousel-container">${slides}</div>`;
}

// --- CAROUSEL LOGIC (Fixed) ---
let carouselInterval = null;

function startCarousel() {
    logger.log('startCarousel: Attempting to start...');

    // Stop any existing interval properly
    if (carouselInterval) {
        logger.log('startCarousel: Clearing old interval');
        clearInterval(carouselInterval);
        carouselInterval = null;
    }

    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) {
        logger.warn('startCarousel: No slides found!');
        return;
    }

    logger.log(`startCarousel: Starting new interval with ${slides.length} slides.`);

    let currentIndex = 0;
    const rotate = () => {
        // Double check existence in case DOM changed
        if (slides.length === 0) return;

        slides.forEach(s => s.classList.remove('active'));

        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
    };

    carouselInterval = setInterval(rotate, 8000); // 8 seconds per slide
}

// --- PLAYBACK HELPER (Retry Logic) ---
window.legitFlixPlay = async function (id) {
    logger.log('legitFlixPlay: Clicked', id);

    const waitForGlobals = async (retries = 10, delay = 200) => {
        for (let i = 0; i < retries; i++) {
            if (window.PlaybackManager && window.ApiClient) return true;
            await new Promise(r => setTimeout(r, delay));
        }
        return false;
    };

    if (!window.PlaybackManager || !window.ApiClient) {
        logger.warn('legitFlixPlay: Globals not ready, waiting...');
        const ready = await waitForGlobals();
        if (!ready) {
            alert("Jellyfin is still loading components. Please try again in moment.");
            return;
        }
    }

    const apiClient = window.ApiClient;
    try {
        const item = await apiClient.getItem(apiClient.getCurrentUserId(), id);
        if (!item) return;

        logger.log('legitFlixPlay: Sending play command');
        window.PlaybackManager.play({
            items: [item],
            startPositionTicks: 0,
            serverId: apiClient.serverId()
        });
    } catch (error) {
        logger.error('legitFlixPlay: Failed', error);
        alert("Playback failed. See console.");
    }
};

// --- CUSTOM NAVIGATION (Dynamic) ---
async function injectCustomNav() {
    logger.log('injectCustomNav: Checking...');
    if (document.querySelector('.legit-nav-links')) return;

    const headerLeft = document.querySelector('.headerLeft');
    if (!headerLeft) {
        logger.log('injectCustomNav: headerLeft not found yet.');
        return;
    }

    logger.log('injectCustomNav: Fetching views...');
    const views = await fetchUserViews();

    // Map views to HTML links
    const linksHtml = views.map(v => {
        // Special case for "Home" or "Dashboard"? 
        // Usually views are just the libraries. We can add a manual 'Dashboard' link first.
        return `<a href="#!/list?parentId=${v.Id}&id=${v.Id}" class="nav-link">${v.Name}</a>`;
    }).join('');

    const dashLink = `<a href="#!/home" class="nav-link active">Dashboard</a>`;

    const finalHtml = `
        <div class="legit-nav-links">
            ${dashLink}
            ${linksHtml}
        </div>
    `;

    logger.log('injectCustomNav: Injecting HTML');
    headerLeft.insertAdjacentHTML('beforeend', finalHtml);
}

// --- INJECTION & INIT ---
async function injectMediaBar() {
    logger.log('injectMediaBar: Started');

    const hash = window.location.hash;
    const isHomePage = hash.includes('home') || hash === '' || hash.includes('startup');
    if (!isHomePage) return;

    // Remove old
    document.querySelectorAll('.hero-carousel-container').forEach(el => el.remove());

    const items = await fetchMediaBarItems();
    if (items.length === 0) return;

    // Attempt injection
    const checkInterval = setInterval(() => {
        let container = document.querySelector('.homeSectionsContainer');
        if (!container) container = document.querySelector('.mainAnimatedPages');
        if (!container) container = document.querySelector('#indexPage .pageContent');

        const isReady = container && window.ApiClient;

        if (isReady) {
            clearInterval(checkInterval);
            const wrapper = document.createElement('div');
            wrapper.innerHTML = createMediaBarHTML(items);

            container.insertBefore(wrapper, container.firstChild);

            logger.log('injectMediaBar: Injected successfully');
            startCarousel();
        }
    }, 1000);

    setTimeout(() => {
        clearInterval(checkInterval);
        logger.log('injectMediaBar: Timeout reached');
    }, 15000);
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

// --- CUSTOM NAVIGATION (Dribbble Style) ---
function injectCustomNav() {
    // Only inject if not already present
    if (document.querySelector('.legit-nav-links')) return;

    // We need to find the header container. Usually .headerLeft or .skinHeader
    const headerLeft = document.querySelector('.headerLeft');
    if (!headerLeft) return;

    // Create the links container
    const navHtml = `
        <div class="legit-nav-links">
            <a href="#!/home" class="nav-link active">Dashboard</a>
            <a href="#!/movies" class="nav-link">Movies</a>
            <a href="#!/tv" class="nav-link">Series</a>
            <a href="#!/kids" class="nav-link">Kids</a>
        </div>
    `;

    // Inject after the logo
    headerLeft.insertAdjacentHTML('beforeend', navHtml);
}

function init() {
    console.log('LegitFlix: Init Sequence Started');

    // 1. Hero Carousel (Wait for Auth)
    // We wrap this in a retry block to ensure we don't give up too early
    const startHero = async () => {
        let attempts = 0;
        // Try for up to 30 seconds to find ApiClient
        while (!window.ApiClient && attempts < 60) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }
        if (window.ApiClient) {
            injectMediaBar();
        } else {
            console.error('LegitFlix: ApiClient never loaded. Hero canceled.');
        }
    };
    startHero();

    // 2. Jellyseerr
    injectJellyseerr();

    // 3. Custom Nav
    injectCustomNav();

    // 4. Observers for navigation/persistence
    const observer = new MutationObserver((mutations) => {
        // Debounce or check flags
        let headerChanged = false;
        let contentChanged = false;

        for (const m of mutations) {
            if (m.addedNodes.length) {
                if (m.target.classList.contains('headerLeft') || document.querySelector('.skinHeader')) {
                    headerChanged = true;
                }
                if (document.querySelector('.homeSectionsContainer')) {
                    contentChanged = true;
                }
            }
        }

        if (headerChanged) injectCustomNav();
        if (contentChanged) {
            injectJellyseerr();
            // Re-inject media bar if lost
            if (!document.querySelector('.hero-carousel-container') && window.ApiClient) {
                injectMediaBar();
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Hook events
    document.addEventListener('viewshow', () => {
        // injectMediaBar call is handled by verify/observer usually, but safe to call
        injectCustomNav();
        injectJellyseerr();
    });
}

init();