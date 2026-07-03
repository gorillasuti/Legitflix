<div align="center">

<img src="Image%20gallery/Readme-Logo.png" alt="Legitflix Banner" height="60">

<br />

A modern, standalone React-based frontend plugin for Jellyfin that replaces the standard client interface with a new layout and custom player.

Built strictly using official routes from the [Jellyfin API specification](https://api.jellyfin.org). The client keeps backend security and session validation fully intact. We welcome open-source contributors to audit the codebase, find flaws, and help improve functionality or security controls.

<br />

<a href="#installation"><img alt="Jellyfin Install" src="https://img.shields.io/badge/Jellyfin-Install-007bff?style=for-the-badge&logo=jellyfin&logoColor=white" /></a>
<a href="#bypassing-disabling-or-uninstalling"><img alt="Disable / Delete" src="https://img.shields.io/badge/Disable_/_Delete-555555?style=for-the-badge&logo=gitbook&logoColor=white" /></a>
<a href="#local-development--real-time-testing"><img alt="Local Development" src="https://img.shields.io/badge/Local_Development-2ea44f?style=for-the-badge&logo=visualstudiocode&logoColor=white" /></a>
<a href="#feature-showcases"><img alt="Image Gallery" src="https://img.shields.io/badge/Image_Gallery-ff6a00?style=for-the-badge&logo=googlephotos&logoColor=white" /></a>
</div>

---

<div align="center">
  <a href="Image%20gallery/Homepage/Legitflix%20-%20Carousel.png"><img src="Image%20gallery/Homepage/Legitflix%20-%20Carousel.png" alt="Hero Carousel" width="32%" /></a>
  <a href="Image%20gallery/Auth/Legitflix%20-%20Who%20is%20watching.png"><img src="Image%20gallery/Auth/Legitflix%20-%20Who%20is%20watching.png" alt="Who Is Watching" width="32%" /></a>
  <a href="Image%20gallery/Settings/Legitflix%20-%20Settings%20page.png"><img src="Image%20gallery/Settings/Legitflix%20-%20Settings%20page.png" alt="Settings Screen" width="32%" /></a>
</div>

---

## What you get

<details open>
<summary><b>See all features</b></summary>

<table>
<tr>
<td width="50%" valign="top">

#### Revamped Authentication
- **Who's Watching** - Updated profile selector page.
- **Sign In** - Modern, custom authentication forms.
- **Quick Connect** - Updated quick connect UI.

</td>
<td width="50%" valign="top">

#### Home Page
- **Hero Carousel** - Giant showcase of library items with auto-play backdrops and trailers.
- **Promo Banners** - Dynamic content zones with configurable media filters and sorting logic.
- **Instant Search** - Optimized global search index offering results as you type.

</td>
</tr>
<tr>
<td width="50%" valign="top">

#### Settings & Customization
- **Theme Engine** - Custom colors, styles and logos that dynamically update elements globally.
- **Personalization** - Custom Avatar and Banner Picker modals for better looks.
- **3rd Party Link Integration** - Request media or link external tools directly inside the UI.

</td>
<td width="50%" valign="top">

#### Series & Movies Experience
- **In-Context Trailers** - Play trailer previews directly inside the series/movie backdrops with a toggleable background mode.
- **Batch Episode Manager** - Custom selection mode lets you batch-toggle watched/unwatched states for multiple episodes at once.
- **Direct Metadata Editing** - Instantly trigger Image pickers, Identification lookups, or Metadata editors directly on the content page.

</td>
</tr>
<tr>
<td width="50%" valign="top">

#### Rebuilt Video Player
- **hls.js & Direct Play** - Dynamically switches between native direct-play streams and transcoded HLS feeds using hls.js for client compatibility.
- **Drill-down Settings Menu** - Control streaming quality presets (from 4K down to 240p), select audio language tracks, and toggle subtitle options on the fly.
- **On-the-fly Subtitle Delay** - Dynamically shifts active subtitle text cue timings (`+/- 10.0` seconds in `0.5s` steps) to correct out-of-sync audio.
- **Skip Markers & Auto-Next** - Detects intro, outro, and recap chapters to display skip indicators, alongside a next episode auto-play popup. All customizeable and can be tuned or disabled in the theme settings.
- **Trickplay & Session Reporting** - Renders thumbnail previews on the seek bar using Jellyfin's trickplay assets (`tiles.m3u8`), and reports play progress back to the server to save resume positions.

</td>
</tr>
</table>

</details>

---

## Feature Showcases

### Revamped Authentication

A new modern UI for the authentication flow.

<div align="center">
  <a href="Image%20gallery/Auth/Legitflix%20-%20Who%20is%20watching.png"><img src="Image%20gallery/Auth/Legitflix%20-%20Who%20is%20watching.png" alt="Who is watching" width="32%" /></a>
  <a href="Image%20gallery/Auth/Legitflix%20-%20User%20Auth.png"><img src="Image%20gallery/Auth/Legitflix%20-%20User%20Auth.png" alt="User Login Form" width="32%" /></a>
  <a href="Image%20gallery/Auth/Legitflix%20-%20Quick%20connect.png"><img src="Image%20gallery/Auth/Legitflix%20-%20Quick%20connect.png" alt="Quick Connect" width="32%" /></a>
</div>

---

### Home Page

A homepage with dynamic promo banners, auto-play hero carousel, and an optimized global search.

<div align="center">
  <a href="Image%20gallery/Homepage/Legitflix%20-%20Carousel.png"><img src="Image%20gallery/Homepage/Legitflix%20-%20Carousel.png" alt="Hero Carousel" width="32%" /></a>
  <a href="Image%20gallery/Homepage/Legitflix%20-%20Promo%20banner.png"><img src="Image%20gallery/Homepage/Legitflix%20-%20Promo%20banner.png" alt="Promo Banner" width="32%" /></a>
  <a href="Image%20gallery/Homepage/Legitflix%20-Search.png"><img src="Image%20gallery/Homepage/Legitflix%20-Search.png" alt="Instant Search" width="32%" /></a>
</div>

---

### Settings & Customization

Fine-tune accent colors, upload custom profile banners and avatars via specialized pickers, or link external services like Jellyseerr directly in the interface.

<div align="center">
  <a href="Image%20gallery/Settings/Legitflix%20-%20Settings%20page.png"><img src="Image%20gallery/Settings/Legitflix%20-%20Settings%20page.png" alt="Settings Dashboard" width="32%" /></a>
  <a href="Image%20gallery/Settings/Legitflix%20-%20Customize%20profile.png"><img src="Image%20gallery/Settings/Legitflix%20-%20Customize%20profile.png" alt="Customize Profile" width="32%" /></a>
  <a href="Image%20gallery/Settings/Legitflix%20-%20Theme%20settings.png"><img src="Image%20gallery/Settings/Legitflix%20-%20Theme%20settings.png" alt="Theme Customizer" width="32%" /></a>
</div>

---

### Rebuilt Video Player

A custom hls.js-powered HTML5 video player featuring quality settings, subtitle delay offsets, trickplay scrubbing previews, and customizable skip triggers.

<div align="center">
  <a href="Image%20gallery/Series/Legitflix%20-%20Episode%20player.png"><img src="Image%20gallery/Series/Legitflix%20-%20Episode%20player.png" alt="Video Player" width="48%" /></a>
  <a href="Image%20gallery/Series/Legitflix%20-%20Subtitle%20manager.png"><img src="Image%20gallery/Series/Legitflix%20-%20Subtitle%20manager.png" alt="Subtitle Sync & Search" width="48%" /></a>
</div>

<br />

> **[View the Complete Image Gallery](./Image%20gallery)**
---

## Installation

Getting started with Legitflix is simple. You can install it directly from your existing Jellyfin Dashboard using our official repository.

### 1. Add the Repository

1. Open your Jellyfin **Dashboard**.
2. Navigate to the **Plugins** tab on the left sidebar.
3. Click on the **Manage Repositories** tab at the top.
4. Click the **+ New Repository** button.
5. Enter the following details:

**Name**: Legitflix<br>**Repository URL**: `https://raw.githubusercontent.com/gorillasuti/Legitflix/refs/heads/main/manifest.json`

### 2. Install the Plugin

1. Go to the **All** tab within the Plugins menu.
2. Scroll down to find **Legitflix** or use the search bar.
3. Click on the Legitflix card.
4. Select the latest version and click **Install**.

### 3. Restart & Activate

1. **Restart your Jellyfin Server.** This is required for the plugin to initialize.
2. Once the server is back up, refresh your browser (Ctrl+F5 or Cmd+Shift+R is recommended to clear the cache).
3. You will now be greeted by the new Legitflix interface!

---

## Bypassing, Disabling or Uninstalling

If you need to temporarily bypass the custom UI, disable it server-wide while keeping the plugin installed, or completely uninstall Legitflix from your server, follow these instructions:

### 1. Temporarily Bypassing or Switching the Interface (Client-side)
You can switch between the custom Legitflix interface and Jellyfin's stock Classic view without disabling or uninstalling the plugin:

* **The Settings Toggle (Long term switch - Recommended for Mobile/TV/potentially Tablet)**:
  In the profile dropdown open **User Settings** -> **Display tab** -> find **Jellyfin Classic View** and click the **Disable Plugin Look** button. This saves a device-specific cookie (`lf-classic-view=true`) to load the stock Jellyfin UI.
  * *To switch back*: Click the **"Legitflix UI"** button (or the Legitflix logo in the dashboard) dynamically injected in the sidebar drawer menu under "Plugin Settings". In the modal, select **Plugin Look** to clear the cookie and return to Legitflix.
* **The URL Query Parameter (Temporary switch)**:
  Access Jellyfin via `http(s)://your-server-url/web/index.html?classic=true#/home` to load the classic interface directly.
* **The Keyboard Shortcut (Long term switch - saves a cookie)**:
  Press `Ctrl + K` or `Cmd + K` on your keyboard to instantly toggle between Legitflix and the classic Jellyfin interface.

### 2. Disabling the Custom UI Server-Wide (Keep Installed)
If you want to keep the plugin installed, but restore Jellyfin's stock UI for all users and devices globally:

1. Open your Jellyfin **Dashboard** -> **Plugins** -> **Legitflix**.
2. Untoggle the **"Enable plugin"** option.
3. Recommended to restart your Jellyfin server.

### 3. Completely Uninstalling the Plugin
To remove Legitflix completely from your Jellyfin server:

1. Open your Jellyfin **Dashboard** -> **Plugins** -> **Legitflix**.
2. Select **Uninstall**.
3. **Restart your Jellyfin Server** to complete the cleanup.
4. (Optional) Refresh your browser cache (Ctrl+F5 or Cmd+Shift+R) on client devices to clear any cached assets.

---

## Local Development

To test and develop the plugin locally:

### 1. Setup the Frontend (React Client)

1. Navigate to the `legitflix-client` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your local Jellyfin server URL:
   ```bash
   cp .env.example .env
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:8096` in your browser. All API requests will proxy to your Jellyfin instance.

### 2. Setup the Full Integrated Plugin (React + C# Backend)
If you are developing or testing the compiled plugin loaded inside Jellyfin:
1. Copy the build script template to create your own configuration:
   ```powershell
   Copy-Item run-dev.example.ps1 run-dev.ps1
   ```
2. Open `run-dev.ps1` in an editor and modify the `$pluginDest` variable to point to your Jellyfin server's local plugin directory (e.g. your Docker host volume mount).
3. If necessary, adjust the `docker restart jellyfin` command at the bottom of the script to match how you start/stop your server.
4. Run the script to compile the frontend, build the C# DLL, deploy the plugin files, and restart the server automatically:
   ```powershell
   ./run-dev.ps1
   ```

---

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).