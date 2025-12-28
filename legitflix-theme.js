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

// =========================================================================
// CAROUSEL COMPONENT DOCUMENTATION
// 
// Use this guide to locate key carousel functionality:
// 1. Data Fetching: fetchMediaBarItems (Line ~76) - Gets items from API.
// 2. HTML Generation: createMediaBarHTML (Line ~99) - Builds slides.
// 3. Carousel Logic: injectMediaBar (Line ~270) - Handles injection & timer.
// 4. Playback Logic: legitFlixPlay (See below) - Handles Play button click.
// 
// BUG REPORT: The "Play" button on the carousel has issues initiating playback
// directly due to internal Jellyfin `PlaybackManager` being inaccessible in
// theme context. The current solution (V6) uses a workaround:
// -> Navigates to details page -> Auto-clicks the native Play button.
// =========================================================================
async function fetchMediaBarItems() {
    logger.log('fetchMediaBarItems: Fetching hero content...');
    const auth = await getAuth();
    if (!auth) return [];

    const fields = 'PrimaryImageAspectRatio,Overview,BackdropImageTags,ImageTags,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks,Genres';
    const url = `/Users/${auth.UserId}/Items?IncludeItemTypes=${CONFIG.heroMediaTypes}&Recursive=true&SortBy=Random&Limit=${CONFIG.heroLimit}&Fields=${fields}&ImageTypeLimit=1&EnableImageTypes=Backdrop,Primary,Logo`;

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
        const backdropUrl = `/Items/${item.Id}/Images/Backdrop/0?maxHeight=1080&quality=96`; // Improved quality
        const activeClass = index === 0 ? 'active' : '';


        // IMDb Rating
        let ratingHtml = item.CommunityRating ? `<span class="star-rating">⭐ ${item.CommunityRating.toFixed(1)}</span>` : '';

        // Ends At Calculation
        let endsAtHtml = '';
        if (item.RunTimeTicks && item.Type !== 'Series') {
            const ms = item.RunTimeTicks / 10000;
            const endTime = new Date(Date.now() + ms);
            const timeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            endsAtHtml = `<span class="ends-at">Ends at ${timeStr}</span>`;
        } else if (item.Type === 'Series') {
            endsAtHtml = `<span class="ends-at">${item.ChildCount ? item.ChildCount + ' Seasons' : 'Series'}</span>`;
        }

        const title = item.Name;
        const desc = item.Overview || '';
        const playOnClick = `window.legitFlixPlay('${item.Id}')`;
        const infoOnClick = `window.legitFlixShowItem('${item.Id}')`;

        // Logo vs Text Logic
        const hasLogo = item.ImageTags && item.ImageTags.Logo;
        const titleHtml = hasLogo
            ? `<img src="/Items/${item.Id}/Images/Logo?maxHeight=200&maxWidth=450&quality=90" class="hero-logo" alt="${title}" />`
            : `<h1 class="hero-title">${title}</h1>`;

        return `
            <div class="hero-slide ${activeClass}" data-index="${index}">
                <div class="hero-backdrop" style="background-image: url('${backdropUrl}')"></div>
                <div class="hero-overlay"></div>
                <div class="hero-content">
                    ${titleHtml}
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
                        <button class="hero-button-info" onclick="window.legitFlixShowItem('${item.Id}')" title="More Info">
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

// --- NAV HELPER (Fixes appRouter crash) ---
window.legitFlixShowItem = function (itemId) {
    // Match Plugin: Use /#!/details route
    window.top.location.href = `/#!/details?id=${itemId}`;
};

// --- PLAYBACK HELPER (Retry Logic & Force Load) ---
// --- PLAYBACK HELPER (Debug Mode) ---
// --- PLAYBACK HELPER (V6 - Navigate & Auto-Click) ---
// TODO: Fix Direct Playback. 
// Current Issue: API commands (Play, PlayMediaSource) are rejected by client.
// Workaround: Navigate to details page and simulate click on Native Play Button.
window.legitFlixPlay = async function (id) {
    logger.log('legitFlixPlay (V6 Auto-Click): Clicked', id);

    // 1. Navigate to Details Page (Reliable)
    window.legitFlixShowItem(id);

    // 2. Poll for the Native Play Button on the new page and click it
    // Since this is a SPA, the script continues running.
    let attempts = 0;
    const maxAttempts = 40; // 4 seconds

    const clickInterval = setInterval(() => {
        attempts++;
        // Look for the Detail Page Play Button
        // Usually in .mainDetailButtons or just huge play button
        const playBtn = document.querySelector('.detailPage .btnPlay')
            || document.querySelector('.detailButtons .btnPlay')
            || document.querySelector('button[is="emby-playbutton"].detailButton')
            || document.querySelector('.itemDetailPage .playButton');

        if (playBtn) {
            // Verify it belongs to the correct item? 
            // Hard to check, but we just navigated, so assume yes.
            logger.log('legitFlixPlay: Found Detail Play Button. Clicking!', playBtn);
            playBtn.click();
            clearInterval(clickInterval);
        } else if (attempts >= maxAttempts) {
            logger.warn('legitFlixPlay: Could not find Play button on details page. User must click manually.');
            clearInterval(clickInterval);
        }
    }, 100);
};

