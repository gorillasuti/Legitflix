/* LegitFlix Bundle.js v2.4
   - Fixes: 'appRouter' ReferenceError by replacing it with direct URL navigation.
   - Removed: appRouter safety shim and dependency logic.
   - Improved: Aggressive DOM cleanup to remove stale media bars.
*/

console.log('%c LegitFlix: Bundle v2.4 Loaded ', 'background: #00AA00; color: white; padding: 2px 5px; border-radius: 3px;');

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

    // V2.3 CHANGE: CLEANUP OLD BARS
    // Aggressively remove ALL instances by class, not just ID
    document.querySelectorAll('.legit-media-bar-container').forEach(el => el.remove());

    const existing = document.getElementById('legit-media-bar');
    if (existing) {
        console.log('LegitFlix: Refreshing Media Bar...');
        existing.remove();
    }

    const items = await fetchMediaBarItems();
    if (items.length === 0) return;

    const checkInterval = setInterval(() => {
        // Aggressive container search
        let container = document.querySelector('.homeSectionsContainer');
        if (!container) container = document.querySelector('.mainAnimatedPages');
        if (!container) container = document.querySelector('#indexPage .pageContent');

        if (container) {
            clearInterval(checkInterval);
            const wrapper = document.createElement('div');
            wrapper.innerHTML = createMediaBarHTML(items);

            // Inject
            container.insertBefore(wrapper, container.firstChild);
            console.log('LegitFlix: Media Bar Injected (Fresh Build)');
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