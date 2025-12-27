/* LegitFlix Theme JS v3.0
   - Architecture: Renamed from bundle.js.
   - UX: Added Native CSS Loading Screen to prevent UI pop-in.
   - Core: Robust playback logic and strict checks.
*/

console.log('%c LegitFlix: Theme v3.0 Loaded ', 'background: #00AA00; color: white; padding: 2px 5px; border-radius: 3px;');

// --- GLOBAL NAVIGATION HELPER ---
// --- GLOBAL NAVIGATION HELPER ---
window.legitFlixShowItem = function (id) {
    console.log('LegitFlix: Navigating to', id);
    // V2.4 CHANGE: Use direct URL navigation (mirrors working-mediabar.js)
    // This avoids all 'appRouter' issues entirely.
    window.top.location.href = `#!/details?id=${id}`;
};

// --- SAFETY SHIM REMOVED ---
// We no longer rely on appRouter, so no shim is needed.

const CONFIG = {
    rootUrl: '',
    mediaBar: {
        enabled: true,
        limit: 20,
        // V2.5 CHANGE: Fetch both Movies and Series
        type: 'Movie,Series',
        sortBy: 'Random',
        enableBackdrops: true
    }
};

// --- AUTH HELPER ---
async function getAuth() {
    let attempts = 0;
    while (!window.ApiClient && attempts < 20) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }
    if (window.ApiClient) {
        return {
            UserId: window.ApiClient.getCurrentUserId(),
            AccessToken: window.ApiClient.accessToken()
        };
    }
    return null;
}

// --- UTILS ---
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// --- DATA FETCHING ---
async function fetchMediaBarItems() {
    const auth = await getAuth();
    if (!auth) return [];

    // Fields: Needed for the rich hero UI (ProductionYear, OfficialRating, CommunityRating, RunTimeTicks)
    const fields = 'PrimaryImageAspectRatio,Overview,BackdropImageTags,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks,Genres';
    const url = `/Users/${auth.UserId}/Items?IncludeItemTypes=${CONFIG.mediaBar.type}&Recursive=true&SortBy=${CONFIG.mediaBar.sortBy}&Limit=20&Fields=${fields}&ImageTypeLimit=1&EnableImageTypes=Backdrop,Primary`;

    try {
        const response = await fetch(url, {
            headers: { 'X-Emby-Token': auth.AccessToken }
        });
        const data = await response.json();
        const allItems = data.Items || [];

        // V2.6 LOGIC: Strict Randomization (No Patterns)
        // We simply shuffle the entire mixed pool.
        return shuffleArray(allItems);

    } catch (error) {
        console.error('LegitFlix: API Error', error);
        return [];
    }
}

// --- UI GENERATION (HERO CAROUSEL) ---
function createMediaBarHTML(items) {
    if (!items || items.length === 0) return '';

    const slides = items.map((item, index) => {
        // High quality backdrop for hero
        const backdropUrl = `/Items/${item.Id}/Images/Backdrop/0?maxHeight=1080&quality=80`;
        const activeClass = index === 0 ? 'active' : '';

        // --- METADATA LOGIC ---
        const year = item.ProductionYear || '';

        // IMDb Rating (CommunityRating)
        let ratingHtml = '';
        if (item.CommunityRating) {
            ratingHtml = `<span class="star-rating">⭐ ${item.CommunityRating.toFixed(1)}</span>`;
        } else {
            ratingHtml = `<span class="star-rating">N/A</span>`;
        }

        // Ends At Calculation
        let endsAtHtml = '';
        if (item.RunTimeTicks && item.Type !== 'Series') {
            // 1 tick = 10,000 ms ?? No, 1 tick = 100ns. 1ms = 10,000 ticks.
            // Jellyfin uses 10,000 ticks per ms.
            const ms = item.RunTimeTicks / 10000;
            const endTime = new Date(Date.now() + ms);
            const timeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            endsAtHtml = `<span class="ends-at">Ends at ${timeStr}</span>`;
        } else if (item.Type === 'Series') {
            endsAtHtml = `<span class="ends-at">${item.ChildCount ? item.ChildCount + ' Seasons' : 'Series'}</span>`;
        }

        const desc = item.Overview || '';
        const title = item.Name;

        // Button actions
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
                        <span class="year">${year}</span>
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

    return `
        <div id="legit-hero-carousel" class="hero-carousel-container">
            ${slides}
        </div>
    `;
}

// --- CAROUSEL LOGIC ---
let carouselInterval;
function startCarousel() {
    if (carouselInterval) clearInterval(carouselInterval);

    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    let currentIndex = 0;

    const showSlide = (index) => {
        slides.forEach(s => s.classList.remove('active'));
        slides[index].classList.add('active');
    };

    carouselInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
    }, 8000); // 8 seconds per slide
}

