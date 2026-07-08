# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Removed


## [v1.2.0.0]

### Added
- **Group-Specific Server Locks**: Added granular server-level configuration locks (`LockVisualSettings`, `LockNavigationSettings`, and `LockPlayerSettings`) to the C# plugin configuration, allowing administrators to restrict parts of the user settings (Visual, Navigation, Player) independently.
- **Client Lock Enforcement**: Updated the user Profile page and the theme settings modal (`Profile.jsx` and `LegitFlixSettingsModal.jsx`) to respect group-specific server overrides, rendering distinct lock icons and disabling settings controls accordingly. Injected locked preferences dynamically via the script injector (`UiInjector.cs`).
- **Redesigned Admin Configuration Page**: Completely overhauled the plugin configuration page (`configPage.html`) with a modern, glassmorphic header, grouped visual cards for settings, dedicated lock toggle switches on headers, custom styling, and clean user experience. Enabled the configuration page in the main menu dashboard sidebar (`Plugin.cs`).
- **Notification Bell Option**: Added a toggleable "Recently Added" Notification Bell inside the navbar (under Navigation tab in Theme settings and General Display settings in Profile page), supporting local preferences and global overrides.
- **Latest Media Fetcher & Cache**: Implemented a custom client-side fetcher utilizing the `/Users/{userId}/Items/Latest` Jellyfin endpoint, caching lists in `localStorage` (stale-while-revalidate) for zero-latency presentation.
- **Notification Dropdown Actions**: Added a dropdown menu displaying posters, relative dates, type labels, language flags/codes, and resolution quality badges, equipped with "Mark Read" and "Clear All" (dismiss) functionality to manage clutter.
- **Admin Plugin Update Notifications**: For admin users only, the notification bell now handles updates. To bypass browser Content Security Policy restrictions on client-side external connections, update checks are processed server-side via a background timer (in `Plugin.cs`) and injected directly into the client context config. Renders a modern gradient card displaying version diffs and featuring a custom 44x44px `Legitflix-icon.svg` badge that links directly to the Jellyfin Plugins Dashboard.
- **Dropdown Clear/Read Button Hover**: Redesigned the "Clear All" and "Mark Read" hover feedback with a custom SVG-style expanding slide underline animation instead of a simple brightness filter.
- **Mark All Read Visibility Fix**: Fixed an issue where the "Mark Read" button was hidden due to the dropdown auto-clearing unread states immediately on toggle. Changed `handleBellClick` to only toggle visibility, preserving the "Mark Read" button for explicit user clicks.

### Changed
- **Profile Personalization Redesign**: Combined the "Profile Avatar" and "App Background Image" settings in the theme settings modal into a unified "Profile Personalization" section, styled as symmetrical, stacked horizontal card rows with image previews, metadata, and full Change/Remove control pairs.
- **Profile Modal Layout Rework**: Reworked the `.pm-actions` block in the Profile Modal (`ProfileModal.jsx`) into a side-by-side symmetric action grid. Added the missing "Change Cover" and "Remove Cover" actions to fully manage custom profile backdrop cover images.
- **Native Select Overlays**: Re-implemented the `CustomDropdown` component (used on Library and Favorites view filters/sorters) to overlay a transparent native `<select>` element over the custom button. Changed the "Screensaver Time" input field in `Profile.jsx` from a standard number input to a native select dropdown. Added `:focus-within` visual highlights to support seamless TV DPAD remote control and keyboard spatial navigation focus indicators.

