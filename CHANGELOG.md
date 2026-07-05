# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed


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
