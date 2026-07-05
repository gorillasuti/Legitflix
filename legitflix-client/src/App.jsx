import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme, getDefaultLogo } from './context/ThemeContext';
import { jellyfinService } from './services/jellyfin';
import Home from './pages/Home/Home';
import SeriesDetail from './pages/SeriesDetail/SeriesDetail';
import MovieDetail from './pages/MovieDetail/MovieDetail';
import Profile from './pages/Profile/Profile';
import SelectServer from './pages/Auth/SelectServer';
import SelectUser from './pages/Auth/SelectUser';
import Login from './pages/Auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import LegacyRouteHandler from './components/LegacyRouteHandler';
import ItemRedirect from './pages/ItemRedirect/ItemRedirect';
import Player from './pages/Player/Player';
import Library from './pages/Library/Library';
import Favorites from './pages/Favorites/Favorites';


import QuickConnectModal from './components/QuickConnectModal';

function AppContent() {
  const { config, updateConfig } = useTheme();

  // Screensaver State
  const [screensaverActive, setScreensaverActive] = useState(false);
  const [screensaverBackdrops, setScreensaverBackdrops] = useState([]);
  const [screensaverIndex, setScreensaverIndex] = useState(0);
  const [screensaverTimeText, setScreensaverTimeText] = useState('');
  const [screensaverDateText, setScreensaverDateText] = useState('');
  const [screensaverPosition, setScreensaverPosition] = useState({ top: '20%', left: '20%' });
  const [showQuickConnect, setShowQuickConnect] = useState(false);

  // Monitor Inactivity
  useEffect(() => {
    let lastActivity = Date.now();
    let idleTimer = null;
    let clockTimer = null;

    const resetActivity = () => {
      lastActivity = Date.now();
      setScreensaverActive(false);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetActivity, { passive: true }));

    const updatePosition = () => {
      const randomTop = Math.floor(Math.random() * 60) + 10;
      const randomLeft = Math.floor(Math.random() * 60) + 10;
      setScreensaverPosition({ top: `${randomTop}%`, left: `${randomLeft}%` });
    };

    idleTimer = setInterval(() => {
      const type = config.screensaverType || 'none';
      if (type === 'none') return;

      const hash = window.location.hash || '';
      if (hash.includes('/play') || hash.includes('/login') || hash.includes('/select-server') || hash.includes('/select-user')) {
      if (hash.includes('/login') || hash.includes('/select-server') || hash.includes('/select-user')) {
        lastActivity = Date.now();
        return;
      }

      // Check if any video element is playing (not paused and not ended)
      const hasActiveVideo = Array.from(document.querySelectorAll('video')).some(v => !v.paused && !v.ended);
      if (hasActiveVideo) {
        lastActivity = Date.now();
        return;
      }

      const idleMs = Date.now() - lastActivity;
      const thresholdMs = (config.screensaverTime || 180) * 1000;

      if (idleMs >= thresholdMs) {
        setScreensaverActive(true);
      }
    }, 1000);

    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setScreensaverTimeText(`${hours}:${minutes}`);

      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      setScreensaverDateText(now.toLocaleDateString(undefined, options));
    };

    updateClock();
    clockTimer = setInterval(updateClock, 1000);

    const positionInterval = setInterval(updatePosition, 20000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, resetActivity));
      clearInterval(idleTimer);
      clearInterval(clockTimer);
      clearInterval(positionInterval);
    };
  }, [config.screensaverType, config.screensaverTime]);

  // Backdrop/Logo Cycling Effect
  useEffect(() => {
    const isBackdrop = config.screensaverType === 'backdrop';
    const isLogo = config.screensaverType === 'logo';

    if (!screensaverActive || (!isBackdrop && !isLogo)) {
      setScreensaverBackdrops([]);
      return;
    }

    let cycleTimer = null;

    const loadImages = async () => {
      try {
        const user = await jellyfinService.getCurrentUser();
        if (!user) return;

        const reqImgTypes = isBackdrop ? ['Backdrop'] : ['Logo'];
        const res = await jellyfinService.getItems(user.Id, {
          includeItemTypes: ['Movie', 'Series'],
          recursive: true,
          imageTypes: reqImgTypes,
          limit: 35,
          sortBy: 'Random'
        });

        if (res && res.Items) {
          const token = jellyfinService.api?.accessToken || jellyfinService.api?.configuration?.accessToken;
          const basePath = jellyfinService.api?.basePath;
          let urls = [];

          if (isBackdrop) {
            urls = res.Items
              .filter(item => item.BackdropImageTags && item.BackdropImageTags.length > 0)
              .map(item => `${basePath}/Items/${item.Id}/Images/Backdrop/0?tag=${item.BackdropImageTags[0]}&quality=80&maxWidth=1920&api_key=${token}`);
          } else {
            urls = res.Items
              .filter(item => item.ImageTags && item.ImageTags.Logo)
              .map(item => `${basePath}/Items/${item.Id}/Images/Logo/0?tag=${item.ImageTags.Logo}&quality=90&maxWidth=600&api_key=${token}`);
          }

          if (urls.length > 0) {
            setScreensaverBackdrops(urls);
            setScreensaverIndex(0);
          }
        }
      } catch (e) {
        console.error("Failed to load screensaver media items", e);
      }
    };

    loadImages();

    const intervalSec = config.screensaverInterval || 10;
    cycleTimer = setInterval(() => {
      setScreensaverIndex(prev => {
        if (screensaverBackdrops.length === 0) return 0;
        return (prev + 1) % screensaverBackdrops.length;
      });
    }, intervalSec * 1000);

    return () => {
      clearInterval(cycleTimer);
    };
  }, [screensaverActive, config.screensaverType, screensaverBackdrops.length, config.screensaverInterval]);

  useEffect(() => {
    // Remove Jellyfin wrapper layout classes to prevent theme.css overrides from breaking our React layout
    const cleanWrapperClasses = () => {
      const classesToRemove = ['layout-mobile', 'layout-desktop', 'layout-tv', 'layout-tv-black', 'layout-custom'];
      classesToRemove.forEach(cls => {
        document.documentElement.classList.remove(cls);
        document.body.classList.remove(cls);
      });
    };

    cleanWrapperClasses();
    const t1 = setTimeout(cleanWrapperClasses, 100);
    const t2 = setTimeout(cleanWrapperClasses, 500);
    const t3 = setTimeout(cleanWrapperClasses, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    const loadUserBannerAndAvatar = async () => {
      try {
        const user = await jellyfinService.getCurrentUser();
        if (user) {
          let customBannerUrl = null;
          let customAvatarUrl = null;
          let backdropsEnabled = true;
          try {
            const prefs = await jellyfinService.getDisplayPreferences("usersettings");
            if (prefs && prefs.CustomPrefs) {
              const custom = prefs.CustomPrefs;
              backdropsEnabled = custom["enableBackdrops"] !== "false";
              if (backdropsEnabled && custom["LegitFlix_Backdrop_ItemId"]) {
                const itemId = custom["LegitFlix_Backdrop_ItemId"];
                const tag = custom["LegitFlix_Backdrop_ImageTag"];
                const token = jellyfinService.api?.accessToken || jellyfinService.api?.configuration?.accessToken;
                customBannerUrl = `${jellyfinService.api.basePath}/Items/${itemId}/Images/Backdrop/0?tag=${tag}&quality=90&maxWidth=1920&api_key=${token}`;
              }
              if (custom["LegitFlix_CustomAvatarUrl"]) {
                customAvatarUrl = custom["LegitFlix_CustomAvatarUrl"];
              }
            }
          } catch (e) {
            console.warn("Failed to load user display preferences in App.jsx", e);
          }

          let finalBannerUrl = null;
          if (backdropsEnabled) {
            if (customBannerUrl) {
              finalBannerUrl = customBannerUrl;
            } else if (user.ImageTags && user.ImageTags.Banner) {
              finalBannerUrl = `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Banner?tag=${user.ImageTags.Banner}&quality=90`;
            } else if (user.BackdropImageTags && user.BackdropImageTags.length > 0) {
              finalBannerUrl = `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Backdrop/0?tag=${user.BackdropImageTags[0]}&quality=90`;
            }
          }

          let finalAvatarUrl = null;
          if (customAvatarUrl) {
            finalAvatarUrl = customAvatarUrl;
          } else if (user.PrimaryImageTag || (user.ImageTags && user.ImageTags.Primary)) {
            const tag = user.PrimaryImageTag || user.ImageTags.Primary;
            finalAvatarUrl = `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?tag=${tag}&quality=90`;
          } else {
            const basePath = import.meta.env.PROD ? '/LegitFlix/Client' : '';
            finalAvatarUrl = `${basePath}/avatars/Netflix/010c7b9061ece2fbf7bbb8d9bb6d2bee16f4a68c.png`;
          }

          if (config.appBackground !== finalBannerUrl || config.userAvatar !== finalAvatarUrl) {
            updateConfig({ 
              appBackground: finalBannerUrl,
              userAvatar: finalAvatarUrl
            });
          }

          // Cache user avatar for Select User / Login screens
          try {
            const cachedAvatars = JSON.parse(localStorage.getItem('legitflix_user_avatars') || '{}');
            if (cachedAvatars[user.Id] !== finalAvatarUrl) {
              cachedAvatars[user.Id] = finalAvatarUrl;
              localStorage.setItem('legitflix_user_avatars', JSON.stringify(cachedAvatars));
            }
          } catch (e) {
            console.error("[LegitFlix] Failed to cache user avatar:", e);
          }
        } else {
          if (config.appBackground !== null || config.userAvatar !== null) {
            updateConfig({ 
              appBackground: null, 
              userAvatar: null 
            });
          }
        }
      } catch (e) {
        // Not logged in or loading error
      }
    };
    loadUserBannerAndAvatar();
  }, []);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleShowToast = (e) => {
      const { message, type } = e.detail;
      setToast({ message, type });
      setTimeout(() => {
        setToast(null);
      }, 3000);
    };
    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, []);

  const triggerGlobalRandomPlay = async () => {
    try {
      const filters = config.randomContentFilters || { Movie: true, Series: true, Episode: true };
      const includeItemTypes = Object.entries(filters)
          .filter(([_, enabled]) => enabled)
          .map(([type]) => type);

      if (includeItemTypes.length === 0) return;

      const user = await jellyfinService.getCurrentUser();
      if (!user) return;

      const query = {
          sortBy: ['Random'],
          limit: 1,
          recursive: true,
          includeItemTypes: includeItemTypes,
          fields: ['MediaSources', 'SeriesId']
      };

      if (config.randomLibraries && config.randomLibraries.length > 0) {
          query.parentId = config.randomLibraries.join(',');
      }

      const result = await jellyfinService.getItems(user.Id, query);

      if (result && result.Items && result.Items.length > 0) {
          const item = result.Items[0];
          if (item.Type === 'Movie') {
              window.location.hash = `#/movie/${item.Id}`;
          } else if (item.Type === 'Series') {
              window.location.hash = `#/series/${item.Id}`;
          } else if (item.Type === 'Episode' && item.SeriesId) {
              window.location.hash = `#/series/${item.SeriesId}`;
          } else {
              window.location.hash = `#/item/${item.Id}`;
          }
      }
    } catch (e) {
      console.error("Global random play failed", e);
    }
  };

  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Ignore when typing in inputs/selects/textareas
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      // Shift + H -> Home
      if (e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        window.location.hash = '#/';
        return;
      }

      // Q -> Show Quick Connect Modal (Open to all users)
      if (e.key.toLowerCase() === 'q' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setShowQuickConnect(true);
        return;
      }

      // D -> Admin Dashboard Redirect
      if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        try {
          const user = await jellyfinService.getCurrentUser();
          const isAdmin = !!user?.Policy?.IsAdministrator;
          if (isAdmin) {
            e.preventDefault();
            window.location.href = '/web/index.html?classic=true#/dashboard';
          }
        } catch (err) {
          console.error("Dashboard hotkey check failed", err);
        }
        return;
      }

      // R -> Play Random Item
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const hash = window.location.hash || '';
        // If player is not actively showing, trigger random play
        if (!hash.includes('/play') && !document.querySelector('video')) {
          e.preventDefault();
          await triggerGlobalRandomPlay();
        }
      }

      // Classic view shortcut (Ctrl + K)
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const date = new Date();
        date.setTime(date.getTime() + (365*24*60*60*1000));
        document.cookie = "lf-classic-view=true; path=/; expires=" + date.toUTCString();
        
        const redirect = () => {
          window.location.href = window.location.origin + window.location.pathname + '?classic=true#/home';
        };

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let reg of registrations) {
              reg.unregister();
            }
          }).catch(() => {}).finally(redirect);
        } else {
          redirect();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Router>
        <LegacyRouteHandler />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/select-server" element={<SelectServer />} />
          <Route path="/login/select-user" element={<SelectUser />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/series/:id" element={<SeriesDetail />} />
            <Route path="/movie/:id" element={<MovieDetail />} />
            <Route path="/library/:id" element={<Library />} />
            <Route path="/item/:id" element={<ItemRedirect />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/play/:id" element={<Player />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </Router>
      <QuickConnectModal isOpen={showQuickConnect} onClose={() => setShowQuickConnect(false)} />

      {toast && (
        <div className={`lf-toast ${toast.type}`}>
          <span className="material-icons">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Fullscreen Screensaver Overlay */}
      {screensaverActive && config.screensaverType !== 'none' && (
        <div className="lf-screensaver">
          {screensaverBackdrops.length > 0 && (
            screensaverBackdrops.map((url, idx) => (
              <img
                key={url}
                src={url}
                alt="Screensaver Media"
                className={`lf-screensaver-backdrop-img ${idx === screensaverIndex ? 'active' : ''}`}
                style={{ 
                  zIndex: idx === screensaverIndex ? 1 : 0,
                  objectFit: config.screensaverType === 'logo' ? 'contain' : 'cover',
                  maxWidth: config.screensaverType === 'logo' ? '60%' : '100%',
                  maxHeight: config.screensaverType === 'logo' ? '50%' : '100%',
                  margin: config.screensaverType === 'logo' ? 'auto' : 'unset',
                  opacity: idx === screensaverIndex ? (config.screensaverType === 'logo' ? 0.9 : 0.65) : 0
                }}
              />
            ))
          )}
          
          <div 
            className="lf-screensaver-info" 
            style={{ 
              top: screensaverPosition.top, 
              left: screensaverPosition.left,
              zIndex: 10
            }}
          >
            <img 
              src={config.logoUrl || getDefaultLogo(config.accentColor)} 
              alt="Logo" 
              className="lf-screensaver-logo"
            />
            <div className="lf-screensaver-clock">{screensaverTimeText}</div>
            <div className="lf-screensaver-date">{screensaverDateText}</div>
          </div>

          <div className="lf-screensaver-hint" style={{ zIndex: 10 }}>
            Press any button to return
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
