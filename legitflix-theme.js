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
                        <button class="hero-button-info" onclick="window.appRouter.showItem('${item.Id}')" title="More Info">
                            <span class="material-icons-outlined">info</span>
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
    // We need Auth to get the ServerId
    const auth = await getAuth();
    if (!auth) return;

    const views = await fetchUserViews();
    if (!views || views.length === 0) {
        logger.warn('injectCustomNav: No views found.');
        return;
    }

    // Map views to HTML links with CORRECT standard Jellyfin URL
    // USER CONFIRMED: #/list?parentId=...&serverId=... works.
    const linksHtml = views.map(v => {
        return `<a href="#!/list?parentId=${v.Id}&serverId=${auth.ServerId}" class="nav-link">${v.Name}</a>`;
    }).join('');

    // Removed Dashboard link as per request (Logo is enough)

    const finalHtml = `
        <div class="legit-nav-links">
            ${linksHtml}
        </div>
    `;

    logger.log('injectCustomNav: Injecting HTML');
    if (!document.querySelector('.legit-nav-links')) {
        headerLeft.insertAdjacentHTML('beforeend', finalHtml);

        // Mark active link & Add Click Listener for Instant Feedback
        const currentHash = window.location.hash;
        document.querySelectorAll('.legit-nav-links .nav-link').forEach(link => {
            // Initial Active Check
            if (currentHash.includes(link.getAttribute('href'))) {
                link.classList.add('active');
            }

            // Click Listener - Instant Feedback
            link.addEventListener('click', (e) => {
                // Remove active from all
                document.querySelectorAll('.legit-nav-links .nav-link').forEach(l => l.classList.remove('active'));
                // Add to this
                e.currentTarget.classList.add('active');
            });
        });
    }
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