### Fixed
- **Settings Modal Button Contrast**: Added CSS styling for `.lf-btn--secondary` (using translucent borders and dark glass backgrounds) to prevent unstyled native white/grayish browser button fallbacks on buttons such as "Change Avatar" and "Select from Library" in PWA mode.
- **PWA Focus & Tap Highlights**: Disabled default pointer-tap outlines (`*:focus:not(:focus-visible)`) and WebKit tap highlight colors globally to prevent intrusive orange outline boxes from appearing around tabs, buttons, or other clickable elements when clicked/tapped on mobile PWAs, while retaining visual focus outlines for keyboard/TV spatial navigation.
- **Native Select Dark Theme**: Added global `color-scheme: dark` overrides and explicit native `<option>` tag styles in `theme.css` to force native select option lists to render with dark backgrounds and white text across all platforms and PWAs, eliminating white flashes and contrast issues.
- **Profile Background Sync Bug**: Fixed a bug where the profile background in the Settings Modal's "Profile Personalization" section did not load or update properly if edited elsewhere. Added `usersettings` backdrop preferences queries and native banner fallbacks to align loading/saving logic with the profile page.
- **Real-Time Avatar Sync**: Removed full page reloads (`window.location.reload()`) from avatar updates across the navigation bar, profile modal, and account profile page. Replaced them with instant React state bindings via the shared `ThemeContext` context to update user profile pictures immediately.
- **Classic View Switcher Redirection**: Refactored the dialog cancellation logic in `UiInjector.cs` to redirect the user to the classic home screen (`?classic=true#/home`) when they choose to stay in classic view after clicking a home logo, preventing them from getting stuck inside configuration dashboards or sub-menus. Also updated the logo interceptor to ignore `nav-logo` classes to avoid blocking custom PWA navigation clicks, added explicit exclusions for dashboard and plugin configuration page URLs (`configurationpage` and `dashboard`) to prevent intercept loops, and enabled backdrop clicks (outside dialog boundaries) to close the switch modal cleanly and remove elements from the DOM.
- **Auth Page Skeleton Loader**: Added an `AuthSkeleton` mimicking the profile selection screen ("Who's watching?") to show during initial boot when no active session exists, preventing the homepage content layout skeleton from flashing before routing unauthenticated users to the login screens.
- **Avatar Picker Persistence & CSP Bypass**: Implemented native Jellyfin avatar persistence by routing uploads to `/Users/{userId}/Images/Primary` with the correct Base64 payload. Bypassed browser CSP data URL blocks by writing an in-memory canvas-to-blob rendering helper. Added strict security failsafes (validating selected URLs against the official avatar manifest, checking image MIME types, and downscaling images exceeding 512px via canvas context) to guarantee safe transit weight and prevent malicious file execution. Deleted obsolete localStorage cache checks across the app to stream avatars directly from the server.
- **Console Log Sanitization**: Sanitized browser debug statements across the app (in `jellyfin.js`, `Navbar.jsx`, and `Player.jsx`) to remove user profile policy data dumps, activity metrics, and direct stream URLs that leaked sensitive auth `api_key` tokens to the console.
- **ESLint Security Enforcement**: Enforced strict dev linting by configuring `"no-console": "warn"` and integrating `eslint-plugin-security` to run automated scans for known security pitfalls (unsafe regex, object injection vectors) across the client codebase.
- **Actions Popover Redesign & Logic Wiring**: Redesigned and structurally aligned the Action Sheet Popovers (`lf-movie-actions-popover` and `lf-series-actions-popover`) in the movie and series detail views to match the look, feel, spacing, hover transitions, and threat danger highlights of the home page context menu (`.lf-context-menu`). Restructured items to use direct `.lf-context-menu__item`, `.lf-context-menu__icon`, and `.lf-context-menu__label` bindings. Removed intermediate container wrappers to eliminate scrollbar boxes and tracks. Also wired the missing "Edit Subtitles" action in the movie popover to trigger the subtitle downloader modal, corrected the movie popover to open downwards (`top: calc(100% + 8px)`) preventing items from clipping off-screen on PWAs, and overrode button styling defaults inside `.lf-context-menu__item` (transparent background, border and outline resets) to prevent native browser white background rendering in PWA mode.



## [v1.1.1.0]


### Changed
- **Player Submenu Action Styling**: Polished select margins and added hover highlight visual feedback to the "Style Appearance" trigger in the player subtitle menu.
- **Profile Playback Settings Sync**: Synchronized the Profile page's "Playback" settings tab with all player options from the settings modal (adding Seek Time dropdown, Auto Skip Intros toggle, and Auto Skip Recaps toggle) to make the Profile page a complete, granular settings collective.

