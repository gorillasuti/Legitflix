/* LegitFlix Bundle.js v2.2
   - Added: 'appRouter' Polyfill. Even if the browser caches old HTML, 
     this script will catch the click and prevent the crash.
*/

console.log('%c LegitFlix: Bundle v2.2 Loaded ', 'background: #00AA00; color: white; padding: 2px 5px; border-radius: 3px;');

// --- GLOBAL NAVIGATION HELPER ---
window.legitFlixShowItem = function (id) {
    console.log('LegitFlix: Navigating to', id);

    // Strategy 1: Try standard global router
    if (window.appRouter) {
        window.appRouter.showItem(id);
        return;
    }

    // Strategy 2: Emby/Jellyfin Page Helper
    if (window.Emby && window.Emby.Page && window.Emby.Page.showItem) {
        window.Emby.Page.showItem(id);
        return;
    }

    // Strategy 3: Universal Hash Navigation
    const newHash = `#!/details?id=${id}`;
    if (window.location.hash !== newHash) {
        window.location.hash = newHash;
    } else {
        window.location.reload();
    }
};

// --- SAFETY SHIM (The Fix for your Error) ---
// If the old HTML is cached and tries to call appRouter, we catch it here.
if (typeof appRouter === 'undefined') {
    console.log('LegitFlix: Polyfilling missing appRouter');
    window.appRouter = {
        showItem: function (id) {
            window.legitFlixShowItem(id);
        }
    };
}

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
        // Using window.legitFlixShowItem explicitly
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
    const isHomePage = hash.includes('home') || hash === '' || hash.includes('startup');

    if (!isHomePage) return;
    if (document.getElementById('legit-media-bar')) return;

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
            container.insertBefore(wrapper, container.firstChild);
            console.log('LegitFlix: Media Bar Injected');
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