// --- PREFERENCES: FEATURED HEADER ---
// --- PREFERENCES: GAMING PROFILE LAYOUT ---
async function injectFeaturedPrefs() {
    const prefsPage = document.querySelector('#myPreferencesMenuPage');
    if (!prefsPage) return;

    // Use .readOnlyContent as the main container based on user HTML
    const contentContainer = prefsPage.querySelector('.readOnlyContent');
    if (!contentContainer) return;

    // Avoid double injection
    if (prefsPage.querySelector('.gaming-profile-header')) return;

    // 1. Get User Data
    let user = null;
    try {
        user = await window.ApiClient.getCurrentUser();
    } catch (e) { console.error('Error getting user', e); }
    if (!user) return;

    const userImageUrl = `/Users/${user.Id}/Images/Primary?quality=90&maxHeight=300`;

    // 2. Map Links for Tabs
    // We try to find existing links to make tabs functional
    const findLink = (str) => {
        const a = contentContainer.querySelector(`a[href*="${str}"]`);
        return a ? a.getAttribute('href') : '#';
    };

    const profileHref = findLink('userprofile');
    const displayHref = findLink('mypreferencesdisplay');
    const homeHref = findLink('mypreferenceshome');
    const playbackHref = findLink('mypreferencesplayback');
    const subtitleHref = findLink('mypreferencessubtitles');
    const quickConnectHref = findLink('quickconnect');
    const controlsHref = findLink('mypreferencescontrols'); // Assuming standard naming

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
    } else if (user.BackdropImageTags && user.BackdropImageTags.length > 0) {
        const pBannerUrl = `/Users/${user.Id}/Images/Backdrop/0?maxHeight=500`;
        bannerStyle = `background-image: url('${pBannerUrl}');`;
        bannerClass = 'has-banner';
        btnText = 'Change profile banner';
        btnIcon = 'edit';
    }

    const headerHtml = `
        <div class="gaming-profile-header">
            <h1 class="profile-page-title">Account Settings</h1>
            
            <div class="profile-nav-tabs" style="padding-bottom: 1rem; flex-wrap: wrap;">
                <a class="profile-tab active" onclick="location.href='${profileHref}'">My details</a>
                <a class="profile-tab" onclick="location.href='${displayHref}'">Display</a>
                <a class="profile-tab" onclick="location.href='${homeHref}'">Home Screen</a>
                <a class="profile-tab" onclick="location.href='${playbackHref}'">Playback</a>
                <a class="profile-tab" onclick="location.href='${subtitleHref}'">Subtitles</a>
                <a class="profile-tab" onclick="location.href='${quickConnectHref}'">Quick Connect</a>
                
                <!-- Sign Out (Icon) -->
                <a class="profile-tab logout-tab" onclick="document.querySelector('.btnLogout').click()" title="Sign Out">
                    <span class="material-icons">exit_to_app</span>
                </a>
            </div>

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
        </div>
    `;

    // 4. Insert at TOP of content
    contentContainer.insertAdjacentHTML('afterbegin', headerHtml);

    // 5. Cleanup Redundant Titles & Buttons
    const oldTitle = contentContainer.querySelector('.headerUsername');
    if (oldTitle) oldTitle.style.display = 'none';

    // Move Sign Out button into Nav (Hide original)
    const oldLogout = contentContainer.querySelector('.btnLogout');
    if (oldLogout) oldLogout.style.display = 'none';

    // 6. Style Password Section as a Card
    // Find the section containing password fields
    const passwordInput = contentContainer.querySelector('#fldCurrentPassword');
    if (passwordInput) {
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
window.legitFlixOpenBannerPicker = async function () {
    // Fetch random backdrops
    const auth = await getAuth();
    if (!auth) return;

    // Create UI
    const popup = document.createElement('div');
    popup.className = 'legit-popup-overlay';
    popup.innerHTML = `
        <div class="legit-popup-content">
            <h2>Select Banner</h2>
            <div class="legit-popup-grid" id="bannerGrid">Loading...</div>
            <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
                <button class="legit-btn-secondary" onclick="document.querySelector('.legit-popup-overlay').remove()">Close</button>
                <button class="legit-btn-primary" onclick="alert('Save functionality coming soon!'); document.querySelector('.legit-popup-overlay').remove()">
                    <span class="material-icons">save</span> Save
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    // Fetch
    try {
        const url = `/Users/${auth.UserId}/Items?Recursive=true&IncludeItemTypes=Movie,Series&ImageTypes=Backdrop&SortBy=Random&Limit=12&Fields=Id,Name`;
        const res = await fetch(url, { headers: { 'X-Emby-Token': auth.AccessToken } });
        const data = await res.json();

        const grid = popup.querySelector('#bannerGrid');
        grid.innerHTML = data.Items.map(item => `
            <div class="banner-option" onclick="document.querySelector('.profile-banner').style.backgroundImage='url(/Items/${item.Id}/Images/Backdrop/0?maxHeight=500)'; document.querySelector('.profile-banner').classList.add('has-banner'); document.querySelector('.legit-popup-overlay').remove();" 
                 style="background-image: url('/Items/${item.Id}/Images/Backdrop/0?maxHeight=200');">
            </div>
        `).join('');
    } catch (e) { console.error(e); }
};

window.legitFlixOpenAvatarPicker = function () {
    const popup = document.createElement('div');
    popup.className = 'legit-popup-overlay';
    popup.innerHTML = `
        <div class="legit-popup-content small" style="min-width: 350px;">
            <h2>Edit Avatar</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <!-- Row 1: Choose (Plugin) | Upload (Native) -->
                <button class="legit-btn-primary" onclick="triggerAvatarsPlugin()"><i class="material-icons">face</i> Choose Avatar</button>
                <button class="legit-btn-primary" onclick="triggerNativeUpload()"><i class="material-icons">upload</i> Upload Image</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                 <!-- Row 2: Close | Save -->
                <button class="legit-btn-secondary" onclick="document.querySelector('.legit-popup-overlay').remove()">Close</button>
                <button class="legit-btn-primary" onclick="document.querySelector('.legit-popup-overlay').remove(); alert('Saved!')"><i class="material-icons">save</i> Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
};

// Trigger Native Upload by finding the original (hidden) header image button
// Trigger Native Upload by finding the original input
window.triggerNativeUpload = function () {
    console.log('LegitFlix: Triggering Native Upload...');

    // The user identified <input id="uploadImage">
    const input = document.getElementById('uploadImage');
    if (input) {
        // Ensure it's not hidden in a way that prevents click (though file inputs usually work)
        console.log('LegitFlix: Found #uploadImage. Clicking...');
        input.click();
        document.querySelector('.legit-popup-overlay').remove();
        return;
    }

    // Fallback: The container
    const placeholder = document.querySelector('.imagePlaceHolder');
    if (placeholder) {
        console.log('LegitFlix: Found .imagePlaceHolder. Clicking...');
        placeholder.click();
        document.querySelector('.legit-popup-overlay').remove();
        return;
    }

    // Fallback 2: The standard button classes
    const btn = document.querySelector('.btnUpload') || document.querySelector('.headerUserButton');
    if (btn) {
        btn.click();
        document.querySelector('.legit-popup-overlay').remove();
        return;
    }

    alert('Native upload button (#uploadImage) not found. This feature depends on Jellyfin\'s default elements being present (even if hidden).');
};

// Helper for Avatars Plugin detection
function ensurePluginTriggers() {
    // The bundled avatars.js waits for node.id === "cssBranding" or text "Profile"
    // We inject a dummy cssBranding to wake it up if it hasn't fired.
    if (!document.getElementById('cssBranding')) {
        const dummy = document.createElement('div');
        dummy.id = 'cssBranding';
        dummy.style.display = 'none';
        document.body.appendChild(dummy);
        console.log('LegitFlix: Injected #cssBranding to trigger avatars plugin.');
    }
}

// Helper to trigger the installed avatars plugin
window.triggerAvatarsPlugin = function () {
    const findAndClickValue = () => {
        // Plugin injects ID 'show-modal' or 'jf-avatars-btn-show-modal'
        // It injects it BEFORE the upload button usually.
        const pluginBtn = document.getElementById('jf-avatars-btn-show-modal') || document.getElementById('show-modal');
        if (pluginBtn) {
            console.log('LegitFlix: Found plugin button. Clicking...');
            pluginBtn.click();
            document.querySelector('.legit-popup-overlay').remove();
            return true;
        }
        return false;
    };

    if (!findAndClickValue()) {
        console.log('LegitFlix: Plugin button empty. Ensuring triggers...');
        ensurePluginTriggers();

        // Retry
        let retries = 10;
        const interval = setInterval(() => {
            if (findAndClickValue()) {
                clearInterval(interval);
            } else if (retries <= 0) {
                clearInterval(interval);
                alert('Avatars Plugin not ready. Please ensure the "jf-avatars" plugin is installed and that we are on the Profile page.');
            }
            retries--;
        }, 200);
    }
};

// Helper to upload backdrop to Jellyfin Server
// Helper to upload backdrop to Jellyfin Server
window.uploadUserBackdrop = async function (imageUrl) {
    try {
        console.log('LegitFlix: Starting upload for', imageUrl);
        const userId = await window.ApiClient.getCurrentUserId();
        const serverId = window.ApiClient.serverId();
        const accessToken = window.ApiClient.accessToken();

        // 1. Fetch the image content
        // Note: imageUrl is relative e.g. /Items/..., fetch handles it.
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`Failed to fetch source image: ${res.status}`);

        const blob = await res.blob();
        console.log('LegitFlix: Image blob fetched.', blob.type, blob.size);

        if (blob.size === 0) throw new Error('Fetched blob is empty.');

        // 2. Prepare Upload
        // Endpoint: POST /Users/{userId}/Images/Backdrop
        // Note: Jellyfin API usually expects the raw bytes in body
        const uploadUrl = window.ApiClient.getUrl(`/Users/${userId}/Images/Backdrop`);

        console.log('LegitFlix: Uploading backdrop to', uploadUrl);

        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `MediaBrowser Client="Jellyfin Web", Device="ValidDevice", DeviceId="ValidId", Version="10.8.0", Token="${accessToken}"`,
                'Content-Type': blob.type || 'image/png' // Strict type
            },
            body: blob
        });

        if (uploadRes.ok) {
            console.log('LegitFlix: Backdrop uploaded successfully.');
            return true;
        } else {
            console.error('LegitFlix: Upload failed', uploadRes.status, uploadRes.statusText);
            const errText = await uploadRes.text(); // Read server error if any
            console.error('LegitFlix: Server response:', errText);
            return false;
        }
    } catch (e) {
        console.error('LegitFlix: Error uploading backdrop', e);
        return false;
    }
};




