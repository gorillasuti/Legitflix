/* LegitFlix Bundle.js v2.1
   - Fixed: 'appRouter is not defined' error by adding a robust navigation helper.
   - Fixed: Navigation now supports Jellyfin 10.9+.
*/

console.log('%c LegitFlix: Core Bundle Loaded ', 'background: #e50914; color: white; padding: 2px 5px; border-radius: 3px;');

// --- GLOBAL NAVIGATION HELPER (FIXES CLICK ERROR) ---
window.legitFlixShowItem = function (id) {
    console.log('LegitFlix: Navigating to', id);

    // Strategy 1: Try standard global router (Older versions)
    if (window.appRouter) {
        window.appRouter.showItem(id);
        return;
    }

    // Strategy 2: Try Emby/Jellyfin Page Helper (Newer versions)
    // Note: window.Emby might be undefined in some module scopes, but usually available globally
    if (window.Emby && window.Emby.Page && window.Emby.Page.showItem) {
        window.Emby.Page.showItem(id);
        return;
    }

    // Strategy 3: Universal Hash Navigation (The "Nuclear" Option)
    // This forces the router to pick up the change
    const newHash = `#!/details?id=${id}`;
    if (window.location.hash !== newHash) {
        window.location.hash = newHash;
    } else {
        // Force reload if already on the page (rare edge case)
        window.location.reload();
    }
};

const CONFIG = {
    rootUrl: '',
    mediaBar: {
        enabled: true,
        limit: 20,
        type: 'Movie',
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

// --- DATA FETCHING ---
async function fetchMediaBarItems() {
    const auth = await getAuth();
    if (!auth) return [];

    // Filter by "IsFavorite" or other parameters if you want specific content
    const url = `/Users/${auth.UserId}/Items?IncludeItemTypes=${CONFIG.mediaBar.type}&Recursive=true&SortBy=${CONFIG.mediaBar.sortBy}&Limit=${CONFIG.mediaBar.limit}&Fields=PrimaryImageAspectRatio,Overview,BackdropImageTags&ImageTypeLimit=1`;

    try {
        const response = await fetch(url, {
            headers: { 'X-Emby-Token': auth.AccessToken }
        });
        const data = await response.json();
        return data.Items || [];
    } catch (error) {
        console.error('LegitFlix: API Error', error);
        return [];
    }
}

// --- UI GENERATION ---
function createMediaBarHTML(items) {
    const cards = items.map(item => {
        const imgUrl = `/Items/${item.Id}/Images/Primary?maxHeight=400&maxWidth=266&quality=90`;
        // UPDATED ONCLICK: Uses our global helper instead of appRouter directly
        return `
            <div class="legit-media-card" onclick="window.legitFlixShowItem('${item.Id}')">
                <div class="legit-card-image" style="background-image: url('${imgUrl}')"></div>
                <div class="legit-card-overlay">
                    <span class="legit-card-title">${item.Name}</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div id="legit-media-bar" class="legit-media-bar-container">
            <div class="legit-media-header">
                <span class="legit-header-title">Top Picks for You</span>
                <span class="legit-header-subtitle">Only on LegitFlix</span>
            </div>
            <div class="legit-media-scroller">
                ${cards}
            </div>
        </div>
    `;
}

// --- INJECTION LOGIC ---
async function injectMediaBar() {
    const hash = window.location.hash;

    // Standard Home + "Startup" handling
    const isHomePage = hash.includes('home') || hash === '' || hash.includes('startup');

    if (!isHomePage) return;
    if (document.getElementById('legit-media-bar')) return;

    const items = await fetchMediaBarItems();
    if (items.length === 0) return;

    // Aggressive Container Search (Works with standard and plugin themes)
    const checkInterval = setInterval(() => {
        let container = document.querySelector('.homeSectionsContainer'); // Standard
        if (!container) container = document.querySelector('.mainAnimatedPages'); // Alternative
        if (!container) container = document.querySelector('#indexPage .pageContent'); // Fallback

        if (container) {
            clearInterval(checkInterval);

            const wrapper = document.createElement('div');
            wrapper.innerHTML = createMediaBarHTML(items);

            // Inject at top
            container.insertBefore(wrapper, container.firstChild);
            console.log('LegitFlix: Media Bar Injected');
        }
    }, 1000);

    setTimeout(() => clearInterval(checkInterval), 10000);
}

// --- INIT ---
function init() {
    injectMediaBar();
    document.addEventListener('viewshow', () => {
        injectMediaBar();
    });
}

init();