### Fixed
- **Settings Modal Typo Fixes**: Corrected `Ctrl + K` description inside Keyboard Shortcuts list and removed beta suffix label from playback speed option headers.
- **Settings Modal Divider Polishes**: Removed overlapping inline border-top styles in Settings Modal configuration blocks and added scoped CSS resets.
- **Hover Card Metadata Resolution**: Added lazy-loading metadata queries (supporting structured parent series lookups for episodic items, direct series details fetches, and individual defensive try-catch safety wrappers) to HoverCard elements to support resolution, HDR, language, and genre badges for simplified item lists on the Home page (and prioritized genre classification over general "Animation").
- **Vite Dev Server Path Typo**: Corrected the platform default Vite connection URL in `run-dev.example.ps1` to match the client router config.
- **Settings Modal Reset Button**: Hooked 16 missing settings into the Reset button — all 9 subtitle styling options, 3 poster tag toggles, 3 playback behavior toggles (auto-pause, auto-resume, auto-PiP), long-press speed, random libraries, Jellyseerr button text, and Jellyseerr background.
- **Recap Skip False Positives**: Removed `'prologue'` from the recap chapter detection keywords — prologues are actual story content and must not be auto-skipped as recaps.
- **Separate Intro & Recap Skip Toggles**: Split the combined "Auto Skip Intros & Recaps" toggle into two independent settings: "Auto Skip Intros" (`playerAutoSkip`) and "Auto Skip Recaps" (`playerAutoSkipRecap`), each with its own toggle, config key, save/reset/sync handling, and ThemeContext wiring.

## [v1.1.0.0]

### Added
- **Account-Bound Settings Sync**: Integrated configuration settings with Jellyfin's server-side `DisplayPreferences` under namespace `"legitflix-theme"`, allowing user configurations to roam across different devices.
- **Native Profile Picture Synchronization**: Auto-uploads custom avatar choices to the Jellyfin server profile under `/UserImage` so that the customized profile pictures sync natively to the login/auth pages on all devices.
- **Poster Badge Indicators**: Added resolution and dynamic HDR badges (4K, 1080p, UHD, HDR) on media posters on both libraries and home screen sections.
- **Spacebar 2x Playback Speed**: Supported long-pressing the spacebar during video playback to play at 2x speed (with visual indicator overlay).
- **Escape Key Fullscreen Exit**: Added a quick shortcut mapping the `Esc` key to exit video playback fullscreen mode natively across both Movie and TV Episode players.
- **Global Application Hotkeys**: Added quick action keyboard hotkeys: `Shift + H` to return Home, `Q` to trigger Quick Connect, `D` for Admin Dashboard access, and `R` to play random media.
- **Gamepad Control Capability**: Integrated native controller input listener hooks to support gamepad control mappings.
- **Global Settings Managed Tooltips**: Added inline informational tooltips for settings managed globally by the system administrator to explain why option changes are locked.
- **Library Filter Grouping**: Added "Randomize From" library selection lists and content type filter lists for the random play generator.

### Changed
- **Avatar Asset Relocation**: Relocated 16MB of avatar graphics out of `/public` and into `/avatars` at the repository root, loading them dynamically from the raw GitHub CDN. This reduced the compiled C# plugin DLL size by 16MB (757 files).
- **Screensaver Visual Styling**: Rewrote screensaver transition parameters to utilize GSAP easing instead of standard linear CSS transitions, enhancing overall aesthetics.
- **Media Card Hover Overlays**: Refactored card hover states to use glassmorphic translucent layers for a premium, clean visual presentation.
- **Profile Options Categorization**: Restructured the Settings tab within `Profile.jsx` to separate Home Screen Sections and Jellyfin Library Options into distinct card layout divisions.
- **Overlay Modals Glassmorphism**: Refactored CastModal, SyncPlayModal, and EditImagesModal to utilize the unified translucent theme overrides for premium visual coherence.

### Fixed
- **Authentication Stale Overwrite Trap**: Added a unified check to prevent uninitialized default settings from blank browser storage overrides from wiping remote user configurations.
- **XSS Vector Protection**: Introduced strict protocol check validation (`sanitizeUrlStrict`) to clean user-uploaded paths and reject `javascript:`, `data:`, or `blob:` protocol execution exploits.
- **Prototype Pollution Guard**: Implemented recursion scrubbers (`deepSanitizeObject`) on deserializing JSON parameters to prevent object prototype pollution attacks.
- **Safe URI Parsing**: Resolved boot crashes on the startup thread caused by unescaped percent sign sequences in custom text fields.
- **Unload Synchronization Guard**: Handled tab close and visibility state updates using `fetch` with `keepalive: true` to guarantee final preference saves.
- **Player Controller Hotkeys**: Resolved aspect ratio scaling toggling (`A`), audio stream cycling, and subtitle track cycling key mapping issues in the playback screen.

### Removed
- **Sign Out Duplication**: Removed the redundant "Sign Out" option from settings page cards.