// --- INIT & ROBUSTNESS ---
// We use a polling mechanism to ensure the UI is ready before injecting.
// This is more reliable than Observers for the initial load.

let _injectedNav = false;
let _injectedHero = false;
let _injectedJelly = false;

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

    // 2. Try Inject Hero (Home Page Only)
    const isHome = window.location.hash.includes('home') || window.location.hash === '' || window.location.hash.includes('startup');
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
    if (window.location.hash.toLowerCase().includes('preferences')) {
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

                navTabs.appendChild(tab);

                // Hide original row (it's usually wrapped in a .listItem or similar)
                // The user snippet shows it is an <a> with class "listItem-border" containing a .listItem div
                // We should hide the <a> itself
                enhancedBtn.style.display = 'none';
            }
            // ---------------------------------------------

        } catch (e) {
            logger.error('Prefs Header Injection failed', e);
        }
    }
}

function init() {
    console.log('LegitFlix: V4.5 Robust Init');

    // Start Polling Loop (Runs every 1s)
    setInterval(pollForUI, 1000);

    // Watch for Route Changes to reset flags
    window.addEventListener('hashchange', () => {
        logger.log('Route Changed');
        _injectedHero = false;
        _injectedJelly = false;

        // RE-RUN ACTIVE STATE CHECK ON NAV (For Pill Effect)
        setTimeout(() => {
            const currentHash = window.location.hash;
            document.querySelectorAll('.legit-nav-links .nav-link').forEach(link => {
                link.classList.remove('active');
                if (currentHash.includes(link.getAttribute('href'))) {
                    link.classList.add('active');
                }
            });
        }, 200);
        if (!document.querySelector('.legit-nav-links')) _injectedNav = false;
    });

    const observer = new MutationObserver((mutations) => {
        if (!document.querySelector('.legit-nav-links')) _injectedNav = false;
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

init();

/* --- AVATARS PLUGIN (Bundled) --- */
/*! For license information please see main.js.LICENSE.txt */
(() => { "use strict"; var t = "jf-avatars", e = "https://raw.githubusercontent.com/kalibrado/js-avatars-images/refs/heads/main", r = "".concat(e, "/images_metadata.json"), n = "".concat(e, "/folders_names.json"), o = function (t) { var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : document.body; return window.getComputedStyle(e).getPropertyValue(t).replace(/['"]/g, "").trim().trim() }, i = { getTitle: function () { return window.i18n.title }, getSearchLabel: function () { return window.i18n["search-label"] }, getBtnCancelLabel: function () { return window.i18n["btn-cancel"] }, getBtnValidateLabel: function () { return window.i18n["btn-validate"] }, getBtnShowAvatarsLabel: function () { return window.i18n["btn-show"] }, getSrcImages: function () { return o("--".concat(t, "-url-images")) || r }, getSrcCatImages: function () { return o("--".concat(t, "-url-images-cat")) || n }, getFilterLabel: function () { return window.i18n["filter-label"] }, getDefaultOptionLabel: function () { return window.i18n["default-option"] }, debug: function () { return !!o("--".concat(t, "-debug")) }, injectBtnModal: function () { return o("--".concat(t, "-inject-btn")) || "#btnDeleteImage" }, selectedImage: null, prefix: t, fallbackUrl: "https://raw.githubusercontent.com/kalibrado/jf-avatars/refs/heads/main/src/lang/", avatarUrls: function (t) { return [{ url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=".concat(t) }, { url: "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortFlat&facialHairType=BeardLight&seed=".concat(t) }, { url: "https://api.multiavatar.com/".concat(t, ".svg") }, { url: "https://robohash.org/".concat(t, ".png") }, { url: "https://ui-avatars.com/api/?name=".concat(t, "&background=random") }] } }, a = function (t, e) { for (var r in e) e.hasOwnProperty(r) && (t.style[r] = e[r]) }, c = function () { var t = document.getElementById("".concat(i.prefix, "-footer-container")), e = document.getElementById("".concat(i.prefix, "-search-container")), r = document.getElementById("".concat(i.prefix, "-grid-container")), n = document.getElementById("".concat(i.prefix, "-footer-left")), o = document.getElementById("".concat(i.prefix, "-footer-right")), c = window.innerWidth; c <= 500 ? (a(t, { flexDirection: "column", alignItems: "center" }), a(r, { maxHeight: "45vh" }), a(e, { width: "100%" }), a(n, { flexDirection: "column" }), a(o, { justifyContent: "center" })) : c <= 1024 ? (a(t, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }), a(r, { maxHeight: "60vh" }), a(e, { width: "100%" }), a(n, { width: "100%", display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "flex-start" }), a(o, { display: "flex", justifyContent: "right", alignItems: "center", flexDirection: "column" })) : (a(t, { marginTop: "1em", display: "inline-flex", flexDirection: "row", gap: "10px", justifyContent: "space-between", width: "100%" }), a(n, { width: "100%", display: "flex", justifyContent: "space-between", flexDirection: "row", alignItems: "center" }), a(o, { display: "flex", width: "fit-content", justifyContent: "space-between", alignItems: "center", flexDirection: "row" }), a(r, { maxHeight: "60vh" }), a(e, { width: "45%" })) }; function u() { u = function () { return e }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", l = i.toStringTag || "@@toStringTag"; function f(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e] } try { f({}, "") } catch (t) { f = function (t, e, r) { return t[e] = r } } function h(t, e, r, n) { var i = e && e.prototype instanceof b ? e : b, a = Object.create(i.prototype), c = new P(n || []); return o(a, "_invoke", { value: C(t, r, c) }), a } function d(t, e, r) { try { return { type: "normal", arg: t.call(e, r) } } catch (t) { return { type: "throw", arg: t } } } e.wrap = h; var p = "suspendedStart", v = "suspendedYield", m = "executing", y = "completed", g = {}; function b() { } function w() { } function x() { } var L = {}; f(L, a, (function () { return this })); var E = Object.getPrototypeOf, S = E && E(E(T([]))); S && S !== r && n.call(S, a) && (L = S); var k = x.prototype = b.prototype = Object.create(L); function j(t) { ["next", "throw", "return"].forEach((function (e) { f(t, e, (function (t) { return this._invoke(e, t) })) })) } function I(t, e) { function r(o, i, a, c) { var u = d(t[o], t, i); if ("throw" !== u.type) { var l = u.arg, f = l.value; return f && "object" == s(f) && n.call(f, "__await") ? e.resolve(f.__await).then((function (t) { r("next", t, a, c) }), (function (t) { r("throw", t, a, c) })) : e.resolve(f).then((function (t) { l.value = t, a(l) }), (function (t) { return r("throw", t, a, c) })) } c(u.arg) } var i; o(this, "_invoke", { value: function (t, n) { function o() { return new e((function (e, o) { r(t, n, e, o) })) } return i = i ? i.then(o, o) : o() } }) } function C(e, r, n) { var o = p; return function (i, a) { if (o === m) throw Error("Generator is already running"); if (o === y) { if ("throw" === i) throw a; return { value: t, done: !0 } } for (n.method = i, n.arg = a; ;) { var c = n.delegate; if (c) { var u = O(c, n); if (u) { if (u === g) continue; return u } } if ("next" === n.method) n.sent = n._sent = n.arg; else if ("throw" === n.method) { if (o === p) throw o = y, n.arg; n.dispatchException(n.arg) } else "return" === n.method && n.abrupt("return", n.arg); o = m; var l = d(e, r, n); if ("normal" === l.type) { if (o = n.done ? y : v, l.arg === g) continue; return { value: l.arg, done: n.done } } "throw" === l.type && (o = y, n.method = "throw", n.arg = l.arg) } } } function O(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, O(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), g; var i = d(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, g; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, g) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, g) } function _(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e) } function A(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e } function P(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(_, this), this.reset(!0) } function T(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function r() { for (; ++o < e.length;)if (n.call(e, o)) return r.value = e[o], r.done = !1, r; return r.value = t, r.done = !0, r }; return i.next = i } } throw new TypeError(s(e) + " is not iterable") } return w.prototype = x, o(k, "constructor", { value: x, configurable: !0 }), o(x, "constructor", { value: w, configurable: !0 }), w.displayName = f(x, l, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === w || "GeneratorFunction" === (e.displayName || e.name)) }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, x) : (t.__proto__ = x, f(t, l, "GeneratorFunction")), t.prototype = Object.create(k), t }, e.awrap = function (t) { return { __await: t } }, j(I.prototype), f(I.prototype, c, (function () { return this })), e.AsyncIterator = I, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new I(h(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then((function (t) { return t.done ? t.value : a.next() })) }, j(k), f(k, l, "Generator"), f(k, a, (function () { return this })), f(k, "toString", (function () { return "[object Generator]" })), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function t() { for (; r.length;) { var n = r.pop(); if (n in e) return t.value = n, t.done = !1, t } return t.done = !0, t } }, e.values = T, P.prototype = { constructor: P, reset: function (e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(A), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t) }, stop: function () { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval }, dispatchException: function (e) { if (this.done) throw e; var r = this; function o(n, o) { return c.type = "throw", c.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var a = this.tryEntries[i], c = a.completion; if ("root" === a.tryLoc) return o("end"); if (a.tryLoc <= this.prev) { var u = n.call(a, "catchLoc"), l = n.call(a, "finallyLoc"); if (u && l) { if (this.prev < a.catchLoc) return o(a.catchLoc, !0); if (this.prev < a.finallyLoc) return o(a.finallyLoc) } else if (u) { if (this.prev < a.catchLoc) return o(a.catchLoc, !0) } else { if (!l) throw Error("try statement without catch or finally"); if (this.prev < a.finallyLoc) return o(a.finallyLoc) } } } }, abrupt: function (t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, g) : this.complete(a) }, complete: function (t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), g }, finish: function (t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), A(r), g } }, catch: function (t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; A(r) } return o } } throw Error("illegal catch attempt") }, delegateYield: function (e, r, n) { return this.delegate = { iterator: T(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), g } }, e } function l(t, e, r, n, o, i, a) { try { var c = t[i](a), u = c.value } catch (t) { return void r(t) } c.done ? e(u) : Promise.resolve(u).then(n, o) } function s(t) { return s = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (t) { return typeof t } : function (t) { return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t }, s(t) } function f(t, e) { for (var r = 0; r < e.length; r++) { var n = e[r]; n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, h(n.key), n) } } function h(t) { var e = function (t) { if ("object" != s(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var r = e.call(t, "string"); if ("object" != s(r)) return r; throw new TypeError("@@toPrimitive must return a primitive value.") } return String(t) }(t); return "symbol" == s(e) ? e : e + "" } var d = new (function () { return t = function t() { var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 4; !function (t, e) { if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function") }(this, t), this.queue = [], this.activeLoads = 0, this.maxConcurrent = e }, e = [{ key: "add", value: function (t) { var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 10; this.queue.push({ loadTask: t, priority: e }), this.queue.sort((function (t, e) { return t.priority - e.priority })), this.processQueue() } }, { key: "processQueue", value: function () { var t = this; if (!(this.activeLoads >= this.maxConcurrent || 0 === this.queue.length)) { var e = this.queue.shift().loadTask; this.activeLoads++, Promise.resolve(e()).catch((function (t) { return M("Image load error: ".concat(t)) })).finally((function () { t.activeLoads--, t.processQueue() })) } } }], e && f(t.prototype, e), Object.defineProperty(t, "prototype", { writable: !1 }), t; var t, e }())(100), p = function (t, e) { var r = function (t) { var e = t.getBoundingClientRect(), r = window.innerHeight; if (e.top < r && e.bottom > 0) { var n = Math.abs((e.top + e.bottom) / 2 - r / 2); return Math.floor(n / 100) } return 20 + Math.floor(e.top / 100) }(t); d.add((function () { return new Promise((function (r, n) { var o = new Image; o.onload = function () { t.src = e, t.classList.remove("blink"), a(t, { cursor: "pointer" }), v(t), r() }, o.onerror = function () { M("Image failed to load: ".concat(e)), t.remove(), n(new Error("Failed to load image: ".concat(e))) }, o.src = e })) }), r) }, v = function (t) { t.onmouseover = function (e) { var r = e.target; i.selectedImage && i.selectedImage.src === r.src || r.id === "".concat(i.prefix, "-img-selected") || a(t, { transform: "scale(1.1)", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)", filter: "brightness(1)" }) }, t.onmouseout = function (e) { var r = e.target; i.selectedImage && i.selectedImage.src === r.src || r.id === "".concat(i.prefix, "-img-selected") || a(t, { transform: "scale(1)", boxShadow: "none", filter: "brightness(0.5)" }) }, t.onclick = function (e) { e.target.src.endsWith(i.imageName) || (M("Clicked img ".concat(t.id)), H(t)) } }, m = function () { var t, e = (t = u().mark((function t(e) { var r, n = arguments; return u().wrap((function (t) { for (; ;)switch (t.prev = t.next) { case 0: r = n.length > 1 && void 0 !== n[1] ? n[1] : 6, e.slice(0, r).forEach((function (t, e) { setTimeout((function () { (new Image).src = t.url, M("Preloading important image #".concat(e + 1, ": ").concat(t.url)) }), 50 * e) })); case 3: case "end": return t.stop() } }), t) })), function () { var e = this, r = arguments; return new Promise((function (n, o) { var i = t.apply(e, r); function a(t) { l(i, n, o, a, c, "next", t) } function c(t) { l(i, n, o, a, c, "throw", t) } a(void 0) })) }); return function (t) { return e.apply(this, arguments) } }(); function y(t) { return y = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (t) { return typeof t } : function (t) { return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t }, y(t) } function g() { g = function () { return e }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function l(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e] } try { l({}, "") } catch (t) { l = function (t, e, r) { return t[e] = r } } function s(t, e, r, n) { var i = e && e.prototype instanceof b ? e : b, a = Object.create(i.prototype), c = new P(n || []); return o(a, "_invoke", { value: C(t, r, c) }), a } function f(t, e, r) { try { return { type: "normal", arg: t.call(e, r) } } catch (t) { return { type: "throw", arg: t } } } e.wrap = s; var h = "suspendedStart", d = "suspendedYield", p = "executing", v = "completed", m = {}; function b() { } function w() { } function x() { } var L = {}; l(L, a, (function () { return this })); var E = Object.getPrototypeOf, S = E && E(E(T([]))); S && S !== r && n.call(S, a) && (L = S); var k = x.prototype = b.prototype = Object.create(L); function j(t) { ["next", "throw", "return"].forEach((function (e) { l(t, e, (function (t) { return this._invoke(e, t) })) })) } function I(t, e) { function r(o, i, a, c) { var u = f(t[o], t, i); if ("throw" !== u.type) { var l = u.arg, s = l.value; return s && "object" == E(s) && n.call(s, "__await") ? e.resolve(s.__await).then((function (t) { r("next", t, a, c) }), (function (t) { r("throw", t, a, c) })) : e.resolve(s).then((function (t) { l.value = t, a(l) }), (function (t) { return r("throw", t, a, c) })) } c(u.arg) } var i; o(this, "_invoke", { value: function (t, n) { function o() { return new e((function (e, o) { r(t, n, e, o) })) } return i = i ? i.then(o, o) : o() } }) } function C(e, r, n) { var o = h; return function (i, a) { if (o === p) throw Error("Generator is already running"); if (o === v) { if ("throw" === i) throw a; return { value: t, done: !0 } } for (n.method = i, n.arg = a; ;) { var c = n.delegate; if (c) { var u = O(c, n); if (u) { if (u === m) continue; return u } } if ("next" === n.method) n.sent = n._sent = n.arg; else if ("throw" === n.method) { if (o === h) throw o = v, n.arg; n.dispatchException(n.arg) } else "return" === n.method && n.abrupt("return", n.arg); o = p; var l = f(e, r, n); if ("normal" === l.type) { if (o = n.done ? v : d, l.arg === m) continue; return { value: l.arg, done: n.done } } "throw" === l.type && (o = v, n.method = "throw", n.arg = l.arg) } } } function O(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, O(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), m; var i = f(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, m; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, m) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, m) } function _(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e) } function A(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e } function P(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(_, this), this.reset(!0) } function T(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function r() { for (; ++o < e.length;)if (n.call(e, o)) return r.value = e[o], r.done = !1, r; return r.value = t, r.done = !0, r }; return i.next = i } } throw new TypeError(E(e) + " is not iterable") } return g.prototype = b, o(E, "constructor", { value: b, configurable: !0 }), o(b, "constructor", { value: g, configurable: !0 }), g.displayName = l(b, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === g || "GeneratorFunction" === (e.displayName || e.name)) }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, b) : (t.__proto__ = b, l(t, u, "GeneratorFunction")), t.prototype = Object.create(E), t }, e.awrap = function (t) { return { __await: t } }, S(k.prototype), l(k.prototype, c, (function () { return this })), e.AsyncIterator = k, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new k(s(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then((function (t) { return t.done ? t.value : a.next() })) }, S(E), l(E, u, "Generator"), l(E, a, (function () { return this })), l(E, "toString", (function () { return "[object Generator]" })), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function t() { for (; r.length;) { var n = r.pop(); if (n in e) return t.value = n, t.done = !1, t } return t.done = !0, t } }, e.values = A, _.prototype = { constructor: _, reset: function (e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(O), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t) }, stop: function () { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval }, dispatchException: function (e) { if (this.done) throw e; var r = this; function o(n, o) { return c.type = "throw", c.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var a = this.tryEntries[i], c = a.completion; if ("root" === a.tryLoc) return o("end"); if (a.tryLoc <= this.prev) { var u = n.call(a, "catchLoc"), l = n.call(a, "finallyLoc"); if (u && l) { if (this.prev < a.catchLoc) return o(a.catchLoc, !0); if (this.prev < a.finallyLoc) return o(a.finallyLoc) } else if (u) { if (this.prev < a.catchLoc) return o(a.catchLoc, !0) } else { if (!l) throw Error("try statement without catch or finally"); if (this.prev < a.finallyLoc) return o(a.finallyLoc) } } } }, abrupt: function (t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, m) : this.complete(a) }, complete: function (t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), m }, finish: function (t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), O(r), m } }, catch: function (t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; O(r) } return o } } throw Error("illegal catch attempt") }, delegateYield: function (e, r, n) { return this.delegate = { iterator: A(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), m } }, e } function U(t, e, r, n, o, i, a) { try { var c = t[i](a), u = c.value } catch (t) { return void r(t) } c.done ? e(u) : Promise.resolve(u).then(n, o) } function D(t) { return function () { var e = this, r = arguments; return new Promise((function (n, o) { var i = t.apply(e, r); function a(t) { U(i, n, o, a, c, "next", t) } function c(t) { U(i, n, o, a, c, "throw", t) } a(void 0) })) } } function q(t) { return q = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (t) { return typeof t } : function (t) { return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t }, q(t) } var M = function () { try { if (null == i || !i.debug()) return; var t = (new Date).toLocaleString(); console.group("%c######### ".concat(i.prefix, " #########"), "color: #3498db; font-weight: bold;"), console.log("%c".concat(t), "color: #2ecc71;"); for (var e = arguments.length, r = new Array(e), n = 0; n < e; n++)r[n] = arguments[n]; r.forEach((function (t) { "object" === q(t) ? null === t ? console.log(null) : Array.isArray(t) ? console.table(t) : t instanceof Error ? console.error(t) : console.dir(t, { depth: null, colors: !0 }) : console.log(t) })), console.groupEnd() } catch (t) { console.error("An error occurred in the log function:", t) } }, H = function (t) { var e = document.querySelector("button[id='".concat(i.prefix, "-btn-validate']")); t.onmouseover = function () { return {} }, t.onmouseout = function () { return {} }, a(e, { display: "block" }), e.onclick = function () { return Y(t.src) }, i.selectedImage && a(i.selectedImage, { filter: "brightness(0.5)" }), i.selectedImage = t, a(i.selectedImage, { filter: "brightness(1)" }) }, R = function () { var t = D(F().mark((function t(e) { var r, n; return F().wrap((function (t) { for (; ;)switch (t.prev = t.next) { case 0: return t.next = 2, fetch(e); case 2: return r = t.sent, t.next = 5, r.blob(); case 5: return n = t.sent, t.abrupt("return", new Promise((function (t, e) { var r = new FileReader; r.onloadend = function () { return t(r.result) }, r.onerror = e, r.readAsDataURL(n) }))); case 7: case "end": return t.stop() } }), t) }))); return function (e) { return t.apply(this, arguments) } }(), Y = function () { var t = D(F().mark((function t(e) { var r, n, o, c, u, l, s, f, h, d, p, v; return F().wrap((function (t) { for (; ;)switch (t.prev = t.next) { case 0: for (_(), r = JSON.parse(localStorage.getItem("jellyfin_credentials")), n = r.Servers[0], o = n.AccessToken, c = n.UserId, u = null, l = window.location.hash, s = new URLSearchParams(l.split("?")[1] || ""), f = s.get("userId"), h = 0; h < localStorage.length; h++)(d = localStorage.key(h)) && d.startsWith("_device") && (p = localStorage.getItem(d), u = p); return t.next = 11, R(e); case 11: v = t.sent, fetch("../Users/".concat(f, "/Images/Primary"), { headers: { accept: "*/*", "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", authorization: 'MediaBrowser Client="Jellyfin Web", Device="Chrome", DeviceId="'.concat(u, '", Version="10.9.11", Token="').concat(o, '"'), "content-type": "image/png" }, referrerPolicy: "no-referrer", body: v.split(",")[1], method: "POST" }).then((function (t) { return M("User image successfully updated:", t) })).catch((function (t) { return M("Error updating the image:", t) })).finally((function () { var t = "url('".concat(e, "')"); if (a(document.getElementById("image"), { backgroundImage: t }), c == f) { var r = document.querySelector(".headerUserButton"); r.classList.contains("headerUserButtonRound") || r.classList.add("headerUserButtonRound"), r.innerHTML = '<div class="headerButton headerButtonRight paper-icon-button-light headerUserButtonRound" style="background-image:'.concat(t, ';"></div>') } window.localStorage.setItem("".concat(i.prefix, "-selected-img"), e), document.getElementById("".concat(i.prefix, "-modal")).remove(), document.getElementById("".concat(i.prefix, "-backdrop-modal")).remove() })); case 13: case "end": return t.stop() } }), t) }))); return function (e) { return t.apply(this, arguments) } }(), z = function () { var t = D(F().mark((function t() { var e, r, n, o, c = arguments; return F().wrap((function (t) { for (; ;)switch (t.prev = t.next) { case 0: if (e = c.length > 0 && void 0 !== c[0] ? c[0] : [], (r = c.length > 1 && void 0 !== c[1] ? c[1] : T()) instanceof HTMLElement) { t.next = 4; break } throw new Error("imgGrid must be a valid HTML element."); case 4: _(), n = [], e.forEach((function (t, e) { var r = (null == t ? void 0 : t.url) || (null == t ? void 0 : t.imageUrl) || (null == t ? void 0 : t.link) || (null == t ? void 0 : t.src); n.push(P(r, e)) })), i.selectedImage && n.unshift(P(i.selectedImage.src, "selected-tmp", !0)), u = void 0, u = document.querySelector('div[class="headerButton headerButtonRight paper-icon-button-light headerUserButtonRound"]'), (o = u ? u.style.backgroundImage.split('"')[1] : null) && n.unshift(P(o, "selected", !0)), n.length > 0 ? (a(r, { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px", padding: "15px" }), r.innerHTML = "", n.forEach((function (t) { return r.appendChild(t) }))) : M("No more srcImages available."); case 11: case "end": return t.stop() }var u }), t) }))); return function () { return t.apply(this, arguments) } }(), W = function () { var t = D(F().mark((function t() { var e, r, n, o, a, c, u; return F().wrap((function (t) { for (; ;)switch (t.prev = t.next) { case 0: if (e = i.getSrcImages(), r = "".concat(i.prefix, "-srcImages"), !(n = localStorage.getItem(r))) { t.next = 17; break } if (t.prev = 4, o = JSON.parse(n), a = new Date(o.timestamp), !(new Date - a < 864e5 && o.src === e)) { t.next = 12; break } return M("Using cached srcImages (".concat(o.data.length, ") from localStorage")), t.abrupt("return", o.data); case 12: t.next = 17; break; case 14: t.prev = 14, t.t0 = t.catch(4), M("Error parsing stored data:", t.t0); case 17: return t.prev = 17, t.next = 20, V(e); case 20: return c = t.sent, M("srcImages loaded ".concat(c.length)), u = { src: e, timestamp: (new Date).toISOString(), data: c }, localStorage.setItem(r, JSON.stringify(u)), t.abrupt("return", c); case 27: return t.prev = 27, t.t1 = t.catch(17), M("Error:", t.t1), t.abrupt("return", []); case 31: case "end": return t.stop() } }), t, null, [[4, 14], [17, 27]]) }))); return function () { return t.apply(this, arguments) } }(), J = function () { var t = D(F().mark((function t() { var e, r, n, o, a; return F().wrap((function (t) { for (; ;)switch (t.prev = t.next) { case 0: return e = navigator.language.split("-")[0], r = "en", n = e, o = {}, a = function () { var t = D(F().mark((function t(e) { var r, n, o; return F().wrap((function (t) { for (; ;)switch (t.prev = t.next) { case 0: return r = "jf-avatars/src/lang/".concat(e, ".json"), n = "".concat(i.fallbackUrl, "/").concat(e, ".json"), t.next = 4, V(r); case 4: if (o = t.sent) { t.next = 10; break } return M("Attempting to load from GitHub..."), t.next = 9, V(n); case 9: o = t.sent; case 10: return t.abrupt("return", o); case 11: case "end": return t.stop() } }), t) }))); return function (e) { return t.apply(this, arguments) } }(), t.next = 7, a(n); case 7: if (o = t.sent) { t.next = 12; break } return t.next = 11, a(r); case 11: o = t.sent; case 12: o || (M("Unable to load language files."), o = {}), window.i18n = o; case 14: case "end": return t.stop() } }), t) }))); return function () { return t.apply(this, arguments) } }(), V = function () { var t = D(F().mark((function t(e) { var r, n, o, i = arguments; return F().wrap((function (t) { for (; ;)switch (t.prev = t.next) { case 0: return r = i.length > 1 && void 0 !== i[1] ? i[1] : "no-store", t.prev = 1, M("Attempting to load: ".concat(e)), t.next = 5, fetch(e, { cache: r }); case 5: if ((n = t.sent).ok) { t.next = 8; break } throw new Error("File ".concat(e, " not found")); case 8: return t.next = 10, n.json(); case 10: return o = t.sent, M("JSON loaded:", o), t.abrupt("return", o); case 15: return t.prev = 15, t.t0 = t.catch(1), M("Error loading from: ".concat(e, ", ").concat(t.t0.message)), t.abrupt("return", null); case 19: case "end": return t.stop() } }), t, null, [[1, 15]]) }))); return function (e) { return t.apply(this, arguments) } }(), Q = function (t) { var e = t.getBoundingClientRect(); return e.top >= 0 && e.left >= 0 && e.bottom <= window.innerHeight && e.right <= window.innerWidth }; function $(t, e) { (null == e || e > t.length) && (e = t.length); for (var r = 0, n = Array(e); r < e; r++)n[r] = t[r]; return n } var X = function () { M("Attempting to add button"), document.getElementById("".concat(i.prefix, "-btn-show-modal")) ? M("Button already exists") : function (t, e) { var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 100, n = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : 1e3, o = Date.now(), i = setInterval((function () { var r = document.querySelector(t), a = Date.now() - o; M("Wait Element ".concat(t)), r && (M("Element ".concat((null == r ? void 0 : r.id) || (null == r ? void 0 : r.textContent), " founded")), clearInterval(i), e()), a >= n && (clearInterval(i), M("Element ".concat(t, " not found within timeout period."))) }), r) }(i.injectBtnModal(), (function () { var t; (t = document.createElement("style")).type = "text/css", t.innerText = "\n  .lds-ripple, .lds-ripple div {\n    box-sizing: border-box;\n  }\n  .lds-ripple {\n    display: inline-block;\n    position: relative;\n    width: 80px;\n    height: 80px;\n  }\n  .lds-ripple div {\n    position: absolute;\n    border: 4px solid currentColor;\n    opacity: 1;\n    border-radius: 50%;\n    animation: lds-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;\n  }\n  .lds-ripple div:nth-child(2) {\n    animation-delay: -0.5s;\n  }\n  @keyframes lds-ripple {\n    0% { top: 36px; left: 36px; width: 8px; height: 8px; opacity: 0; }\n    5% { top: 36px; left: 36px; width: 8px; height: 8px; opacity: 1; }\n    100% { top: 0; left: 0; width: 80px; height: 80px; opacity: 0; }\n  }\n  @keyframes blink {\n    from { transform: scale(0.1); opacity: 1;}\n    to { transform: scale(1); opacity: 0;}\n  }\n\n  .blink {\n    animation: blink 1s infinite;\n  }\n", document.head.appendChild(t), document.querySelector(i.injectBtnModal()).before(C({ id: "show-modal", textContent: i.getBtnShowAvatarsLabel(), onClick: function () { return B() } })), M("Button injected") })) }, K = function () { M("Attempting to observe dom changes"); var t = document.body, e = { childList: !0, subtree: !0 }, r = function (t) { var e, r = function (t, e) { var r = "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"]; if (!r) { if (Array.isArray(t) || (r = function (t, e) { if (t) { if ("string" == typeof t) return $(t, e); var r = {}.toString.call(t).slice(8, -1); return "Object" === r && t.constructor && (r = t.constructor.name), "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? $(t, e) : void 0 } }(t)) || e && t && "number" == typeof t.length) { r && (t = r); var n = 0, o = function () { }; return { s: o, n: function () { return n >= t.length ? { done: !0 } : { done: !1, value: t[n++] } }, e: function (t) { throw t }, f: o } } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.") } var i, a = !0, c = !1; return { s: function () { r = r.call(t) }, n: function () { var t = r.next(); return a = t.done, t }, e: function (t) { c = !0, i = t }, f: function () { try { a || null == r.return || r.return() } finally { if (c) throw i } } } }(t); try { for (r.s(); !(e = r.n()).done;)"childList" === e.value.type && window.location.hash.includes("#/userprofile") && (X(), Z.disconnect()) } catch (t) { r.e(t) } finally { r.f() } }; M("Navigation to userprofile detected."), J().then((function () { window.location.hash.includes("#/userprofile") ? X() : new MutationObserver(r).observe(t, e) })) }, Z = new MutationObserver((function (t) { t.forEach((function (t) { t.addedNodes.forEach((function (t) { "cssBranding" !== t.id && "Profile" !== t.textContent || (K(), Z.disconnect()) })) })) })); K(), Z.observe(document.body, { childList: !0, subtree: !0 }) })();