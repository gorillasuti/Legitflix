/**
 * LegitFlix Movie Detail Page Revamp
 * Implements a "Direct Player" layout with Series-style Trailer/Hero features.
 */

(function () {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    const CONFIG = {
        debug: true,
        cssId: 'lf-movie-revamp-styles',
        containerId: 'lf-movie-detail-container'
    };

    const log = (...args) => CONFIG.debug && console.log('[LF-Movie]', ...args);

    // =========================================================================
    // CSS STYLES (Merged Movie + Series Features)
    // =========================================================================
    const MOVIE_DETAIL_CSS = `
        /* ============================================
           LEGITFLIX SHARED STYLES
           ============================================ */
        :root {
            --clr-accent: #ff6a00;
            --clr-accent-hover: #FF8C00;
            --clr-bg-main: #141414;
            --clr-bg-surface: #1f1f1f;
            --clr-bg-glass: rgba(255, 255, 255, 0.1);
            --clr-bg-glass-hover: rgba(255, 255, 255, 0.2);
            --clr-text-main: #ffffff;
            --clr-text-muted: #bcbcbc;
            --clr-divider: rgba(255, 255, 255, 0.1);
            --clr-heart: #e91e63;
            --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            --font-display: 'Outfit', sans-serif;
            --radius-sm: 4px;
            --radius-md: 8px;
            --radius-lg: 12px;
            --content-padding: 3%;
        }

        .lf-movie-container {
            width: 100%;
            overflow-x: hidden;
            position: relative;
            background-color: var(--clr-bg-main);
            color: var(--clr-text-main);
            font-family: var(--font-primary);
        }

        .lf-movie-container * { box-sizing: border-box; }

        /* HERO SECTION */
        .lf-series-hero {
            position: relative;
            width: 100%;
            height: 70vh;
            min-height: 500px;
            display: flex;
            align-items: flex-end;
            padding: 40px var(--content-padding);
            overflow: hidden;
        }

        .lf-series-hero__backdrop {
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center top;
            z-index: 0;
        }

        .lf-series-hero__backdrop::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(to top,
                    var(--clr-bg-main) 0%,
                    rgba(20, 20, 20, 0.85) 25%,
                    rgba(20, 20, 20, 0.4) 60%,
                    transparent 100%);
            z-index: 1;
        }

        .lf-series-hero__trailer {
            position: absolute;
            inset: 0;
            z-index: 1;
            opacity: 0;
            transition: opacity 0.5s ease;
            pointer-events: none;
        }

        .lf-series-hero__trailer.is-playing {
            opacity: 1;
            pointer-events: auto;
        }

        .lf-series-hero__trailer iframe {
            width: 100%;
            height: 100%;
            border: none;
        }

        .lf-series-hero.is-clean-view .lf-series-hero__content {
            opacity: 0;
            pointer-events: none;
            transform: translateY(20px);
        }

        .lf-series-hero__content {
            position: relative;
            z-index: 2;
            display: flex;
            gap: 40px;
            width: 100%;
            align-items: flex-end;
        }

        .lf-series-hero__poster {
            flex-shrink: 0;
            width: 220px;
            aspect-ratio: 2 / 3;
            object-fit: cover;
            border-radius: var(--radius-lg);
            border: 2px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .lf-series-hero__info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }

        .lf-series-hero__logo {
            position: absolute;
            bottom: 40px;
            left: var(--content-padding);
            width: 200px;
            max-width: 30%;
            height: auto;
            object-fit: contain;
            z-index: 5;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.5s ease;
        }

        .lf-series-hero.is-clean-view .lf-series-hero__logo {
            opacity: 1;
        }

        .lf-series-hero.is-clean-view .lf-series-hero__content {
            opacity: 0;
            pointer-events: none;
            transform: translateY(20px);
        }

        .lf-series-hero__content {
            position: relative;
            z-index: 2;
            display: flex;
            gap: 40px;
            width: 100%;
            align-items: flex-end;
            transition: all 0.5s ease;
        }



        .lf-series-hero__meta {
            display: flex;
            align-items: center;
            gap: 16px;
            color: var(--clr-text-muted);
            font-size: 0.95rem;
            flex-wrap: wrap;
        }

        .lf-series-hero__meta span.separator {
            margin: 0 4px;
            color: var(--clr-divider);
        }

        .lf-meta-badge {
            background: rgba(255,255,255,0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.85rem;
        }

        .lf-series-hero__rating {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #ffc107;
        }

        /* ACTIONS & BUTTONS */
        .lf-series-hero__actions {
            display: flex;
            gap: 12px;
            margin-top: 16px;
        }

        .lf-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: var(--radius-md);
            font-family: var(--font-primary);
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            text-decoration: none;
        }

        .lf-btn--primary {
            background: var(--clr-accent);
            color: white;
        }
        .lf-btn--primary:hover { background: var(--clr-accent-hover); }

        .lf-btn--glass {
            background: var(--clr-bg-glass);
            color: white;
            backdrop-filter: blur(10px);
        }
        .lf-btn--glass:hover { background: var(--clr-bg-glass-hover); }

        .lf-btn--icon-only { padding: 10px; } 

        /* Heart Active State */
        .lf-btn--heart {
            transition: background 0.2s ease, border-color 0.2s ease;
            border: 1px solid transparent;
        }
        .lf-btn--heart:hover { background: var(--clr-bg-glass-hover); }
        .lf-btn--heart.is-liked {
            background: rgba(233, 30, 99, 0.2);
            border-color: var(--clr-heart);
        }
        .lf-btn--heart.is-liked .material-icons { color: var(--clr-heart); }

        /* Mute Button */
        .lf-mute-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .lf-mute-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: white; }
        .lf-mute-btn.is-muted { opacity: 0.7; }

        /* LAYOUT & SIDEBAR */
        .lf-series-hero__details {
            display: flex;
            gap: 3rem;
            align-items: flex-start;
            margin-top: 10px;
        }

        .lf-series-hero__description {
            flex: 0 0 60%;
            color: var(--clr-text-muted);
            line-height: 1.6;
            font-size: 0.9rem;
        }

        .lf-series-hero__description-text {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            transition: all 0.3s ease;
            margin: 0;
        }
        .lf-series-hero__description-text.expanded {
            -webkit-line-clamp: unset;
            display: block;
        }

        .lf-series-hero__load-more {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-top: 8px;
            padding: 0;
            background: transparent;
            border: none;
            color: var(--clr-accent);
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            transition: color 0.2s ease;
        }
        .lf-series-hero__load-more:hover { color: var(--clr-accent-hover); }
        .lf-series-hero__load-more .material-icons { transition: transform 0.2s ease; font-size: 18px; }
        .lf-series-hero__load-more.expanded .material-icons { transform: rotate(180deg); }

        .lf-series-hero__cast-info {
            flex: 1;
            font-size: 0.85rem;
            color: var(--clr-text-muted);
            line-height: 1.8;
            padding-top: 5px;
        }
        .lf-series-hero__cast-info strong { color: var(--clr-text-main); }


        /* CONTENT SECTIONS */
        .lf-content-section {
            width: 100%;
            padding: 30px var(--content-padding);
        }

        /* DIVIDER STYLE */
        .lf-section-divider {
            border: none;
            border-top: 1px solid var(--clr-divider);
            margin: 0 var(--content-padding);
            display: block;
            width: auto;
        }

        .lf-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }

        .lf-section-title {
            font-family: var(--font-display);
            font-size: 1.3rem; 
            font-weight: 600;
            color: var(--clr-text-main);
            margin: 0;
        }

        .lf-filter-controls { display: flex; gap: 10px; align-items: center; }

        /* DROPDOWNS */
        .lf-filter-btn {
            position: relative;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            color: var(--clr-text-muted);
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .lf-filter-btn:hover { background: var(--clr-bg-glass); color: var(--clr-text-main); }
        .lf-filter-btn .material-icons { font-size: 18px; }
        
        /* WATCHED BUTTON SPECIFIC */
        .lf-filter-btn.is-selected {
            background: rgba(255, 255, 255, 0.1);
            color: var(--clr-accent);
            border-color: rgba(255, 106, 0, 0.3);
        }
        .lf-filter-btn.is-selected .material-icons {
            color: var(--clr-accent);
        }

        .lf-filter-dropdown { position: relative; display: inline-block; }

        .lf-filter-dropdown__menu {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            min-width: 220px;
            background: var(--clr-bg-surface);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
            pointer-events: none;
        }
        .lf-filter-dropdown:hover .lf-filter-dropdown__menu, 
        .lf-filter-dropdown.is-open .lf-filter-dropdown__menu {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
            pointer-events: auto;
        }

        .lf-lang-menu { padding: 10px 0; }
        .lf-lang-section { padding-bottom: 5px; }
        .lf-dropdown-section-title {
            padding: 5px 15px;
            font-size: 0.75rem;
            text-transform: uppercase;
            color: var(--clr-text-muted);
            font-weight: 600;
        }
        .lf-lang-separator {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 5px 0;
        }

        .lf-filter-dropdown__option {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            color: var(--clr-text-muted);
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.15s ease;
        }
        .lf-filter-dropdown__option:hover { background: var(--clr-bg-glass); color: var(--clr-text-main); }
        .lf-filter-dropdown__option.is-selected {
            color: var(--clr-accent);
            background: rgba(255, 106, 0, 0.1);
        }

        .lf-lang-footer {
            padding: 8px 10px 0 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 5px;
        }
        .lf-edit-subs-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--clr-text-main);
            padding: 8px 12px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
            text-decoration: none;
        }
        .lf-edit-subs-btn:hover { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.3); }
        .lf-edit-subs-btn .material-icons { font-size: 18px; }

        /* PLAYER WRAPPER (90vh) */
        .lf-player-wrapper {
            width: 100%;
            height: 90vh;
            background: black;
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            position: relative;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .lf-player-overlay {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.8) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
        }
        .lf-big-play-btn {
            width: 90px;
            height: 90px;
            background: var(--clr-accent);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 30px rgba(255, 107, 0, 0.4);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .lf-player-overlay:hover .lf-big-play-btn {
            transform: scale(1.1);
            box-shadow: 0 0 50px rgba(255, 107, 0, 0.6);
        }
        .lf-big-play-btn .material-icons { font-size: 48px; color: white; }
        .lf-player-iframe { width: 100%; height: 100%; border: none; }

        /* GRIDS */
        .lf-cast-grid,
        .lf-similar-grid {
            display: flex;
            flex-wrap: nowrap;
            gap: 16px;
            overflow-x: auto;
            padding-bottom: 20px;
        }
        .lf-cast-grid::-webkit-scrollbar,
        .lf-similar-grid::-webkit-scrollbar { height: 8px; }
        .lf-cast-grid::-webkit-scrollbar-thumb,
        .lf-similar-grid::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }

        .lf-cast-card { width: 120px; flex-shrink: 0; text-align: center; cursor: pointer; }
        .lf-cast-image {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 8px;
            transition: border-color 0.2s;
            aspect-ratio: 1/1;
        }
        .lf-cast-card:hover .lf-cast-image { border-color: rgba(255, 255, 255, 0.4); }
        .lf-cast-name { font-weight: 600; font-size: 0.9rem; color: #fff; }
        .lf-cast-role { font-size: 0.8rem; color: #aaa; }

        .lf-similar-card { width: 180px; flex-shrink: 0; cursor: pointer; transition: transform 0.2s; }
        .lf-similar-card:hover { transform: translateY(-4px); }
        .lf-similar-poster {
            width: 100%;
            aspect-ratio: 2/3;
            border-radius: 8px;
            margin-bottom: 8px;
        }
        .lf-similar-title { font-size: 0.9rem; text-align: center; color: #fff; }

        /* RESPONSIVE */
        @media (max-width: 900px) {
            .lf-series-hero__details { flex-direction: column; gap: 20px; }
            .lf-series-hero__description { flex: auto; max-width: 100%; }
        }
        @media (max-width: 768px) {
            .lf-series-hero { height: auto; min-height: 60vh; padding: 20px; }
            .lf-series-hero__content { flex-direction: column; align-items: center; text-align: center; }
            .lf-series-hero__poster { width: 140px; margin-bottom: 20px; }
            .lf-series-hero__info { padding-top: 0; }
            .lf-series-hero__meta { justify-content: center; }
            .lf-series-hero__actions { justify-content: center; }
            .lf-player-wrapper { height: 40vh; }
        }
    `;

    // =========================================================================
    // CSS INJECTION
    // =========================================================================
    function injectStyles() {
        if (document.getElementById(CONFIG.cssId)) return;
        const style = document.createElement('style');
        style.id = CONFIG.cssId;
        style.textContent = MOVIE_DETAIL_CSS;
        document.head.appendChild(style);
        log('CSS injected');
    }

    // =========================================================================
    // UI GENERATORS
    // =========================================================================

    function createHeroSection(item) {
        // Safe accessors
        const backdropUrl = `/Items/${item.Id}/Images/Backdrop/0?maxHeight=1080&quality=80`;
        const posterUrl = `/Items/${item.Id}/Images/Primary?maxHeight=400&maxWidth=300&quality=90`;
        const title = item.Name || 'Unknown Movie';
        const year = item.ProductionYear || '';
        const rating = item.OfficialRating || '';
        const communityRating = item.CommunityRating ? item.CommunityRating.toFixed(1) : '';

        // Time logic
        let durationStr = '';
        let endsAtStr = '';
        if (item.RunTimeTicks) {
            const totalMins = Math.round(item.RunTimeTicks / 600000000);
            const hrs = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

            const endDate = new Date(Date.now() + (item.RunTimeTicks / 10000));
            endsAtStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        // Sub/Dub
        let audioLangs = new Set();
        let subLangs = new Set();
        if (item.MediaStreams) {
            item.MediaStreams.forEach(stream => {
                if (stream.Type === 'Audio' && stream.Language) audioLangs.add(stream.Language);
                if (stream.Type === 'Subtitle' && stream.Language) subLangs.add(stream.Language);
            });
        }
        const hasSub = subLangs.size > 0;
        const hasDub = audioLangs.size > 1;
        const subDubText = (hasSub && hasDub) ? 'Sub | Dub' : (hasSub ? 'Sub' : (hasDub ? 'Dub' : ''));

        // Description & Metadata
        const description = item.Overview || '';
        const genres = (item.Genres || []).slice(0, 3).join(', ');
        const studios = (item.Studios || []).slice(0, 2).map(s => s.Name || s).join(', ');
        const cast = (item.People || []).filter(p => p.Type === 'Actor').slice(0, 3).map(p => p.Name).join(', ');

        // Logo
        let logoUrl = '';
        if (item.ImageTags && item.ImageTags.Logo) {
            logoUrl = `/Items/${item.Id}/Images/Logo?maxHeight=200&maxWidth=500&quality=90`;
        }
        const titleHtml = logoUrl
            ? `<img src="${logoUrl}" alt="${title}" class="lf-series-hero__logo-title">`
            : `<h1 class="lf-series-hero__title">${title}</h1>`;

        // Icons
        const isFav = item.UserData && item.UserData.IsFavorite;
        const favIcon = isFav ? 'favorite' : 'favorite_border';
        const favClass = isFav ? 'is-liked' : '';

        // Play Button State (Resume vs Play)
        let playButtonText = 'Play';
        let playButtonIcon = 'play_arrow';
        if (item.UserData && item.UserData.PlaybackPositionTicks > 0) {
            const pct = Math.round((item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100);
            if (pct < 95) {
                playButtonText = `Continue from ${pct}%`;
            } else {
                playButtonIcon = 'replay';
                playButtonText = 'Watch Again';
            }
        }

        return `
            <section class="lf-series-hero" id="lfSeriesHero">
                <div class="lf-series-hero__backdrop" id="lfHeroBackdrop" style="background-image: url('${backdropUrl}');"></div>
                
                <!-- TRAILER CONTAINER -->
                <div class="lf-series-hero__trailer" id="lfHeroTrailer">
                    <iframe id="lfTrailerIframe" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                </div>

                ${logoUrl ? `<img src="${logoUrl}" alt="${title}" class="lf-series-hero__logo">` : ''}

                <div class="lf-series-hero__content">
                    <img class="lf-series-hero__poster" src="${posterUrl}" alt="${title}">
                    
                    <div class="lf-series-hero__info">
                        ${titleHtml}
                        
                        <div class="lf-series-hero__meta">
                            ${year ? `<span>${year}</span><span class="separator">•</span>` : ''}
                            ${rating ? `<span>${rating}</span><span class="separator">•</span>` : ''}
                            <div class="lf-series-hero__rating">
                                <span class="material-icons">star</span>
                                <span>${communityRating}</span>
                            </div>
                            ${durationStr ? `<span class="separator">•</span><span>${durationStr}</span>` : ''}
                            ${endsAtStr ? `<span class="lf-meta-badge">Ends at ${endsAtStr}</span>` : ''}
                            ${subDubText ? `<span class="separator">•</span><span class="lf-meta-badge">${subDubText}</span>` : ''}
                        </div>

                        <div class="lf-series-hero__actions">
                            <button class="lf-btn lf-btn--primary" id="lfPlayBtn">
                                <span class="material-icons">${playButtonIcon}</span>
                                ${playButtonText}
                            </button>
                            
                            <!-- SWAPPED: Trailer Middle, Heart Last -->
                            <button class="lf-btn lf-btn--glass" id="lfTrailerBtn">
                                <span class="material-icons">theaters</span>
                                Watch Trailer
                            </button>

                            <button class="lf-btn lf-btn--glass lf-btn--icon-only lf-btn--heart ${favClass}" id="lfHeartBtn" title="Toggle Favorites">
                                <span class="material-icons">${favIcon}</span>
                            </button>

                            <button class="lf-mute-btn" id="lfMuteBtn" title="Toggle Mute" style="display: none;">
                                <span class="material-icons">volume_off</span>
                            </button>
                        </div>

                        <div class="lf-series-hero__details">
                            <div class="lf-series-hero__description">
                                <p class="lf-series-hero__description-text" id="lfDescriptionText">${description}</p>
                                <button class="lf-series-hero__load-more" id="lfLoadMoreBtn" style="display:none">
                                    <span>Read more</span>
                                    <span class="material-icons">expand_more</span>
                                </button>
                            </div>
                            <div class="lf-series-hero__cast-info">
                                ${cast ? `<div><strong>Starring:</strong> ${cast}</div>` : ''}
                                ${genres ? `<div><strong>Genres:</strong> ${genres}</div>` : ''}
                                ${studios ? `<div><strong>Studio:</strong> ${studios}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function createPlayerSection(item) {
        // Watched State for Header
        const isPlayed = item.UserData && item.UserData.Played;
        const playedIcon = isPlayed ? 'check_circle' : 'check_circle_outline';
        const playedClass = isPlayed ? 'is-selected' : '';

        // Simple mock of Audio/Subs for now, or we could parse media streams
        // Using static list logic as placeholder for prototype, same as Series module
        const audioOptions = `
            <div class="lf-filter-dropdown__option is-selected"><span class="material-icons">check</span> English</div>
        `;
        const subOptions = `
             <div class="lf-filter-dropdown__option is-selected"><span class="material-icons">check</span> English</div>
        `;

        return `
            <hr class="lf-section-divider">
            <section class="lf-content-section" id="lfDirectPlayer">
                 <div class="lf-section-header">
                    <h2 class="lf-section-title">${item.Name}</h2>
                    
                    <div class="lf-filter-controls">
                        <!-- AUDIO / SUBS -->
                        <div class="lf-filter-dropdown" id="lfLangDropdown">
                            <button class="lf-filter-btn" id="lfLangBtn" title="Audio & Subtitles">
                                <span class="material-icons">subtitles</span>
                                <span>Audio & Subs</span>
                                <span class="material-icons">expand_more</span>
                            </button>
                            <div class="lf-filter-dropdown__menu lf-lang-menu">
                                <div class="lf-lang-section">
                                    <div class="lf-dropdown-section-title">Audio</div>
                                    ${audioOptions}
                                </div>
                                <div class="lf-lang-separator"></div>
                                <div class="lf-lang-section">
                                    <div class="lf-dropdown-section-title">Subtitles</div>
                                    ${subOptions}
                                </div>
                                <div class="lf-lang-footer">
                                    <button class="lf-edit-subs-btn" id="lfEditSubsBtn">
                                        <span class="material-icons">edit</span>
                                        <span>Edit Subtitles</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- WATCHED TOGGLE -->
                        <button class="lf-filter-btn ${playedClass}" id="lfWatchedBtn" title="Mark as Watched">
                            <span class="material-icons">${playedIcon}</span>
                            <span>Mark Watched</span>
                        </button>
                    </div>
                </div>
                
                <div class="lf-player-wrapper">
                    <div class="lf-player-overlay" onclick="window.legitFlixPlay('${item.Id}')">
                         <div class="lf-big-play-btn">
                             <span class="material-icons">play_arrow</span>
                         </div>
                    </div>
                    <div style="width:100%; height:100%; background: url('/Items/${item.Id}/Images/Backdrop/0') center/cover; opacity: 0.3;"></div>
                </div>
            </section>
        `;
    }

    function createCastSection(people) {
        const actors = people.filter(p => p.Type === 'Actor');
        if (actors.length === 0) return '';
        const cards = actors.map(person => `
            <div class="lf-cast-card" onclick="window.legitFlixShowItem('${person.Id}')">
                <img class="lf-cast-image" src="${person.PrimaryImageTag ? `/Items/${person.Id}/Images/Primary?maxHeight=200&maxWidth=200` : '/web/assets/img/default-avatar.png'}" alt="${person.Name}">
                <div class="lf-cast-name">${person.Name}</div>
                <div class="lf-cast-role">${person.Role || 'Actor'}</div>
            </div>
        `).join('');

        return `
            <hr class="lf-section-divider">
            <section class="lf-content-section">
                <div class="lf-section-header">
                    <h2 class="lf-section-title">Cast & Crew</h2>
                </div>
                <div class="lf-cast-grid">${cards}</div>
            </section>
        `;
    }

    function createSimilarSection(items) {
        if (!items || items.length === 0) return '';
        const cards = items.slice(0, 10).map(item => `
            <div class="lf-similar-card" onclick="window.legitFlixShowItem('${item.Id}')">
                <img class="lf-similar-poster" src="/Items/${item.Id}/Images/Primary?maxHeight=300&maxWidth=200" alt="${item.Name}">
                <div class="lf-similar-title">${item.Name}</div>
            </div>
        `).join('');

        return `
             <hr class="lf-section-divider">
            <section class="lf-content-section">
                <div class="lf-section-header">
                     <h2 class="lf-section-title">More Like This</h2>
                </div>
                <div class="lf-similar-grid">${cards}</div>
            </section>
        `;
    }

    // =========================================================================
    // EVENTS & LOGIC
    // =========================================================================

    function wireUpEvents(container, item) {
        // --- Play Button ---
        const playBtn = container.querySelector('#lfPlayBtn');
        playBtn?.addEventListener('click', () => window.legitFlixPlay(item.Id));

        // --- Heart Button ---
        const heartBtn = container.querySelector('#lfHeartBtn');
        heartBtn?.addEventListener('click', () => {
            // Optimistic UI
            const isLiked = heartBtn.classList.toggle('is-liked');
            const icon = heartBtn.querySelector('.material-icons');
            if (icon) icon.textContent = isLiked ? 'favorite' : 'favorite_border';
            window.legitFlixToggleFav(item.Id, heartBtn); // Async call in background
        });

        // --- Watched Button ---
        const watchedBtn = container.querySelector('#lfWatchedBtn');
        watchedBtn?.addEventListener('click', () => {
            // Optimistic UI
            const isSelected = watchedBtn.classList.toggle('is-selected');
            const icon = watchedBtn.querySelector('.material-icons');
            if (icon) icon.textContent = isSelected ? 'check_circle' : 'check_circle_outline';
            window.legitFlixTogglePlayed(item.Id, watchedBtn);
        });

        // --- Dropdown Logic ---
        const langBtn = container.querySelector('#lfLangBtn');
        const langDropdown = container.querySelector('#lfLangDropdown');
        langBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('is-open');
        });
        document.addEventListener('click', (e) => {
            if (!langDropdown?.contains(e.target)) langDropdown?.classList.remove('is-open');
        });

        // --- Edit Subtitles ---
        const editSubsBtn = container.querySelector('#lfEditSubsBtn');
        editSubsBtn?.addEventListener('click', () => {
            console.log('[LF] Edit Subtitles clicked for', item.Id);
            // In future: Open SubtitleManager.show(item.Id)
            alert('Edit Subtitles feature coming soon!');
        });

        // --- Read More Logic ---
        const descText = container.querySelector('#lfDescriptionText');
        const loadMoreBtn = container.querySelector('#lfLoadMoreBtn');
        if (descText && loadMoreBtn) {
            // Check overflow with tolerance
            if (descText.scrollHeight > descText.clientHeight + 2) {
                loadMoreBtn.style.display = 'inline-flex';
            }
            loadMoreBtn.addEventListener('click', function () {
                const isExpanded = descText.classList.toggle('expanded');
                this.classList.toggle('expanded', isExpanded);
                this.querySelector('span:first-child').textContent = isExpanded ? 'Show Less' : 'Read More';
            });
        }

        // --- TRAILER LOGIC ---
        const trailerBtn = container.querySelector('#lfTrailerBtn');
        const trailerContainer = container.querySelector('#lfHeroTrailer');
        const trailerIframe = container.querySelector('#lfTrailerIframe');
        const heroSection = container.querySelector('#lfSeriesHero');
        const backdrop = container.querySelector('#lfHeroBackdrop');
        const muteBtn = container.querySelector('#lfMuteBtn');

        const trailerYtId = (item.RemoteTrailers && item.RemoteTrailers.length > 0)
            ? getYoutubeId(item.RemoteTrailers[0].Url)
            : null;

        if (trailerBtn && trailerYtId) {
            let hideUITimeout;
            let blockedTimeout;
            let messageHandler;

            const startHideTimer = () => {
                clearTimeout(hideUITimeout);
                hideUITimeout = setTimeout(() => {
                    if (trailerContainer.classList.contains('is-playing')) {
                        heroSection?.classList.add('is-clean-view');
                    }
                }, 5000);
            };

            const resetHideTimer = () => {
                heroSection?.classList.remove('is-clean-view');
                if (trailerContainer.classList.contains('is-playing')) startHideTimer();
            };

            heroSection?.addEventListener('mousemove', resetHideTimer);
            heroSection?.addEventListener('click', resetHideTimer);

            trailerBtn.addEventListener('click', () => {
                const isPlaying = trailerContainer.classList.contains('is-playing');
                if (isPlaying) {
                    // STOP
                    trailerIframe.src = '';
                    trailerContainer.classList.remove('is-playing');
                    heroSection.classList.remove('is-clean-view');
                    clearTimeout(hideUITimeout);
                    clearTimeout(blockedTimeout);
                    if (messageHandler) window.removeEventListener('message', messageHandler);
                    document.getElementById('lfTrailerHelpBtn')?.remove();
                    if (backdrop) backdrop.style.opacity = '1';

                    trailerBtn.innerHTML = '<span class="material-icons">theaters</span> Watch Trailer';
                    muteBtn.style.display = 'none';
                    muteBtn.classList.remove('is-muted');
                } else {
                    // PLAY
                    log('Playing trailer:', trailerYtId);
                    const origin = window.location.origin;
                    const embedUrl = `https://www.youtube.com/embed/${trailerYtId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${trailerYtId}&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;

                    trailerIframe.src = embedUrl;
                    trailerContainer.classList.add('is-playing');
                    heroSection.classList.add('is-clean-view');
                    if (backdrop) backdrop.style.opacity = '0';

                    startHideTimer();

                    trailerBtn.innerHTML = '<span class="material-icons">stop_circle</span> Stop Trailer';

                    muteBtn.style.display = 'flex';
                    muteBtn.innerHTML = '<span class="material-icons">volume_off</span>';
                    muteBtn.classList.add('is-muted');

                    // Blocking Detection
                    let receivedMessage = false;
                    messageHandler = (e) => {
                        if (typeof e.data === 'string' && (e.data.includes('"event"') || e.data.includes('"id"'))) {
                            receivedMessage = true;
                            clearTimeout(blockedTimeout);
                        }
                    };
                    window.addEventListener('message', messageHandler);

                    blockedTimeout = setTimeout(() => {
                        if (!receivedMessage && trailerContainer.classList.contains('is-playing')) {
                            showTrailerHelpBtn(trailerContainer);
                        }
                    }, 4000);
                }
            });

            // Mute Logic
            muteBtn.addEventListener('click', () => {
                const isMuted = muteBtn.classList.contains('is-muted');
                const func = isMuted ? 'unMute' : 'mute'; // YouTube API commands
                trailerIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');

                if (isMuted) {
                    muteBtn.classList.remove('is-muted');
                    muteBtn.innerHTML = '<span class="material-icons">volume_up</span>';
                } else {
                    muteBtn.classList.add('is-muted');
                    muteBtn.innerHTML = '<span class="material-icons">volume_off</span>';
                }
            });

        } else if (trailerBtn) {
            trailerBtn.style.opacity = '0.5';
            trailerBtn.style.pointerEvents = 'none';
            trailerBtn.innerHTML = 'No Trailer';
        }
    }

    function showTrailerHelpBtn(container) {
        if (document.getElementById('lfTrailerHelpBtn')) return;
        const btn = document.createElement('button');
        btn.id = 'lfTrailerHelpBtn';
        btn.innerHTML = '<span class="material-icons">help_outline</span> <span>Trouble playing?</span>';
        btn.className = 'lf-btn lf-btn--glass';
        Object.assign(btn.style, {
            position: 'absolute', bottom: '20px', right: '20px', zIndex: '100',
            padding: '8px 16px', fontSize: '0.85rem', opacity: '0', transition: 'opacity 0.3s ease'
        });
        container.appendChild(btn);
        requestAnimationFrame(() => btn.style.opacity = '1');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            alert('Your browser may be blocking the trailer. Try disabling ad blockers for this site.');
            // Or inject proper modal like Series page if wanted, using alert for simple JS proto now.
        });
    }

    function getYoutubeId(url) {
        if (!url) return null;
        if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        return null;
    }

    // =========================================================================
    // MAIN LOGIC
    // =========================================================================

    async function injectMoviePage(itemId) {
        if (document.getElementById(CONFIG.containerId)) return;

        const userId = window.ApiClient.getCurrentUserId();
        const item = await window.ApiClient.getItem(userId, itemId);

        if (!item || item.Type !== 'Movie') return;

        log('Injecting Movie Page for:', item.Name);
        injectStyles();

        const detailPage = document.querySelector('.itemDetailPage');
        if (detailPage) {
            detailPage.classList.add('hide');
            detailPage.style.display = 'none';
        }

        const container = document.createElement('div');
        container.id = CONFIG.containerId;
        container.className = 'lf-movie-container';
        container.dataset.itemId = itemId; // Fix: Set itemId to prevent re-injection loop

        let html = createHeroSection(item);
        html += createPlayerSection(item);

        if (item.People && item.People.length > 0) {
            html += createCastSection(item.People);
        }

        try {
            const similarRes = await window.ApiClient.getSimilarItems(itemId, { Limit: 12, UserId: userId });
            if (similarRes && similarRes.Items) {
                html += createSimilarSection(similarRes.Items);
            }
        } catch (e) { log('Error fetching similar:', e); }

        container.innerHTML = html;
        document.querySelector('.pageContainer').appendChild(container);

        // WIRE UP
        wireUpEvents(container, item);
        isInjecting = false; // Reset lock
    }

    let isInjecting = false; // Lock flag

    function checkUrl() {
        const hash = window.location.hash;
        if (hash.includes('details?id=')) {
            const id = new URLSearchParams(hash.split('?')[1]).get('id');
            if (id) {
                const currentContainer = document.getElementById(CONFIG.containerId);
                // If ID changed or not injected
                if (!currentContainer || currentContainer.dataset.itemId !== id) {
                    if (isInjecting) return; // Prevent double injection

                    if (currentContainer) currentContainer.remove();

                    isInjecting = true;
                    injectMoviePage(id).catch(err => {
                        console.error('[LF] Injection failed', err);
                        isInjecting = false;
                    });
                }
            }
        } else {
            const container = document.getElementById(CONFIG.containerId);
            if (container) {
                container.remove();
                const detailPage = document.querySelector('.itemDetailPage');
                if (detailPage) detailPage.style.display = '';
            }
        }
    }

    window.LFMovieDetail = {
        init: () => {
            log('Module Loaded');
            setInterval(checkUrl, 500);
        }
    };

    window.LFMovieDetail.init();

})();