// --- LOADING SCREEN ---
function initLoadingScreen() {
    if (document.querySelector('.legit-loader')) return;

    // Inject Loader HTML
    const loaderHtml = `
        <div class="legit-loader">
            <div class="loader-content">
                <div class="loader-logo">LegitFlix</div>
                <div class="loader-spinner"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loaderHtml);
}

// Dismiss Loader Helper
function dismissLoader() {
    const loader = document.querySelector('.legit-loader');
    if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 600); // Matches CSS transition
    }
}

// Call immediately
initLoadingScreen();

// --- PLAYBACK HELPER (Robust Logic) ---
window.legitFlixPlay = async function (id) {
    if (!window.PlaybackManager || !window.ApiClient) {
        alert("Please wait for Jellyfin to finish loading...");
        return;
    }

    const apiClient = window.ApiClient;
    const userId = apiClient.getCurrentUserId();

    try {
        // Fetch the full item details first (safest way to ensure playback works)
        const item = await apiClient.getItem(userId, id);
        if (!item) {
            console.error('LegitFlix: Media item not found for playback.');
            return;
        }

        console.log('LegitFlix: Playing', item.Name);

        window.PlaybackManager.play({
            items: [item],
            startPositionTicks: 0,
            isMuted: false,
            isPaused: false,
            serverId: apiClient.serverId()
        });

    } catch (error) {
        console.error('LegitFlix: Error starting playback', error);
        alert("Playback failed. See console for details.");
    }
};

// --- INJECTION LOGIC ---
async function injectMediaBar() {
    const hash = window.location.hash;
    const isHomePage = hash.includes('home') || hash === '' || hash.includes('startup');

    if (!isHomePage) {
        dismissLoader(); // Ensure loader is gone if we navigate away or start elsewhere
        return;
    }

    // CLEANUP
    document.querySelectorAll('.hero-carousel-container').forEach(el => el.remove());
    // Also remove old media bars if they exist
    document.querySelectorAll('.legit-media-bar-container').forEach(el => el.remove());

    const items = await fetchMediaBarItems();
    if (items.length === 0) {
        dismissLoader();
        return;
    }

    const checkInterval = setInterval(() => {
        let container = document.querySelector('.homeSectionsContainer');
        if (!container) container = document.querySelector('.mainAnimatedPages');
        if (!container) container = document.querySelector('#indexPage .pageContent');

        if (container) {
            clearInterval(checkInterval);
            const wrapper = document.createElement('div');
            wrapper.innerHTML = createMediaBarHTML(items);

            // Inject at very top
            container.insertBefore(wrapper, container.firstChild);

            // Start the show
            startCarousel();
            console.log('LegitFlix: Hero Carousel Injected');

            // UI is ready, dismiss loader
            dismissLoader();
        }
    }, 1000);

    // Safety timeout to dismiss loader if injection hangs
    setTimeout(() => {
        clearInterval(checkInterval);
        dismissLoader();
    }, 12000);
}

function init() {
    injectMediaBar();
    document.addEventListener('viewshow', () => {
        injectMediaBar();
    });
}

init();