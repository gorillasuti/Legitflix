/* LegitFlix Bundle.js v2.5
   - UI Overhaul: Replaced Media Bar with "Hero Carousel" spotlight.
   - Added: Auto-rotating slides, "Play" button, and specific metadata.
   - Improved: Strict shuffling for random content display.
*/

console.log('%c LegitFlix: Bundle v2.6 Loaded ', 'background: #00AA00; color: white; padding: 2px 5px; border-radius: 3px;');

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

        // Metadata formatting
        const year = item.ProductionYear || '';
        const rating = item.OfficialRating || 'NR';
        const match = Math.floor(80 + Math.random() * 19); // Fake "Match" score for aesthetics 80-99%
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
                        <span class="match-score">${match}% Match</span>
                        <span class="year">${year}</span>
                        <span class="rating-badge">${rating}</span>
                    </div>
                    <p class="hero-desc">${desc}</p>
                    <div class="hero-actions">
                        <button class="btn-play" onclick="${playOnClick}">
                            <i class="material-icons">play_arrow</i> PLAY
                        </button>
                        <button class="btn-list" onclick="${infoOnClick}">
                            <i class="material-icons">add</i> MY LIST
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

// --- PLAYBACK HELPER ---
window.legitFlixPlay = async function (id) {
    const auth = await getAuth();
    if (!window.PlaybackManager || !auth) {
        window.legitFlixShowItem(id); // Fallback to details
        return;
    }

    // Simple play request
    window.PlaybackManager.play({
        items: [id],
        serverId: window.ApiClient.serverId()
    });
};

// --- INJECTION LOGIC ---
async function injectMediaBar() {
    const hash = window.location.hash;
    const isHomePage = hash.includes('home') || hash === '' || hash.includes('startup');

    if (!isHomePage) return;

    // CLEANUP
    document.querySelectorAll('.hero-carousel-container').forEach(el => el.remove());
    // Also remove old media bars if they exist
    document.querySelectorAll('.legit-media-bar-container').forEach(el => el.remove());

    const items = await fetchMediaBarItems();
    if (items.length === 0) return;

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
        }
    }, 1000);

    setTimeout(() => clearInterval(checkInterval), 10000);
}

function init() {
    injectMediaBar();
    document.addEventListener('viewshow', () => {
        injectMediaBar();
    });
}

init();