// --- [REMOVED] Duplicate legacy navigation logic ---

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
            container.classList.add('has-legit-hero'); // Enable CSS spacing

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
    console.log('[LegitFlix] injectFeaturedPrefs: Starting...');

    // 1. Target ANY user preferences page (Menu, Display, Home, Playback, etc.)
    // Multiple pages may exist in DOM simultaneously (client-side routing)
    // We need to find the VISIBLE/ACTIVE one
    let prefsPage = null;
    const allPrefsPages = document.querySelectorAll('.userPreferencesPage');
    for (const page of allPrefsPages) {
        // Check if page is visible (not display:none)
        const style = window.getComputedStyle(page);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
            prefsPage = page;
            break;
        }
    }

    if (!prefsPage) {
        // Debug: Log all pages with data-role="page" to see what's available
        const allPages = document.querySelectorAll('[data-role="page"]');
        console.log('[LegitFlix] injectFeaturedPrefs: No matching page. Available pages:',
            Array.from(allPages).map(p => `${p.id} (${p.className})`).join(', '));
        return;
    }
    console.log('[LegitFlix] injectFeaturedPrefs: Found page:', prefsPage.id || prefsPage.className);

    // Use .readOnlyContent or specific containers based on user HTML
    // Form pages often have the form directly as child, card pages use .readOnlyContent
    const contentContainer = prefsPage.querySelector('.readOnlyContent') ||
        prefsPage.querySelector('.content-primary') ||
        prefsPage.querySelector('form') || // Form-based pages (Display, Playback, etc.)
        prefsPage; // Ultimate fallback: inject into page itself

    if (!contentContainer) {
        console.log('[LegitFlix] injectFeaturedPrefs: No content container found');
        return;
    }
    console.log('[LegitFlix] injectFeaturedPrefs: Found container:', contentContainer.className);

    // Avoid double injection
    if (prefsPage.querySelector('.gaming-profile-header')) {
        console.log('[LegitFlix] injectFeaturedPrefs: Header already exists');
        return;
    }

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

    // 2. Map Links for Tabs - ensure they include userId parameter
    // We try to find existing links to make tabs functional, fallback to standard hashes with userId
    const findLink = (str, defaultHash) => {
        const a = contentContainer.querySelector(`a[href*="${str}"]`);
        return a ? a.getAttribute('href') : `${defaultHash}?userId=${user.Id}`;
    };

    const profileHref = findLink('mypreferencesmenu', '#/mypreferencesmenu');
    const displayHref = findLink('mypreferencesdisplay', '#/mypreferencesdisplay');
    const homeHref = findLink('mypreferenceshome', '#/mypreferenceshome');
    const playbackHref = findLink('mypreferencesplayback', '#/mypreferencesplayback');
    const subtitleHref = findLink('mypreferencessubtitles', '#/mypreferencessubtitles');
    const quickConnectHref = findLink('quickconnect', '#/quickconnect');
    const controlsHref = findLink('mypreferencescontrols', '#/mypreferencescontrols'); // Assuming standard naming

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
    } else if (user.BackdropImageTags && user.BackdropImageTags.length > 0) {
        // FALLBACK: If no Banner but has Backdrop (rare for users, but possible)
        const pBannerUrl = `/Users/${user.Id}/Images/Backdrop/0?tag=${user.BackdropImageTags[0]}&maxHeight=500&v=${Date.now()}`;
        bannerStyle = `background-image: url('${pBannerUrl}');`;
        bannerClass = 'has-banner';
        btnText = 'Change profile banner';
        btnIcon = 'edit';
    }

    // Detect if we're on "My Details" page (needs banner/avatar) vs other settings pages
    const isMyDetailsPage = prefsPage.id === 'myPreferencesMenuPage';

    // Build header HTML with conditional banner/avatar sections
    let headerHtml = `
        <div class="gaming-profile-header">
            <h1 class="profile-page-title">Account Settings</h1>
            
            <div class="profile-nav-tabs" style="padding-bottom: 1rem; flex-wrap: wrap;">
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('mypreferencesmenu') ? 'active' : ''}" onclick="location.href='${profileHref}'">My details</a>
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('mypreferencesdisplay') ? 'active' : ''}" onclick="location.href='${displayHref}'">Display</a>
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('mypreferenceshome') ? 'active' : ''}" onclick="location.href='${homeHref}'">Home Screen</a>
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('mypreferencesplayback') ? 'active' : ''}" onclick="location.href='${playbackHref}'">Playback</a>
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('mypreferencessubtitles') ? 'active' : ''}" onclick="location.href='${subtitleHref}'">Subtitles</a>
                <a class="profile-tab ${window.location.hash.toLowerCase().includes('quickconnect') ? 'active' : ''}" onclick="location.href='${quickConnectHref}'">Quick Connect</a>
                
                <!-- Sign Out (Icon) -->
                <a class="profile-tab logout-tab" onclick="document.querySelector('.btnLogout').click()" title="Sign Out">
                    <span class="material-icons">exit_to_app</span>
                </a>
            </div>
    `;

    // Only add banner and avatar on "My Details" page
    if (isMyDetailsPage) {
        headerHtml += `
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
        `;
    }

    headerHtml += `
        </div>
    `;

    // 4. Insert at TOP of content
    contentContainer.insertAdjacentHTML('afterbegin', headerHtml);

    // FETCH & SYNC Remote Banner (Async)
    window.getUserBanner().then(remoteUrl => {
        if (remoteUrl && remoteUrl !== localBanner) {
            console.log('LegitFlix: Remote banner found, updating UI:', remoteUrl);
            const bannerEl = contentContainer.querySelector('.profile-banner');
            if (bannerEl) {
                bannerEl.style.backgroundImage = `url('${remoteUrl}')`;
                bannerEl.classList.add('has-banner');

                const btnTextEl = contentContainer.querySelector('.banner-add-text');
                if (btnTextEl) btnTextEl.textContent = 'Change profile banner';
                const btnIconEl = contentContainer.querySelector('.banner-add-btn .material-icons-outlined');
                if (btnIconEl) btnIconEl.textContent = 'edit';

                // Update Local Cache
                localStorage.setItem(`LegitFlix_Banner_${user.Id}`, remoteUrl);
            }
        }
    });

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
            <div class="legit-popup-grid" id="bannerGrid" style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">Loading...</div>
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

        const success = await window.saveUserBanner(window._pendingBannerUrl);
        if (success) {
            document.querySelector('.legit-popup-overlay').remove();
            console.log('LegitFlix: Banner updated successfully!');
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
        const url = `/Users/${auth.UserId}/Items?Recursive=true&IncludeItemTypes=Movie,Series&ImageTypes=Backdrop&SortBy=Random&Limit=48&Fields=Id,Name`;
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

/* --- POPUP LOGIC --- */
window.legitFlixOpenAvatarPicker = function () {
    const popup = document.createElement('div');
    popup.className = 'legit-popup-overlay';

    // REDESIGN: Horizontal, Compact, "Options next to each other"
    popup.innerHTML = `
        <div class="legit-popup-content small" style="text-align:center; padding: 2rem; width: auto; min-width: 400px;">
            <h2 style="margin-bottom: 2rem; font-size: 1.4rem; font-weight: 500;">Change Avatar</h2>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="legit-btn-primary" id="btnOpenGallery" style="flex: 1; padding: 0.5rem !important; flex-direction: row; gap: 8px; border-radius: 8px !important;">
                    <span class="material-icons" style="font-size: 1.75rem; display:block;">grid_view</span>
                    <span style="font-size: 0.9rem !important;">Choose Avatar</span>
                </button>
                
                <button class="legit-btn-accent" id="btnUploadLocal" style="flex: 1; padding: 0.5rem !important; flex-direction: row; gap: 8px; border-radius: 8px !important;">
                    <span class="material-icons" style="font-size: 1.75rem; display:block;">upload_file</span>
                    <span style="font-size: 0.9rem !important;">Upload Image</span>
                </button>
            </div>
            
            <button class="legit-btn-secondary" id="btnClosePopup" style="margin-top: 20px; width: 100%; border: none;">Cancel</button>
        </div>
    `;

    document.body.appendChild(popup);

    // Handlers
    popup.querySelector('#btnOpenGallery').onclick = () => {
        popup.remove();
        if (window.LegitFlixAvatarPicker) window.LegitFlixAvatarPicker.open();
    };

    popup.querySelector('#btnUploadLocal').onclick = () => {
        popup.remove();
        window.triggerNativeUpload();
    };

    const close = () => popup.remove();
    popup.querySelector('#btnClosePopup').onclick = close;
    popup.onclick = (e) => { if (e.target === popup) close(); };
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
                            'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${window.ApiClient.accessToken()}"`,
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

        // DEBUG: Verify Target
        console.log(`LegitFlix DEBUG: Uploading ${imageType} to ${uploadUrl}`);
        if (imageType === 'Backdrop') alert(`LegacyFlix Debug: Uploading Backdrop to:\n${uploadUrl}`);

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

// --- DISPLAY PREFS HELPER (Persistent Banner) ---
window.saveUserBanner = async function (bannerUrl) {
    try {
        const userId = window.ApiClient.getCurrentUserId();
        // Use a unique ID for our theme settings
        const prefsId = 'legitflix-theme-config';
        const client = 'LegitFlix';

        // 1. Get Current
        const getUrl = window.ApiClient.getUrl(`/DisplayPreferences/${prefsId}?userId=${userId}&client=${client}`);
        let currentPrefs = {};
        try {
            const res = await fetch(getUrl, {
                headers: {
                    'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${window.ApiClient.accessToken()}"`
                }
            });
            if (res.ok) currentPrefs = await res.json();
            else currentPrefs = { Id: prefsId, CustomPrefs: {} }; // Init if new
        } catch (e) { currentPrefs = { Id: prefsId, CustomPrefs: {} }; }

        // 2. Update
        if (!currentPrefs.CustomPrefs) currentPrefs.CustomPrefs = {};
        currentPrefs.CustomPrefs.BannerUrl = bannerUrl;

        // 3. Save
        const postUrl = window.ApiClient.getUrl(`/DisplayPreferences/${prefsId}?userId=${userId}&client=${client}`);
        await fetch(postUrl, {
            method: 'POST',
            headers: {
                'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${window.ApiClient.accessToken()}"`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentPrefs)
        });

        // 4. Update LocalStorage for instant access on this device
        localStorage.setItem(`LegitFlix_Banner_${userId}`, bannerUrl);

        console.log('LegitFlix: Banner saved to DisplayPrefs:', bannerUrl);
        return true;
    } catch (e) {
        console.error('LegitFlix: Failed to save banner pref', e);
        return false;
    }
};

window.getUserBanner = async function () {
    try {
        const userId = window.ApiClient.getCurrentUserId();
        const prefsId = 'legitflix-theme-config';
        const client = 'LegitFlix';
        const getUrl = window.ApiClient.getUrl(`/DisplayPreferences/${prefsId}?userId=${userId}&client=${client}`);

        const res = await fetch(getUrl, {
            headers: {
                'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${window.ApiClient.accessToken()}"`
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.CustomPrefs ? data.CustomPrefs.BannerUrl : null;
    } catch (e) { return null; }
};

/* --- CUSTOM AVATAR PICKER (Netflix Style) --- */
window.LegitFlixAvatarPicker = {
    repoBase: 'https://raw.githubusercontent.com/kalibrado/js-avatars-images/refs/heads/main',
    allImages: [],
    selectedUrl: null,

    open: async function () {
        // Simple Loading Indicator
        const loader = document.createElement('div');
        loader.className = 'legit-popup-overlay';
        loader.innerHTML = '<div style="color:white; font-size:24px; font-weight:bold;">Loading Avatars...</div>';
        document.body.appendChild(loader);

        try {
            const res = await fetch(`${this.repoBase}/images_metadata.json`);
            if (!res.ok) throw new Error('Network error');
            this.allImages = await res.json();

            loader.remove();
            this.selectedUrl = null; // Reset selection
            this.renderModal();
        } catch (e) {
            loader.remove();
            console.error('Failed to load avatars', e);
            alert('Failed to load avatars. Please check console.');
        }
    },

    renderModal: function () {
        const categories = [...new Set(this.allImages.map(img => img.folder))].sort();

        const overlay = document.createElement('div');
        overlay.className = 'legit-popup-overlay';
        overlay.style.backdropFilter = 'blur(15px)';
        overlay.style.background = 'rgba(0, 0, 0, 0.85)';
        overlay.style.zIndex = '99999';

        const style = document.createElement('style');
        style.innerHTML = `
            .lf-picker-modal {
                width: 90vw; height: 85vh;
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
                padding: 20px 30px;
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 2px solid #222;
                background: linear-gradient(to bottom, #222, #141414);
                z-index: 10;
                gap: 20px;
            }
            .lf-picker-title { 
                font-size: 1.5rem; 
                font-weight: 600; 
                margin: 0; 
                color: #e5e5e5;
                white-space: nowrap;
            }
            
            .lf-picker-controls { 
                display: flex; gap: 15px; align-items: center; 
                flex: 1; justify-content: flex-end;
            }
            
            /* Stylized Inputs to match theme */
            .lf-control-input {
                background: rgba(255, 255, 255, 0.1); 
                border: 1px solid rgba(255, 255, 255, 0.2); 
                color: white;
                padding: 10px 15px; 
                border-radius: 4px; 
                font-size: 0.95rem;
                transition: all 0.2s;
            }
            .lf-control-input:focus { 
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.5); 
                outline: none; 
            }
            .lf-control-input option {
                background: #222;
                color: white;
            }
            
            .lf-search-input { width: 250px; }
            .lf-category-select { cursor: pointer; }

            .lf-picker-close {
                background: transparent; border: none; color: #fff;
                font-size: 28px; cursor: pointer; opacity: 0.6;
                transition: opacity 0.2s;
                margin-left: 10px;
                line-height: 1;
                display: flex; align-items: center;
            }
            .lf-picker-close:hover { opacity: 1; }

            .lf-picker-grid {
                flex: 1; overflow-y: auto;
                padding: 30px;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
                gap: 25px;
                justify-content: center;
                align-content: start;
            }
            
            .lf-picker-item {
                aspect-ratio: 1;
                border-radius: 50%;
                background-size: cover; background-position: center;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                border: 4px solid transparent;
                position: relative;
            }
            .lf-picker-item:hover {
                transform: scale(1.1);
                border-color: rgba(255,255,255,0.5);
                box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                z-index: 2;
            }
            .lf-picker-item.selected {
                border-color: #182737; /* Theme Color */
                transform: scale(1.1);
                box-shadow: 0 0 20px rgba(0, 164, 220, 0.6);
                z-index: 3;
            }

            .lf-picker-footer {
                padding: 20px 30px;
                background: #1a1a1a;
                border-top: 1px solid #333;
                display: flex; justify-content: flex-end; gap: 15px;
            }
            
            /* Footer Buttons */
            .lf-btn {
                padding: 8px 12px; border-radius: 6px; 
                font-weight: 600; font-size: 1rem; cursor: pointer; border: none;
                transition: all 0.2s;
            }
            .lf-btn-cancel { background: transparent; color: #aaa; border: 1px solid #444; }
            .lf-btn-cancel:hover { color: white; border-color: white; }
            
            .lf-btn-save { 
                background: var(--clr-accent); color: white; 
                opacity: 0.5; pointer-events: none; /* Disabled by default */
            }
            .lf-btn-save.active { opacity: 1; pointer-events: auto; }
            .lf-btn-save:hover { background: var(--clr-accent-hover); }

            @media (max-width: 768px) {
                .lf-picker-header { flex-direction: column; align-items: flex-start; gap: 15px; padding: 15px; }
                .lf-picker-controls { width: 100%; flex-wrap: wrap; }
                .lf-search-input { width: 100%; }
                .lf-picker-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); padding: 15px; gap: 15px; }
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
                    <input type="text" class="lf-control-input lf-search-input" id="lfAvatarSearch" placeholder="Search...">
                    <select class="lf-control-input lf-category-select" id="lfAvatarFilter">
                        <option value="All">All Categories</option>
                        ${catOptions}
                    </select>
                </div>
                
                <button class="lf-picker-close" id="lfPickerClose">
                    <span class="material-icons">close</span>
                </button>
            </div>
            
            <div class="lf-picker-grid" id="lfPickerGrid"></div>
            
            <div class="lf-picker-footer">
                <button class="lf-btn lf-btn-cancel" id="lfBtnCancel">Cancel</button>
                <button class="lf-btn lf-btn-save" id="lfBtnSave">Save Avatar</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Elements
        const searchInput = modal.querySelector('#lfAvatarSearch');
        const filterSelect = modal.querySelector('#lfAvatarFilter');
        const grid = modal.querySelector('#lfPickerGrid');
        const closeBtn = modal.querySelector('#lfPickerClose');
        const cancelBtn = modal.querySelector('#lfBtnCancel');
        const saveBtn = modal.querySelector('#lfBtnSave');

        // Handlers
        const close = () => overlay.remove();
        closeBtn.onclick = close;
        cancelBtn.onclick = close;

        saveBtn.onclick = () => this.saveAvatar(saveBtn);

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

        // Initial Render
        this.renderGridItems(grid, this.allImages);
    },

    renderGridItems: function (container, images) {
        // Limit render count for performance
        const displayImages = images.slice(0, 500);

        const html = displayImages.map(img => `
            <div class="lf-picker-item" 
                 title="${img.name}" 
                 style="background-image: url('${img.url}')"
                 data-url="${img.url}">
            </div>
        `).join('');

        container.innerHTML = html;

        // View More Indicator if truncated
        if (images.length > 500) {
            container.insertAdjacentHTML('beforeend', '<div style="grid-column: 1/-1; text-align:center; padding:20px; color:#aaa;">(Only showing first 500 results. Use search to filter.)</div>');
        }



        // Add Selection Logic
        const items = container.querySelectorAll('.lf-picker-item');
        items.forEach(item => {
            item.onclick = () => {
                // Deselect all
                container.querySelectorAll('.lf-picker-item.selected').forEach(el => el.classList.remove('selected'));
                // Select clicked
                item.classList.add('selected');

                // Update State
                this.selectedUrl = item.dataset.url;

                // Enable Save
                const saveBtn = document.querySelector('#lfBtnSave');
                if (saveBtn) saveBtn.classList.add('active');
            };
        });
    },

    saveAvatar: async function (btn) {
        if (!this.selectedUrl) return;

        btn.textContent = "Saving...";
        btn.classList.remove('active'); // Disable double click

        const success = await window.uploadExternalImage(this.selectedUrl, 'Primary');

        if (success) {
            location.reload();
        } else {
            alert('Update failed. Please try again.');
            btn.textContent = "Save Avatar";
            btn.classList.add('active');
        }
    }
};




// --- INIT & ROBUSTNESS ---
// We use a polling mechanism to ensure the UI is ready before injecting.
// This is more reliable than Observers for the initial load.

let _injectedNav = false;
let _injectedHero = false;
let _injectedJelly = false;

// =========================================================================
// MODERN SEARCH MODAL LOGIC
// =========================================================================

let _searchDebounce = null;

function createSearchModal() {
    if (document.querySelector('.legit-search-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'legit-search-overlay';

    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) closeSearchModal();
    };

    const modal = document.createElement('div');
    modal.className = 'legit-search-modal';

    // Header / Input
    const header = document.createElement('div');
    header.className = 'legit-search-header';

    const icon = document.createElement('span');
    icon.className = 'material-icons legit-search-icon';
    icon.textContent = 'search';

    const input = document.createElement('input');
    input.className = 'legit-search-input';
    input.type = 'text';
    input.placeholder = 'Search movies, shows, people...';
    input.autocomplete = 'off';

    input.oninput = (e) => {
        const query = e.target.value;
        if (_searchDebounce) clearTimeout(_searchDebounce);
        _searchDebounce = setTimeout(() => performSearch(query), 300);
    };

    // ESC Hint + Close Area
    const closeContainer = document.createElement('div');
    closeContainer.className = 'legit-search-actions';
    closeContainer.onclick = closeSearchModal; // Click area closes too

    const escBadge = document.createElement('span');
    escBadge.className = 'legit-search-esc';
    escBadge.textContent = 'esc';

    const closeText = document.createElement('span');
    closeText.className = 'legit-search-close-text';
    closeText.textContent = 'Close';

    closeContainer.appendChild(escBadge);
    closeContainer.appendChild(closeText);

    header.appendChild(icon);
    header.appendChild(input);
    header.appendChild(closeContainer);

    // Quick Access Categories
    const categories = document.createElement('div');
    categories.className = 'legit-search-categories';
    categories.id = 'legit-search-categories';

    // Results container
    const results = document.createElement('div');
    results.className = 'legit-search-results';
    results.id = 'legit-search-results';
    results.innerHTML = '<div class="legit-no-results">Type to search...</div>';

    modal.appendChild(header);
    modal.appendChild(categories);
    modal.appendChild(results);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    return { overlay, input, results };
}

function openSearchModal() {
    let elements = createSearchModal();
    if (!elements) {
        // Already exists
        const overlay = document.querySelector('.legit-search-overlay');
        const input = document.querySelector('.legit-search-input');
        const results = document.querySelector('#legit-search-results');
        elements = { overlay, input, results };
    }

    // Force reflow
    elements.overlay.offsetHeight;
    elements.overlay.classList.add('visible');

    setTimeout(() => {
        elements.input.focus();
    }, 50);

    // Add ESC listener
    document.addEventListener('keydown', handleSearchEsc);

    // Load categories
    populateSearchCategories();
}

async function populateSearchCategories() {
    const container = document.getElementById('legit-search-categories');
    // Allow refreshing if empty, but don't duplicate
    if (!container || container.childElementCount > 0) return;

    try {
        if (!window.ApiClient) return;
        const userId = window.ApiClient.getCurrentUserId();
        const views = await window.ApiClient.getUserViews({}, userId);

        if (views && views.Items) {
            views.Items.forEach(view => {
                const pill = document.createElement('button');
                pill.className = 'legit-search-category-pill';
                pill.textContent = view.Name;
                pill.onclick = () => {
                    const serverId = view.ServerId || window.ApiClient.serverId();
                    window.location.hash = `#!/list?parentId=${view.Id}&serverId=${serverId}`;
                    closeSearchModal();
                };
                container.appendChild(pill);
            });
        }
    } catch (e) {
        console.error('Error loading search categories', e);
    }
}

function closeSearchModal() {
    const overlay = document.querySelector('.legit-search-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }
    document.removeEventListener('keydown', handleSearchEsc);
}

function handleSearchEsc(e) {
    if (e.key === 'Escape') closeSearchModal();
}

async function performSearch(query) {
    const resultsContainer = document.querySelector('#legit-search-results');
    if (!resultsContainer) return;

    if (!query || query.length < 2) {
        resultsContainer.innerHTML = '<div class="legit-no-results">Type to search...</div>';
        return;
    }

    if (!window.ApiClient) {
        resultsContainer.innerHTML = '<div class="legit-no-results">Error: API not ready</div>';
        return;
    }

    try {
        const userId = window.ApiClient.getCurrentUserId();
        // Use Search/Hints for quick results or Items for full
        const result = await window.ApiClient.getSearchHints({
            userId: userId,
            searchTerm: query,
            limit: 20,
            includeItemTypes: "Movie,Series,BoxSet,MusicAlbum,MusicArtist,Person",
            mediaTypes: "Video,Audio"
        });

        renderSearchResults(result.SearchHints || []);

    } catch (e) {
        console.error('Search failed:', e);
        resultsContainer.innerHTML = '<div class="legit-no-results">Search failed.</div>';
    }
}

function renderSearchResults(items) {
    const container = document.querySelector('#legit-search-results');
    if (!container) return;

    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="legit-no-results">No results found</div>';
        return;
    }

    items.forEach(item => {
        const el = document.createElement('a');
        el.className = 'legit-search-result-item';
        // Go to item
        // Go to item
        if (item.ItemId) {
            // Match Plugin: Use /#!/details route via helper
            el.onclick = (e) => {
                e.preventDefault();
                closeSearchModal();
                window.legitFlixShowItem(item.ItemId);
            };
        }

        // Image
        const thumb = document.createElement('div');
        if (item.PrimaryImageAspectRatio) {
            const imgUrl = window.ApiClient.getUrl(`/Items/${item.ItemId}/Images/Primary?maxHeight=60&maxWidth=40&quality=90`);
            thumb.className = 'legit-result-thumb';
            thumb.style.backgroundImage = `url('${imgUrl}')`;
        } else {
            thumb.className = 'legit-result-icon';
            thumb.innerHTML = '<span class="material-icons">movie</span>';
        }

        // Info
        const info = document.createElement('div');
        info.className = 'legit-result-info';

        const title = document.createElement('div');
        title.className = 'legit-result-title';
        title.textContent = item.Name;

        const meta = document.createElement('div');
        meta.className = 'legit-result-meta';

        // Type Tag
        const typeEl = document.createElement('span');
        typeEl.className = 'legit-result-tag';
        typeEl.textContent = item.Type;
        meta.appendChild(typeEl);

        // Year
        if (item.ProductionYear) {
            const yearEl = document.createElement('span');
            yearEl.textContent = item.ProductionYear;
            meta.appendChild(yearEl);
        }

        info.appendChild(title);
        info.appendChild(meta);

        el.appendChild(thumb);
        el.appendChild(info);
        container.appendChild(el);
    });
}

// Navigation: Hamburger + Logo + Dynamic Links (Left) + Drawer Menu (Right)
async function injectCustomNav() {
    // === LEFT SIDE: Hamburger + Logo + Dynamic Nav Links ===
    const headerLeft = document.querySelector('.headerLeft');
    if (headerLeft && !headerLeft.querySelector('.legit-nav-container')) {
        // Clear existing content
        headerLeft.innerHTML = '';

        // Create container for our nav
        const navContainer = document.createElement('div');
        navContainer.className = 'legit-nav-container';

        // 1. Hamburger menu button (far left)
        const hamburger = document.createElement('button');
        hamburger.className = 'legit-hamburger-menu paper-icon-button-light';
        hamburger.innerHTML = '<span class="material-icons">menu</span>';
        hamburger.setAttribute('title', 'Menu');
        hamburger.onclick = () => {
            document.querySelector('.mainDrawer')?.classList.toggle('is-visible');
        };
        navContainer.appendChild(hamburger);

        // 2. LEGITFLIX logo
        const logo = document.createElement('a');
        logo.className = 'legit-nav-logo';
        logo.href = '#/home';
        logo.innerHTML = '<img src="https://i.imgur.com/9tbXBxu.png" alt="LEGITFLIX" class="logo-img">';
        navContainer.appendChild(logo);

        // 3. Dynamic nav links from API
        const navLinks = document.createElement('div');
        navLinks.className = 'legit-nav-links';

        try {
            if (window.ApiClient) {
                const userId = window.ApiClient.getCurrentUserId();
                const views = await window.ApiClient.getUserViews({}, userId);

                // Create link for each library
                if (views && views.Items) {
                    views.Items.forEach(view => {
                        const link = document.createElement('a');
                        link.className = 'nav-link';

                        const serverId = view.ServerId || window.ApiClient.serverId();
                        // User requested #/list format
                        link.href = `#!/list?parentId=${view.Id}&serverId=${serverId}`;

                        // Map collection types to icons
                        const iconMap = {
                            'movies': 'movie',
                            'tvshows': 'tv',
                            'music': 'library_music',
                            'books': 'book',
                            'photos': 'photo_library',
                            'livetv': 'live_tv',
                            'homevideos': 'video_library',
                            'musicvideos': 'music_video',
                            'mixed': 'video_library'
                        };

                        const iconName = iconMap[view.CollectionType?.toLowerCase()] || 'video_library';

                        link.innerHTML = `
                            <span class="material-icons">${iconName}</span>
                            <span>${view.Name}</span>
                        `;

                        navLinks.appendChild(link);
                    });
                }
            }
        } catch (e) {
            console.error('[LegitFlix] Failed to load nav links:', e);
        }

        navContainer.appendChild(navLinks);
        headerLeft.appendChild(navContainer);
    }

    // === RIGHT SIDE: Drawer Menu ===
    const headerRight = document.querySelector('.headerRight');
    if (!headerRight) return;

    // Check if already modified
    if (headerRight.querySelector('.legit-nav-drawer')) return;

    // Find all buttons except the user profile button
    const buttons = Array.from(headerRight.querySelectorAll('button'));
    const profileButton = buttons.find(btn => btn.classList.contains('headerUserButton'));

    // Get the 4 icon buttons (everything except profile)
    const iconButtons = buttons.filter(btn => btn !== profileButton);

    if (iconButtons.length === 0) return;

    // Create drawer toggle button (hamburger menu)
    const drawerToggle = document.createElement('button');
    drawerToggle.className = 'legit-nav-drawer-toggle paper-icon-button-light';
    drawerToggle.innerHTML = '<span class="material-icons">more_vert</span>';
    drawerToggle.setAttribute('title', 'More');

    // Create drawer container
    const drawer = document.createElement('div');
    drawer.className = 'legit-nav-drawer';

    // Sort buttons: Search, Cast, SyncPlay, Player, Others
    const getOrder = (btn) => {
        const txt = (btn.getAttribute('title') || btn.getAttribute('aria-label') || btn.className || '').toLowerCase();
        if (txt.includes('search')) return 1;
        if (txt.includes('cast') || txt.includes('play on')) return 2;
        if (txt.includes('syncplay') || txt.includes('group')) return 3;
        if (txt.includes('player') || txt.includes('remote') || txt.includes('queue')) return 4;
        return 10;
    };

    iconButtons.sort((a, b) => getOrder(a) - getOrder(b));

    // Move icon buttons into drawer and add text labels
    iconButtons.forEach(btn => {
        // Get button title or aria-label for text
        const label = btn.getAttribute('title') || btn.getAttribute('aria-label') || 'Menu';

        // Add text label if not already present
        if (!btn.querySelector('.drawer-btn-text')) {
            const textSpan = document.createElement('span');
            textSpan.className = 'drawer-btn-text';
            textSpan.textContent = label;
            btn.appendChild(textSpan);
        }

        // INTERCEPT SEARCH: Check if this is the search button
        const isSearch = btn.classList.contains('headerSearchButton') ||
            btn.querySelector('.search') ||
            (btn.getAttribute('data-id') === 'search') ||
            (label && label.toLowerCase().includes('search'));

        if (isSearch) {
            // CLONE BUTTON to strip existing Jellyfin event listeners (fixes double navigation)
            const clone = btn.cloneNode(true);
            clone.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openSearchModal();
                // Close drawer if open
                document.querySelector('.legit-nav-drawer')?.classList.remove('open');
            };
            drawer.appendChild(clone);

            // Remove original button since we cloned it
            if (btn.parentNode) btn.parentNode.removeChild(btn);
        } else {
            drawer.appendChild(btn);
        }
    });

    // Inject Dashboard Link for Admins
    if (window.ApiClient) {
        try {
            const user = await window.ApiClient.getCurrentUser();
            if (user && user.Policy && user.Policy.IsAdministrator) {
                const dashBtn = document.createElement('button');
                dashBtn.className = 'paper-icon-button-light headerButton';
                dashBtn.setAttribute('title', 'Dashboard');

                dashBtn.onclick = () => {
                    window.location.hash = '#/dashboard';
                    document.querySelector('.legit-nav-drawer')?.classList.remove('open');
                };

                dashBtn.innerHTML = `
                    <span class="material-icons">dashboard</span>
                    <span class="drawer-btn-text">Dashboard</span>
                `;

                drawer.appendChild(dashBtn);
            }
        } catch (e) {
            console.error('[LegitFlix] Admin check failed:', e);
        }
    }

    // Insert drawer toggle before profile button
    if (profileButton) {
        profileButton.parentNode.insertBefore(drawerToggle, profileButton);
    } else {
        headerRight.appendChild(drawerToggle);
    }

    // Add drawer to header
    headerRight.appendChild(drawer);

    // Toggle functionality
    drawerToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.classList.toggle('open');
    });

    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (!drawer.contains(e.target) && e.target !== drawerToggle) {
            drawer.classList.remove('open');
        }
    });
}

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

    // 2. Try Inject Hero (Home Page Only) - exclude settings pages
    const hashLower = window.location.hash.toLowerCase();
    const isHome = (hashLower === '' || hashLower === '#/' || hashLower.includes('/home') || hashLower.includes('startup'))
        && !hashLower.includes('preferences');
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
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('preferences') || hash.includes('quickconnect')) {
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

                // Insert BEFORE Admin Tabs (Dashboard/Metadata) if present, else Logout
                // User Request: Advanced - Admin tabs - Sign out
                const dashboardTab = navTabs.querySelector('a[href*="dashboard"]');
                const metadataTab = navTabs.querySelector('a[href*="metadata"]');
                const logoutTab = navTabs.querySelector('.logout-tab');

                // Target the first one found
                const targetTab = dashboardTab || metadataTab || logoutTab;

                if (targetTab) {
                    navTabs.insertBefore(tab, targetTab);
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
    // Only on "My Details" page (mypreferencesmenu), not other settings pages
    const hash = window.location.hash.toLowerCase();
    if (!hash.includes('mypreferencesmenu')) return;

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
                                'Authorization': `MediaBrowser Client="Jellyfin Web", Device="${(typeof window.ApiClient.deviceName === 'function' ? window.ApiClient.deviceName() : 'Web Client')}", DeviceId="${(typeof window.ApiClient.deviceId === 'function' ? window.ApiClient.deviceId() : 'UnknownId')}", Version="${(typeof window.ApiClient.applicationVersion === 'function' ? window.ApiClient.applicationVersion() : '10.11.5')}", Token="${window.ApiClient.accessToken()}"`,
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
    console.log('LegitFlix: V5.6 Robust Init');

    // Start Polling Loop (Runs every 1s)
    setInterval(pollForUI, 1000);

    // Watch for Route Changes to reset flags
    window.addEventListener('hashchange', () => {
        logger.log('Route Changed');
        _injectedHero = false;
        _injectedJelly = false;

        // Remove profile header to force re-injection on new page
        const oldHeader = document.querySelector('.gaming-profile-header');
        if (oldHeader) {
            console.log('[LegitFlix] hashchange: Removing old header, new hash:', window.location.hash);
            oldHeader.remove();
        } else {
            console.log('[LegitFlix] hashchange: No header to remove, new hash:', window.location.hash);
        }

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

    // --- RENAME SECTIONS (My List->Categories, Next Up->History, Recently Added->Latest) ---
    function renameMyList() {
        document.querySelectorAll('.sectionTitle, .sectionTitle-cards').forEach(el => {
            let text = el.innerText.trim();
            const lowerText = text.toLowerCase();
            let newText = null;

            // 1. My List / My Media -> Categories
            if (lowerText === 'my list' || lowerText === 'my media' || lowerText === 'mes médias') {
                newText = 'Categories';
            }
            // 2. Next Up -> History
            else if (lowerText === 'next up' || lowerText === 'continuar viendo') {
                newText = 'History';
            }
            // 3. Recently Added in [Type] -> Latest [Type]
            else if (lowerText.startsWith('recently added in ')) {
                // "Recently Added in " is 18 chars
                const type = text.substring(18);
                newText = `Latest ${type}`;
            }

            if (newText) {
                el.innerText = newText;
                // Also update the link if it exists for tooltip/accessibility
                const parent = el.closest('.sectionHeader, .sectionTitleContainer');
                if (parent) {
                    const link = parent.querySelector('a');
                    if (link) link.setAttribute('title', newText);
                }
            }
        });
    }
    // Run initially and on mutation
    renameMyList();

    // --- FIX MIXED CONTENT CARDS (Convert Thumb->Primary & Backdrop->Portrait) ---
    function fixMixedCards() {
        // Find Backdrops that should be Posters (Movies/Series)
        const selector = '.overflowBackdropCard[data-type="Movie"], .overflowBackdropCard[data-type="Series"]';
        const cards = document.querySelectorAll(selector);

        cards.forEach(card => {
            // 1. Swap Card Class (Backdrop -> Portrait)
            // This fixes dimensions and grid layout
            card.classList.remove('overflowBackdropCard');
            card.classList.add('overflowPortraitCard');

            // 2. Swap Padder Class
            const padder = card.querySelector('.cardPadder-overflowBackdrop');
            if (padder) {
                padder.classList.remove('cardPadder-overflowBackdrop');
                padder.classList.add('cardPadder-overflowPortrait');
            }

            // 3. Swap Image URL (Thumb -> Primary)
            // This gets the correct Poster image from server
            const imgContainer = card.querySelector('.cardImageContainer');
            if (imgContainer) {
                const style = imgContainer.getAttribute('style') || '';
                // Improved Lazy-Loader Fighting Logic
                const swapImage = () => {
                    const s = imgContainer.getAttribute('style') || '';
                    if (s.includes('Images/Thumb')) {
                        // Replace Thumb with Primary
                        const ns = s.replace(/Images\/Thumb/g, 'Images/Primary');
                        if (s !== ns) imgContainer.setAttribute('style', ns);
                    }
                };

                // Run immediately
                swapImage();

                // Observe for lazy loader changes
                if (!imgContainer._observerAttached) {
                    new MutationObserver(swapImage).observe(imgContainer, { attributes: true, attributeFilter: ['style'] });
                    imgContainer._observerAttached = true;
                }
            }
        });
    }

    // Run initially and on mutation
    renameMyList();
    fixMixedCards();
    // --- INJECT DYNAMIC PROMO BANNER (Crunchyroll Style) ---
    let _promoInjectionInProgress = false; // Guard for race conditions
    let _injectedBanner = false; // Track if banner already injected

    async function injectPromoBanner() {
        if (_promoInjectionInProgress || _injectedBanner) return;

        // Strict Home Page Check (Relaxed for root)
        const hash = window.location.hash.toLowerCase();
        // Allow 'home', 'index', or empty/root '#!/'
        if (!hash.includes('home') && !hash.endsWith('/web/index.html') && hash !== '#!/' && hash !== '' && hash !== '#/') {
            return;
        }

        const homeSections = document.querySelector('.homeSectionsContainer');
        if (!homeSections && !document.querySelector('.verticalSection')) return;

        _promoInjectionInProgress = true;

        try {
            // 2. Find Injection Point: After "History" section
            // Strategy A: Find by Title
            const titles = Array.from(document.querySelectorAll('.sectionTitle, .sectionTitle-cards'));
            let historyTitle = titles.find(t => {
                const txt = t.innerText.toLowerCase();
                return txt.includes('history') || txt.includes('next up') || txt.includes('continuar');
            });

            let historySection = null;
            if (historyTitle) {
                historySection = historyTitle.closest('.verticalSection');
            }

            // Strategy B: Fallback to known class
            if (!historySection) {
                historySection = document.querySelector('.verticalSection.section5');
            }

            if (!historySection) {
                _promoInjectionInProgress = false; // Reset so we can try again later
                return;
            }


            // 3. Fetch Data
            const auth = await getAuth();
            if (!auth) {
                _promoInjectionInProgress = false;
                return;
            }
            const headers = { 'X-Emby-Token': auth.AccessToken, 'Accept': 'application/json' };

            // A. Get Resume/History Items to Exclude
            // Resume
            const resumeRes = await fetch(`/Users/${auth.UserId}/Items?Limit=20&Recursive=true&Filters=IsResumable&SortBy=DatePlayed&SortOrder=Descending`, { headers });
            const resumeJson = await resumeRes.json();

            // Next Up
            const nextUpRes = await fetch(`/Shows/NextUp?Limit=20&UserId=${auth.UserId}`, { headers });
            const nextUpJson = await nextUpRes.json();

            // B. Get Candidates (Latest Movies/Series)
            // Limit to 3 strictly. Sort by DateCreated Descending.
            const candidatesRes = await fetch(`/Users/${auth.UserId}/Items?Limit=3&Recursive=true&IncludeItemTypes=Movie,Series&SortBy=DateCreated&SortOrder=Descending&ImageTypeLimit=1&EnableImageTypes=Primary,Backdrop,Thumb,Logo&Fields=Overview,ProductionYear,ImageTags`, { headers });
            const candidatesJson = await candidatesRes.json();

            // C. Select Top 3 (or less)
            const selected = candidatesJson.Items || [];

            if (selected.length === 0) {
                _promoInjectionInProgress = false;
                return;
            }

            // 4. Build HTML
            const item1 = selected[0]; // Hero
            const item2 = selected[1]; // Sub 1 (Optional)
            const item3 = selected[2]; // Sub 2 (Optional)

            console.log('[LegitFlix] Promo Banner Items:', item1.Name, item2?.Name, item3?.Name);

            // Helpers for images
            const getBackdrop = (item) => `/Items/${item.Id}/Images/Backdrop/0?maxWidth=2000`;
            // Revert to Thumb for sub-items
            const getThumb = (item) => `/Items/${item.Id}/Images/Thumb/0?maxWidth=800` || `/Items/${item.Id}/Images/Backdrop/0?maxWidth=800`;
            const getLogo = (item) => `/Items/${item.Id}/Images/Logo/0?maxWidth=400`;

            const getLink = (item) => `#/details?id=${item.Id}&serverId=${auth.ServerId}`;

            const html = `
            <div class="legitflix-promo-container">
                <!-- Top Banner (Item 1) -->
                <div class="promo-item promo-item-large" onclick="location.href='${getLink(item1)}'" style="cursor: pointer;">
                    <img src="${getBackdrop(item1)}" class="promo-bg">
                    <div class="promo-content">
                         ${item1.ImageTags && item1.ImageTags.Logo ? `<img src="${getLogo(item1)}" class="promo-logo" style="display:block;">` : `<h2 class="promo-title">${item1.Name}</h2>`}
                         <button class="btn-watch">WATCH NOW</button>
                    </div>
                </div>
                
                <!-- Bottom Grid (Items 2 & 3) -->
                ${(item2 || item3) ? `
                <div class="promo-grid-row">
                    ${item2 ? `
                    <div class="promo-item promo-item-small" onclick="location.href='${getLink(item2)}'" style="cursor: pointer;">
                         <div class="promo-split">
                             <div class="promo-text">
                                 <h3>${item2.Name}</h3>
                                 <p>${item2.ProductionYear || ''}</p>
                                 <p class="desc">${item2.Overview || ''}</p>
                                 <button class="btn-orange">START WATCHING</button>
                             </div>
                             <img src="${getThumb(item2)}" class="promo-poster" onerror="this.src='${getBackdrop(item2)}'">
                         </div>
                    </div>` : ''}
                    ${item3 ? `
                    <div class="promo-item promo-item-small" onclick="location.href='${getLink(item3)}'" style="cursor: pointer;">
                         <div class="promo-split">
                             <div class="promo-text">
                                 <h3>${item3.Name}</h3>
                                 <p>${item3.ProductionYear || ''}</p>
                                 <p class="desc">${item3.Overview || ''}</p>
                                 <button class="btn-orange">START WATCHING</button>
                             </div>
                             <img src="${getThumb(item3)}" class="promo-poster" onerror="this.src='${getBackdrop(item3)}'">
                         </div>
                    </div>` : ''}
                </div>` : ''}
            </div>
            `;

            // 5. Inject
            historySection.insertAdjacentHTML('afterend', html);
            console.log('[LegitFlix] Promo Banner Injected Successfully');
            // Done!
            _injectedBanner = true; // Mark as injected
            _promoInjectionInProgress = false; // Reset after successful injection

        } catch (e) {
            console.error('[LegitFlix] Error building promo banner:', e);
            _promoInjectionInProgress = false; // Reset on error
        }
    }

    // --- HOVER CARD LOGIC (Body Append + Native Button Move) ---
    // Cache for item details to avoid repeated API calls
    const _cardCache = new Map();
    let _hoverTimer = null;
    let _activeOverlay = null;
    let _borrowedButton = null; // Track moved button
    let _originalParent = null;

    function setupHoverCards() {
        console.log('[LegitFlix] setupHoverCards: Initialized');
        // Delegate mouseover to body but filter for cards
        document.body.addEventListener('mouseover', (e) => {
            // Disable on edit/admin pages
            if (window.location.href.includes('edititem') || window.location.href.includes('metadata')) return;

            // Disable on Details Pages (Native Hover Mode)
            if (document.body.classList.contains('native-hover-mode')) return;

            const card = e.target.closest('.card, .overflowPortraitCard, .overflowBackdropCard');
            // Only target cards with an ID and strictly media items (not folders/collections if possible, but mostly items)
            if (!card || !card.dataset.id) return;

            // DEBUG: Log card detection
            console.log('[LegitFlix] Hover: Card detected', card.dataset.id, card.dataset.type);

            // --- FILTERING LOGIC ---
            // 1. Exclude "Categories" (Folders)
            if (card.dataset.type === 'CollectionFolder' || card.dataset.type === 'UserView') {
                console.log('[LegitFlix] Hover: Excluded (folder)');
                return;
            }

            // 2. Exclude "Continue Watching", "History" (Next Up), "My Media"
            const section = card.closest('.verticalSection');
            if (section) {
                const titleEl = section.querySelector('.sectionTitle');
                if (titleEl) {
                    const t = titleEl.innerText.toLowerCase();
                    if (t.includes('continue') || t.includes('resume') || t.includes('history') || t.includes('next up') || t.includes('categories')) {
                        console.log('[LegitFlix] Hover: Excluded (section:', t, ')');
                        return;
                    }
                }
            }

            if (card.classList.contains('card-flat') || card.classList.contains('chapterCard') || card.closest('.visualCardBox')) {
                console.log('[LegitFlix] Hover: Excluded (card type)');
                return;
            }

            // EXCLUSION: Image Editor & Dialogs
            if (card.classList.contains('imageEditorCard') || card.closest('.dialog') || card.closest('.formDialog')) {
                console.log('[LegitFlix] Hover: Excluded (dialog)');
                return;
            }

            // Avoid re-triggering if already showing or bad target
            if (_activeOverlay && _activeOverlay.dataset.sourceId === card.dataset.id) return;

            // Clear any pending timer
            if (_hoverTimer) clearTimeout(_hoverTimer);

            console.log('[LegitFlix] Hover: Will create card for', card.dataset.id);
            // Set delay (Instant - 50ms to prevent accidental flickers)
            _hoverTimer = setTimeout(() => {
                createHoverCard(card, card.dataset.id);
            }, 50);
        });

        document.body.addEventListener('mouseout', (e) => {
            // Check if we left the card AND the overlay
            // This is tricky with body append. we need a check.
            // Simplified: If we hover mainly on the overlay, we keep it.
            // If we leave overlay and card, we close.
            const toElement = e.relatedTarget;
            if (_activeOverlay && !toElement?.closest('.legitflix-hover-overlay') && !toElement?.closest('.card')) {
                closeHoverCard();
            }
        });

        // Also listen on overlay leave
        document.body.addEventListener('mouseout', (e) => {
            if (e.target.closest('.legitflix-hover-overlay')) {
                const toElement = e.relatedTarget;
                // If moving back to origin card, technically ok, but usually we cover it.
                if (!_activeOverlay) return;
                // If left overlay and not going to origin card
                const originId = _activeOverlay.dataset.sourceId;
                const originCard = document.querySelector(`.card[data-id="${originId}"]`);

                if (!toElement?.closest('.legitflix-hover-overlay') && toElement !== originCard && !originCard?.contains(toElement)) {
                    closeHoverCard();
                }
            }
        });
    }

    function closeHoverCard() {
        if (_hoverTimer) clearTimeout(_hoverTimer);

        if (_activeOverlay) {
            const overlay = _activeOverlay;
            _activeOverlay = null;

            // 1. Restore Native Button
            if (_borrowedButton && _originalParent) {
                // Restore style
                _borrowedButton.style.position = '';
                _borrowedButton.style.bottom = '';
                _borrowedButton.style.left = '';
                _borrowedButton.style.margin = ''; // Reset margin too
                _originalParent.appendChild(_borrowedButton);
                _borrowedButton = null;
                _originalParent = null;
            }

            overlay.classList.remove('is-loaded');
            setTimeout(() => overlay.remove(), 50); // Faster removal
        }
    }

    async function createHoverCard(card, id) {
        // PRE-FETCH CHECK: If no longer hovering, abort immediately
        if (!card.matches(':hover')) return;

        closeHoverCard(); // Close existing

        let details = _cardCache.get(id);
        if (!details) {
            try {
                const auth = await getAuth();
                if (!auth) return;
                const headers = { 'X-Emby-Token': auth.AccessToken || auth.token, 'Accept': 'application/json' };
                // Use auth.user or auth.UserId if getAuth returns differently depending on version
                const userId = auth.UserId || auth.user;
                const res = await fetch(`${auth.server || ''}/Users/${userId}/Items/${id}`, { headers });
                details = await res.json();
                _cardCache.set(id, details);
            } catch (e) { return; }
        }

        // POST-FETCH CHECK: Critical check to prevent "stuck" card if mouse left during await
        if (!card.matches(':hover')) return;

        if (!details) return;

        // Position Logic
        // Use .cardBox for visual alignment (ignores outer padding/margins of .card)
        const visualTarget = card.querySelector('.cardBox') || card;
        const rect = visualTarget.getBoundingClientRect();

        // Scale Factor (Reduced from 1.15 to 1.05 as requested "larger than needed")
        const scale = 1.05;
        const width = rect.width * scale;
        // const height = rect.height * scale; // Let height be auto/content based

        // Create Overlay
        const overlay = document.createElement('div');
        overlay.className = 'legitflix-hover-overlay'; // Base class
        overlay.dataset.sourceId = id; // Track source

        // Calculate Centered Position relative to Viewport + Scroll
        // Center logic:
        // Left = RectLeft + (RectWidth - NewWidth)/2
        // But we want it centered on the VISUAL card.
        const leftPos = rect.left + window.scrollX - ((width - rect.width) / 2);
        // Top: A bit higher to allow expanding down? Or center vertically?
        // Let's Center Vertically on the original image for now, but allow content to expand down.
        // Actually, usually hover cards expand OUTWARDS from center.
        // We will set Top/Left and Width. Height is auto.

        // FIX: Ensure it doesn't go off-screen right/left
        // (Simple clamp if needed, but centering usually ok)

        overlay.style.width = width + 'px';
        overlay.style.left = leftPos + 'px';

        // Vertical: Start centered on the card's visual top?
        // If we want it to cover the card, we match top minus offset.
        // rect.top + scrollY - (newHeight - oldHeight)/2 is hard since height is auto.
        // Let's anchor it slightly above the current top to account for scale.
        // If scale 1.05, we shift up by 2.5% of height.
        const topOffset = (rect.height * (scale - 1)) / 2;
        overlay.style.top = (rect.top + window.scrollY - topOffset) + 'px';
        const rating = details.CommunityRating ? `${details.CommunityRating.toFixed(1)} <span class="material-icons star-icon">star</span>` : '';
        const year = details.ProductionYear || '';
        const seasonCount = details.ChildCount ? `${details.ChildCount} Seasons` : '';
        // Unplayed count for series
        const unplayed = details.UserData && details.UserData.UnplayedItemCount ? `${details.UserData.UnplayedItemCount} Unplayed` : '';
        const duration = details.RunTimeTicks ? Math.round(details.RunTimeTicks / 600000000) + 'm' : '';
        const desc = details.Overview || '';

        // State
        let isPlayed = details.UserData?.Played || false;
        let isFav = details.UserData?.IsFavorite || false;

        const iconPlayed = isPlayed ? 'check_circle' : 'check';
        const classPlayed = isPlayed ? 'active' : '';

        const iconFav = isFav ? 'favorite' : 'favorite_border';
        const classFav = isFav ? 'active' : '';

        // Layout: Title -> Rating -> Season -> Unplayed -> Plot -> (Flex Body) -> Footer (Bottom)
        overlay.innerHTML = `
            <div class="hover-body">
                <h3 class="hover-title">${details.Name}</h3>
                
                <div class="hover-row hover-rating">${rating}</div>
                
                ${seasonCount ? `<div class="hover-row hover-seasons">${seasonCount}</div>` : ''}
                
                ${unplayed ? `<div class="hover-row hover-unplayed">${unplayed}</div>` : (duration ? `<div class="hover-row">${duration}</div>` : '')}
                
                <p class="hover-desc">${desc}</p>
            </div>
            
            <div class="hover-footer">
                 <div class="hover-native-btn-slot"></div>
                 <div class="hover-icon-row">
                    <button class="hover-icon-btn action-check ${classPlayed}" title="${isPlayed ? 'Mark Unplayed' : 'Mark Played'}">
                        <span class="material-icons">${iconPlayed}</span>
                    </button>
                    <button class="hover-icon-btn action-fav ${classFav}" title="${isFav ? 'Unfavorite' : 'Favorite'}">
                        <span class="material-icons">${iconFav}</span>
                    </button>
                    <button class="hover-icon-btn action-info" title="Information"><span class="material-icons">info</span></button>
                    <button class="hover-icon-btn action-more" title="More"><span class="material-icons">more_vert</span></button>
                </div>
            </div>
        `;

        // --- Click Handling ---

        // API Helpers
        const toggleState = async (type, currentState, btn) => {
            const auth = await getAuth();
            if (!auth) return;

            const userId = auth.UserId || auth.user;
            const token = auth.AccessToken || auth.token;
            const server = auth.server || ''; // Relative path usually works if empty, but safer

            if (!userId || !token) return;

            const newState = !currentState;
            const iconSpan = btn.querySelector('.material-icons');

            // Optimistic UI Update & Cache Sync
            if (type === 'fav') {
                isFav = newState; // Update closure var
                if (details.UserData) details.UserData.IsFavorite = isFav; // Update Cache

                btn.classList.toggle('active', isFav);
                iconSpan.textContent = isFav ? 'favorite' : 'favorite_border';
                btn.title = isFav ? 'Unfavorite' : 'Favorite';

                const method = isFav ? 'POST' : 'DELETE';
                fetch(`${server}/Users/${userId}/FavoriteItems/${id}?api_key=${token}`, { method });

            } else if (type === 'played') {
                isPlayed = newState; // Update closure var
                if (details.UserData) details.UserData.Played = isPlayed; // Update Cache

                btn.classList.toggle('active', isPlayed);
                iconSpan.textContent = isPlayed ? 'check_circle' : 'check';
                btn.title = isPlayed ? 'Mark Unplayed' : 'Mark Played';

                const method = isPlayed ? 'POST' : 'DELETE';
                fetch(`${server}/Users/${userId}/PlayedItems/${id}?api_key=${token}`, { method });
            }
        };

        // 1. Click Overlay -> Navigate (simulating left click on card)
        overlay.addEventListener('click', (e) => {
            // Prevent if clicking buttons/interactive elements
            if (e.target.closest('button') || e.target.closest('.hover-native-btn-slot')) return;
            window.legitFlixShowItem(id);
        });

        // 2. Button Logic
        const btnCheck = overlay.querySelector('.action-check');
        const btnFav = overlay.querySelector('.action-fav');
        const btnInfo = overlay.querySelector('.action-info');

        if (btnCheck) {
            btnCheck.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                toggleState('played', isPlayed, btnCheck);
            });
        }
        if (btnFav) {
            btnFav.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                toggleState('fav', isFav, btnFav);
            });
        }

        if (btnInfo) {
            btnInfo.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
        }

        // 3. Hijack Native Menu Button (The "More" action)
        // 3. Hijack Native Menu Button (The "More" action)
        const customMoreBtn = overlay.querySelector('.action-more');
        // Strict Selector: Look for data-action="menu" OR iterate button contents
        let nativeMenu = card.querySelector('.cardOverlayButton[data-action="menu"]');

        if (!nativeMenu) {
            // Fallback: Find button with more_vert icon if data-action absent
            const buttons = card.querySelectorAll('.cardOverlayButton');
            for (const btn of buttons) {
                if (btn.innerHTML.includes('more_vert') || btn.innerHTML.includes('dots-vertical')) {
                    nativeMenu = btn;
                    break;
                }
            }
        }

        if (nativeMenu && customMoreBtn) {
            // Confirm it is NOT a play button
            if (!nativeMenu.classList.contains('cardOverlayFab') && !nativeMenu.getAttribute('data-action')?.includes('play')) {
                // PROXY CLICK: Don't move the button (it breaks events). Click it remotely.
                customMoreBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    nativeMenu.click();
                });
            }
        }

        // Info -> Do Nothing (as requested "YET")

        // Info -> Do Nothing (as requested "YET")
        // Check/Fav -> Can implement later or leave as no-op for now.
        // For now they just stop propagation so they don't trigger nav.

        if (document.body.contains(card)) {
            card.appendChild(overlay);
            _activeOverlay = overlay;

            // Move Native Play Button
            const nativeFab = card.querySelector('.cardOverlayFab-primary');
            // If we are attaching to card, nativeFab is inside card.
            // But we want to move it INSIDE the overlay (child of card).
            if (nativeFab) {
                _borrowedButton = nativeFab;
                _originalParent = nativeFab.parentNode;

                const slot = overlay.querySelector('.hover-native-btn-slot');
                slot.appendChild(nativeFab);
            }

            requestAnimationFrame(() => {
                overlay.classList.add('is-loaded');
            });
        }
    }

    // Call setup
    setupHoverCards();

    // Helper to tag sections where we want native hover
    function tagNativeSections() {
        const sections = document.querySelectorAll('.verticalSection');
        sections.forEach(s => {
            const titleEl = s.querySelector('.sectionTitle');
            if (titleEl) {
                const t = titleEl.innerText.toLowerCase();
                if (t.includes('continue') || t.includes('resume') || t.includes('history') || t.includes('next up') || t.includes('categories')) {
                    s.classList.add('native-hover-section');
                }
            }
        });
    }

    // Helper to detect Page Type (Details vs Home)
    function checkPageMode() {
        const hash = window.location.hash.toLowerCase();
        // If on details page, enable native hover mode globally
        if (hash.includes('details')) {
            document.body.classList.add('native-hover-mode');
        } else {
            document.body.classList.remove('native-hover-mode');
        }
    }

    const observer = new MutationObserver((mutations) => {
        checkPageMode(); // Check URL on every mutation (navigation often doesn't trigger reload)
        if (!document.querySelector('.legit-nav-links')) _injectedNav = false;
        renameMyList();
        fixMixedCards();
        injectPromoBanner();
        tagNativeSections();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Dynamic Header Blur Logic
    function initNavScroll() {
        console.log('[LegitFlix] initNavScroll: Starting...');
        let header = document.querySelector('.skinHeader');
        console.log('[LegitFlix] initNavScroll: Header found?', !!header);

        // If header not found yet, wait for it
        if (!header) {
            console.log('[LegitFlix] initNavScroll: Header not ready, will retry...');
            setTimeout(initNavScroll, 500); // Retry after 500ms
            return;
        }

        const onScroll = () => {
            // Try multiple scroll sources (Jellyfin uses different containers)
            let scrollTop = 0;

            // Check common scroll containers in Jellyfin
            const scrollContainer = document.querySelector('.mainAnimatedPages')
                || document.querySelector('.page.type-interior')
                || document.querySelector('[data-role="page"].active')
                || document.scrollingElement
                || document.body;

            if (scrollContainer) {
                scrollTop = scrollContainer.scrollTop;
            }

            // Also check window scroll as fallback
            if (scrollTop === 0) {
                scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            }

            const threshold = window.innerHeight * 0.1; // 10vh

            // DEBUG: Log every 10th scroll event to avoid spam
            if (Math.random() < 0.1) {
                console.log('[LegitFlix] Scroll: top=' + scrollTop + ', threshold=' + Math.round(threshold) + ', container=' + (scrollContainer?.className || 'window'));
            }

            if (scrollTop > threshold) {
                header.classList.add('legitflix-nav-scrolled');
            } else {
                header.classList.remove('legitflix-nav-scrolled');
            }
        };

        // Attach to window with capture to catch all scrolls
        window.addEventListener('scroll', onScroll, { capture: true, passive: true });

        // Also attach to known scroll containers directly
        const containers = document.querySelectorAll('.mainAnimatedPages, .page, [data-role="page"]');
        console.log('[LegitFlix] initNavScroll: Attaching to', containers.length, 'containers');
        containers.forEach(c => c.addEventListener('scroll', onScroll, { passive: true }));

        // MutationObserver to attach to new pages
        const pageObserver = new MutationObserver(() => {
            document.querySelectorAll('.page:not([data-scroll-listener])').forEach(page => {
                page.setAttribute('data-scroll-listener', 'true');
                page.addEventListener('scroll', onScroll, { passive: true });
                console.log('[LegitFlix] Attached scroll listener to new page');
            });
        });
        pageObserver.observe(document.body, { childList: true, subtree: true });

        // Run once
        onScroll();
        console.log('[LegitFlix] initNavScroll: Complete');
    }

    initNavScroll(); // Start scroll listener

}

init();