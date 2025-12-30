/**
 * LegitFlix Series Detail Page Revamp
 * Crunchyroll-inspired series page injection module
 * 
 * This module can be loaded directly in the browser for prototyping,
 * or integrated into legitflix-theme.js for production use.
 */

(function () {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    const CONFIG = {
        debug: true,
        cssId: 'lf-series-revamp-styles',
        containerId: 'lf-series-detail-container'
    };

    const log = (...args) => CONFIG.debug && console.log('[LF-Series]', ...args);

    // =========================================================================
    // CSS STYLES (Extracted from Seriespage.html)
    // =========================================================================
    const SERIES_DETAIL_CSS = `
        /* ============================================
           LEGITFLIX COLOR VARIABLES
           ============================================ */
        .lf-series-container {
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

        .lf-series-container * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* ============================================
           SERIES HERO SECTION (70vh, 100% width)
           ============================================ */
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
            transition: opacity 0.5s ease;
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

        .lf-series-hero__trailer iframe,
        .lf-series-hero__trailer video {
            width: 100%;
            height: 100%;
            object-fit: cover;
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
            transition: all 0.5s ease;
        }

        .lf-series-hero__poster {
            flex-shrink: 0;
            width: 220px;
            aspect-ratio: 2 / 3;
            object-fit: cover;
            border-radius: var(--radius-lg);
            border: 2px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
            margin-top: auto; /* Align to bottom of padded area */
        }

        .lf-series-hero__info {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-start; /* Expand downwards */
            padding-top: 40vh; /* Push content down initially */
            gap: 12px;
        }

        .lf-series-hero__title {
            font-family: var(--font-display);
            font-size: 2.2rem;
            font-weight: 700;
            line-height: 1.2;
            color: var(--clr-text-main);
        }

        .lf-series-hero__meta {
            display: flex;
            align-items: center;
            gap: 16px;
            color: var(--clr-text-muted);
            font-size: 0.9rem;
        }

        .lf-series-hero__rating {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #ffc107;
        }

        .lf-series-hero__details {
            display: flex;
            gap: 3rem;
            align-items: flex-start;
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
        }

        .lf-series-hero__description-text.is-expanded {
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

        .lf-series-hero__load-more:hover {
            color: var(--clr-accent-hover);
        }

        .lf-series-hero__load-more .material-icons {
            font-size: 18px;
            transition: transform 0.2s ease;
        }

        .lf-series-hero__load-more.is-expanded .material-icons {
            transform: rotate(180deg);
        }

        .lf-series-hero__cast-info {
            flex: 0 0 280px;
            font-size: 0.85rem;
            color: var(--clr-text-muted);
            line-height: 1.8;
        }

        .lf-series-hero__cast-info strong {
            color: var(--clr-text-main);
        }

        .lf-series-hero__actions {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
        }

        .lf-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border-radius: var(--radius-md);
            font-family: var(--font-primary);
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
        }

        .lf-btn--primary {
            background: var(--clr-accent);
            color: white;
        }

        .lf-btn--primary:hover {
            background: var(--clr-accent-hover);
        }

        .lf-btn--glass {
            background: var(--clr-bg-glass);
            color: white;
            backdrop-filter: blur(10px);
        }

        .lf-btn--glass:hover {
            background: var(--clr-bg-glass-hover);
        }

        .lf-btn--icon-only {
            padding: 12px;
        }

        .lf-btn--heart {
            transition: background 0.2s ease, border-color 0.2s ease;
            border: 1px solid transparent;
        }

        .lf-btn--heart:hover {
            background: var(--clr-bg-glass-hover);
        }

        .lf-btn--heart .material-icons {
            transition: color 0.2s ease;
        }

        .lf-btn--heart.is-liked {
            background: rgba(233, 30, 99, 0.2);
            border-color: var(--clr-heart);
        }

        .lf-btn--heart.is-liked .material-icons {
            color: var(--clr-heart);
        }

        .lf-btn--heart:active {
            transform: scale(0.9);
        }

        .lf-btn-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .lf-mute-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px; /* Match button height */
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .lf-mute-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: white;
        }

        .lf-mute-btn.is-muted {
            opacity: 0.7;
        }

        /* ============================================
           CONTENT SECTIONS
           ============================================ */
        .lf-content-section {
            width: 100%;
            padding: 30px var(--content-padding);
        }

        .lf-section-divider {
            border: none;
            border-top: 1px solid var(--clr-divider);
            margin: 0 var(--content-padding);
        }

        .lf-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .lf-section-title {
            font-family: var(--font-display);
            font-size: 1.3rem;
            font-weight: 600;
            color: var(--clr-text-main);
        }

        /* ============================================
           SEASON SELECTOR
           ============================================ */
        .lf-episodes-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .lf-season-selector {
            position: relative;
            display: inline-block;
        }

        .lf-season-selector__button {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: var(--clr-bg-surface);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            color: var(--clr-text-main);
            font-family: var(--font-primary);
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .lf-season-selector__button:hover {
            background: var(--clr-bg-glass-hover);
            border-color: var(--clr-accent);
        }

        .lf-season-selector__button .material-icons {
            font-size: 18px;
            transition: transform 0.2s ease;
        }

        .lf-season-selector.is-open .lf-season-selector__button .material-icons {
            transform: rotate(180deg);
        }

        .lf-season-selector__dropdown {
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            min-width: 180px;
            background: var(--clr-bg-surface);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
        }

        .lf-season-selector.is-open .lf-season-selector__dropdown {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .lf-season-selector__option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            color: var(--clr-text-muted);
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 0.85rem;
        }

        .lf-season-selector__option:first-child {
            border-radius: var(--radius-md) var(--radius-md) 0 0;
        }

        .lf-season-selector__option:last-child {
            border-radius: 0 0 var(--radius-md) var(--radius-md);
        }

        .lf-season-selector__option:hover {
            background: var(--clr-bg-glass);
            color: var(--clr-text-main);
        }

        .lf-season-selector__option.is-selected {
            color: var(--clr-accent);
            background: rgba(255, 106, 0, 0.1);
        }

        .lf-season-selector__option-count {
            margin-left: auto;
            font-size: 0.8rem;
            color: var(--clr-text-muted);
            opacity: 0.7;
        }

        /* Filter controls */
        .lf-filter-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }

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

        .lf-filter-btn:hover {
            background: var(--clr-bg-glass);
            color: var(--clr-text-main);
        }

        .lf-filter-btn .material-icons {
            font-size: 18px;
        }

        .lf-filter-dropdown {
            position: relative;
            display: inline-block;
        }

        .lf-filter-dropdown__menu {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            min-width: 150px;
            background: var(--clr-bg-surface);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
        }

        .lf-filter-dropdown.is-open .lf-filter-dropdown__menu {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .lf-filter-dropdown__option {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            color: var(--clr-text-muted);
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 0.85rem;
        }

        .lf-filter-dropdown__option:first-child {
            border-radius: var(--radius-md) var(--radius-md) 0 0;
        }

        .lf-filter-dropdown__option:last-child {
            border-radius: 0 0 var(--radius-md) var(--radius-md);
        }

        .lf-filter-dropdown__option:hover {
            background: var(--clr-bg-glass);
            color: var(--clr-text-main);
        }

        .lf-filter-dropdown__option.is-selected {
            color: var(--clr-accent);
            background: rgba(255, 106, 0, 0.1);
        }

        .lf-filter-dropdown__option .material-icons {
            font-size: 16px;
        }

        /* Language Selector Split */
        .lf-lang-menu {
            min-width: 220px;
            padding: 10px 0;
        }
        .lf-lang-section {
            padding-bottom: 5px;
        }
        .lf-dropdown-section-title {
            padding: 5px 15px;
            font-size: 0.75rem;
            text-transform: uppercase;
            color: var(--clr-text-muted);
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .lf-lang-separator {
            height: 1px;
            background: rgba(255,255,255,0.1);
            margin: 5px 0;
        }
        .lf-lang-footer {
            padding: 8px 10px 0 10px;
            border-top: 1px solid rgba(255,255,255,0.1);
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
        .lf-edit-subs-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.3);
        }
        .lf-edit-subs-btn .material-icons {
             font-size: 18px;
        }

        /* ============================================
           EPISODE GRID
           ============================================ */
        .lf-episode-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
        }

        .lf-episode-card {
            display: block;
            background: var(--clr-bg-surface);
            border-radius: var(--radius-lg);
            overflow: hidden;
            text-decoration: none;
            color: inherit;
            transition: all 0.25s ease;
            cursor: pointer;
            grid-column: auto !important; /* Force auto placement in grid */
            min-width: 0; /* Prevent grid blowout */
            width: 100%;
        }

        .lf-episode-card:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        }

        .lf-episode-card__thumbnail {
            position: relative;
            aspect-ratio: 16 / 9;
            overflow: hidden;
        }

        .lf-episode-card__thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .lf-episode-card:hover .lf-episode-card__thumbnail img {
            transform: scale(1.05);
        }

        .lf-episode-card__play-icon {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.4);
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .lf-episode-card:hover .lf-episode-card__play-icon {
            opacity: 1;
        }

        .lf-episode-card__play-icon .material-icons {
            font-size: 40px;
            color: white;
            background: var(--clr-accent);
            border-radius: 50%;
            padding: 10px;
        }

        .lf-episode-card__progress {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
        }

        .lf-episode-card__progress-bar {
            height: 100%;
            background: var(--clr-accent);
            transition: width 0.3s ease;
        }

        .lf-episode-card__badge {
            position: absolute;
            top: 8px;
            left: 8px;
            background: var(--clr-accent);
            color: white;
            font-weight: 700;
            font-size: 0.75rem;
            padding: 3px 8px;
            border-radius: var(--radius-sm);
        }

        .lf-episode-card__duration {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 0.7rem;
            padding: 3px 6px;
            border-radius: var(--radius-sm);
        }

        .lf-episode-card__info {
            padding: 12px;
        }

        .lf-episode-card__title {
            font-weight: 600;
            font-size: 0.9rem;
            margin-bottom: 4px;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            color: var(--clr-text-main);
        }

        .lf-episode-card__subtitle {
            color: var(--clr-text-muted);
            font-size: 0.8rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* BULK EDIT STYLES */
        .lf-episode-checkbox {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            background: rgba(0, 0, 0, 0.6);
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: scale(0.8);
            transition: all 0.2s ease;
            z-index: 10;
            pointer-events: none; /* Let parent handle click */
        }
        
        .lf-episode-checkbox .material-icons {
            font-size: 18px;
            color: white;
            opacity: 0;
            transform: scale(0);
            transition: all 0.2s ease;
        }

        .lf-episode-card.is-selecting-mode .lf-episode-checkbox {
            opacity: 1;
            transform: scale(1);
        }

        .lf-episode-card.is-selected .lf-episode-checkbox {
            background: var(--clr-accent);
            border-color: var(--clr-accent);
        }

        .lf-episode-card.is-selected .lf-episode-checkbox .material-icons {
            opacity: 1;
            transform: scale(1);
        }

        .lf-episode-card.is-selected {
            box-shadow: 0 0 0 2px var(--clr-accent);
        }
        
        .lf-episode-card.is-watched .lf-episode-card__thumbnail {
             opacity: 0.6;
        }
        
        /* Disable hover play icon in selection mode */
        .lf-episode-card.is-selecting-mode:hover .lf-episode-card__play-icon {
            opacity: 0;
        }

        /* Success Marked State (Green Tick) */
        .lf-episode-card.is-success-marked .lf-episode-checkbox {
            opacity: 1;
            transform: scale(1);
            background: #4caf50;
            border-color: #4caf50;
        }
        .lf-episode-card.is-success-marked .lf-episode-checkbox .material-icons {
            opacity: 1;
            transform: scale(1);
        }


        /* ============================================
           CAST SECTION
           ============================================ */
        .lf-cast-grid {
            display: flex;
            gap: 16px;
            overflow-x: auto;
            padding: 10px 0;
        }

        .lf-cast-card {
            flex-shrink: 0;
            text-align: center;
            width: 100px;
            cursor: pointer;
        }

        .lf-cast-card__image {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            margin-bottom: 8px;
            border: 2px solid var(--clr-bg-surface);
            transition: border-color 0.2s ease, opacity 0.2s ease;
        }

        .lf-cast-card:hover .lf-cast-card__image {
            border-color: rgba(255, 255, 255, 0.4);
            opacity: 0.85;
        }

        .lf-cast-card__name {
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.2s ease;
            color: var(--clr-text-main);
        }

        .lf-cast-card:hover .lf-cast-card__name {
            color: var(--clr-text-main);
        }

        .lf-cast-card__role {
            font-size: 0.75rem;
            color: var(--clr-text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* ============================================
           MORE LIKE THIS
           ============================================ */
        .lf-similar-grid {
            display: flex;
            gap: 16px;
            overflow-x: auto;
            padding: 10px 0;
        }

        .lf-similar-card {
            flex-shrink: 0;
            width: 150px;
            text-decoration: none;
            color: inherit;
            transition: transform 0.2s ease;
            cursor: pointer;
        }

        .lf-similar-card:hover {
            transform: translateY(-4px);
        }

        .lf-similar-card__poster {
            width: 100%;
            aspect-ratio: 2/3;
            object-fit: cover;
            border-radius: var(--radius-md);
            margin-bottom: 8px;
            transition: box-shadow 0.2s ease;
        }

        .lf-similar-card:hover .lf-similar-card__poster {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .lf-similar-card__title {
            font-size: 0.85rem;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.2s ease;
            color: var(--clr-text-main);
        }

        .lf-similar-card:hover .lf-similar-card__title {
            color: var(--clr-accent);
        }

        /* ============================================
           RESPONSIVE
           ============================================ */
        @media (max-width: 900px) {
            .lf-series-hero__details {
                flex-direction: column;
            }

            .lf-series-hero__cast-info {
                flex: 1;
            }
        }

        @media (max-width: 768px) {
            .lf-series-hero {
                padding: 20px var(--content-padding);
                height: auto;
                min-height: 60vh;
            }

            .lf-series-hero__content {
                flex-direction: column;
                align-items: center;
                text-align: center;
            }

            .lf-series-hero__poster {
                width: 140px;
            }

            .lf-series-hero__title {
                font-size: 1.6rem;
            }

            .lf-series-hero__meta {
                justify-content: center;
                flex-wrap: wrap;
            }

            .lf-episode-grid {
                grid-template-columns: 1fr;
            }

            .lf-episodes-header {
                flex-direction: column;
                gap: 12px;
                align-items: flex-start;
            }
        }
    `;

    // =========================================================================
    // CSS INJECTION
    // =========================================================================
    function injectStyles() {
        if (document.getElementById(CONFIG.cssId)) return;

        const style = document.createElement('style');
        style.id = CONFIG.cssId;
        style.textContent = SERIES_DETAIL_CSS;
        document.head.appendChild(style);
        log('CSS injected');
    }

    // =========================================================================
    // UI GENERATORS
    // =========================================================================

    /**
     * Create hero section HTML
     * @param {Object} series - Series data object
     */
    function createHeroSection(series) {
        const backdropUrl = series.backdropUrl || '';
        const posterUrl = series.posterUrl || '';
        const title = series.name || 'Unknown Series';
        const year = series.year || '';
        const rating = series.officialRating || 'TV-14';
        const communityRating = series.communityRating ? series.communityRating.toFixed(1) : '';
        const episodeCount = series.episodeCount || 0;
        const description = series.overview || '';
        const genres = (series.genres || []).slice(0, 3).join(', ');
        const studios = (series.studios || []).slice(0, 2).map(s => s.Name || s).join(', ');
        const cast = (series.people || []).filter(p => p.Type === 'Actor').slice(0, 3).map(p => p.Name).join(', ');
        const logoUrl = series.logoUrl || '';

        return `
            <section class="lf-series-hero" id="lfSeriesHero">
                <div class="lf-series-hero__backdrop" id="lfHeroBackdrop"
                    style="background-image: url('${backdropUrl}');"></div>
                
                <div class="lf-series-hero__trailer" id="lfHeroTrailer">
                    <iframe id="lfTrailerIframe" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                </div>

                ${logoUrl ? `<img class="lf-series-hero__logo" src="${logoUrl}" alt="${title} Logo">` : ''}

                <div class="lf-series-hero__content">
                    <img class="lf-series-hero__poster" src="${posterUrl}" alt="${title}">

                    <div class="lf-series-hero__info">
                        <h1 class="lf-series-hero__title">${title}</h1>

                        <div class="lf-series-hero__meta">
                            ${year ? `<span>${year}</span><span>•</span>` : ''}
                            <span>${rating}</span>
                            ${communityRating ? `
                                <span>•</span>
                                <div class="lf-series-hero__rating">
                                    <span class="material-icons">star</span>
                                    <span>${communityRating}</span>
                                </div>
                            ` : ''}
                            ${episodeCount ? `<span>•</span><span>${episodeCount} Episodes</span>` : ''}
                        </div>

                        <div class="lf-series-hero__actions">
                            <button class="lf-btn lf-btn--primary" id="lfWatchNowBtn">
                                <span class="material-icons">play_arrow</span>
                                Watch Now
                            </button>
                            <button class="lf-btn lf-btn--glass" id="lfTrailerBtn">
                                <span class="material-icons">theaters</span>
                                Watch Trailer
                            </button>
                            <div class="lf-btn-group">
                                <button class="lf-btn lf-btn--glass lf-btn--icon-only lf-btn--heart" id="lfHeartBtn">
                                    <span class="material-icons">favorite_border</span>
                                </button>
                                <button class="lf-mute-btn" id="lfMuteBtn" title="Toggle Mute" style="display: none;">
                                    <span class="material-icons">volume_off</span>
                                </button>
                            </div>
                        </div>

                        <div class="lf-series-hero__details">
                            <div class="lf-series-hero__description">
                                <p class="lf-series-hero__description-text" id="lfDescriptionText">${description}</p>
                                <button class="lf-series-hero__load-more" id="lfLoadMoreBtn">
                                    <span>Load more</span>
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

    /**
     * Create language selector HTML
     */
    function createLanguageSelector(audioStreams = [], subtitleStreams = [], targetEpisodeId = null) {
        console.log('[DEBUG] createLanguageSelector called with:', { audio: audioStreams.length, subs: subtitleStreams.length, targetId: targetEpisodeId });

        const savedAudio = localStorage.getItem('legitflix-audio-pref') || 'en';
        const savedSub = localStorage.getItem('legitflix-sub-pref') || 'en';

        const mapStreamToOption = (stream) => ({
            code: stream.Language || 'und',
            name: stream.Language || stream.Title || 'Unknown',
            displayTitle: stream.DisplayTitle || stream.Title || stream.Language || 'Unknown'
        });

        const uniqueStreams = (streams) => {
            const seen = new Set();
            if (!streams || streams.length === 0) return [];
            return streams.map(mapStreamToOption).filter(s => {
                if (seen.has(s.code)) return false;
                seen.add(s.code);
                return true;
            });
        };

        const availableAudio = uniqueStreams(audioStreams);
        const availableSubs = uniqueStreams(subtitleStreams);

        // Fallbacks
        const audioOptions = availableAudio.length > 0 ? availableAudio : [{ code: 'en', name: 'English' }];
        const subOptions = availableSubs.length > 0 ? availableSubs : [{ code: 'en', name: 'English' }];

        // Placeholder for old languages array removal
        const languages = [];

        // Helper to create options
        const createOptions = (type, list, current) => list.map(l => `
            <div class="lf-filter-dropdown__option ${l.code === current ? 'is-selected' : ''}" 
                 data-type="${type}" data-lang="${l.code}">
                <span>${l.name}</span>
                ${l.code === current ? '<span class="material-icons">check</span>' : ''}
            </div>
        `).join('');

        const html = `
            <div class="lf-filter-dropdown lf-lang-selector" id="lfLangSelector">
                <button class="lf-filter-btn" title="Audio & Subtitles">
                    <span class="material-icons">subtitles</span>
                    <span id="lfLangText">Audio & Subs</span>
                    <span class="material-icons">expand_more</span>
                </button>
                <div class="lf-filter-dropdown__menu lf-lang-menu">
                    <div class="lf-lang-section">
                        <div class="lf-dropdown-section-title">Audio</div>
                        ${createOptions('audio', audioOptions, savedAudio)}
                    </div>
                    <div class="lf-lang-separator"></div>
                    <div class="lf-lang-section">
                        <div class="lf-dropdown-section-title">Subtitles</div>
                        ${createOptions('subtitle', subOptions, savedSub)}
                    </div>
                    <div class="lf-lang-footer">
                        <button class="lf-edit-subs-btn" id="lfEditSubsBtn" ${targetEpisodeId ? `data-episode-id="${targetEpisodeId}"` : ''}>
                            <span class="material-icons">edit</span>
                            <span>Edit Subtitles</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        return html;
    }

    /**
     * Create season selector HTML
     * @param {Array} seasons - Array of season objects
     * @param {number} selectedIndex - Currently selected season index
     */
    function createSeasonSelector(seasons, selectedIndex = 0) {
        const selectedSeason = seasons[selectedIndex];
        const selectedText = selectedSeason?.name || 'Season 1';

        const options = seasons.map((season, i) => `
            <div class="lf-season-selector__option ${i === selectedIndex ? 'is-selected' : ''}" 
                 data-season-id="${season.id}" data-season-index="${i}">
                <span>${season.name}</span>
                ${season.episodeCount > 0 ? `<span class="lf-season-selector__option-count">${season.episodeCount} ep</span>` : ''}
            </div>
        `).join('');

        return `
            <div class="lf-season-selector" id="lfSeasonSelector">
                <button class="lf-season-selector__button ${seasons.length <= 1 ? 'is-disabled' : ''}" 
                        ${seasons.length <= 1 ? 'disabled' : ''}>
                    <span id="lfSelectedSeasonText">${selectedText}</span>
                    <span class="material-icons">expand_more</span>
                </button>
                <div class="lf-season-selector__dropdown">${options}</div>
            </div>
        `;
    }

    /**
     * Create episode grid HTML
     * @param {Array} episodes - Array of episode objects
     */
    function createEpisodeGrid(episodes) {
        return episodes.map(ep => {
            const thumbUrl = ep.thumbnailUrl || '';
            const episodeNum = ep.indexNumber || 0;
            const title = ep.name || `Episode ${episodeNum}`;
            const overview = ep.overview || '';
            const duration = ep.runTimeTicks ? formatDuration(ep.runTimeTicks) : '';
            const progress = ep.userData?.PlayedPercentage || 0;
            const hasProgress = progress > 0;
            const isPlayed = ep.userData?.Played;

            return `
                <div class="lf-episode-card ${isPlayed ? 'is-watched' : ''}" data-episode-id="${ep.id}">
                    <div class="lf-episode-card__thumbnail">
                        <img src="${thumbUrl}" alt="${title}">
                        <div class="lf-episode-card__play-icon">
                            <span class="material-icons">play_arrow</span>
                        </div>
                        <div class="lf-episode-checkbox">
                            <span class="material-icons">check</span>
                        </div>
                        <span class="lf-episode-card__badge">E${episodeNum}</span>
                        ${duration ? `<span class="lf-episode-card__duration">${duration}</span>` : ''}
                        ${hasProgress ? `
                            <div class="lf-episode-card__progress">
                                <div class="lf-episode-card__progress-bar" style="width: ${progress}%;"></div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="lf-episode-card__info">
                        <h3 class="lf-episode-card__title">${title}</h3>
                        <p class="lf-episode-card__subtitle">${overview}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Create episodes section HTML
     * @param {Array} seasons - Season data for selector
     * @param {Array} episodes - Episodes for current season
     */
    function createEpisodesSection(seasons, episodes) {
        // ... (truncated for brevity, keeping identifying logic same) ...
        // Find first unwatched episode logic...
        let targetEpisode = null;
        if (episodes && episodes.length > 0) {
            targetEpisode = episodes.find(e => !e.userData?.Played) || episodes[0];
        }

        let audioStreams = [];
        let subtitleStreams = [];
        let targetEpisodeId = null;

        if (targetEpisode && targetEpisode.MediaSources && targetEpisode.MediaSources.length > 0) {
            targetEpisodeId = targetEpisode.id;
            const source = targetEpisode.MediaSources[0];
            if (source.MediaStreams) {
                audioStreams = source.MediaStreams.filter(s => s.Type === 'Audio');
                subtitleStreams = source.MediaStreams.filter(s => s.Type === 'Subtitle');
            }
        }

        return `
            <hr class="lf-section-divider">
            <section class="lf-content-section" id="lfEpisodesSection">
                <div class="lf-episodes-header">
                    ${createSeasonSelector(seasons)}
                    <div class="lf-filter-controls">
                        ${createLanguageSelector(audioStreams, subtitleStreams, targetEpisodeId)}
                        
                        <!-- Bulk Edit Button -->
                        <button class="lf-filter-btn" id="lfBulkActionBtn" title="Bulk Edit">
                            <span class="material-icons">done_all</span>
                            <span id="lfBulkActionText">Mark Season Watched</span>
                        </button>

                        <div class="lf-filter-dropdown" id="lfSortDropdown">
                            <button class="lf-filter-btn">
                                <span class="material-icons">sort</span>
                                <span id="lfSortText">Newest</span>
                            </button>
                            <div class="lf-filter-dropdown__menu">
                                <div class="lf-filter-dropdown__option is-selected" data-sort="newest">
                                    <span class="material-icons">arrow_downward</span>
                                    Newest First
                                </div>
                                <div class="lf-filter-dropdown__option" data-sort="oldest">
                                    <span class="material-icons">arrow_upward</span>
                                    Oldest First
                                </div>
                            </div>
                        </div>
                        <div class="lf-filter-dropdown" id="lfFilterDropdown">
                            <button class="lf-filter-btn">
                                <span class="material-icons">filter_list</span>
                                <span id="lfFilterText">All</span>
                            </button>
                            <div class="lf-filter-dropdown__menu">
                                <div class="lf-filter-dropdown__option is-selected" data-filter="all">
                                    <span class="material-icons">check</span>
                                    All Episodes
                                </div>
                                <div class="lf-filter-dropdown__option" data-filter="unwatched">
                                    <span class="material-icons">visibility_off</span>
                                    Unwatched
                                </div>
                                <div class="lf-filter-dropdown__option" data-filter="watched">
                                    <span class="material-icons">visibility</span>
                                    Watched
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="lf-episode-grid">${createEpisodeGrid(episodes)}</div>
            </section>
        `;
    }

    // ... Use separate tool call for the Season Selector logic update if I can't reach it here (it's around line 2760) ...
    // Actually, I can replace the function definitions here, but the update logic is far down.
    // I will just update the function definitions first.

    // Wait, if I change createEpisodeGrid now, I break the logic at line 2773 BEFORE I fix it.
    // But valid JS code will be written. It won't break until run.
    // I should try to include the season selector update in the same chunk if possible, or do it immediately after.
    // The file is large (2900 lines). `createEpisodeGrid` is at 1118. `wireUpButtons` is at 2760.
    // I will do two edits. One for the functions, one for the event listener.


    /**
     * Create cast section HTML
     * @param {Array} people - Cast/Crew array
     */
    function createCastSection(people) {
        const actors = people.filter(p => p.Type === 'Actor').slice(0, 15);
        if (actors.length === 0) return '';

        const cards = actors.map(person => {
            const imageUrl = person.imageUrl || '';
            const name = person.Name || 'Unknown';
            const role = person.Role || '';

            return `
                <div class="lf-cast-card" data-person-id="${person.Id}">
                    <img class="lf-cast-card__image" src="${imageUrl}" alt="${name}">
                    <div class="lf-cast-card__name">${name}</div>
                    <div class="lf-cast-card__role">${role}</div>
                </div>
            `;
        }).join('');

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

    /**
     * Create similar items section HTML
     * @param {Array} items - Similar items array
     */
    function createSimilarSection(items) {
        if (!items || items.length === 0) return '';

        const cards = items.slice(0, 12).map(item => {
            const posterUrl = item.posterUrl || '';
            const title = item.Name || 'Unknown';

            return `
                <div class="lf-similar-card" data-item-id="${item.Id}">
                    <img class="lf-similar-card__poster" src="${posterUrl}" alt="${title}">
                    <div class="lf-similar-card__title">${title}</div>
                </div>
            `;
        }).join('');

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
    // UTILITIES
    // =========================================================================
    function formatDuration(ticks) {
        const minutes = Math.floor(ticks / 600000000);
        const seconds = Math.floor((ticks % 600000000) / 10000000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Enforce grid styles using MutationObserver to prevent external overrides
     */
    function enforceGridStyles(grid) {
        if (!grid) return;

        const applyParams = () => {
            grid.style.setProperty('display', 'grid', 'important');
            grid.style.setProperty('grid-template-columns', 'repeat(auto-fill, minmax(280px, 1fr))', 'important');
            grid.style.setProperty('gap', '20px', 'important');
            grid.style.setProperty('width', '100%', 'important');
        };

        // Apply immediately
        applyParams();

        // Watch for changes
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                    // Check if our styles were removed/changed (basic check)
                    if (grid.style.display !== 'grid') shouldReapply = true;
                }
            });
            if (shouldReapply) {
                // disconnect momentarily to avoid infinite loop
                observer.disconnect();
                applyParams();
                observer.observe(grid, { attributes: true, attributeFilter: ['style', 'class'] });
            }
        });

        observer.observe(grid, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    // =========================================================================
    // SUBTITLE MANAGER (Custom Implementation)
    // =========================================================================
    const SubtitleManager = {
        modalId: 'lfSubtitleModal',

        async show(episodeId) {
            log('Opening Subtitle Manager for:', episodeId);
            this.injectModal();
            const modal = document.getElementById(this.modalId);

            // Show modal
            modal.classList.remove('hide');
            modal.classList.add('opened');
            modal.dataset.episodeId = episodeId;

            // Load initial data
            await this.loadCurrentSubtitles(episodeId);

            // Setup listeners (if not already)
            if (!modal.dataset.listenersAttached) {
                this.attachListeners(modal);
                modal.dataset.listenersAttached = 'true';
            }
        },

        injectModal() {
            if (document.getElementById(this.modalId)) return;

            const html = `
                <div id="${this.modalId}" class="lf-modal-overlay hide">
                    <div class="dialogContainer">
                        <div class="focuscontainer dialog dialog-fixedSize dialog-small formDialog subtitleEditorDialog opened" 
                             style="animation: 180ms ease-out 0s 1 normal both running scaleup; max-width: 800px; margin: 5vh auto; background: var(--color-background-secondary, #1c1c1c); border-radius: var(--radius-lg, 12px);">
                            
                            <div class="formDialogHeader" style="display: flex; align-items: center; padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <button class="btnCancel" tabindex="-1" title="Back" style="background:none; border:none; color:inherit; cursor:pointer; padding: 8px; border-radius: 50%;">
                                    <span class="material-icons" aria-hidden="true" style="font-size: 24px;">arrow_back</span>
                                </button>
                                <h3 class="formDialogHeaderTitle" style="margin: 0 0 0 16px; font-size: 1.2rem; font-weight: 600;">Subtitles</h3>
                            </div>

                            <div class="formDialogContent smoothScrollY" style="padding: 20px; max-height: 80vh; overflow-y: auto;">
                                <div class="dialogContentInner dialog-content-centered">
                                    
                                    <!-- EXISTING SUBTITLES -->
                                    <div class="subtitleList" style="margin-bottom:2em">
                                        <h2 style="font-size: 1rem; margin-bottom: 1rem; opacity: 0.8;">My Subtitles</h2>
                                        <div id="lfCurrentSubsList">Loading...</div>
                                    </div>

                                    <!-- SEARCH -->
                                    <h2 style="font-size: 1rem; margin-bottom: 0.5rem; opacity: 0.8; margin-top: 2rem;">Search for Subtitles</h2>
                                    
                                    <!-- TARGET INFO BOX -->
                                    <div id="lfSubtitleTargetInfo" style="background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; font-size: 0.9rem; color: var(--clr-text-muted); border-left: 3px solid var(--clr-accent, #00a4dc);">
                                        Fetching episode info...
                                    </div>

                                    <form class="subtitleSearchForm" style="display: flex; gap: 12px; align-items: flex-end;">
                                        <div class="selectContainer flex-grow" style="flex: 1; display: flex; flex-direction: column; justify-content: space-around; margin-bottom: 0px !important;">
                                            <label class="selectLabel" for="selectLanguage" style="display: block; font-size: 0.85rem; margin-bottom: 6px; opacity: 0.8;">Language</label>
                                            
                                            <!-- STANDARD SELECT (No 'is=emby-select' to avoid truncation/override) -->
                                            <select id="selectLanguage" style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: white; border-radius: 6px; font-size: 1rem; cursor: pointer; appearance: none; -webkit-appearance: none;">
                                                <option value="eng">English</option>
                                                <option value="spa">Spanish</option>
                                                <option value="fre">French</option>
                                                <option value="ger">German</option>
                                                <option value="ita">Italian</option>
                                                <option value="por">Portuguese</option>
                                                <option value="pol">Polish</option>
                                                <option value="rus">Russian</option>
                                                <option value="dut">Dutch</option>
                                                <option value="swe">Swedish</option>
                                                <option value="nor">Norwegian</option>
                                                <option value="fin">Finnish</option>
                                                <option value="da">Danish</option>
                                                <option value="tur">Turkish</option>
                                                <option value="ara">Arabic</option>
                                                <option value="heb">Hebrew</option>
                                                <option value="hun">Hungarian</option>
                                                <option value="cze">Czech</option>
                                                <option value="rom">Romanian</option>
                                                <option value="vie">Vietnamese</option>
                                                <option value="tha">Thai</option>
                                                <option value="chi">Chinese</option>
                                                <option value="jpn">Japanese</option>
                                                <option value="kor">Korean</option>
                                                <option value="gre">Greek</option>
                                                <option value="ind">Indonesian</option>
                                                <option value="may">Malay</option>
                                                <option value="fas">Persian</option>
                                                <option value="ukr">Ukrainian</option>
                                                <option value="hrv">Croatian</option>
                                                <option value="slv">Slovenian</option>
                                                <option value="bul">Bulgarian</option>
                                                <option value="srp">Serbian</option>
                                            </select>
                                        </div>
                                        <button type="submit" class="raised btnSubmit block button-submit emby-button" style="background: var(--clr-accent, #00a4dc); color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 1rem; margin-bottom: 0;">
                                            Search
                                        </button>
                                    </form>

                                    <div class="subtitleResults" id="lfSubtitleSearchResults" style="margin-top: 24px;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <style>
                        .lf-modal-overlay {
                            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                            background: rgba(0,0,0,0.85); z-index: 10000;
                            display: flex; align-items: flex-start; justify-content: center;
                            overflow-y: auto;
                            backdrop-filter: blur(5px);
                        }
                        .lf-modal-overlay.hide { display: none !important; }
                        
                        .listItem { 
                            display: flex; align-items: center; padding: 14px; 
                            background: rgba(255,255,255,0.03);
                            border-radius: 4px;
                            margin-bottom: 4px;
                        }
                        .listItem:hover {
                            background: rgba(255,255,255,0.06);
                        }
                        .listItemBody { flex: 1; margin: 0 16px; }
                        .secondary { font-size: 0.85rem; opacity: 0.6; margin-top: 4px; }
                        
                        .btnDelete { 
                            background: rgba(233, 30, 99, 0.15) !important; 
                            border: 1px solid rgba(233, 30, 99, 0.3) !important; 
                            color: #ff4081 !important; 
                            cursor: pointer; 
                            border-radius: 4px;
                            padding: 8px;
                            display: flex;
                        }
                        .btnDelete:hover { 
                            background: rgba(233, 30, 99, 0.25) !important; 
                        }
                        
                        .btnDownload { 
                            background: rgba(255,255,255,0.1) !important; 
                            border: none !important; 
                            color: white !important; 
                            cursor: pointer; 
                            border-radius: 4px;
                            padding: 8px 16px;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            font-weight: 500;
                            font-size: 0.9rem;
                        }
                        .btnDownload:hover { background: rgba(255,255,255,0.2) !important; }

                        /* Custom Scrollbar for Modal */
                        .smoothScrollY::-webkit-scrollbar { width: 8px; }
                        .smoothScrollY::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                        .smoothScrollY::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
                    </style>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        },

        async loadCurrentSubtitles(episodeId) {
            const listContainer = document.querySelector('#lfCurrentSubsList');
            const infoBox = document.querySelector('#lfSubtitleTargetInfo');

            listContainer.innerHTML = '<div style="padding: 10px; opacity: 0.6;">Fetching subtitles...</div>';

            try {
                const auth = await getAuth();
                const response = await fetch(`/Users/${auth.UserId}/Items/${episodeId}`, {
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });
                const data = await response.json();

                // Update Info Box
                if (infoBox) {
                    const seasonName = data.SeasonName || (data.ParentIndexNumber ? `Season ${data.ParentIndexNumber}` : '');
                    const epNum = data.IndexNumber ? `E${data.IndexNumber}` : '';
                    const fullCode = (data.ParentIndexNumber && data.IndexNumber)
                        ? `S${String(data.ParentIndexNumber).padStart(2, '0')}E${String(data.IndexNumber).padStart(2, '0')}`
                        : epNum;

                    infoBox.innerHTML = `
                        <div style="font-weight: 600; color: var(--clr-text-main); font-size: 1rem;">${data.Name}</div>
                        <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 2px;">
                            ${data.SeriesName || ''} • ${seasonName} • ${fullCode}
                        </div>
                    `;
                }

                // Get streams
                const streams = (data.MediaSources?.[0]?.MediaStreams || []).filter(s => s.Type === 'Subtitle');

                if (streams.length === 0) {
                    listContainer.innerHTML = '<div style="padding: 10px; opacity: 0.6;">No subtitles found.</div>';
                    return;
                }

                listContainer.innerHTML = streams.map((s, index) => `
                    <div class="listItem">
                        <span class="material-icons" style="opacity: 0.7;">closed_caption</span>
                        <div class="listItemBody">
                            <div style="font-weight: 500;">${s.DisplayTitle || s.Title || s.Language || 'Unknown'}</div>
                            <div class="secondary">${s.IsExternal ? 'External' : 'Embedded'} • ${s.Codec || ''} • ${s.IsForced ? 'Forced' : 'Default'}</div>
                        </div>
                        ${s.IsExternal ? `
                        <button class="btnDelete" data-index="${s.Index}" title="Delete">
                            <span class="material-icons" style="font-size: 18px;">delete</span>
                        </button>` : ''}
                    </div>
                `).join('');

                // Bind delete buttons
                listContainer.querySelectorAll('.btnDelete').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const index = e.currentTarget.dataset.index;
                        if (confirm('Are you sure you want to delete this subtitle?')) {
                            this.deleteSubtitle(episodeId, index, e.currentTarget);
                        }
                    });
                });

            } catch (e) {
                log('Error loading subtitles:', e);
                listContainer.innerHTML = `<div style="color: #ff5252;">Error loading subtitles: ${e.message}</div>`;
                if (infoBox) infoBox.textContent = 'Error loading episode info.';
            }
        },

        async deleteSubtitle(episodeId, subtitleIndex, buttonElement) {
            // Optimistic UI
            if (buttonElement) {
                buttonElement.innerHTML = '<span class="material-icons spinning">sync</span>';
            }

            try {
                const auth = await getAuth();
                // Endpoint: DELETE /Videos/{Id}/Subtitles/{Index}
                const response = await fetch(`/Videos/${episodeId}/Subtitles/${subtitleIndex}`, {
                    method: 'DELETE',
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });

                if (!response.ok) {
                    throw new Error(`Delete failed: ${response.statusText}`);
                }

                // Success
                if (buttonElement) {
                    buttonElement.closest('.listItem').style.opacity = '0.5';
                }

                // Refresh list
                setTimeout(() => {
                    this.loadCurrentSubtitles(episodeId);
                }, 1000);

            } catch (e) {
                console.error('Error deleting subtitle:', e);
                if (buttonElement) {
                    buttonElement.innerHTML = '<span class="material-icons" style="color: #ff5252;">error</span>';
                }
                alert('Failed to delete subtitle: ' + e.message);
            }
        },

        async searchSubtitles(episodeId, language) {
            const resultsContainer = document.querySelector('#lfSubtitleSearchResults');
            resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.6;">Searching...</div>';

            try {
                const auth = await getAuth();
                const url = `/Items/${episodeId}/RemoteSearch/Subtitles/${language}`;
                const response = await fetch(url, {
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });
                const data = await response.json(); // Array of RemoteSubtitleInfo

                if (!data || data.length === 0) {
                    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.6;">No results found.</div>';
                    return;
                }

                resultsContainer.innerHTML = data.map(sub => `
                    <div class="listItem">
                        <div class="listItemBody">
                            <div style="font-weight: 500;">${sub.Name}</div>
                            <div class="secondary">
                                <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${sub.Format || 'SRT'}</span>
                                <span style="margin-left: 8px;">${sub.ProviderName || 'Unknown Provider'}</span>
                                <span style="margin-left: 8px;">Downloads: ${sub.DownloadCount || 0}</span>
                            </div>
                        </div>
                        <button class="btnDownload" data-id="${sub.Id}" title="Download">
                            <span class="material-icons">cloud_download</span>
                            <span>Download</span>
                        </button>
                    </div>
                `).join('');

                // Bind download buttons
                resultsContainer.querySelectorAll('.btnDownload').forEach(btn => {
                    btn.addEventListener('click', (e) => this.download(episodeId, e.currentTarget.dataset.id));
                });

            } catch (e) {
                log('Error searching:', e);
                resultsContainer.innerHTML = `<div style="color: #ff5252;">Search failed: ${e.message}</div>`;
            }
        },

        async download(episodeId, subtitleId) {
            const resultsContainer = document.querySelector('#lfSubtitleSearchResults');
            // Optimistic UI
            const btn = resultsContainer.querySelector(`button[data-id="${subtitleId}"]`);
            if (btn) btn.innerHTML = '<span class="material-icons spinning">sync</span>';

            try {
                const auth = await getAuth();
                // Standard Jellyfin download endpoint
                await fetch(`/Items/${episodeId}/RemoteSearch/Subtitles/${subtitleId}`, {
                    method: 'POST',
                    headers: { 'X-Emby-Token': auth.AccessToken }
                });

                if (btn) {
                    btn.innerHTML = '<span class="material-icons" style="color: #4caf50;">check_circle</span>';
                }

                // Refresh list
                setTimeout(() => {
                    this.loadCurrentSubtitles(episodeId);
                }, 1000);

            } catch (e) {
                log('Download error:', e);
                if (btn) btn.innerHTML = '<span class="material-icons" style="color: #ff5252;">error</span>';
            }
        },

        attachListeners(modal) {
            // Close
            modal.querySelector('.btnCancel').addEventListener('click', () => {
                modal.classList.add('hide');
                modal.classList.remove('opened');
            });
            // Click outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hide');
                    modal.classList.remove('opened');
                }
            });

            // Search
            const form = modal.querySelector('.subtitleSearchForm');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const lang = modal.querySelector('#selectLanguage').value;
                const episodeId = modal.dataset.episodeId;
                this.searchSubtitles(episodeId, lang);
            });
        }
    };

    // Observer setup (keeping the rest of the file)
    // ===================================
    function attachEventListeners(container) {
        console.log('[DEBUG] attachEventListeners called');
        // Season dropdown toggle
        const seasonSelector = container.querySelector('#lfSeasonSelector');
        if (seasonSelector) {
            const button = seasonSelector.querySelector('.lf-season-selector__button:not([disabled])');
            button?.addEventListener('click', () => seasonSelector.classList.toggle('is-open'));
        }

        // Language Selector
        const langSelector = container.querySelector('#lfLangSelector');
        if (langSelector) {
            const btn = langSelector.querySelector('.lf-filter-btn');
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelector('#lfSortDropdown')?.classList.remove('is-open');
                container.querySelector('#lfFilterDropdown')?.classList.remove('is-open');
                langSelector.classList.toggle('is-open');
            });

            // Handle options (Audio/Subtitle)
            langSelector.querySelectorAll('.lf-filter-dropdown__option').forEach(opt => {
                opt.addEventListener('click', function () {
                    const type = this.dataset.type; // 'audio' or 'subtitle'
                    const lang = this.dataset.lang;

                    // Update selected state in UI (per section)
                    const section = this.closest('.lf-lang-section');
                    section.querySelectorAll('.lf-filter-dropdown__option').forEach(o => {
                        o.classList.remove('is-selected');
                        const check = o.querySelector('.material-icons');
                        if (check && check.textContent === 'check') check.remove();
                    });

                    this.classList.add('is-selected');
                    // Add checkmark if not present
                    if (!this.querySelector('.material-icons')) {
                        const check = document.createElement('span');
                        check.className = 'material-icons';
                        check.textContent = 'check';
                        this.appendChild(check);
                    }

                    // Save preference
                    if (type === 'audio') localStorage.setItem('legitflix-audio-pref', lang);
                    if (type === 'subtitle') localStorage.setItem('legitflix-sub-pref', lang);

                    console.log(`[DEBUG] Language selected: ${type} -> ${lang}`);

                    // Actually switch stream?
                    // We might need to reload or notify playback logic vs simple pref save
                    // For now we just update UI as requested
                });
            });

            // Edit Subtitles Button
            const editSubsBtn = langSelector.querySelector('#lfEditSubsBtn');
            editSubsBtn?.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Get target ID (Episode ID)
                // We prefer the button's dataset attribute if available
                const targetId = this.dataset.episodeId || currentSeriesId; // Fallback if needed, though usually incorrect for subs

                console.log('[DEBUG] Edit Subtitles Clicked. Target:', targetId);

                if (targetId) {
                    SubtitleManager.show(targetId);
                } else {
                    console.error('No target ID for subtitle editor');
                }

                langSelector.classList.remove('is-open');
            });

            document.addEventListener('click', (e) => {
                if (!langSelector?.contains(e.target)) langSelector?.classList.remove('is-open');
            });
        }

        // Sort dropdown
        const sortDropdown = container.querySelector('#lfSortDropdown');
        if (sortDropdown) {
            const button = sortDropdown.querySelector('.lf-filter-btn');
            button?.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelector('#lfFilterDropdown')?.classList.remove('is-open');
                container.querySelector('#lfLangSelector')?.classList.remove('is-open');
                sortDropdown.classList.toggle('is-open');
            });

            sortDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(opt => {
                opt.addEventListener('click', function () {
                    const sortType = this.dataset.sort;
                    container.querySelector('#lfSortText').textContent = sortType === 'newest' ? 'Newest' : 'Oldest';

                    sortDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(o => o.classList.remove('is-selected'));
                    this.classList.add('is-selected');
                    sortDropdown.classList.remove('is-open');

                    // Reverse episode grid
                    const grid = container.querySelector('.lf-episode-grid');
                    if (grid) {
                        const cards = Array.from(grid.children);
                        cards.reverse();
                        grid.innerHTML = '';
                        cards.forEach(card => grid.appendChild(card));
                    }
                });
            });
        }

        // Filter dropdown
        const filterDropdown = container.querySelector('#lfFilterDropdown');
        if (filterDropdown) {
            const button = filterDropdown.querySelector('.lf-filter-btn');
            button?.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelector('#lfSortDropdown')?.classList.remove('is-open');
                container.querySelector('#lfLangSelector')?.classList.remove('is-open');
                filterDropdown.classList.toggle('is-open');
            });

            filterDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(opt => {
                opt.addEventListener('click', function () {
                    const filterType = this.dataset.filter;
                    const textMap = { all: 'All', watched: 'Watched', unwatched: 'Unwatched' };
                    container.querySelector('#lfFilterText').textContent = textMap[filterType];

                    filterDropdown.querySelectorAll('.lf-filter-dropdown__option').forEach(o => o.classList.remove('is-selected'));
                    this.classList.add('is-selected');
                    filterDropdown.classList.remove('is-open');

                    // Filter episodes
                    container.querySelectorAll('.lf-episode-card').forEach(card => {
                        const progressBar = card.querySelector('.lf-episode-card__progress-bar');
                        const progress = progressBar ? parseFloat(progressBar.style.width) : 0;

                        if (filterType === 'all') {
                            card.style.display = '';
                        } else if (filterType === 'watched' && progress > 0) {
                            card.style.display = '';
                        } else if (filterType === 'unwatched' && progress === 0) {
                            card.style.display = '';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            });
        }

        // Description expand/collapse
        const loadMoreBtn = container.querySelector('#lfLoadMoreBtn');
        const descText = container.querySelector('#lfDescriptionText');

        if (loadMoreBtn && descText) {
            // Check if text is clamped (overflowing)
            // We use a small tolerance
            if (descText.scrollHeight <= descText.clientHeight + 2) {
                loadMoreBtn.style.display = 'none';
            }

            loadMoreBtn.addEventListener('click', function () {
                const isExpanded = descText.classList.toggle('is-expanded');
                this.classList.toggle('is-expanded', isExpanded);
                this.querySelector('span:first-child').textContent = isExpanded ? 'Show less' : 'Load more';
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!seasonSelector?.contains(e.target)) seasonSelector?.classList.remove('is-open');
            if (!sortDropdown?.contains(e.target)) sortDropdown?.classList.remove('is-open');
            if (!filterDropdown?.contains(e.target)) filterDropdown?.classList.remove('is-open');
        });

        // Season selection UI (Update text & close)
        // Season selection UI (Update text & close)
        // Logic moved to wireUpButtons to prevent duplication and ensure consistency
        // (Deleted legacy block to fix 'tempDiv' null error)
    }

    // =========================================================================
    // MAIN RENDER FUNCTION
    // =========================================================================

    /**
     * Render the complete series detail page
     * @param {Object} data - Object containing series, seasons, episodes, people, similar
     * @param {HTMLElement} targetContainer - Container to inject into
     */
    function renderSeriesDetailPage(data, targetContainer) {
        const { series, seasons, episodes, people, similar } = data;

        // Debug initial episodes data
        if (episodes && episodes.length > 0) {
            console.log('[DEBUG] Initial Episodes Data:', episodes[0]);
            if (!episodes[0].MediaSources) console.warn('[DEBUG] No MediaSources in initial episodes!');
        } else {
            console.warn('[DEBUG] No episodes in initial data!');
        }

        injectStyles();

        // Build complete HTML
        const html = `
            <div class="lf-series-container" id="${CONFIG.containerId}">
                ${createHeroSection(series)}
                ${createEpisodesSection(seasons, episodes)}
                ${createCastSection(people)}
                ${createSimilarSection(similar)}
            </div>
        `;

        // Inject into target
        targetContainer.innerHTML = html;

        // Attach event listeners
        const container = document.getElementById(CONFIG.containerId);
        attachEventListeners(container);

        // Enforce grid styles on initial load
        const initialGrid = container.querySelector('.lf-episode-grid');
        if (initialGrid) enforceGridStyles(initialGrid);

        // Parent Observer: Watch for Grid Replacements or Style Changes
        const episodesSection = container.querySelector('#lfEpisodesSection');
        if (episodesSection) {
            const handleMutations = () => {
                // Find the direct parent of episode cards
                const firstCard = episodesSection.querySelector('.lf-episode-card');
                if (firstCard && firstCard.parentElement) {
                    const gridContainer = firstCard.parentElement;

                    // Check if styles are missing or incorrect
                    const computed = window.getComputedStyle(gridContainer);
                    if (computed.display !== 'grid' || gridContainer.style.display !== 'grid') {
                        console.log('[DEBUG] Fixing grid layout on container:', gridContainer.className);
                        enforceGridStyles(gridContainer);
                    }
                }
            };

            const parentObserver = new MutationObserver((mutations) => {
                handleMutations();
            });
            parentObserver.observe(episodesSection, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

            // Should also run immediately in case of race condition
            handleMutations();
        }

        log('Series detail page rendered');
    }

    // =========================================================================
    // API INTEGRATION (For Jellyfin)
    // =========================================================================

    /**
     * Get auth info from Jellyfin
     */
    async function getAuth() {
        if (!window.ApiClient) return null;
        const userId = window.ApiClient.getCurrentUserId();
        if (!userId) return null;
        return {
            UserId: userId,
            AccessToken: window.ApiClient.accessToken(),
            ServerId: window.ApiClient.serverId()
        };
    }

    /**
     * Fetch series details from API
     */
    async function fetchSeriesData(seriesId) {
        const auth = await getAuth();
        if (!auth) return null;

        try {
            // Added MediaSources to fields to get stream info (usually on episodes, but checking series)
            const fields = 'Overview,Genres,Studios,OfficialRating,CommunityRating,ImageTags,BackdropImageTags,People,RemoteTrailers,ChildCount,MediaSources';
            const url = `/Users/${auth.UserId}/Items/${seriesId}?Fields=${fields}`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const item = await response.json();

            // Transform to our format
            return {
                id: item.Id,
                name: item.Name,
                year: item.ProductionYear ? `${item.ProductionYear}${item.EndDate ? ' - ' + new Date(item.EndDate).getFullYear() : ''}` : '',
                officialRating: item.OfficialRating || 'TV-14',
                communityRating: item.CommunityRating || 0,
                episodeCount: item.ChildCount || 0,
                overview: item.Overview || '',
                genres: item.Genres || [],
                studios: item.Studios || [],
                backdropUrl: item.BackdropImageTags?.length ? `/Items/${item.Id}/Images/Backdrop/0?maxWidth=1920&quality=90` : '',
                posterUrl: item.ImageTags?.Primary ? `/Items/${item.Id}/Images/Primary?fillHeight=350&fillWidth=240&quality=96` : '',
                logoUrl: item.ImageTags?.Logo ? `/Items/${item.Id}/Images/Logo?maxWidth=300&quality=90` : '',
                people: item.People || [],
                remoteTrailers: item.RemoteTrailers || [],
                isFavorite: item.UserData?.IsFavorite || false
            };
        } catch (e) {
            log('Error fetching series data:', e);
            return null;
        }
    }

    /**
     * Fetch seasons for a series
     */
    async function fetchSeasons(seriesId) {
        const auth = await getAuth();
        if (!auth) return [];

        try {
            const url = `/Shows/${seriesId}/Seasons?UserId=${auth.UserId}&Fields=ItemCounts`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const data = await response.json();

            return (data.Items || []).map(season => ({
                id: season.Id,
                name: season.Name || `Season ${season.IndexNumber}`,
                indexNumber: season.IndexNumber,
                episodeCount: season.ChildCount || season.RecursiveItemCount || 0
            }));
        } catch (e) {
            log('Error fetching seasons:', e);
            return [];
        }
    }

    /**
     * Fetch episodes for a season
     */
    async function fetchEpisodes(seriesId, seasonId) {
        const auth = await getAuth();
        if (!auth) return [];

        try {
            const fields = 'Overview,PrimaryImageAspectRatio,UserData,RunTimeTicks,MediaSources';
            const url = `/Shows/${seriesId}/Episodes?SeasonId=${seasonId}&UserId=${auth.UserId}&Fields=${fields}`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const data = await response.json();

            return (data.Items || []).map(ep => ({
                id: ep.Id,
                indexNumber: ep.IndexNumber || 0,
                name: ep.Name || `Episode ${ep.IndexNumber}`,
                overview: ep.Overview || '',
                thumbnailUrl: ep.ImageTags?.Primary ? `/Items/${ep.Id}/Images/Primary?fillHeight=180&fillWidth=320&quality=90` : '',
                runTimeTicks: ep.RunTimeTicks || 0,
                MediaSources: ep.MediaSources || [], // Pass through MediaSources
                userData: {
                    PlayedPercentage: ep.UserData?.PlayedPercentage || 0,
                    Played: ep.UserData?.Played || false
                }
            }));
        } catch (e) {
            log('Error fetching episodes:', e);
            return [];
        }
    }

    /**
     * Fetch similar items
     */
    async function fetchSimilar(seriesId) {
        const auth = await getAuth();
        if (!auth) return [];

        try {
            const url = `/Items/${seriesId}/Similar?Limit=12&UserId=${auth.UserId}`;
            const response = await fetch(url, {
                headers: { 'X-Emby-Token': auth.AccessToken }
            });
            const data = await response.json();

            return (data.Items || []).map(item => ({
                Id: item.Id,
                Name: item.Name,
                posterUrl: item.ImageTags?.Primary ? `/Items/${item.Id}/Images/Primary?fillHeight=225&fillWidth=150&quality=90` : ''
            }));
        } catch (e) {
            log('Error fetching similar:', e);
            return [];
        }
    }

    /**
     * Format people with image URLs
     */
    function formatPeople(people) {
        return people.filter(p => p.Type === 'Actor').slice(0, 15).map(person => ({
            Id: person.Id,
            Name: person.Name,
            Type: person.Type,
            Role: person.Role || '',
            imageUrl: person.PrimaryImageTag ? `/Items/${person.Id}/Images/Primary?fillHeight=100&fillWidth=100&quality=90` : ''
        }));
    }

    /**
     * Get YouTube video ID from URL
     */
    function getYoutubeId(url) {
        if (!url) return null;
        if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        if (url.includes('embed/')) return url.split('embed/')[1].split('?')[0];
        return null;
    }

    /**
     * Build YouTube embed URL
     */
    function buildYoutubeEmbedUrl(videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${videoId}`;
    }

    // =========================================================================
    // PAGE DETECTION & INJECTION
    // =========================================================================

    let currentSeriesId = null;
    let isInjecting = false;

    /**
     * Check if we're on a Series detail page
     */
    function isSeriesDetailPage() {
        const hash = window.location.hash;
        return hash.includes('details') && hash.includes('id=');
    }

    /**
     * Get series ID from URL
     */
    function getSeriesIdFromUrl() {
        const hash = window.location.hash;
        const match = hash.match(/id=([a-f0-9]+)/i);
        return match ? match[1] : null;
    }

    /**
     * Inject global style overrides to forcefully hide elements and fix background
     */
    function injectOverridesStyles() {
        const styleId = 'lf-series-overrides';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Force hide original elements */
            .itemDetailPage #itemBackdrop,
            .itemDetailPage .detailPageWrapperContainer,
            .itemDetailPage .detailRibbon,
            .itemDetailPage .detailPagePrimaryContent,
            .itemDetailPage .detailPagePrimaryContainer,
            .itemDetailPage .detailPageSecondaryContainer,
            .itemDetailPage .detailImageContainer,
            .itemDetailPage #listChildrenCollapsible,
            .itemDetailPage #childrenCollapsible,
            .itemDetailPage .nextUpSection,
            .itemDetailPage #castCollapsible,
            .itemDetailPage #guestCastCollapsible,
            .itemDetailPage #similarCollapsible,
            .itemDetailPage .itemDetailsCastSection,
            .itemDetailPage .similarSection,
            .itemDetailPage #additionalPartsCollapsible,
            .itemDetailPage #specialsCollapsible,
            .itemDetailPage #musicVideosCollapsible,
            .itemDetailPage #scenesCollapsible,
            .itemDetailPage .moreFromSeasonSection,
            .itemDetailPage .moreFromArtistSection,
            .itemDetailPage .programGuideSection,
            .itemDetailPage #seriesTimerScheduleSection,
            .itemDetailPage #seriesScheduleSection,
            .itemDetailPage #lyricsSection {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }

            /* Force background and reset padding on main containers */
            .itemDetailPage,
            .itemDetailPage.page,
            .backgroundContainer,
            [data-role="page"].itemDetailPage {
                background-image: none !important;
                background-color: var(--clr-bg-main, #141414) !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                margin-top: 0 !important;
            }

            /* Ensure wrapper starts at top */
            #${CONFIG.containerId}-wrapper {
                position: relative;
                z-index: 10;
                width: 100%;
                min-height: 100vh;
                background-color: var(--clr-bg-main, #141414);
            }
        `;
        document.head.appendChild(style);
        log('Injected global style overrides');
    }

    /**
     * Remove style overrides
     */
    function removeOverridesStyles() {
        const style = document.getElementById('lf-series-overrides');
        if (style) style.remove();
    }

    /**
     * Hide original Jellyfin page elements
     */
    function hideOriginalElements() {
        injectOverridesStyles();

        // Also manually clear any inline styles on the main container just in case
        const itemDetailPage = document.querySelector('.itemDetailPage');
        if (itemDetailPage) {
            itemDetailPage.style.backgroundImage = 'none';
            itemDetailPage.style.backgroundColor = 'var(--clr-bg-main, #141414)';
            itemDetailPage.style.padding = '0';
        }
    }

    /**
     * Main injection function - monitors for series pages and injects our UI
     */
    async function monitorSeriesDetailPage() {
        if (!isSeriesDetailPage()) {
            // Clean up if we left the page
            if (currentSeriesId) {
                currentSeriesId = null;
                const container = document.getElementById(CONFIG.containerId);
                if (container) container.remove();
                removeOverridesStyles(); // Remove our custom styles
            }
            return;
        }

        const seriesId = getSeriesIdFromUrl();
        if (!seriesId || seriesId === currentSeriesId || isInjecting) return;

        // Wait for page container
        const detailPage = document.querySelector('.itemDetailPage') ||
            document.querySelector('[data-type="Series"]') ||
            document.querySelector('.detailPageContent');
        if (!detailPage) return;

        // Check if it's actually a Series (not Movie/Episode)
        const typeElement = document.querySelector('[data-type]');
        const itemType = typeElement?.dataset?.type;

        // We need to verify this is a Series via API since DOM may not be reliable
        const auth = await getAuth();
        if (!auth) return;

        try {
            const checkUrl = `/Users/${auth.UserId}/Items/${seriesId}`;
            const checkRes = await fetch(checkUrl, { headers: { 'X-Emby-Token': auth.AccessToken } });
            const itemData = await checkRes.json();

            if (itemData.Type !== 'Series') {
                return; // Not a series, don't inject
            }
        } catch (e) {
            return;
        }

        isInjecting = true;
        currentSeriesId = seriesId;
        log('Detected Series page:', seriesId);

        try {
            // Fetch all data
            const [seriesData, seasons, similar] = await Promise.all([
                fetchSeriesData(seriesId),
                fetchSeasons(seriesId),
                fetchSimilar(seriesId)
            ]);

            if (!seriesData || seasons.length === 0) {
                log('Failed to fetch series data');
                isInjecting = false;
                return;
            }

            // Fetch episodes for first season
            const firstSeason = seasons[0];
            const episodes = await fetchEpisodes(seriesId, firstSeason.id);

            // Format people for display
            const people = formatPeople(seriesData.people);

            // Store trailer info for button
            let trailerYtId = null;
            if (seriesData.remoteTrailers && seriesData.remoteTrailers.length > 0) {
                trailerYtId = getYoutubeId(seriesData.remoteTrailers[0].Url);
            }

            // Find or create injection point
            let targetContainer = document.querySelector('.itemDetailPage .view-content') ||
                document.querySelector('.itemDetailPage') ||
                detailPage;

            // Hide original elements
            hideOriginalElements();

            // Create wrapper if not exists
            let wrapper = document.getElementById(CONFIG.containerId + '-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = CONFIG.containerId + '-wrapper';
                // Insert at the TOP of the detail page
                targetContainer.insertBefore(wrapper, targetContainer.firstChild);
            }

            // Render our UI
            renderSeriesDetailPage({
                series: seriesData,
                seasons: seasons,
                episodes: episodes,
                people: people,
                similar: similar
            }, wrapper);

            // Wire up dynamic buttons after render
            wireUpButtons(seriesId, seriesData, trailerYtId, seasons);

            log('Series detail page injected successfully');
        } catch (e) {
            log('Error injecting series page:', e);
        } finally {
            isInjecting = false;
        }
    }

    /**
     * Wire up button functionality
     */
    function wireUpButtons(seriesId, seriesData, trailerYtId, seasons) {
        const container = document.getElementById(CONFIG.containerId);
        if (!container) return;

        // Watch Now button - plays first unwatched episode
        const watchNowBtn = container.querySelector('#lfWatchNowBtn');
        if (watchNowBtn) {
            watchNowBtn.addEventListener('click', async () => {
                log('Watch Now clicked');
                // Get NextUp or first episode
                const auth = await getAuth();
                if (!auth) return;

                try {
                    const nextUpUrl = `/Shows/${seriesId}/NextUp?Limit=1&UserId=${auth.UserId}`;
                    const nextUpRes = await fetch(nextUpUrl, { headers: { 'X-Emby-Token': auth.AccessToken } });
                    const nextUpData = await nextUpRes.json();

                    let episodeId = null;
                    if (nextUpData.Items && nextUpData.Items.length > 0) {
                        episodeId = nextUpData.Items[0].Id;
                    } else {
                        // Play first episode
                        const firstSeason = seasons[0];
                        const episodes = await fetchEpisodes(seriesId, firstSeason.id);
                        if (episodes.length > 0) {
                            episodeId = episodes[0].id;
                        }
                    }

                    if (episodeId) {
                        // Use existing playback helper if available
                        if (window.legitFlixPlay) {
                            window.legitFlixPlay(episodeId);
                        } else {
                            window.location.href = `#!/details?id=${episodeId}`;
                        }
                    }
                } catch (e) {
                    log('Error playing:', e);
                }
            });
        }

        // Trailer button
        const trailerBtn = container.querySelector('#lfTrailerBtn');
        const trailerContainer = container.querySelector('#lfHeroTrailer');
        const trailerIframe = container.querySelector('#lfTrailerIframe');
        const backdrop = container.querySelector('#lfHeroBackdrop');

        const muteBtn = container.querySelector('#lfMuteBtn');

        if (trailerBtn && trailerYtId) {
            let hideUITimeout;
            const heroSection = container.querySelector('#lfSeriesHero');

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
                if (trailerContainer.classList.contains('is-playing')) {
                    startHideTimer();
                }
            };

            // Interaction listener to wake up UI
            heroSection?.addEventListener('mousemove', resetHideTimer);
            heroSection?.addEventListener('click', resetHideTimer);

            // YouTube Blocking Detection
            let blockedTimeout;
            let messageHandler;

            const showBlockedModal = () => {
                const modalId = 'lfBlockedModal';
                if (document.getElementById(modalId)) return;

                const html = `
                    <div id="${modalId}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 11000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
                        <div style="background: #1c1c1c; padding: 30px; border-radius: 12px; max-width: 400px; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                            <span class="material-icons" style="font-size: 48px; color: #ff5252; margin-bottom: 20px;">block</span>
                            <h3 style="font-size: 1.2rem; margin-bottom: 10px; color: white;">Content blocked by browser</h3>
                            <p style="color: rgba(255,255,255,0.7); margin-bottom: 24px; line-height: 1.5;">The trailer cannot be played because your browser blocked it. This usually happens due to tracking protection or ad blockers affecting the YouTube player.</p>
                            <button id="lfCloseBlockedBtn" style="background: var(--clr-accent, #00a4dc); color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', html);
                document.getElementById('lfCloseBlockedBtn').addEventListener('click', () => {
                    document.getElementById(modalId).remove();
                    // Also stop the trailer state
                    if (trailerBtn.click) trailerBtn.click(); // Trigger stop logic
                });
            };

            trailerBtn.addEventListener('click', () => {
                const isPlaying = trailerContainer.classList.contains('is-playing');

                if (isPlaying) {
                    // STOP TRAILER
                    trailerIframe.src = '';
                    trailerContainer.classList.remove('is-playing');
                    heroSection?.classList.remove('is-clean-view');
                    clearTimeout(hideUITimeout);

                    // Clear detection logic
                    clearTimeout(blockedTimeout);
                    if (messageHandler) window.removeEventListener('message', messageHandler);
                    document.getElementById('lfTrailerHelpBtn')?.remove();

                    if (backdrop) backdrop.style.opacity = '1';

                    // Reset Button
                    trailerBtn.innerHTML = `
                        <span class="material-icons">play_circle_filled</span>
                        <span>Watch Trailer</span>
                     `;

                    // Hide Mute
                    if (muteBtn) {
                        muteBtn.style.display = 'none';
                        muteBtn.classList.remove('is-muted');
                    }
                } else {
                    // PLAY TRAILER
                    log('Trailer clicked, YT ID:', trailerYtId);
                    if (trailerIframe && trailerContainer) {
                        // Update Iframe Attributes (Exact match)
                        trailerIframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
                        trailerIframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

                        const origin = window.location.origin;
                        // Embed URL with Origin for API reliability
                        const embedUrl = `https://www.youtube.com/embed/${trailerYtId}?autoplay=1&mute=1&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${trailerYtId}&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;

                        trailerIframe.src = embedUrl;
                        trailerContainer.classList.add('is-playing');
                        if (backdrop) backdrop.style.opacity = '0';

                        // Start Clean Mode Timer
                        startHideTimer();

                        // Update Button Text
                        trailerBtn.innerHTML = `
                            <span class="material-icons">stop_circle</span>
                            <span>Stop Trailer</span>
                        `;

                        // Show mute button explicity and force display
                        if (muteBtn) {
                            muteBtn.style.display = 'flex';
                            muteBtn.style.zIndex = '100'; // Ensure visibility
                            muteBtn.classList.add('is-muted');
                            muteBtn.innerHTML = '<span class="material-icons">volume_off</span>';
                        }

                        // Setup Blocking Detection
                        // If we don't get ANY message from the iframe in 5s, assume blocked
                        let receivedMessage = false;

                        messageHandler = (event) => {
                            // YouTube API sends messages as JSON strings
                            if (typeof event.data === 'string') {
                                // We accept any valid-looking JSON message from the player
                                // Common events: infoDelivery, initialDelivery, onReady, apiInfo
                                if (event.data.includes('"event"') || event.data.includes('"id"')) {
                                    receivedMessage = true;
                                    clearTimeout(blockedTimeout);
                                }
                            }
                        };
                        window.addEventListener('message', messageHandler);

                        blockedTimeout = setTimeout(() => {
                            // If playing but no API message, show a help button instead of blocking modal
                            // This avoids false positives where the video plays but API messages are blocked/delayed
                            if (!receivedMessage && trailerContainer.classList.contains('is-playing')) {
                                log('Possible block detected: No YT API message received in 4s. Showing help button.');
                                showTrailerHelpBtn();
                            }
                        }, 4000); // Reduced to 4s
                    }
                }
            });

            // Help Button Helper
            const showTrailerHelpBtn = () => {
                if (document.getElementById('lfTrailerHelpBtn')) return;

                const btn = document.createElement('button');
                btn.id = 'lfTrailerHelpBtn';
                btn.innerHTML = '<span class="material-icons">help_outline</span> <span>Trouble playing?</span>';
                btn.className = 'lf-btn lf-btn--glass';
                Object.assign(btn.style, {
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    zIndex: '100',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    opacity: '0',
                    transition: 'opacity 0.3s ease'
                });

                // Append to container (ensure relative positioning)
                trailerContainer.appendChild(btn);

                // Fade in
                requestAnimationFrame(() => btn.style.opacity = '1');

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showBlockedModal();
                });
            };

            // Mute Button Logic
            if (muteBtn) {
                muteBtn.addEventListener('click', () => {
                    const isMuted = muteBtn.classList.contains('is-muted');
                    // Need to post message to correct origin
                    const targetOrigin = '*';
                    if (trailerIframe.contentWindow) {
                        if (isMuted) {
                            trailerIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), targetOrigin);
                            muteBtn.classList.remove('is-muted');
                            muteBtn.innerHTML = '<span class="material-icons">volume_up</span>';
                        } else {
                            trailerIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), targetOrigin);
                            muteBtn.classList.add('is-muted');
                            muteBtn.innerHTML = '<span class="material-icons">volume_off</span>';
                        }
                    }
                });
            }

        } else if (trailerBtn && !trailerYtId) {
            // No trailer available - hide or disable button
            trailerBtn.style.opacity = '0.5';
            trailerBtn.style.pointerEvents = 'none';
            trailerBtn.title = 'No trailer available';
        }

        // Heart/Favorite button
        const heartBtn = container.querySelector('#lfHeartBtn');
        if (heartBtn) {
            // Set initial state
            if (seriesData.isFavorite) {
                heartBtn.classList.add('is-liked');
                heartBtn.querySelector('.material-icons').textContent = 'favorite';
            }

            heartBtn.addEventListener('click', async function () {
                const icon = this.querySelector('.material-icons');
                const wasLiked = this.classList.contains('is-liked');

                // Optimistic UI update
                this.classList.toggle('is-liked');
                icon.textContent = this.classList.contains('is-liked') ? 'favorite' : 'favorite_border';

                // Call API
                try {
                    const auth = await getAuth();
                    if (auth && window.ApiClient) {
                        await window.ApiClient.updateFavoriteStatus(auth.UserId, seriesId, !wasLiked);
                        log('Favorite updated:', !wasLiked);
                    }
                } catch (e) {
                    // Revert on error
                    this.classList.toggle('is-liked');
                    icon.textContent = wasLiked ? 'favorite' : 'favorite_border';
                    log('Error updating favorite:', e);
                }
            });
        }

        // Playback helper
        const playItem = (itemId) => {
            if (window.PlaybackManager) {
                window.PlaybackManager.play({
                    items: [itemId],
                    startPositionTicks: 0
                });
            } else if (window.legitFlixPlay) {
                window.legitFlixPlay(itemId);
            } else {
                window.location.href = `#!/details?id=${itemId}`;
            }
        };

        // Helper to refresh current season
        const refreshCurrentSeason = async () => {
            const activeSeason = container.querySelector('.lf-season-selector__option.is-selected');
            const seasonId = activeSeason ? activeSeason.dataset.seasonId : (seriesData.seasons[0]?.id || '');
            if (seasonId) activeSeason.click();
        };

        // BULK EDIT STATE
        let isSelectionMode = false;
        const selectedEpisodes = new Set();
        const bulkBtn = container.querySelector('#lfBulkActionBtn');
        const bulkText = container.querySelector('#lfBulkActionText');
        const bulkIcon = bulkBtn?.querySelector('.material-icons');

        if (bulkBtn) bulkBtn.style.display = 'flex';

        // Toggle Mode
        const toggleSelectionMode = (forceState) => {
            isSelectionMode = forceState !== undefined ? forceState : !isSelectionMode;

            if (isSelectionMode) {
                container.classList.add('is-selection-mode');
                container.querySelectorAll('.lf-episode-card').forEach(c => c.classList.add('is-selecting-mode'));
                if (bulkText) bulkText.textContent = `Mark Selected (${selectedEpisodes.size})`;
                if (bulkIcon) bulkIcon.textContent = 'check_circle';
                if (bulkBtn) bulkBtn.classList.add('lf-btn--primary');
            } else {
                container.classList.remove('is-selection-mode');
                container.querySelectorAll('.lf-episode-card').forEach(c => {
                    c.classList.remove('is-selecting-mode');
                    c.classList.remove('is-selected');
                });
                selectedEpisodes.clear();
                if (bulkText) bulkText.textContent = 'Mark Season Watched';
                if (bulkIcon) bulkIcon.textContent = 'done_all';
                if (bulkBtn) bulkBtn.classList.remove('lf-btn--primary');
            }
        };

        // Card Selection Logic
        const toggleCardSelection = (card, id) => {
            if (selectedEpisodes.has(id)) {
                selectedEpisodes.delete(id);
                card.classList.remove('is-selected');
            } else {
                selectedEpisodes.add(id);
                card.classList.add('is-selected');
            }
            if (bulkText) bulkText.textContent = `Mark Selected (${selectedEpisodes.size})`;
        };

        // Bulk Action Listener
        if (bulkBtn) {
            bulkBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent immediate triggering of click-outside
                const auth = await getAuth();
                if (!auth || !window.ApiClient) {
                    console.error('API Client or Auth missing');
                    if (bulkText) bulkText.textContent = 'Login Req.';
                    return;
                }

                if (!isSelectionMode) {
                    // "Mark Season Watched" INSTANT ACTION (No confirmation)
                    const allCards = container.querySelectorAll('.lf-episode-card');
                    if (allCards.length === 0) return;

                    bulkText.textContent = 'Updating...';

                    try {
                        const updates = Array.from(allCards).map(card => {
                            const itemId = card.dataset.episodeId;
                            // Optimistic update (Green tick)
                            card.classList.add('is-success-marked');
                            return window.ApiClient.markPlayed(auth.UserId, itemId, new Date());
                        });

                        await Promise.all(updates);
                        if (bulkText) bulkText.textContent = 'Done!';

                        // Short delay to show success state then refresh
                        setTimeout(() => {
                            refreshCurrentSeason();
                            if (bulkText) bulkText.textContent = 'Mark Season Watched';
                        }, 1000);
                    } catch (e) {
                        log('Error marking season watched:', e);
                        if (bulkText) bulkText.textContent = 'Error!';
                        allCards.forEach(c => c.classList.remove('is-success-marked'));
                    }
                } else {
                    // "Mark Selected" action (Manual selection mode)
                    if (selectedEpisodes.size === 0) {
                        toggleSelectionMode(false);
                        return;
                    }

                    if (bulkText) bulkText.textContent = 'Updating...';
                    try {
                        // Optimistic UI for selected
                        selectedEpisodes.forEach(id => {
                            const card = container.querySelector(`.lf-episode-card[data-episode-id="${id}"]`);
                            if (card) card.classList.add('is-success-marked');
                        });

                        const updates = Array.from(selectedEpisodes).map(itemId => {
                            return window.ApiClient.markPlayed(auth.UserId, itemId, new Date());
                        });
                        await Promise.all(updates);

                        if (bulkText) bulkText.textContent = 'Done!';
                        setTimeout(() => {
                            toggleSelectionMode(false);
                            refreshCurrentSeason();
                        }, 1000);
                    } catch (e) {
                        log('Error marking selected:', e);
                        if (bulkText) bulkText.textContent = 'Error!';
                        container.querySelectorAll('.is-success-marked').forEach(c => c.classList.remove('is-success-marked'));
                    }
                }
            });
        }

        // Click Outside to Exit Selection Mode
        document.addEventListener('click', (e) => {
            if (isSelectionMode) {
                // If click is NOT inside a card AND NOT the bulk button
                const isCard = e.target.closest('.lf-episode-card');
                const isBtn = e.target.closest('#lfBulkActionBtn');
                const isSeasonOption = e.target.closest('.lf-season-selector__option');

                if (!isCard && !isBtn && !isSeasonOption) {
                    toggleSelectionMode(false);
                }
            }
        });

        // Episode card clicks - play or select
        const attachCardListeners = () => {
            container.querySelectorAll('.lf-episode-card').forEach(card => {
                let longPressTimer;
                let preventClick = false;

                const startLongPress = () => {
                    preventClick = false;
                    longPressTimer = setTimeout(() => {
                        preventClick = true;
                        if (!isSelectionMode) {
                            toggleSelectionMode(true);
                        }
                        const id = card.dataset.episodeId;
                        if (!selectedEpisodes.has(id)) {
                            toggleCardSelection(card, id);
                            if (navigator.vibrate) navigator.vibrate(50);
                        }
                    }, 600);
                };

                const cancelLongPress = () => {
                    clearTimeout(longPressTimer);
                };

                // Mouse events
                card.addEventListener('mousedown', startLongPress);
                card.addEventListener('mouseup', cancelLongPress);
                card.addEventListener('mouseleave', cancelLongPress);

                // Touch events
                card.addEventListener('touchstart', startLongPress, { passive: true });
                card.addEventListener('touchend', cancelLongPress);
                card.addEventListener('touchmove', cancelLongPress);

                card.addEventListener('click', function (e) {
                    if (preventClick) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }

                    const episodeId = this.dataset.episodeId;

                    if (isSelectionMode) {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCardSelection(this, episodeId);
                    } else {
                        // Play Mode
                        log('Episode clicked:', episodeId);
                        playItem(episodeId);
                    }
                });
            });
        };
        attachCardListeners();

        // Similar item clicks - navigate to item
        container.querySelectorAll('.lf-similar-card').forEach(card => {
            card.addEventListener('click', function () {
                const itemId = this.dataset.itemId;
                log('Similar clicked:', itemId);
                window.location.href = `#!/details?id=${itemId}`;
            });
        });

        // Season selector - reload episodes when changed
        const seasonOptions = container.querySelectorAll('.lf-season-selector__option');
        seasonOptions.forEach(opt => {
            opt.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();

                const seasonId = this.dataset.seasonId;
                const seasonIndex = parseInt(this.dataset.seasonIndex);
                log('Season changed:', seasonId);

                // Update UI selection
                seasonOptions.forEach(o => o.classList.remove('is-selected'));
                this.classList.add('is-selected');

                const selectorBtnText = container.querySelector('#lfSelectedSeasonText');
                if (selectorBtnText) {
                    selectorBtnText.textContent = this.querySelector('span').textContent;
                }

                // If in selection mode, exit it on season change?
                if (typeof isSelectionMode !== 'undefined' && isSelectionMode) toggleSelectionMode(false);

                // Fetch new episodes
                const episodes = await fetchEpisodes(seriesId, seasonId);

                // Re-render episode grid
                const episodeGrid = container.querySelector('.lf-episode-grid');
                if (episodeGrid) {
                    // Update content directly (createEpisodeGrid now returns just cards)
                    episodeGrid.innerHTML = createEpisodeGrid(episodes);

                    // Re-attach click handlers using shared function
                    if (typeof attachCardListeners === 'function') {
                        attachCardListeners();
                    }
                }
            });
        });
    }

    /**
     * Start monitoring loop
     */
    function startMonitoring() {
        // Run immediately
        monitorSeriesDetailPage();

        // Then check periodically for SPA navigation
        setInterval(() => {
            monitorSeriesDetailPage();
        }, 1000);
    }

    // =========================================================================
    // DEMO DATA (For browser prototyping)
    // =========================================================================
    const DEMO_DATA = {
        series: {
            id: '43b07d8c75320ca4542a2ea375ed8095',
            name: 'Your Lie in April',
            year: '2014 - 2015',
            officialRating: 'TV-PG',
            communityRating: 8.6,
            episodeCount: 22,
            overview: "Piano prodigy Arima Kosei dominated the competition and all child musicians knew his name. But after his mother, who was also his instructor, passed away, he had a mental breakdown while performing at a recital that resulted in him no longer being able to hear the sound of his piano even though his hearing was perfectly fine. Even two years later, Kosei hasn't touched the piano and views the world in monotone, without any flair or color. He was content living out his life with his good friends Tsubaki and Watari until one day, a free-spirited violinist named Kaori changed everything.",
            genres: ['Drama', 'Romance', 'Music'],
            studios: [{ Name: 'A-1 Pictures' }],
            backdropUrl: 'https://stream.legitflix.eu/Items/43b07d8c75320ca4542a2ea375ed8095/Images/Backdrop/0?tag=1027162ed5999b669a9b22983261de30&maxWidth=1920&quality=80',
            posterUrl: 'https://stream.legitflix.eu/Items/43b07d8c75320ca4542a2ea375ed8095/Images/Primary?fillHeight=350&fillWidth=240&quality=96&tag=68e1bad239ac7faf99052b2fd3304c72',
            people: [
                { Name: 'Natsuki Hanae', Type: 'Actor', Role: 'Kousei Arima' },
                { Name: 'Risa Taneda', Type: 'Actor', Role: 'Kaori Miyazono' },
                { Name: 'Ayane Sakura', Type: 'Actor', Role: 'Tsubaki Sawabe' }
            ]
        },
        seasons: [
            { id: 's1', name: 'Season 1', episodeCount: 22 },
            { id: 's2', name: 'Season 2', episodeCount: 24 },
            { id: 's3', name: 'Specials', episodeCount: 2 }
        ],
        episodes: [
            { id: 'e1', indexNumber: 1, name: 'Monotone/Colorful', overview: 'Piano prodigy Kosei Arima dominates competitions until tragedy strikes.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000, userData: { PlayedPercentage: 75 } },
            { id: 'e2', indexNumber: 2, name: 'Friend A', overview: 'Kaori asks Kosei to be her accompanist at a competition.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000 },
            { id: 'e3', indexNumber: 3, name: 'Inside Spring', overview: 'Kosei struggles as he faces the piano again after years.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000 },
            { id: 'e4', indexNumber: 4, name: 'Departure', overview: 'The competition day arrives and Kosei must overcome his fears.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000 },
            { id: 'e5', indexNumber: 5, name: 'Gray Skies', overview: 'A defining moment that will change Kosei\'s life forever.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000 },
            { id: 'e6', indexNumber: 6, name: 'On the Way Home', overview: 'Kosei reflects on his performance and what lies ahead.', thumbnailUrl: 'https://stream.legitflix.eu/Items/d7362b64f95057e0cb43e59f6e1590e5/Images/Primary?fillHeight=180&fillWidth=320&quality=96', runTimeTicks: 13650000000 }
        ],
        people: [
            { Id: 'p1', Name: 'Natsuki Hanae', Type: 'Actor', Role: 'Kousei Arima', imageUrl: 'https://stream.legitflix.eu/Items/52cf6b71865912d687416fd9efe30e77/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p2', Name: 'Risa Taneda', Type: 'Actor', Role: 'Kaori Miyazono', imageUrl: 'https://stream.legitflix.eu/Items/a04645001ff80f055512f906137bab8d/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p3', Name: 'Ayane Sakura', Type: 'Actor', Role: 'Tsubaki Sawabe', imageUrl: 'https://stream.legitflix.eu/Items/efc9b3bea54cc5e1eea1c27dfb7f35bf/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p4', Name: 'Ryota Osaka', Type: 'Actor', Role: 'Ryouta Watari', imageUrl: 'https://stream.legitflix.eu/Items/c41402b5f1002a24c825ddd8b706bbb9/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p5', Name: 'Ai Kayano', Type: 'Actor', Role: 'Nagi Aiza', imageUrl: 'https://stream.legitflix.eu/Items/8da0c7a7ffcc3ffb559fd05c1f241fb4/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p6', Name: 'Saori Hayami', Type: 'Actor', Role: 'Emi Igawa', imageUrl: 'https://stream.legitflix.eu/Items/72fb92f7d43121d3715ad608118426fd/Images/Primary?fillHeight=100&fillWidth=100&quality=96' },
            { Id: 'p7', Name: 'Yuki Kaji', Type: 'Actor', Role: 'Takeshi Aiza', imageUrl: 'https://stream.legitflix.eu/Items/491d9d793c6fdd08d7bbde585d398c14/Images/Primary?fillHeight=100&fillWidth=100&quality=96' }
        ],
        similar: [
            { Id: 's1', Name: 'Golden Time', posterUrl: 'https://stream.legitflix.eu/Items/9bcd2a047bc849520b0221b95355d765/Images/Primary?fillHeight=225&fillWidth=150&quality=96' },
            { Id: 's2', Name: 'Akame ga Kill!', posterUrl: 'https://stream.legitflix.eu/Items/b2556b9c04d84cb2773a4910c484fafd/Images/Primary?fillHeight=225&fillWidth=150&quality=96' },
            { Id: 's3', Name: 'Anohana', posterUrl: 'https://stream.legitflix.eu/Items/9bcd2a047bc849520b0221b95355d765/Images/Primary?fillHeight=225&fillWidth=150&quality=96' },
            { Id: 's4', Name: 'Clannad', posterUrl: 'https://stream.legitflix.eu/Items/b2556b9c04d84cb2773a4910c484fafd/Images/Primary?fillHeight=225&fillWidth=150&quality=96' },
            { Id: 's5', Name: 'Violet Evergarden', posterUrl: 'https://stream.legitflix.eu/Items/9bcd2a047bc849520b0221b95355d765/Images/Primary?fillHeight=225&fillWidth=150&quality=96' },
            { Id: 's6', Name: 'Toradora!', posterUrl: 'https://stream.legitflix.eu/Items/b2556b9c04d84cb2773a4910c484fafd/Images/Primary?fillHeight=225&fillWidth=150&quality=96' }
        ]
    };

    // =========================================================================
    // PUBLIC API
    // =========================================================================
    window.LFSeriesDetail = {
        // UI generators
        injectStyles,
        renderSeriesDetailPage,
        createHeroSection,
        createSeasonSelector,
        createEpisodeGrid,
        createEpisodesSection,
        createCastSection,
        createSimilarSection,

        // API functions
        fetchSeriesData,
        fetchSeasons,
        fetchEpisodes,
        fetchSimilar,

        // Page monitoring
        monitorSeriesDetailPage,
        startMonitoring,

        // Demo data
        DEMO_DATA,

        // Quick demo function for browser testing
        demo: function (targetSelector = 'body') {
            const target = document.querySelector(targetSelector);
            if (!target) {
                console.error('Target not found:', targetSelector);
                return;
            }
            target.style.backgroundColor = '#141414';
            target.style.fontFamily = "'Inter', sans-serif";
            renderSeriesDetailPage(DEMO_DATA, target);
            log('Demo rendered into:', targetSelector);
        }
    };

    // =========================================================================
    // AUTO-START (Only when running on Jellyfin)
    // =========================================================================

    // Check if we're in Jellyfin (ApiClient exists or will exist)
    const checkAndStart = () => {
        if (window.ApiClient) {
            log('Detected Jellyfin environment. Starting monitoring...');
            startMonitoring();
        } else if (window.location.href.includes('file://')) {
            log('Detected local file mode. Call LFSeriesDetail.demo() to test.');
        } else {
            // Wait for ApiClient to appear
            setTimeout(checkAndStart, 500);
        }
    };

    // Start after a short delay to let Jellyfin initialize
    setTimeout(checkAndStart, 1000);

    log('Module loaded. Call LFSeriesDetail.demo() to test, or it will auto-start on Jellyfin.');
})();
