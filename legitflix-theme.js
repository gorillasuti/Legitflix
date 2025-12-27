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

    const hasAvatar = user.PrimaryImageTag;
    const userImageUrl = hasAvatar
        ? `/Users/${user.Id}/Images/Primary?tag=${user.PrimaryImageTag}&quality=90&maxHeight=300`
        : 'https://raw.githubusercontent.com/google/material-design-icons/master/png/action/account_circle/materialicons/48dp/2x/baseline_account_circle_white_48dp.png';

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
    } else if (user.ImageTags && user.ImageTags.Banner) {
        const pBannerUrl = `/Users/${user.Id}/Images/Banner?tag=${user.ImageTags.Banner}&maxHeight=500&v=${Date.now()}`;
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
            <div class="legit-popup-grid" id="bannerGrid">Loading...</div>
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

        const success = await window.uploadUserBackdrop(window._pendingBannerUrl);
        if (success) {
            document.querySelector('.legit-popup-overlay').remove();
            alert('Banner updated successfully!');
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
        const url = `/Users/${auth.UserId}/Items?Recursive=true&IncludeItemTypes=Movie,Series&ImageTypes=Backdrop&SortBy=Random&Limit=12&Fields=Id,Name`;
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

window.legitFlixOpenAvatarPicker = function () {
    const popup = document.createElement('div');
    popup.className = 'legit-popup-overlay';

    popup.innerHTML = `
        <div class="legit-popup-content avatar-picker-popup">
            <h2>Change Avatar</h2>
            <div class="avatar-options-grid">
                <button class="legit-btn-primary" onclick="window.LegitFlixAvatarPicker.open(); document.querySelector('.legit-popup-overlay').remove()">
                    <span class="material-icons">grid_view</span>
                    Choose from Gallery
                </button>
                <button class="legit-btn-accent" onclick="window.triggerNativeUpload()">
                    <span class="material-icons">upload_file</span>
                    Upload Image
                </button>
            </div>
            <button class="legit-btn-secondary" style="margin-top:20px;" onclick="this.closest('.legit-popup-overlay').remove()">Close</button>
        </div>
    `;
    document.body.appendChild(popup);
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
                            'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${window.ApiClient.deviceName()}", DeviceId="${window.ApiClient.deviceId()}", Version="${window.ApiClient.applicationVersion()}", Token="${window.ApiClient.accessToken()}"`,
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

window.uploadUserBackdrop = (url) => window.uploadExternalImage(url, 'Banner');

/* --- CUSTOM AVATAR PICKER (Native) --- */
/* --- CUSTOM AVATAR PICKER (Netflix Style) --- */
window.LegitFlixAvatarPicker = {
    repoBase: 'https://raw.githubusercontent.com/kalibrado/js-avatars-images/refs/heads/main',
    allImages: [],

    open: async function () {
        // Simple Loading Indicator
        const loader = document.createElement('div');
        loader.className = 'legit-popup-overlay';
        loader.innerHTML = '<div style="color:white; font-size:24px; font-weight:bold;">Loading Avatars...</div>';
        document.body.appendChild(loader);

        try {
            const res = await fetch(`${this.repoBase}/images_metadata.json`);
            if (!res.ok) throw new Error('Network error');
            this.allImages = await res.json(); // Data is a flat array

            loader.remove();
            this.renderModal();
        } catch (e) {
            loader.remove();
            console.error('Failed to load avatars', e);
            alert('Failed to load avatars. Please check console.');
        }
    },

    renderModal: function () {
        // Extract Unique Categories from "folder" property
        const categories = [...new Set(this.allImages.map(img => img.folder))].sort();

        const overlay = document.createElement('div');
        overlay.className = 'legit-popup-overlay';
        overlay.style.backdropFilter = 'blur(15px)';
        overlay.style.background = 'rgba(0, 0, 0, 0.85)';
        overlay.style.zIndex = '99999';

        const style = document.createElement('style');
        style.innerHTML = `
            .lf-picker-modal {
                width: 95vw; height: 90vh;
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
                padding: 25px 40px;
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 3px solid #000;
                background: linear-gradient(to bottom, #222, #141414);
                z-index: 10;
            }
            .lf-picker-title { font-size: 2vw; font-weight: 700; margin: 0; color: #e5e5e5; }
            
            .lf-picker-controls { display: flex; gap: 20px; align-items: center; }
            
            .lf-search-input {
                background: #000; border: 1px solid #333; color: white;
                padding: 12px 18px; border-radius: 4px; font-size: 1rem; width: 300px;
                transition: border 0.3s;
            }
            .lf-search-input:focus { border-color: #fff; outline: none; }
            
            .lf-category-select {
                background: #333; border: 1px solid #444; color: white;
                padding: 12px 18px; border-radius: 4px; font-size: 1rem;
                cursor: pointer; font-weight: bold;
            }
            .lf-category-select:hover { background: #444; }

            .lf-picker-grid {
                flex: 1; overflow-y: auto;
                padding: 40px;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: 30px;
                justify-content: center;
                align-content: start;
            }
            
            .lf-picker-item {
                aspect-ratio: 1;
                border-radius: 50%;
                background-size: cover; background-position: center;
                cursor: pointer;
                transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), border 0.2s;
                border: 4px solid transparent;
                position: relative;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            }
            .lf-picker-item:hover {
                transform: scale(1.15);
                border-color: #fff; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                z-index: 2;
            }
            
            .lf-picker-close {
                position: absolute; top: 15px; right: 25px;
                background: transparent; border: none; color: #fff;
                font-size: 35px; cursor: pointer; opacity: 0.5;
                transition: opacity 0.2s;
                z-index: 20;
            }
            .lf-picker-close:hover { opacity: 1; }
            
            @media (max-width: 768px) {
                .lf-picker-header { flex-direction: column; gap: 15px; align-items: flex-start; padding: 20px; }
                .lf-picker-controls { width: 100%; flex-wrap: wrap; }
                .lf-search-input { width: 100%; }
                .lf-picker-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); padding: 15px; gap: 15px; }
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
                    <input type="text" class="lf-search-input" id="lfAvatarSearch" placeholder="Search for an avatar...">
                    <select class="lf-category-select" id="lfAvatarFilter">
                        <option value="All">All Categories</option>
                        ${catOptions}
                    </select>
                </div>
                <button class="lf-picker-close" id="lfPickerClose">&times;</button>
            </div>
            <div class="lf-picker-grid" id="lfPickerGrid"></div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const searchInput = modal.querySelector('#lfAvatarSearch');
        const filterSelect = modal.querySelector('#lfAvatarFilter');
        const grid = modal.querySelector('#lfPickerGrid');
        const closeBtn = modal.querySelector('#lfPickerClose');

        closeBtn.onclick = () => overlay.remove();

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

        // Render initial
        this.renderGridItems(grid, this.allImages);
    },

    renderGridItems: function (container, images) {
        // PERFORMANCE GUARD: Limit rendering to 500 items to prevent DOM freeze
        const displayImages = images.slice(0, 500);

        const html = displayImages.map(img => `
            <div class="lf-picker-item" 
                 title="${img.name}" 
                 style="background-image: url('${img.url}')">
            </div>
        `).join('');

        container.innerHTML = html;

        if (images.length > 500) {
            container.insertAdjacentHTML('beforeend', '<div style="grid-column: 1/-1; text-align:center; padding:20px; color:#aaa;">(Only showing first 500 results. Use search to find specific items.)</div>');
        }

        // Add Listeners
        const items = container.querySelectorAll('.lf-picker-item');
        items.forEach((item, index) => {
            item.onclick = () => this.selectAvatar(displayImages[index].url);
        });
    },

    selectAvatar: async function (url) {
        if (!confirm('Set as your avatar?')) return;

        const grid = document.querySelector('.lf-picker-grid');
        grid.innerHTML = '<div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white;"><h1>Updating Profile...</h1><p>Please wait...</p></div>';

        const success = await window.uploadExternalImage(url, 'Primary');
        if (success) {
            location.reload();
        } else {
            alert('Update failed. Please try again.');
            document.querySelector('.legit-popup-overlay').remove();
        }
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

                // Insert BEFORE Logout tab if possible, otherwise append
                const logoutTab = navTabs.querySelector('.logout-tab');
                if (logoutTab) {
                    navTabs.insertBefore(tab, logoutTab);
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
    // Only on preferences page
    if (!window.location.hash.toLowerCase().includes('preferences')) return;

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
                                'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${window.ApiClient.deviceName()}", DeviceId="${window.ApiClient.deviceId()}", Version="${window.ApiClient.applicationVersion()}", Token="${window.ApiClient.accessToken()}"`,
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