/* LegitFlix Bundle.js
   Frontend Logic for Jellyfin Custom Theme
   Updated Path: /themes/legitflix/
*/

console.log('LegitFlix: Bundle loaded.');

const CONFIG = {
    // CRITICAL CHANGE: Updated to match the new Docker mount path
    rootUrl: '/themes/legitflix',
    mediaBar: {
        enabled: true,
        limit: 20,
        type: 'Movie',
        sortBy: 'Random',
        enableBackdrops: true
    }
};

// --- DOM UTILITIES ---

function waitForElement(selector, callback) {
    if (document.querySelector(selector)) {
        callback(document.querySelector(selector));
        return;
    }
    const observer = new MutationObserver((mutations) => {
        if (document.querySelector(selector)) {
            observer.disconnect();
            callback(document.querySelector(selector));
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// --- MEDIA BAR LOGIC ---

async function fetchMediaBarItems() {
    try {
        const auth = await getAuth();
        if (!auth) return [];

        const url = `/Users/${auth.UserId}/Items?IncludeItemTypes=${CONFIG.mediaBar.type}&Recursive=true&SortBy=${CONFIG.mediaBar.sortBy}&Limit=${CONFIG.mediaBar.limit}&Fields=PrimaryImageAspectRatio,Overview,BackdropImageTags&ImageTypeLimit=1`;

        const response = await fetch(url, {
            headers: { 'X-Emby-Token': auth.AccessToken }
        });
        const data = await response.json();
        return data.Items || [];
    } catch (error) {
        console.error('LegitFlix: Error fetching media items', error);
        return [];
    }
}

async function getAuth() {
    let attempts = 0;
    while (!window.ApiClient && attempts < 10) {
        await new Promise(r => setTimeout(r, 500));
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

function createMediaBarHTML(items) {
    if (!items.length) return '';

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

async function injectMediaBar() {
    const hash = window.location.hash;
    const isHomePage = hash.includes('home') || hash === '#/home.html' || hash === '';

    if (!isHomePage) return;
    if (document.getElementById('legit-media-bar')) return;

    const items = await fetchMediaBarItems();
    if (items.length === 0) return;

    const html = createMediaBarHTML(items);

    waitForElement('.homeSectionsContainer', (container) => {
        if (document.getElementById('legit-media-bar')) return;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        container.insertBefore(wrapper, container.firstChild);
    });
}

function init() {
    injectMediaBar();
    document.addEventListener('viewshow', () => {
        injectMediaBar();
    });
}

init();