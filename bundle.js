/* LegitFlix Bundle.js v2.0
   - Added Debug Logging
   - Added Compatibility for "Jellyfin Enhanced" Plugin
*/

console.log('%c LegitFlix: Core Bundle Loaded ', 'background: #e50914; color: white; padding: 2px 5px; border-radius: 3px;');

const CONFIG = {
    // If using external, this base URL doesn't matter for fetching items, only for static assets if you have them
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
    console.log('LegitFlix: Waiting for ApiClient...');
    let attempts = 0;
    while (!window.ApiClient && attempts < 20) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }
    if (window.ApiClient) {
        console.log('LegitFlix: ApiClient found. User:', window.ApiClient.getCurrentUserId());
        return {
            UserId: window.ApiClient.getCurrentUserId(),
            AccessToken: window.ApiClient.accessToken()
        };
    }
    console.error('LegitFlix: Could not find ApiClient.');
    return null;
}

// --- DATA FETCHING ---
async function fetchMediaBarItems() {
    const auth = await getAuth();
    if (!auth) return [];

    console.log('LegitFlix: Fetching movies...');
    const url = `/Users/${auth.UserId}/Items?IncludeItemTypes=${CONFIG.mediaBar.type}&Recursive=true&SortBy=${CONFIG.mediaBar.sortBy}&Limit=${CONFIG.mediaBar.limit}&Fields=PrimaryImageAspectRatio,Overview,BackdropImageTags&ImageTypeLimit=1`;
    
    try {
        const response = await fetch(url, {
            headers: { 'X-Emby-Token': auth.AccessToken }
        });
        const data = await response.json();
        console.log(`LegitFlix: Fetched ${data.Items ? data.Items.length : 0} items.`);
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
            <div class="legit-media-card" onclick="appRouter.showItem('${item.Id}')">
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
    // 1. Check if we are on home
    const hash = window.location.hash;
    console.log('LegitFlix: Current Hash:', hash);
    
    // Looser check for home to support plugins that might change URL structure
    const isHomePage = hash.includes('home') || hash === '' || hash.includes('startup');
    
    if (!isHomePage) {
        console.log('LegitFlix: Not on home page, skipping.');
        return;
    }

    if (document.getElementById('legit-media-bar')) {
        console.log('LegitFlix: Bar already exists.');
        return;
    }

    // 2. Fetch Data
    const items = await fetchMediaBarItems();
    if (items.length === 0) return;

    // 3. Find Injection Point (Aggressive Search)
    const checkInterval = setInterval(() => {
        // Try standard Jellyfin container
        let container = document.querySelector('.homeSectionsContainer');
        
        // Try "Jellyfin Enhanced" specific containers if standard not found
        if (!container) container = document.querySelector('.mainAnimatedPages');
        if (!container) container = document.querySelector('#indexPage .pageContent');

        if (container) {
            clearInterval(checkInterval);
            console.log('LegitFlix: Container found:', container.className);
            
            const wrapper = document.createElement('div');
            wrapper.innerHTML = createMediaBarHTML(items);
            
            // Inject at top
            container.insertBefore(wrapper, container.firstChild);
            console.log('LegitFlix: Injection Complete.');
        } else {
            console.log('LegitFlix: Waiting for container...');
        }
    }, 1000); // Check every second
    
    // Stop checking after 10 seconds to save resources
    setTimeout(() => clearInterval(checkInterval), 10000);
}

// --- INIT ---
function init() {
    injectMediaBar();
    document.addEventListener('viewshow', () => {
        console.log('LegitFlix: View Changed');
        injectMediaBar();
    });
}

init();
