import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { jellyfinService } from '../../services/jellyfin';
import Navbar from '../../components/Navbar';
import Hls from 'hls.js';
import './Player.css';

const QUALITY_PRESETS = [
    { name: 'Auto', bitrate: 140000000 }
];

const STANDARD_QUALITIES = [
    { name: '4K - 120 Mbps', height: 2160, bitrate: 120000000 },
    { name: '4K - 80 Mbps', height: 2160, bitrate: 80000000 },
    { name: '4K - 40 Mbps', height: 2160, bitrate: 40000000 },
    { name: '4K - 20 Mbps', height: 2160, bitrate: 20000000 },
    { name: '1080p - 60 Mbps', height: 1080, bitrate: 60000000 },
    { name: '1080p - 30 Mbps', height: 1080, bitrate: 30000000 },
    { name: '1080p - 20 Mbps', height: 1080, bitrate: 20000000 },
    { name: '1080p - 15 Mbps', height: 1080, bitrate: 15000000 },
    { name: '1080p - 10 Mbps', height: 1080, bitrate: 10000000 },
    { name: '1080p - 8 Mbps', height: 1080, bitrate: 8000000 },
    { name: '720p - 6 Mbps', height: 720, bitrate: 6000000 },
    { name: '720p - 4 Mbps', height: 720, bitrate: 4000000 },
    { name: '720p - 3 Mbps', height: 720, bitrate: 3000000 },
    { name: '720p - 2 Mbps', height: 720, bitrate: 2000000 },
    { name: '480p - 1.5 Mbps', height: 480, bitrate: 1500000 },
    { name: '480p - 1 Mbps', height: 480, bitrate: 1000000 },
    { name: '360p - 750 Kbps', height: 360, bitrate: 750000 },
    { name: '360p - 500 Kbps', height: 360, bitrate: 500000 },
    { name: '240p - 420 Kbps', height: 240, bitrate: 420000 },
    { name: '240p - 320 Kbps', height: 240, bitrate: 320000 }
];

const Player = () => {
    const { config } = useTheme();
    const [castTarget, setCastTarget] = useState(() => {
        try {
            const saved = localStorage.getItem('legitflix_cast_target');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const isSyncingRef = useRef(false);
    const [syncPlayActive, setSyncPlayActive] = useState(
        () => localStorage.getItem('legitflix_syncplay_joined_group') !== null
    );
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const progressIntervalRef = useRef(null);
    const resumeTimeRef = useRef(0);
    const lastSavedLocalTimeRef = useRef(0);
    const autoPausedRef = useRef(false);
    const longPressedRef = useRef(false);
    const spaceTimerRef = useRef(null);
    const spaceSpeedActiveRef = useRef(false);

    const [isLongPressing, setIsLongPressing] = useState(false);
    const longPressTimerRef = useRef(null);

    // Data State
    const [item, setItem] = useState(null);
    const [seasons, setSeasons] = useState([]);
    const [episodes, setEpisodes] = useState([]);
    const [currentSeasonId, setCurrentSeasonId] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [nextEpisode, setNextEpisode] = useState(null);

    // Playback Streams / Media State
    const [playSessionId, setPlaySessionId] = useState(null);
    const [mediaSourceId, setMediaSourceId] = useState(null);
    const [audioStreams, setAudioStreams] = useState([]);
    const [subtitleStreams, setSubtitleStreams] = useState([]);
    const [selectedAudioIndex, setSelectedAudioIndex] = useState(null);
    const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(null); // null = Off

    // Play method state (true if using Hls.js, false if using static direct play)
    const [useHls, setUseHls] = useState(true);

    // Start with null to prevent double-load (dummy load + real transcode/direct play URL switch)
    const [streamUrl, setStreamUrl] = useState(null);

    // Native Quality presets
    const [selectedQualityPreset, setSelectedQualityPreset] = useState(QUALITY_PRESETS[0]); // Default to Auto (140 Mbps)
    const [hlsLevels, setHlsLevels] = useState([]);
    const [currentLevelIndex, setCurrentLevelIndex] = useState(-1); // -1 is Auto

    // Player Playback States
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [playbackStarted, setPlaybackStarted] = useState(false);

    // Settings drill-down menu states
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [settingsMenuView, setSettingsMenuView] = useState('main'); // 'main', 'quality', 'audio', 'subtitles', 'subtitle-delay'
    const [subtitleDelay, setSubtitleDelay] = useState(0); // Subtitle delay offset in seconds

    // Jellyfin Advanced Action Sheet Settings
    const [showJellyfinMenu, setShowJellyfinMenu] = useState(false);
    const [jellyfinMenuView, setJellyfinMenuView] = useState('main'); // 'main', 'aspect-ratio', 'playback-speed', 'repeat-mode'
    const [aspectRatio, setAspectRatio] = useState('auto'); // 'auto', 'cover', 'fill', '16:9', '4:3'
    const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5, 0.75, 1, 1.25, 1.5, 2
    const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'

    // Playback Stats for Nerds overlay
    const [showStats, setShowStats] = useState(false);
    const [droppedFrames, setDroppedFrames] = useState(0);
    const [corruptedFrames, setCorruptedFrames] = useState(0);
    const [playerDimensions, setPlayerDimensions] = useState('0x0');
    const [videoResolution, setVideoResolution] = useState('0x0');

    // Skip Intro / Outro / Recap states
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    const [introStart, setIntroStart] = useState(-1);
    const [introEnd, setIntroEnd] = useState(-1);

    const [showSkipOutro, setShowSkipOutro] = useState(false);
    const [outroStart, setOutroStart] = useState(-1);
    const [outroEnd, setOutroEnd] = useState(-1);

    const [showSkipRecap, setShowSkipRecap] = useState(false);
    const [recapStart, setRecapStart] = useState(-1);
    const [recapEnd, setRecapEnd] = useState(-1);

    // Next episode popup states
    const [showNextEpPopup, setShowNextEpPopup] = useState(false);

    // Netflix-style next episode auto-start button states
    const [elapsedMs, setElapsedMs] = useState(0);

    // Trickplay (Scrubbing thumbnails) states
    const [trickplayManifest, setTrickplayManifest] = useState(null);
    const [hoverTime, setHoverTime] = useState(0);
    const [hoverPercent, setHoverPercent] = useState(0);
    const [showHoverPreview, setShowHoverPreview] = useState(false);

    const lastReportTimeRef = useRef(0);
    const containerRef = useRef(null);
    const idleTimeoutRef = useRef(null);

    // Reset player state on ID change
    useEffect(() => {
        setItem(null);
        setSeasons([]);
        setEpisodes([]);
        setCurrentSeasonId(null);
        setNextEpisode(null);
        setPlaySessionId(null);
        setMediaSourceId(null);
        setAudioStreams([]);
        setSubtitleStreams([]);
        setSelectedAudioIndex(null);
        setSelectedSubtitleIndex(null);
        setUseHls(true);
        setSelectedQualityPreset(QUALITY_PRESETS[0]);
        setHlsLevels([]);
        setCurrentLevelIndex(-1);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setBuffered(0);
        setIsLoading(true);
        setPlaybackStarted(false);
        setShowNextEpPopup(false);
        setShowSkipIntro(false);
        setShowSkipOutro(false);
        setShowSkipRecap(false);
        setIntroStart(-1);
        setIntroEnd(-1);
        setOutroStart(-1);
        setOutroEnd(-1);
        setRecapStart(-1);
        setRecapEnd(-1);
        setTrickplayManifest(null);
        setShowHoverPreview(false);
        lastReportTimeRef.current = 0;
        lastSavedLocalTimeRef.current = 0;
        resumeTimeRef.current = 0;

        setShowJellyfinMenu(false);
        setJellyfinMenuView('main');
        setAspectRatio('auto');
        setPlaybackSpeed(1);
        setRepeatMode('none');
        setShowStats(false);
        setDroppedFrames(0);
        setCorruptedFrames(0);
        setPlayerDimensions('0x0');
        setVideoResolution('0x0');

        // Synchronously set initial stream URL to match new ID
        setStreamUrl(jellyfinService.getStreamUrl(id, null, null, null, null, 140000000));

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    }, [id]);

    // Handle Idle User Controls auto-hide
    const resetIdleTimer = () => {
        setShowControls(true);
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
                setShowSettingsMenu(false);
                setSettingsMenuView('main');
                setShowJellyfinMenu(false);
                setJellyfinMenuView('main');
            }
        }, 3500);
    };

    const handleMouseMove = () => {
        resetIdleTimer();
    };

    useEffect(() => {
        resetIdleTimer();
        return () => {
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        };
    }, [isPlaying]);

    // Fetch and parse Trickplay tiles.m3u8 using the official Jellyfin API
    useEffect(() => {
        const loadTrickplay = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) return;

                const token = jellyfinService.api.accessToken;
                const baseUrl = jellyfinService.api.configuration.basePath || '';

                const width = 320;
                let url = `${baseUrl}/Videos/${id}/Trickplay/${width}/tiles.m3u8?api_key=${token}`;
                if (mediaSourceId) {
                    url += `&mediaSourceId=${mediaSourceId}`;
                }

                const res = await fetch(url);
                if (!res.ok) {
                    console.warn(`[Trickplay] tiles.m3u8 fetch failed with status: ${res.status}`);
                    setTrickplayManifest(null);
                    return;
                }

                const text = await res.text();
                const lines = text.split('\n');

                let tileWidth = 10;
                let tileHeight = 10;
                let thumbWidth = 320;
                let thumbHeight = 180;
                let interval = 10000; // default 10 seconds

                for (const line of lines) {
                    if (line.startsWith('#EXT-X-LAYOUT:') || line.startsWith('#EXT-X-TILE:') || line.includes('LAYOUT=')) {
                        const layoutMatch = line.match(/LAYOUT=(\d+)x(\d+)/i);
                        if (layoutMatch) {
                            tileWidth = parseInt(layoutMatch[1], 10);
                            tileHeight = parseInt(layoutMatch[2], 10);
                        }

                        const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
                        if (resMatch) {
                            thumbWidth = parseInt(resMatch[1], 10);
                            thumbHeight = parseInt(resMatch[2], 10);
                        }

                        const durMatch = line.match(/DURATION=(\d+)/i);
                        if (durMatch) {
                            interval = parseInt(durMatch[1], 10) * 1000;
                        }
                    }

                    if (line.startsWith('#EXT-X-TARGETDURATION:')) {
                        const targetDur = parseInt(line.split(':')[1], 10);
                        if (targetDur > 0) {
                            interval = targetDur * 1000;
                        }
                    }
                }

                let extinfCount = 0;
                let extinfDuration = 0;
                for (const line of lines) {
                    if (line.startsWith('#EXTINF:')) {
                        extinfCount++;
                        const match = line.match(/#EXTINF:([0-9.]+)/);
                        if (match) {
                            extinfDuration = parseFloat(match[1]);
                            break; // Use the first sheet's duration which is representative of a full sheet
                        }
                    }
                }

                if (extinfDuration > 0) {
                    const thumbsPerSheet = tileWidth * tileHeight;
                    interval = (extinfDuration / thumbsPerSheet) * 1000;
                }

                setTrickplayManifest({
                    Width: thumbWidth,
                    Height: thumbHeight,
                    TileWidth: tileWidth,
                    TileHeight: tileHeight,
                    Interval: interval || 10000,
                    SelectedWidth: width
                });
                console.log("[Trickplay] Parsed manifest details successfully:", { thumbWidth, thumbHeight, tileWidth, tileHeight, interval });

            } catch (err) {
                console.error("Error loading/parsing trickplay:", err);
                setTrickplayManifest(null);
            }
        };

        loadTrickplay();
    }, [id, mediaSourceId]);

    // Load Initial Metadata & User Preferences
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) {
                    navigate('/login');
                    return;
                }

                const data = await jellyfinService.getItemDetails(user.Id, id);
                if (!data) return;

                setItem(data);

                let playerTitle = `Watching: ${data.Name || 'Player'}`;
                if (data.Type === 'Episode') {
                    const season = String(data.ParentIndexNumber || 1).padStart(2, '0');
                    const episode = String(data.IndexNumber || 1).padStart(2, '0');
                    if (data.SeriesName) {
                        playerTitle = `Watching: ${data.SeriesName} - S${season}E${episode} - ${data.Name}`;
                    } else {
                        playerTitle = `Watching: S${season}E${episode} - ${data.Name}`;
                    }
                } else if (data.Type === 'Movie') {
                    playerTitle = `Watching: ${data.Name}`;
                }
                document.title = playerTitle;

                // Set resume time: check localStorage first, fallback to UserData ticks
                const localSecs = localStorage.getItem(`lf-resume-${id}`);
                if (localSecs) {
                    resumeTimeRef.current = parseFloat(localSecs);
                    console.log("[Playback] Resuming from localStorage:", resumeTimeRef.current);
                } else if (data.UserData?.PlaybackPositionTicks) {
                    resumeTimeRef.current = data.UserData.PlaybackPositionTicks / 10000000;
                    console.log("[Playback] Resuming from ticks:", resumeTimeRef.current);
                }

                // Check for Intro, Outro & Recap chapters (Skip markers)
                if (data.Chapters && data.Chapters.length > 0) {
                    const introChapter = data.Chapters.find(c => {
                        const name = c.Name?.toLowerCase() || '';
                        return name.includes('intro') || name.includes('opening') || name.includes('op');
                    });
                    if (introChapter) {
                        const startSecs = introChapter.StartPositionTicks / 10000000;
                        setIntroStart(startSecs);
                        const currentIndex = data.Chapters.indexOf(introChapter);
                        const nextChapter = data.Chapters[currentIndex + 1];
                        const endSecs = nextChapter ? (nextChapter.StartPositionTicks / 10000000) : (startSecs + 90);
                        setIntroEnd(endSecs);
                    }

                    const outroChapter = data.Chapters.find(c => {
                        const name = c.Name?.toLowerCase() || '';
                        return name.includes('outro') || name.includes('ending') || name.includes('credit') || name.includes('ed');
                    });
                    if (outroChapter) {
                        const startSecs = outroChapter.StartPositionTicks / 10000000;
                        setOutroStart(startSecs);
                        const currentIndex = data.Chapters.indexOf(outroChapter);
                        const nextChapter = data.Chapters[currentIndex + 1];
                        const endSecs = nextChapter ? (nextChapter.StartPositionTicks / 10000000) : (startSecs + 90);
                        setOutroEnd(endSecs);
                    }

                    const recapChapter = data.Chapters.find(c => {
                        const name = c.Name?.toLowerCase() || '';
                        return name.includes('recap') || name.includes('previously') || name.includes('preview');
                    });
                    if (recapChapter) {
                        const startSecs = recapChapter.StartPositionTicks / 10000000;
                        setRecapStart(startSecs);
                        const currentIndex = data.Chapters.indexOf(recapChapter);
                        const nextChapter = data.Chapters[currentIndex + 1];
                        const endSecs = nextChapter ? (nextChapter.StartPositionTicks / 10000000) : (startSecs + 90);
                        setRecapEnd(endSecs);
                    }
                }

                // Parallelize all subsequent metadata queries to start playback instantly
                const isEpisode = data.Type === 'Episode' && data.SeriesId;
                const [seriesData, seasonsData, episodesData] = await Promise.all([
                    isEpisode ? jellyfinService.getItemDetails(user.Id, data.SeriesId).catch(() => null) : Promise.resolve(null),
                    isEpisode ? jellyfinService.getSeasons(user.Id, data.SeriesId).catch(() => null) : Promise.resolve(null),
                    isEpisode ? jellyfinService.getEpisodes(user.Id, data.SeriesId, data.SeasonId).catch(() => null) : Promise.resolve(null)
                ]);

                if (isEpisode) {
                    if (seriesData) {
                        setIsFavorite(seriesData.UserData?.IsFavorite || false);
                    } else {
                        setIsFavorite(data.UserData?.IsFavorite || false);
                    }

                    if (seasonsData) {
                        setSeasons(seasonsData);
                        setCurrentSeasonId(data.SeasonId);
                    }

                    if (episodesData) {
                        const sortedEpisodes = episodesData.sort((a, b) => (a.IndexNumber || 0) - (b.IndexNumber || 0));
                        setEpisodes(sortedEpisodes);

                        // Find Next Episode for skip button
                        const currentIdx = sortedEpisodes.findIndex(ep => ep.Id === id);
                        if (currentIdx !== -1 && currentIdx < sortedEpisodes.length - 1) {
                            setNextEpisode(sortedEpisodes[currentIdx + 1]);
                        }
                    }
                } else {
                    setIsFavorite(data.UserData?.IsFavorite || false);
                }

            } catch (error) {
                console.error("Error loading initial player details:", error);
            }
        };
        loadInitialData();
    }, [id, navigate]);

    // Synchronize favorite toggles in real-time
    useEffect(() => {
        const handleToggle = (e) => {
            const { itemId, isFavorite: newFav } = e.detail;
            const targetId = item?.SeriesId || item?.Id;
            if (targetId === itemId) {
                setIsFavorite(newFav);
            }
        };
        window.addEventListener('favoriteToggled', handleToggle);
        return () => window.removeEventListener('favoriteToggled', handleToggle);
    }, [item]);

    // Netflix Auto Next Episode Timer & Reset
    useEffect(() => {
        if (!showSkipOutro) {
            setElapsedMs(0);
        }
    }, [showSkipOutro]);

    useEffect(() => {
        if (config.playerAutoNextEp !== false && showSkipOutro && nextEpisode && isPlaying) {
            const intervalId = setInterval(() => {
                setElapsedMs(prev => {
                    const next = prev + 100;
                    if (next >= 5000) {
                        clearInterval(intervalId);
                        handlePlayNextEpisode();
                        return 5000;
                    }
                    return next;
                });
            }, 100);
            return () => clearInterval(intervalId);
        }
    }, [showSkipOutro, nextEpisode, isPlaying, handlePlayNextEpisode, config.playerAutoNextEp]);

    // Unified streaming loop: Negotiates playback info and handles streamUrl changes safely
    useEffect(() => {
        const fetchStream = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) return;

                // Save current playback seconds in ref before reloading
                if (videoRef.current && videoRef.current.currentTime > 0) {
                    resumeTimeRef.current = videoRef.current.currentTime;
                }
                // Call posted PlaybackInfo on server
                const playbackInfo = await jellyfinService.getPlaybackInfo(
                    id,
                    user.Id,
                    selectedQualityPreset.bitrate,
                    selectedAudioIndex,
                    selectedSubtitleIndex,
                    mediaSourceId
                );

                if (playbackInfo?.MediaSources?.length > 0) {
                    const source = playbackInfo.MediaSources[0];
                    setMediaSourceId(source.Id);
                    setPlaySessionId(playbackInfo.PlaySessionId);

                    const streams = source.MediaStreams || [];
                    const audio = streams.filter(s => s.Type === 'Audio');
                    const subs = streams.filter(s => s.Type === 'Subtitle');

                    setAudioStreams(audio);
                    setSubtitleStreams(subs);

                    let activeAudioIdx = selectedAudioIndex;
                    let activeSubIdx = selectedSubtitleIndex;

                    // Match user settings profiles if indexes are not yet loaded
                    if (selectedAudioIndex === null && audio.length > 0) {
                        const audioPref = user.Configuration?.AudioLanguagePreference;
                        const matchedAudio = audio.find(s => s.Language?.toLowerCase() === audioPref?.toLowerCase());
                        const defaultAudio = audio.find(s => s.IsDefault) || audio[0];
                        activeAudioIdx = matchedAudio ? matchedAudio.Index : defaultAudio.Index;
                        setSelectedAudioIndex(activeAudioIdx);
                    }

                    if (selectedSubtitleIndex === null && subs.length > 0) {
                        const subMode = user.Configuration?.SubtitleMode;
                        const subPref = user.Configuration?.SubtitleLanguagePreference;
                        if (subMode !== 'None') {
                            const matchedSub = subs.find(s => s.Language?.toLowerCase() === subPref?.toLowerCase());
                            const defaultSub = subs.find(s => s.IsDefault || s.IsForced);
                            activeSubIdx = matchedSub ? matchedSub.Index : (defaultSub ? defaultSub.Index : null);
                            setSelectedSubtitleIndex(activeSubIdx);
                        }
                    }

                    // --- DIRECT PLAY / TRANSCODING DECISION ---
                    if (source.SupportsDirectPlay && selectedQualityPreset.name === 'Auto') {
                        // Play direct static file (0% CPU)
                        const directUrl = jellyfinService.getDirectStreamUrl(id, source.Id);
                        setStreamUrl(directUrl);
                        setUseHls(false);
                        console.log("[DirectPlay] Negotiated Direct Play stream");
                    } else {
                        // Play via Hls.js transcoding/direct streaming (1% - 80% CPU)
                        const transUrl = jellyfinService.getStreamUrl(
                            id,
                            activeAudioIdx,
                            activeSubIdx,
                            source.Id,
                            playbackInfo.PlaySessionId,
                            selectedQualityPreset.bitrate
                        );
                        setStreamUrl(transUrl);
                        setUseHls(true);
                        console.log("[PlaybackInfo] Negotiated HLS stream");
                    }
                }
            } catch (err) {
                console.error("Failed to load/negotiate playback stream:", err);
            }
        };

        fetchStream();
    }, [id, selectedQualityPreset, selectedAudioIndex, selectedSubtitleIndex]);

    // HLS.js or Native Video streaming lifecycle
    useEffect(() => {
        if (!streamUrl || !videoRef.current || castTarget) return;

        const video = videoRef.current;
        setIsLoading(true);

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (useHls) {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    maxBufferLength: 30,           // Fast VOD startup buffering sizes
                    maxMaxBufferLength: 90,
                    maxBufferSize: 60 * 1024 * 1024,
                    enableWorker: true,
                    lowLatencyMode: true,          // Low latency startup
                    backBufferLength: 30,          // Keep 30s in back buffer
                    progressive: true
                });
                hlsRef.current = hls;

                hls.loadSource(streamUrl);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (hls.levels && hls.levels.length > 0) {
                        setHlsLevels(hls.levels);
                    }
                    setCurrentLevelIndex(hls.currentLevel);

                    video.muted = false;
                    setIsMuted(false);
                    video.volume = volume;

                    video.play().catch(e => {
                        console.warn("Autoplay blocked by browser. Left paused showing play button.", e);
                    });
                });

                hls.on(Hls.Events.LEVEL_SWITCHED, () => {
                    setCurrentLevelIndex(hls.currentLevel);
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hls.recoverMediaError();
                                break;
                            default:
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS playback
                video.src = streamUrl;
                video.muted = false;
                setIsMuted(false);
                video.volume = volume;
                video.play().catch(e => console.warn("Safari HLS autoplay blocked:", e));
            }
        } else {
            // Direct Play (Static URL)
            video.src = streamUrl;
            video.muted = false;
            setIsMuted(false);
            video.volume = volume;
            video.play().catch(e => {
                console.warn("DirectPlay autoplay blocked:", e);
            });
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [streamUrl, useHls, castTarget]);

    // Cast Target playback & state sync loop
    useEffect(() => {
        if (!castTarget) return;

        console.log(`[LegitFlix Cast] Casting to session: ${castTarget.id} (name: ${castTarget.name})`);

        jellyfinService.playOnSession(castTarget.id, id)
            .then(() => console.log(`[LegitFlix Cast] playOnSession command sent.`))
            .catch(err => console.error("[LegitFlix Cast] Failed to cast item:", err));

        setIsLoading(false);
        setIsPlaying(true);
        setPlaybackStarted(true);

        const syncState = async () => {
            try {
                const sessions = await jellyfinService.getSessions();
                const session = sessions.find(s => s.Id === castTarget.id);
                if (session) {
                    if (session.NowPlayingItem && session.NowPlayingItem.Id === id) {
                        const positionSecs = (session.PlayState.PositionTicks || 0) / 10000000;
                        setCurrentTime(positionSecs);
                        setIsPlaying(!session.PlayState.IsPaused);
                        if (session.NowPlayingItem.RunTimeTicks) {
                            setDuration(session.NowPlayingItem.RunTimeTicks / 10000000);
                        }
                    }
                }
            } catch (err) {
                console.error("[LegitFlix Cast] Sync error:", err);
            }
        };

        syncState();
        const interval = setInterval(syncState, 4000);

        return () => {
            clearInterval(interval);
        };
    }, [id, castTarget]);

    // Cast Target + SyncPlay state update listeners
    useEffect(() => {
        const handleCastUpdated = (e) => {
            setCastTarget(e.detail);
        };
        const handleSyncJoined = () => {
            setSyncPlayActive(true);
        };
        const handleSyncLeft = () => {
            setSyncPlayActive(false);
        };
        window.addEventListener('castTargetUpdated', handleCastUpdated);
        window.addEventListener('syncPlayJoined', handleSyncJoined);
        window.addEventListener('syncPlayLeft', handleSyncLeft);
        return () => {
            window.removeEventListener('castTargetUpdated', handleCastUpdated);
            window.removeEventListener('syncPlayJoined', handleSyncJoined);
            window.removeEventListener('syncPlayLeft', handleSyncLeft);
        };
    }, []);

    // SyncPlay Synchronization Hook
    useEffect(() => {
        if (!syncPlayActive || castTarget) return;

        jellyfinService.connectWebSocket();

        console.log("[LegitFlix SyncPlay] Initializing synchronization observer...");

        const unsubscribe = jellyfinService.registerPlayer((event, data) => {
            if (event === 'SyncPlayCommand') {
                const cmd = data.Command;
                const positionSecs = (data.PositionTicks || 0) / 10000000;
                const video = videoRef.current;
                if (!video) return;

                console.log(`[LegitFlix SyncPlay] WS Command received: ${cmd} (Position: ${positionSecs}s)`);

                isSyncingRef.current = true;
                if (cmd === 'Pause') {
                    video.pause();
                    setIsPlaying(false);
                } else if (cmd === 'Unpause') {
                    video.play().catch(() => { });
                    setIsPlaying(true);
                } else if (cmd === 'Seek') {
                    video.currentTime = positionSecs;
                    setCurrentTime(positionSecs);
                }

                setTimeout(() => {
                    isSyncingRef.current = false;
                }, 200);
            }
        });

        const pingInterval = setInterval(() => {
            if (videoRef.current && !isSyncingRef.current && isPlaying) {
                const ticks = Math.floor(videoRef.current.currentTime * 10000000);
                jellyfinService.syncPlayPing(ticks).catch(() => { });
            }
        }, 5000);

        return () => {
            unsubscribe();
            clearInterval(pingInterval);
        };
    }, [id, isPlaying, castTarget, syncPlayActive]);

    // Handle Playback Reporting & Progress updates
    useEffect(() => {
        if (!item || !isPlaying || !playSessionId) {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            return;
        }

        if (!playbackStarted) {
            const initialTicks = Math.floor(currentTime * 10000000);
            jellyfinService.reportPlaybackStart(item.Id, initialTicks, mediaSourceId, selectedAudioIndex, selectedSubtitleIndex, playSessionId);
            setPlaybackStarted(true);
        }

        progressIntervalRef.current = setInterval(() => {
            if (videoRef.current) {
                const secs = videoRef.current.currentTime;
                const ticks = Math.floor(secs * 10000000);
                jellyfinService.reportPlaybackProgress(item.Id, ticks, false, mediaSourceId, playSessionId);
                lastReportTimeRef.current = secs;
            }
        }, 10000);

        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        };
    }, [isPlaying, item, playbackStarted, mediaSourceId, selectedAudioIndex, selectedSubtitleIndex, playSessionId]);

    // Save final state ticks to localStorage
    useEffect(() => {
        return () => {
            if (item && videoRef.current) {
                const finalTime = videoRef.current.currentTime;
                const ticks = Math.floor(finalTime * 10000000);
                jellyfinService.reportPlaybackStopped(item.Id, ticks, playSessionId);

                // If completed or close to end, clear local cache
                if (duration > 0 && finalTime >= duration - 5) {
                    localStorage.removeItem(`lf-resume-${id}`);
                }
            }
        };
    }, [id, duration, item, playSessionId]);

    // Fullscreen Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Apply playback speed
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed, streamUrl]);

    // Poll playback stats for nerds
    useEffect(() => {
        if (!showStats || !videoRef.current) return;

        const updateStats = () => {
            const video = videoRef.current;
            if (!video) return;

            setPlayerDimensions(`${video.clientWidth}x${video.clientHeight}`);
            setVideoResolution(`${video.videoWidth}x${video.videoHeight}`);

            if (typeof video.getVideoPlaybackQuality === 'function') {
                const q = video.getVideoPlaybackQuality();
                setDroppedFrames(q.droppedVideoFrames || 0);
                setCorruptedFrames(q.corruptedVideoFrames || 0);
            }
        };

        updateStats();
        const interval = setInterval(updateStats, 1000);
        return () => clearInterval(interval);
    }, [showStats, isPlaying]);

    // HTML5 Video Event Listeners
    const handlePlay = () => {
        setIsPlaying(true);
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
        const isSyncPlayActive = localStorage.getItem('legitflix_syncplay_joined_group') !== null;
        if (isSyncPlayActive && !isSyncingRef.current) {
            jellyfinService.syncPlayUnpause().catch(() => { });
        }
    };

    const handlePause = () => {
        setIsPlaying(false);
        if (item && videoRef.current) {
            const ticks = Math.floor(videoRef.current.currentTime * 10000000);
            jellyfinService.reportPlaybackProgress(item.Id, ticks, true, mediaSourceId, playSessionId);
        }
        const isSyncPlayActive = localStorage.getItem('legitflix_syncplay_joined_group') !== null;
        if (isSyncPlayActive && !isSyncingRef.current) {
            jellyfinService.syncPlayPause().catch(() => { });
        }
    };

    const handleSeeked = () => {
        const isSyncPlayActive = localStorage.getItem('legitflix_syncplay_joined_group') !== null;
        if (isSyncPlayActive && !isSyncingRef.current && videoRef.current) {
            const ticks = Math.floor(videoRef.current.currentTime * 10000000);
            jellyfinService.syncPlaySeek(ticks).catch(() => { });
        }
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const currentSecs = video.currentTime;
        setCurrentTime(currentSecs);

        // Apply subtitle delay to active text track cues dynamically
        const tracks = video.textTracks;
        if (tracks) {
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                if (track.mode === 'showing' && track.cues) {
                    for (let j = 0; j < track.cues.length; j++) {
                        const cue = track.cues[j];
                        if (cue.originalStartTime === undefined) {
                            cue.originalStartTime = cue.startTime;
                            cue.originalEndTime = cue.endTime;
                        }
                        const targetStart = cue.originalStartTime + subtitleDelay;
                        const targetEnd = cue.originalEndTime + subtitleDelay;
                        if (Math.abs(cue.startTime - targetStart) > 0.01) {
                            cue.startTime = targetStart;
                        }
                        if (Math.abs(cue.endTime - targetEnd) > 0.01) {
                            cue.endTime = targetEnd;
                        }
                        // Apply vertical position line offset dynamically
                        if (config.subtitleVerticalPosition === 'Top') {
                            if (cue.line !== 2) cue.line = 2;
                        } else if (config.subtitleVerticalPosition === 'Bottom') {
                            if (cue.line !== -2) cue.line = -2;
                        }
                    }
                }
            }
        }

        if (config.playerAutoSkip) {
            if (introEnd > 0 && currentSecs >= introStart && currentSecs < introEnd) {
                video.currentTime = introEnd;
                setCurrentTime(introEnd);
                setShowSkipIntro(false);
                return;
            }
        }
        if (config.playerAutoSkipRecap) {
            if (recapEnd > 0 && currentSecs >= recapStart && currentSecs < recapEnd) {
                video.currentTime = recapEnd;
                setCurrentTime(recapEnd);
                setShowSkipRecap(false);
                return;
            }
        }

        // Compute Buffered Percentage
        if (video.buffered.length > 0) {
            const end = video.buffered.end(video.buffered.length - 1);
            setBuffered((end / video.duration) * 100);
        }

        // Save current position to localStorage continuously
        const roundedSecs = Math.floor(currentSecs);
        if (roundedSecs !== lastSavedLocalTimeRef.current && roundedSecs > 0) {
            localStorage.setItem(`lf-resume-${id}`, roundedSecs.toString());
            lastSavedLocalTimeRef.current = roundedSecs;
        }

        // Show/Hide Skip Intro button dynamically (checks end time since start can be 0)
        if (introEnd > 0) {
            setShowSkipIntro(currentSecs >= introStart && currentSecs <= introEnd);
        }

        // Show/Hide Skip Outro button dynamically
        if (outroEnd > 0) {
            setShowSkipOutro(currentSecs >= outroStart && currentSecs <= outroEnd);
        }

        // Show/Hide Skip Recap button dynamically
        if (recapEnd > 0) {
            setShowSkipRecap(currentSecs >= recapStart && currentSecs <= recapEnd);
        }

        // Show Next Episode Popup if near end (within 30 seconds of ending)
        if (nextEpisode && duration > 0) {
            const timeLeft = duration - currentSecs;
            setShowNextEpPopup(timeLeft <= 30 && timeLeft > 2);
        }
    };

    const handleLoadedMetadata = () => {
        if (!videoRef.current) return;
        setDuration(videoRef.current.duration);
        setIsLoading(false);

        videoRef.current.playbackRate = playbackSpeed;

        // Restore playback position on load/re-negotiation
        if (resumeTimeRef.current > 0) {
            videoRef.current.currentTime = resumeTimeRef.current;
            resumeTimeRef.current = 0; // Reset
        }
    };

    const handleWaiting = () => {
        setIsLoading(true);
        const isSyncPlayActive = localStorage.getItem('legitflix_syncplay_joined_group') !== null;
        if (isSyncPlayActive && !isSyncingRef.current && videoRef.current) {
            const ticks = Math.floor(videoRef.current.currentTime * 10000000);
            jellyfinService.syncPlayBuffering(ticks, isPlaying).catch(() => { });
        }
    };

    const handlePlaying = () => {
        setIsLoading(false);
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
        const isSyncPlayActive = localStorage.getItem('legitflix_syncplay_joined_group') !== null;
        if (isSyncPlayActive && !isSyncingRef.current && videoRef.current) {
            const ticks = Math.floor(videoRef.current.currentTime * 10000000);
            jellyfinService.syncPlayReady(ticks, isPlaying).catch(() => { });
        }
    };

    const handleVideoEnded = () => {
        if (repeatMode === 'one') {
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(e => console.warn("Repeat play failed:", e));
            }
            return;
        }

        if (repeatMode === 'all') {
            const playlist = location.state?.playlist || [];
            if (playlist.length > 0) {
                const [nextId, ...remainingPlaylist] = playlist;
                const loopedPlaylist = [...remainingPlaylist, id];
                navigate(`/play/${nextId}`, { state: { playlist: loopedPlaylist } });
            } else if (nextEpisode) {
                navigate(`/play/${nextEpisode.Id}`);
            } else if (episodes.length > 0) {
                navigate(`/play/${episodes[0].Id}`);
            } else {
                if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play().catch(e => console.warn(e));
                }
            }
            return;
        }

        const playlist = location.state?.playlist || [];
        if (playlist.length > 0) {
            const [nextId, ...remainingPlaylist] = playlist;
            navigate(`/play/${nextId}`, { state: { playlist: remainingPlaylist } });
        } else if (nextEpisode) {
            navigate(`/play/${nextEpisode.Id}`);
        } else {
            navigate(-1);
        }
    };

    const handleBackClick = () => {
        if (item) {
            if (item.Type === 'Episode' && item.SeriesId) {
                navigate(`/series/${item.SeriesId}`);
                return;
            } else if (item.Type === 'Movie') {
                navigate(`/movie/${item.Id}`);
                return;
            }
        }
        navigate(-1);
    };

    // User Controls
    const togglePlay = () => {
        if (longPressedRef.current) {
            longPressedRef.current = false;
            return;
        }
        if (castTarget) {
            jellyfinService.sendPlaystateCommand(castTarget.id, isPlaying ? 'Pause' : 'Unpause')
                .then(() => setIsPlaying(!isPlaying))
                .catch(err => console.error(err));
            return;
        }
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play().catch(e => console.error("Play error:", e));
        }
        resetIdleTimer();
    };

    const handleLongPressStart = (e) => {
        if (!config.playerLongPressSpeed || castTarget || !videoRef.current) return;
        longPressedRef.current = false;
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = setTimeout(() => {
            if (videoRef.current) {
                videoRef.current.playbackRate = 2.0;
                setIsLongPressing(true);
                longPressedRef.current = true;
            }
        }, 400);
    };

    const handleLongPressEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        if (isLongPressing || longPressedRef.current) {
            if (videoRef.current) {
                videoRef.current.playbackRate = playbackSpeed;
            }
            setIsLongPressing(false);
            setTimeout(() => {
                longPressedRef.current = false;
            }, 100);
        }
    };

    const skipTime = (amount) => {
        if (castTarget) {
            let target = currentTime + amount;
            if (target < 0) target = 0;
            if (target > duration) target = duration;
            jellyfinService.sendPlaystateCommand(castTarget.id, 'Seek', Math.floor(target * 10000000))
                .then(() => setCurrentTime(target))
                .catch(err => console.error(err));
            return;
        }
        if (!videoRef.current) return;
        let target = videoRef.current.currentTime + amount;
        if (target < 0) target = 0;
        if (target > duration) target = duration;
        videoRef.current.currentTime = target;
        resetIdleTimer();
    };

    const handleTimelineChange = (e) => {
        const targetPercent = parseFloat(e.target.value);
        const targetSecs = (targetPercent / 100) * duration;
        if (castTarget) {
            jellyfinService.sendPlaystateCommand(castTarget.id, 'Seek', Math.floor(targetSecs * 10000000))
                .then(() => setCurrentTime(targetSecs))
                .catch(err => console.error(err));
            return;
        }
        if (!videoRef.current) return;
        videoRef.current.currentTime = targetSecs;
        setCurrentTime(targetSecs);
        resetIdleTimer();
    };

    const handleVolumeChange = (e) => {
        const vol = parseFloat(e.target.value);
        setVolume(vol);
        setIsMuted(vol === 0);
        if (videoRef.current) {
            videoRef.current.volume = vol;
            videoRef.current.muted = vol === 0;
        }
    };

    const toggleMute = () => {
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        if (videoRef.current) {
            videoRef.current.muted = nextMute;
        }
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error(`Error enabling fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
        resetIdleTimer();
    };

    const skipIntro = () => {
        if (videoRef.current && introEnd > 0) {
            videoRef.current.currentTime = introEnd;
            setCurrentTime(introEnd);
            setShowSkipIntro(false);
        }
    };

    const skipOutro = () => {
        if (videoRef.current && outroEnd > 0) {
            videoRef.current.currentTime = outroEnd;
            setCurrentTime(outroEnd);
            setShowSkipOutro(false);
        }
    };

    const skipRecap = () => {
        if (videoRef.current && recapEnd > 0) {
            videoRef.current.currentTime = recapEnd;
            setCurrentTime(recapEnd);
            setShowSkipRecap(false);
        }
    };

    function handlePlayNextEpisode() {
        if (nextEpisode) {
            navigate(`/play/${nextEpisode.Id}`);
        }
    }

    const getDynamicQualities = () => {
        if (!item) return [{ name: 'Auto', bitrate: 140000000 }];

        const mediaSource = item.MediaSources?.[0];
        if (!mediaSource) return [{ name: 'Auto', bitrate: 140000000 }];

        const videoStream = mediaSource.MediaStreams?.find(s => s.Type === 'Video');
        const origHeight = videoStream?.Height || mediaSource.Height || 1080;

        const options = [{ name: 'Auto', bitrate: 140000000 }];

        STANDARD_QUALITIES.forEach(q => {
            if (q.height <= origHeight) {
                options.push(q);
            }
        });

        return options;
    };

    const getSelectedQualityLabel = () => {
        if (!useHls) return 'Original (Direct Play)';
        if (selectedQualityPreset.name === 'Auto') {
            if (hlsRef.current && hlsRef.current.currentLevel !== -1 && hlsLevels[hlsRef.current.currentLevel]) {
                const activeLevel = hlsLevels[hlsRef.current.currentLevel];
                return `Auto (${activeLevel.height}p)`;
            }
            return 'Auto';
        }
        return selectedQualityPreset.name;
    };

    const getActiveChapterName = () => {
        if (!item || !item.Chapters || item.Chapters.length === 0) return '';
        const currentTicks = currentTime * 10000000;
        let activeChapter = item.Chapters[0];
        for (let i = 1; i < item.Chapters.length; i++) {
            if (item.Chapters[i].StartPositionTicks <= currentTicks) {
                activeChapter = item.Chapters[i];
            } else {
                break;
            }
        }
        return activeChapter ? activeChapter.Name : '';
    };

    const getHoveredChapterName = (time) => {
        if (!item || !item.Chapters || item.Chapters.length === 0) return '';
        const hoverTicks = time * 10000000;
        let activeChapter = item.Chapters[0];
        for (let i = 1; i < item.Chapters.length; i++) {
            if (item.Chapters[i].StartPositionTicks <= hoverTicks) {
                activeChapter = item.Chapters[i];
            } else {
                break;
            }
        }
        return activeChapter ? activeChapter.Name : '';
    };

    const formatTime = (secs) => {
        if (isNaN(secs)) return '0:00';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);

        if (h > 0) {
            return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        }
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Seekbar Mouse events for Trickplay preview
    const handleSeekbarMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const percent = Math.min(Math.max(mouseX / rect.width, 0), 1);
        setHoverPercent(percent * 100);
        setHoverTime(percent * duration);
        setShowHoverPreview(true);
    };

    const handleSeekbarMouseLeave = () => {
        setShowHoverPreview(false);
    };

    const getThumbnailStyle = (time) => {
        if (!trickplayManifest) return {};

        const interval = trickplayManifest.Interval || 10000;
        const thumbIndex = Math.floor((time * 1000) / interval);

        const cols = trickplayManifest.TileWidth || 10;
        const rows = trickplayManifest.TileHeight || 10;
        const thumbWidth = trickplayManifest.Width || 320;
        const thumbHeight = trickplayManifest.Height || 180;

        const thumbsPerSheet = cols * rows;
        const sheetIndex = Math.floor(thumbIndex / thumbsPerSheet);
        const indexInSheet = thumbIndex % thumbsPerSheet;

        // Clamp the index to prevent layout alignment overflow mapping
        const safeIndex = Math.min(Math.max(indexInSheet, 0), thumbsPerSheet - 1);
        const col = safeIndex % cols;
        const row = Math.floor(safeIndex / cols);

        const tileUrl = jellyfinService.getTrickplayTileUrl(
            id,
            trickplayManifest.SelectedWidth || thumbWidth,
            sheetIndex,
            mediaSourceId
        );

        // Align thumbnail using exact pixel coordinates to prevent off-center/black alignments
        return {
            backgroundImage: `url(${tileUrl})`,
            backgroundSize: `${cols * thumbWidth}px ${rows * thumbHeight}px`,
            backgroundPosition: `-${col * thumbWidth}px -${row * thumbHeight}px`,
            width: `${thumbWidth}px`,
            height: `${thumbHeight}px`
        };
    };

    const handleSeasonChange = async (seasonId) => {
        setCurrentSeasonId(seasonId);
        try {
            const user = await jellyfinService.getCurrentUser();
            if (user && item?.SeriesId) {
                const episodesData = await jellyfinService.getEpisodes(user.Id, item.SeriesId, seasonId);
                const sortedEpisodes = episodesData.sort((a, b) => (a.IndexNumber || 0) - (b.IndexNumber || 0));
                setEpisodes(sortedEpisodes);
            }
        } catch (error) {
            console.error("Failed to change season:", error);
        }
    };

    const toggleFavorite = async () => {
        if (!item) return;
        const targetId = item.SeriesId || item.Id;
        try {
            const user = await jellyfinService.getCurrentUser();
            const newFav = !isFavorite;
            // Optimistic update
            setIsFavorite(newFav);
            window.dispatchEvent(new CustomEvent('favoriteToggled', {
                detail: { itemId: targetId, isFavorite: newFav }
            }));
            await jellyfinService.markFavorite(user.Id, targetId, newFav);
        } catch (err) {
            console.error("Favorite toggle failed", err);
            // Revert on failure
            setIsFavorite(!isFavorite);
            window.dispatchEvent(new CustomEvent('favoriteToggled', {
                detail: { itemId: targetId, isFavorite: !isFavorite }
            }));
        }
    };

    // Keyboard controls
    useEffect(() => {
        const cycleAspectRatio = () => {
            const modes = ['auto', 'cover', 'fill', '16:9', '4:3'];
            setAspectRatio(prev => {
                const idx = modes.indexOf(prev);
                return modes[(idx + 1) % modes.length];
            });
        };

        const cycleSubtitleTracks = () => {
            if (subtitleStreams.length === 0) return;
            const choices = [null, ...subtitleStreams.map(s => s.Index)];
            const currentIndex = selectedSubtitleIndex === null ? 0 : choices.indexOf(selectedSubtitleIndex);
            const nextIndex = (currentIndex + 1) % choices.length;
            setSelectedSubtitleIndex(choices[nextIndex]);
        };

        const cycleAudioTracks = () => {
            if (audioStreams.length === 0) return;
            const currentIndex = selectedAudioIndex === null ? 0 : audioStreams.findIndex(s => s.Index === selectedAudioIndex);
            const nextIndex = (currentIndex + 1) % audioStreams.length;
            setSelectedAudioIndex(audioStreams[nextIndex].Index);
        };

        const changePlaybackSpeed = (delta) => {
            setPlaybackSpeed(prev => {
                const newVal = Math.round((prev + delta) * 10) / 10;
                return Math.max(0.5, Math.min(2.0, newVal));
            });
        };

        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            resetIdleTimer();
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (e.repeat) return;
                    if (config.playerLongPressSpeed && !castTarget && videoRef.current) {
                        spaceSpeedActiveRef.current = false;
                        if (spaceTimerRef.current) clearTimeout(spaceTimerRef.current);
                        spaceTimerRef.current = setTimeout(() => {
                            if (videoRef.current) {
                                videoRef.current.playbackRate = 2.0;
                                setIsLongPressing(true);
                                spaceSpeedActiveRef.current = true;
                            }
                        }, 400);
                    } else {
                        togglePlay();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    skipTime(-(config.playerSeekTime || 10));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    skipTime(config.playerSeekTime || 10);
                    break;
                case 'KeyF':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        e.preventDefault();
                        document.exitFullscreen();
                    }
                    break;
                case 'KeyM':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'KeyA':
                    e.preventDefault();
                    cycleAspectRatio();
                    break;
                case 'KeyI':
                    e.preventDefault();
                    setShowStats(prev => !prev);
                    break;
                case 'KeyC':
                    e.preventDefault();
                    cycleSubtitleTracks();
                    break;
                case 'KeyV':
                    e.preventDefault();
                    cycleAudioTracks();
                    break;
                case 'KeyS':
                    e.preventDefault();
                    setShowSettingsMenu(true);
                    setSettingsMenuView('subtitles');
                    break;
                case 'Equal':
                case 'NumpadAdd':
                    if (e.shiftKey || e.code === 'NumpadAdd') {
                        e.preventDefault();
                        changePlaybackSpeed(0.1);
                    }
                    break;
                case 'Minus':
                case 'NumpadSubtract':
                    e.preventDefault();
                    changePlaybackSpeed(-0.1);
                    break;
                case 'KeyR':
                    e.preventDefault();
                    setPlaybackSpeed(1.0);
                    break;
                default:
                    break;
            }
        };

        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                if (spaceTimerRef.current) {
                    clearTimeout(spaceTimerRef.current);
                    spaceTimerRef.current = null;
                }
                if (spaceSpeedActiveRef.current) {
                    e.preventDefault();
                    if (videoRef.current) {
                        videoRef.current.playbackRate = playbackSpeed;
                    }
                    setIsLongPressing(false);
                    spaceSpeedActiveRef.current = false;
                } else if (config.playerLongPressSpeed) {
                    e.preventDefault();
                    togglePlay();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isPlaying, duration, isMuted, config, playbackSpeed, subtitleStreams, selectedSubtitleIndex, audioStreams, selectedAudioIndex]);

    useEffect(() => {
        const handlePauseOnFocusLoss = () => {
            if (!videoRef.current) return;
            const isPlayingElement = !videoRef.current.paused;

            // Hidden tab or blurred window
            if (document.hidden || !document.hasFocus()) {
                if (config.playerAutoPip) {
                    if (document.pictureInPictureEnabled && videoRef.current.requestPictureInPicture) {
                        videoRef.current.requestPictureInPicture().catch(err => {
                            console.log("[LegitFlix] Failed auto PiP:", err);
                            if (config.playerAutoPause && isPlayingElement) {
                                videoRef.current.pause();
                                autoPausedRef.current = true;
                            }
                        });
                    } else if (config.playerAutoPause && isPlayingElement) {
                        videoRef.current.pause();
                        autoPausedRef.current = true;
                    }
                } else if (config.playerAutoPause && isPlayingElement) {
                    videoRef.current.pause();
                    autoPausedRef.current = true;
                }
            }
        };

        const handleResumeOnFocusGain = () => {
            if (!videoRef.current) return;
            if (!document.hidden && document.hasFocus()) {
                if (document.pictureInPictureElement) {
                    document.exitPictureInPicture().catch(e => console.log("[LegitFlix] Failed exit PiP:", e));
                }
                if (config.playerAutoResume && autoPausedRef.current) {
                    videoRef.current.play().catch(e => console.error("[LegitFlix] Auto resume failed:", e));
                    autoPausedRef.current = false;
                }
            }
        };

        const onVisibilityChange = () => {
            if (document.hidden) handlePauseOnFocusLoss();
            else handleResumeOnFocusGain();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('blur', handlePauseOnFocusLoss);
        window.addEventListener('focus', handleResumeOnFocusGain);

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('blur', handlePauseOnFocusLoss);
            window.removeEventListener('focus', handleResumeOnFocusGain);
        };
    }, [config]);

    // Gamepad controls loop
    useEffect(() => {
        if (!config.enableGamepad) return;

        let active = true;
        const lastButtonStates = {};

        const pollGamepad = () => {
            if (!active) return;
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = gamepads.find(g => g !== null);

            if (gp) {
                gp.buttons.forEach((btn, idx) => {
                    const pressed = btn.pressed;
                    const wasPressed = !!lastButtonStates[idx];

                    if (pressed && !wasPressed) {
                        switch (idx) {
                            case 0: // A button -> play/pause
                                togglePlay();
                                break;
                            case 1: // B button -> back
                                navigate(-1);
                                break;
                            case 12: // D-pad Up -> volume up
                                setVolume(prev => Math.min(1, prev + 0.05));
                                break;
                            case 13: // D-pad Down -> volume down
                                setVolume(prev => Math.max(0, prev - 0.05));
                                break;
                            case 14: // D-pad Left -> seek backward
                                skipTime(-(config.playerSeekTime || 10));
                                break;
                            case 15: // D-pad Right -> seek forward
                                skipTime(config.playerSeekTime || 10);
                                break;
                            default:
                                break;
                        }
                    }
                    lastButtonStates[idx] = pressed;
                });
            }

            requestAnimationFrame(pollGamepad);
        };

        pollGamepad();

        return () => {
            active = false;
        };
    }, [config.enableGamepad, isPlaying, duration, volume]);

    const currentPercent = duration ? (currentTime / duration) * 100 : 0;
    const progressStyles = {
        background: `linear-gradient(to right, 
            var(--clr-accent, #f47521) 0%, 
            var(--clr-accent, #f47521) ${currentPercent}%, 
            #70737d ${currentPercent}%, 
            #70737d ${Math.max(currentPercent, buffered)}%, 
            #3d3f46 ${Math.max(currentPercent, buffered)}%, 
            #3d3f46 100%)`
    };

    const nextEpCountdown = Math.max(0, Math.ceil((5000 - elapsedMs) / 1000));
    const fillPercent = config.playerAutoNextEp !== false ? (elapsedMs / 5000) * 100 : 0;
    const nextBtnText = config.playerAutoNextEp !== false ? `Next Episode in ${nextEpCountdown}s` : "Next Episode";

    const getOriginalMediaInfo = () => {
        if (!item || !item.MediaSources || item.MediaSources.length === 0) return {};
        const source = item.MediaSources[0];

        const sizeMiB = source.Size
            ? `${(source.Size / (1024 * 1024)).toFixed(1)} MiB`
            : 'N/A';

        const bitrateMbps = source.Bitrate
            ? `${(source.Bitrate / 1000000).toFixed(1)} Mbps`
            : 'N/A';

        const videoStream = source.MediaStreams?.find(s => s.Type === 'Video');
        const audioStream = source.MediaStreams?.find(s => s.Type === 'Audio');

        return {
            container: source.Container || 'N/A',
            size: sizeMiB,
            bitrate: bitrateMbps,
            videoCodec: videoStream ? `${videoStream.Codec?.toUpperCase() || ''} ${videoStream.Profile || ''}`.trim() : 'N/A',
            videoBitrate: videoStream && videoStream.Bitrate ? `${Math.round(videoStream.Bitrate / 1000)} kbps` : 'N/A',
            videoRange: videoStream?.VideoRangeType || videoStream?.VideoRange || 'SDR',
            audioCodec: audioStream ? audioStream.Codec?.toUpperCase() || 'N/A' : 'N/A',
            audioBitrate: audioStream && audioStream.Bitrate ? `${Math.round(audioStream.Bitrate / 1000)} kbps` : 'N/A',
            audioChannels: audioStream?.Channels ? `${audioStream.Channels}` : 'N/A',
            audioSampleRate: audioStream?.SampleRate ? `${audioStream.SampleRate} Hz` : 'N/A',
            audioBitDepth: audioStream?.BitDepth ? `${audioStream.BitDepth}` : 'N/A'
        };
    };

    const originalMediaInfo = getOriginalMediaInfo();

    if (!item) {
        return (
            <div className="lf-player-page" style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Navbar alwaysFilled={true} />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner cr-spinner-orange"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="lf-player-page">
            <Navbar alwaysFilled={true} />

            {/* Custom Interactive Player Container */}
            <div
                ref={containerRef}
                className={`lf-player-video-container cr-player-container ${isFullscreen ? 'is-fullscreen' : ''} ${!showControls ? 'hide-cursor' : ''}`}
                onMouseMove={handleMouseMove}
            >
                {/* HTML5 Native Video Tag or Cast Screen Poster */}
                {castTarget ? (
                    <div className="lf-player-cast-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <span className="material-icons lf-player-cast-screen-icon" style={{ fontSize: '72px', color: 'var(--clr-accent, #ff7e00)', marginBottom: '16px', animation: 'pulse 2s infinite' }}>cast_connected</span>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: '#fff' }}>Casting to {castTarget.name}</h3>
                        <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.6)' }}>{item?.Name || 'Loading title...'}</p>
                    </div>
                ) : (
                    <>
                        {isLongPressing && (
                            <div style={{
                                position: 'absolute',
                                top: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0, 0, 0, 0.75)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                color: '#fff',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                zIndex: 1000,
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                            }}>
                                <span className="material-icons" style={{ fontSize: '1rem', color: 'var(--clr-accent, #ff7e00)' }}>fast_forward</span>
                                2X Speed
                            </div>
                        )}
                        <video
                            ref={videoRef}
                            className="lf-player-video-element"
                            preload="auto"
                            onClick={togglePlay}
                            onDoubleClick={toggleFullscreen}
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onTimeUpdate={handleTimeUpdate}
                            onSeeked={handleSeeked}
                            onLoadedMetadata={handleLoadedMetadata}
                            onWaiting={handleWaiting}
                            onPlaying={handlePlaying}
                            onEnded={handleVideoEnded}
                            onMouseDown={handleLongPressStart}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                            onTouchStart={handleLongPressStart}
                            onTouchEnd={handleLongPressEnd}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: aspectRatio === 'auto' ? 'contain' : (aspectRatio === 'cover' ? 'cover' : 'fill'),
                                aspectRatio: (aspectRatio === '16:9' ? '16/9' : (aspectRatio === '4:3' ? '4/3' : 'auto')),
                                background: '#000'
                            }}
                        />
                    </>
                )}

                {/* Loading / Buffering Spinner */}
                {isLoading && (
                    <div className="lf-player-loading-spinner-layer">
                        <div className="spinner cr-spinner-orange"></div>
                    </div>
                )}

                {/* Skip Recap Button Pill */}
                {showSkipRecap && (
                    <button className="cr-skip-intro-btn cr-skip-recap-btn" onClick={skipRecap}>
                        <span className="material-icons">skip_next</span>
                        <span>Skip Recap</span>
                    </button>
                )}

                {/* Skip Intro Button Pill */}
                {showSkipIntro && (
                    <button className="cr-skip-intro-btn" onClick={skipIntro}>
                        <span className="material-icons">skip_next</span>
                        <span>Skip Intro</span>
                    </button>
                )}

                {/* Skip Outro Button Pill */}
                {showSkipOutro && (
                    <>
                        {nextEpisode && (
                            <button className="cr-next-episode-btn" onClick={handlePlayNextEpisode}>
                                <div className="layer-base">
                                    <span className="material-icons">skip_next</span>
                                    <span>{nextBtnText}</span>
                                </div>
                                <div className="layer-filled" style={{ width: `${fillPercent}%` }}>
                                    <div className="layer-filled-content">
                                        <span className="material-icons">skip_next</span>
                                        <span>{nextBtnText}</span>
                                    </div>
                                </div>
                            </button>
                        )}
                        <button className="cr-skip-intro-btn cr-skip-outro-btn" onClick={skipOutro}>
                            <span className="material-icons">skip_next</span>
                            <span>Skip Outro</span>
                        </button>
                    </>
                )}

                {/* Next Episode Toast Popup */}
                {showNextEpPopup && nextEpisode && (
                    <div className="cr-next-ep-toast">
                        <div className="toast-img">
                            <img src={jellyfinService.getImageUrl(nextEpisode, 'Primary', { maxWidth: 150 })} alt="Next Episode" />
                        </div>
                        <div className="toast-details">
                            <span className="toast-label">Up Next</span>
                            <span className="toast-title">E{nextEpisode.IndexNumber} - {nextEpisode.Name}</span>
                            <button className="toast-play-now" onClick={handlePlayNextEpisode}>
                                Play Now
                            </button>
                        </div>
                    </div>
                )}

                {/* Crunchyroll-Style HUD Overlay */}
                <div className={`lf-player-hud-overlay cr-hud-overlay ${showControls ? 'visible' : 'hidden'}`}>

                    {/* Top HUD Row */}
                    <div className="hud-top-bar cr-hud-top">
                        <button className="hud-back-btn cr-back-btn" onClick={handleBackClick}>
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div className="hud-meta-block">
                            {item.Type === 'Episode' ? (
                                <>
                                    <span className="hud-series-title cr-accent-text">{item.SeriesName}</span>
                                    <h1 className="hud-item-title">S{item.ParentIndexNumber}E{item.IndexNumber} - {item.Name}</h1>
                                </>
                            ) : (
                                <h1 className="hud-item-title">{item.Name}</h1>
                            )}
                        </div>
                    </div>

                    {/* Timeline Seekbar Row */}
                    <div className="hud-bottom-bar cr-hud-bottom">
                        <div className="hud-timeline-container cr-timeline-row">
                            <span className="hud-time-display cr-time">
                                {formatTime(currentTime)}
                                {getActiveChapterName() && (
                                    <span className="cr-current-chapter-name" style={{ marginLeft: '8px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 'normal', fontSize: '0.85rem' }}>
                                        • {getActiveChapterName()}
                                    </span>
                                )}
                            </span>

                            <div
                                className="hud-slider-wrapper cr-slider-wrap"
                                onMouseMove={handleSeekbarMouseMove}
                                onMouseLeave={handleSeekbarMouseLeave}
                            >
                                {/* Chapter Ticks Overlay (Media Section Dividers) */}
                                <div className="cr-seekbar-chapters-ticks">
                                    {duration > 0 && (item.Chapters || []).map((chapter, idx) => {
                                        const chapterTime = chapter.StartPositionTicks / 10000000;
                                        const leftPercent = (chapterTime / duration) * 100;
                                        if (leftPercent <= 0 || leftPercent >= 100) return null;
                                        return (
                                            <div
                                                key={idx}
                                                className="cr-seekbar-chapter-tick"
                                                style={{ left: `${leftPercent}%` }}
                                                title={chapter.Name}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Trickplay Hover Preview Thumbnail Box */}
                                {showHoverPreview && duration > 0 && (
                                    <div className="cr-hover-preview" style={{ left: `${hoverPercent}%` }}>
                                        {trickplayManifest && (
                                            <div className="cr-hover-thumbnail" style={getThumbnailStyle(hoverTime)} />
                                        )}
                                        <span className="cr-hover-time-text">
                                            {formatTime(hoverTime)}
                                            {getHoveredChapterName(hoverTime) && ` - ${getHoveredChapterName(hoverTime)}`}
                                        </span>
                                    </div>
                                )}

                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={currentPercent}
                                    onChange={handleTimelineChange}
                                    style={progressStyles}
                                    className="hud-seeker-range cr-seeker-range"
                                />
                            </div>

                            <span className="hud-time-display cr-time">{formatTime(duration)}</span>
                        </div>

                        {/* Controls Bottom Row */}
                        <div className="hud-controls-row cr-controls-row">
                            {/* Left Group Controls */}
                            <div className="hud-left-controls cr-left-group">
                                <button className="hud-icon-btn cr-icon-btn" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
                                    <span className="material-icons">
                                        {isPlaying ? 'pause' : 'play_arrow'}
                                    </span>
                                </button>

                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <button className="hud-icon-btn cr-icon-btn" onClick={() => skipTime(-(config.playerSeekTime || 10))} title={`Rewind ${config.playerSeekTime || 10}s`}>
                                        <span className="material-icons">fast_rewind</span>
                                    </button>

                                    <button className="hud-icon-btn cr-icon-btn" onClick={() => skipTime(config.playerSeekTime || 10)} title={`Forward ${config.playerSeekTime || 10}s`}>
                                        <span className="material-icons">fast_forward</span>
                                    </button>
                                </div>

                                {nextEpisode && (
                                    <button className="hud-icon-btn cr-icon-btn" onClick={handlePlayNextEpisode} title="Next Episode">
                                        <span className="material-icons">skip_next</span>
                                    </button>
                                )}

                                {/* Volume Slider */}
                                <div className="hud-volume-control cr-volume-control">
                                    <button className="hud-icon-btn cr-icon-btn" onClick={toggleMute}>
                                        <span className="material-icons">
                                            {isMuted ? 'volume_off' : volume > 0.5 ? 'volume_up' : 'volume_down'}
                                        </span>
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={handleVolumeChange}
                                        className="hud-volume-slider cr-volume-slider"
                                    />
                                    <span className="hud-volume-percentage">
                                        {Math.round((isMuted ? 0 : volume) * 100)}%
                                    </span>
                                </div>
                            </div>

                            {/* Right Group Controls */}
                            <div className="hud-right-controls cr-right-group">
                                {/* Drill-Down Settings Menu */}
                                <div className="hud-settings-wrapper cr-settings-wrap">
                                    <button className="hud-icon-btn cr-icon-btn" onClick={() => {
                                        setShowSettingsMenu(!showSettingsMenu);
                                        setSettingsMenuView('main');
                                        setShowJellyfinMenu(false);
                                    }} title="Audio & Subtitles">
                                        <span className="material-icons">tune</span>
                                    </button>

                                    {showSettingsMenu && (
                                        <div className="hud-settings-dropdown cr-settings-panel">
                                            {settingsMenuView === 'main' && (
                                                <ul className="cr-settings-list">
                                                    <li onClick={() => setSettingsMenuView('quality')}>
                                                        <span>Quality</span>
                                                        <span className="cr-settings-val">
                                                            {getSelectedQualityLabel()}
                                                        </span>
                                                        <span className="material-icons list-arrow">chevron_right</span>
                                                    </li>
                                                    <li onClick={() => setSettingsMenuView('audio')}>
                                                        <span>Audio Language</span>
                                                        <span className="cr-settings-val">
                                                            {audioStreams.find(s => s.Index === selectedAudioIndex)?.Language?.toUpperCase() || 'Default'}
                                                        </span>
                                                        <span className="material-icons list-arrow">chevron_right</span>
                                                    </li>
                                                    <li onClick={() => setSettingsMenuView('subtitles')}>
                                                        <span>Subtitles</span>
                                                        <span className="cr-settings-val">
                                                            {selectedSubtitleIndex === null ? 'Off' : subtitleStreams.find(s => s.Index === selectedSubtitleIndex)?.Language?.toUpperCase() || 'On'}
                                                        </span>
                                                        <span className="material-icons list-arrow">chevron_right</span>
                                                    </li>
                                                    <li onClick={() => setSettingsMenuView('subtitle-delay')}>
                                                        <span>Subtitle Delay</span>
                                                        <span className="cr-settings-val">
                                                            {subtitleDelay === 0 ? 'None' : `${subtitleDelay > 0 ? '+' : ''}${subtitleDelay.toFixed(1)}s`}
                                                        </span>
                                                        <span className="material-icons list-arrow">chevron_right</span>
                                                    </li>
                                                </ul>
                                            )}

                                            {/* Quality Submenu */}
                                            {settingsMenuView === 'quality' && (
                                                <div className="cr-settings-submenu">
                                                    <div className="submenu-header" onClick={() => setSettingsMenuView('main')}>
                                                        <span className="material-icons">chevron_left</span>
                                                        <span>Quality</span>
                                                    </div>
                                                    <ul className="submenu-list">
                                                        {!useHls ? (
                                                            <li className="selected">
                                                                <span className="cr-radio-circle"></span>
                                                                <span>Original (Direct Play)</span>
                                                            </li>
                                                        ) : (
                                                            <>
                                                                {getDynamicQualities().map((preset) => {
                                                                    const isSelected = selectedQualityPreset.name === preset.name;
                                                                    return (
                                                                        <li
                                                                            key={preset.name}
                                                                            className={isSelected ? 'selected' : ''}
                                                                            onClick={() => {
                                                                                setSelectedQualityPreset(preset);
                                                                                setShowSettingsMenu(false);
                                                                                setSettingsMenuView('main');
                                                                                resetIdleTimer();
                                                                            }}
                                                                        >
                                                                            <span className="cr-radio-circle"></span>
                                                                            <span>{preset.name}</span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Audio Submenu */}
                                            {settingsMenuView === 'audio' && (
                                                <div className="cr-settings-submenu">
                                                    <div className="submenu-header" onClick={() => setSettingsMenuView('main')}>
                                                        <span className="material-icons">chevron_left</span>
                                                        <span>Audio Language</span>
                                                    </div>
                                                    <ul className="submenu-list">
                                                        {audioStreams.map(stream => (
                                                            <li
                                                                key={stream.Index}
                                                                className={selectedAudioIndex === stream.Index ? 'selected' : ''}
                                                                onClick={() => {
                                                                    setSelectedAudioIndex(stream.Index);
                                                                    setShowSettingsMenu(false);
                                                                }}
                                                            >
                                                                <span className="cr-radio-circle"></span>
                                                                <span>{stream.Language ? stream.Language.toUpperCase() : 'Unknown'} - {stream.DisplayTitle || stream.Title || 'Track'}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Subtitles Submenu */}
                                            {settingsMenuView === 'subtitles' && (
                                                <div className="cr-settings-submenu">
                                                    <div className="submenu-header" onClick={() => setSettingsMenuView('main')}>
                                                        <span className="material-icons">chevron_left</span>
                                                        <span>Subtitles</span>
                                                    </div>
                                                    <ul className="submenu-list">
                                                        <li className={selectedSubtitleIndex === null ? 'selected' : ''} onClick={() => {
                                                            setSelectedSubtitleIndex(null);
                                                            setShowSettingsMenu(false);
                                                        }}>
                                                            <span className="cr-radio-circle"></span>
                                                            <span>Off</span>
                                                        </li>
                                                        {subtitleStreams.map(stream => (
                                                            <li
                                                                key={stream.Index}
                                                                className={selectedSubtitleIndex === stream.Index ? 'selected' : ''}
                                                                onClick={() => {
                                                                    setSelectedSubtitleIndex(stream.Index);
                                                                    setShowSettingsMenu(false);
                                                                }}
                                                            >
                                                                <span className="cr-radio-circle"></span>
                                                                <span>{stream.Language ? stream.Language.toUpperCase() : 'Unknown'} - {stream.DisplayTitle || stream.Title || 'Track'}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }}></div>
                                                    <div className="style-appearance-btn" onClick={() => setSettingsMenuView('subtitle-style')}>
                                                        <span className="material-icons" style={{ fontSize: '1.2rem' }}>palette</span>
                                                        <span>Style Appearance...</span>
                                                    </div>
                                                </div>
                                            )}

                                            {settingsMenuView === 'subtitle-style' && (
                                                <div className="cr-settings-submenu">
                                                    <div className="submenu-header" onClick={() => setSettingsMenuView('subtitles')}>
                                                        <span className="material-icons">chevron_left</span>
                                                        <span>Subtitle Style</span>
                                                    </div>
                                                    <div style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <div style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 0, display: 'flex' }}>
                                                            <span style={{ fontSize: '0.8rem', color: '#999', marginBottom: '4px' }}>Text Size</span>
                                                            <select
                                                                className="legit-select"
                                                                style={{ width: '100%', padding: '6px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                                                                value={config.subtitleTextSize}
                                                                onChange={(e) => updateConfig({ subtitleTextSize: e.target.value })}
                                                            >
                                                                <option value="Small">Small</option>
                                                                <option value="Normal">Normal</option>
                                                                <option value="Medium">Medium</option>
                                                                <option value="Large">Large</option>
                                                                <option value="Extra Large">Extra Large</option>
                                                            </select>
                                                        </div>
                                                        <div style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 0, display: 'flex' }}>
                                                            <span style={{ fontSize: '0.8rem', color: '#999', marginBottom: '4px' }}>Text Color</span>
                                                            <select
                                                                className="legit-select"
                                                                style={{ width: '100%', padding: '6px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                                                                value={config.subtitleColor}
                                                                onChange={(e) => updateConfig({ subtitleColor: e.target.value })}
                                                            >
                                                                <option value="#ffffff">White</option>
                                                                <option value="#ffff00">Yellow</option>
                                                                <option value="#00ff00">Green</option>
                                                                <option value="#00ffff">Cyan</option>
                                                                <option value="#ff00ff">Magenta</option>
                                                                <option value="#ff0000">Red</option>
                                                                <option value="#000000">Black</option>
                                                            </select>
                                                        </div>
                                                        <div style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 0, display: 'flex' }}>
                                                            <span style={{ fontSize: '0.8rem', color: '#999', marginBottom: '4px' }}>Vertical Position</span>
                                                            <select
                                                                className="legit-select"
                                                                style={{ width: '100%', padding: '6px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                                                                value={config.subtitleVerticalPosition}
                                                                onChange={(e) => updateConfig({ subtitleVerticalPosition: e.target.value })}
                                                            >
                                                                <option value="Bottom">Bottom</option>
                                                                <option value="Top">Top</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtitle Delay Submenu */}
                                            {settingsMenuView === 'subtitle-delay' && (
                                                <div className="cr-settings-submenu">
                                                    <div className="submenu-header" onClick={() => setSettingsMenuView('main')}>
                                                        <span className="material-icons">chevron_left</span>
                                                        <span>Subtitle Delay</span>
                                                    </div>
                                                    <div style={{ padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>
                                                            {subtitleDelay === 0 ? 'No Delay' : `${subtitleDelay > 0 ? '+' : ''}${subtitleDelay.toFixed(1)}s`}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ fontSize: '0.8rem', color: '#8b8f9e', minWidth: '30px', textAlign: 'right' }}>-10s</span>
                                                            <input
                                                                type="range"
                                                                min="-10"
                                                                max="10"
                                                                step="0.1"
                                                                value={subtitleDelay}
                                                                onChange={(e) => setSubtitleDelay(parseFloat(e.target.value))}
                                                                style={{
                                                                    flexGrow: 1,
                                                                    accentColor: 'var(--clr-accent, #ff6a00)',
                                                                    cursor: 'pointer',
                                                                    height: '4px'
                                                                }}
                                                            />
                                                            <span style={{ fontSize: '0.8rem', color: '#8b8f9e', minWidth: '30px' }}>+10s</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSubtitleDelay(0)}
                                                            style={{
                                                                background: 'rgba(255, 255, 255, 0.08)',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                color: '#fff',
                                                                padding: '6px 12px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600',
                                                                alignSelf: 'center',
                                                                transition: 'background 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                                                        >
                                                            Reset Delay
                                                        </button>
                                                        <div style={{ fontSize: '0.75rem', color: '#8b8f9e', textAlign: 'center', lineHeight: '1.4' }}>
                                                            Drag slider to shift subtitles forward or backward in time to sync with audio.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Advanced Jellyfin Settings Menu */}
                                <div className="hud-settings-wrapper cr-settings-wrap">
                                    <button className="hud-icon-btn cr-icon-btn" onClick={() => {
                                        setShowJellyfinMenu(!showJellyfinMenu);
                                        setJellyfinMenuView('main');
                                        setShowSettingsMenu(false);
                                    }} title="Playback Settings">
                                        <span className="material-icons">settings</span>
                                    </button>

                                    {showJellyfinMenu && (
                                        <div className="hud-settings-dropdown cr-settings-panel">
                                            {jellyfinMenuView === 'main' && (
                                                <ul className="cr-settings-list">
                                                    <li onClick={() => setJellyfinMenuView('aspect-ratio')}>
                                                        <span>Aspect Ratio</span>
                                                        <span className="cr-settings-val">{aspectRatio === 'auto' ? 'Auto' : aspectRatio.toUpperCase()}</span>
                                                        <span className="material-icons list-arrow">chevron_right</span>
                                                    </li>
                                                    <li onClick={() => setJellyfinMenuView('playback-speed')}>
                                                        <span>Playback Speed</span>
                                                        <span className="cr-settings-val">{playbackSpeed}x</span>
                                                        <span className="material-icons list-arrow">chevron_right</span>
                                                    </li>
                                                    <li onClick={() => setJellyfinMenuView('repeat-mode')}>
                                                        <span>Repeat Mode</span>
                                                        <span className="cr-settings-val">{repeatMode === 'none' ? 'None' : (repeatMode === 'one' ? 'Repeat One' : 'Repeat All')}</span>
                                                        <span className="material-icons list-arrow">chevron_right</span>
                                                    </li>
                                                    <li onClick={() => {
                                                        setShowJellyfinMenu(false);
                                                        setShowStats(true);
                                                    }}>
                                                        <span>Playback Info</span>
                                                        <span className="material-icons list-arrow">chevron_right</span>
                                                    </li>
                                                </ul>
                                            )}

                                            {/* Aspect Ratio Submenu */}
                                            {jellyfinMenuView === 'aspect-ratio' && (
                                                <div className="cr-settings-submenu">
                                                    <div className="submenu-header" onClick={() => setJellyfinMenuView('main')}>
                                                        <span className="material-icons">chevron_left</span>
                                                        <span>Aspect Ratio</span>
                                                    </div>
                                                    <ul className="submenu-list">
                                                        {['auto', 'cover', 'fill', '16:9', '4:3'].map(mode => (
                                                            <li
                                                                key={mode}
                                                                className={aspectRatio === mode ? 'selected' : ''}
                                                                onClick={() => {
                                                                    setAspectRatio(mode);
                                                                    setShowJellyfinMenu(false);
                                                                }}
                                                            >
                                                                <span className="cr-radio-circle"></span>
                                                                <span>{mode === 'auto' ? 'Auto' : (mode === 'cover' ? 'Cover' : (mode === 'fill' ? 'Fill' : mode))}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Playback Speed Submenu */}
                                            {jellyfinMenuView === 'playback-speed' && (
                                                <div className="cr-settings-submenu">
                                                    <div className="submenu-header" onClick={() => setJellyfinMenuView('main')}>
                                                        <span className="material-icons">chevron_left</span>
                                                        <span>Playback Speed</span>
                                                    </div>
                                                    <ul className="submenu-list">
                                                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                                            <li
                                                                key={speed}
                                                                className={playbackSpeed === speed ? 'selected' : ''}
                                                                onClick={() => {
                                                                    setPlaybackSpeed(speed);
                                                                    setShowJellyfinMenu(false);
                                                                }}
                                                            >
                                                                <span className="cr-radio-circle"></span>
                                                                <span>{speed}x</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Repeat Mode Submenu */}
                                            {jellyfinMenuView === 'repeat-mode' && (
                                                <div className="cr-settings-submenu">
                                                    <div className="submenu-header" onClick={() => setJellyfinMenuView('main')}>
                                                        <span className="material-icons">chevron_left</span>
                                                        <span>Repeat Mode</span>
                                                    </div>
                                                    <ul className="submenu-list">
                                                        {['none', 'one', 'all'].map(mode => (
                                                            <li
                                                                key={mode}
                                                                className={repeatMode === mode ? 'selected' : ''}
                                                                onClick={() => {
                                                                    setRepeatMode(mode);
                                                                    setShowJellyfinMenu(false);
                                                                }}
                                                            >
                                                                <span className="cr-radio-circle"></span>
                                                                <span>{mode === 'none' ? 'None' : (mode === 'one' ? 'Repeat One' : 'Repeat All')}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button className="hud-icon-btn cr-icon-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                                    <span className="material-icons">
                                        {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats for Nerds Modal Overlay */}
                {showStats && (
                    <div className="playerStats">
                        <div className="playerStats-content">
                            <button type="button" className="playerStats-closeButton" onClick={() => setShowStats(false)} title="Close Stats">
                                <span className="material-icons">close</span>
                            </button>
                            <div className="playerStats-stats">
                                <div className="playerStats-stat playerStats-stat-header">
                                    <div className="playerStats-stat-label">Stats for Nerds</div>
                                    <div className="playerStats-stat-value"></div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Player</div>
                                    <div className="playerStats-stat-value">{useHls ? 'Hls.js Video Player' : 'Html Video Player'}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Play method</div>
                                    <div className="playerStats-stat-value">{useHls ? 'Transcoding' : 'Direct playing'}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Protocol</div>
                                    <div className="playerStats-stat-value">{window.location.protocol.replace(':', '')}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Stream type</div>
                                    <div className="playerStats-stat-value">Video</div>
                                </div>

                                <div className="playerStats-stat playerStats-stat-header">
                                    <div className="playerStats-stat-label">Video Info</div>
                                    <div className="playerStats-stat-value"></div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Player dimensions</div>
                                    <div className="playerStats-stat-value">{playerDimensions}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Video resolution</div>
                                    <div className="playerStats-stat-value">{videoResolution}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Dropped frames</div>
                                    <div className="playerStats-stat-value">{droppedFrames}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Corrupted frames</div>
                                    <div className="playerStats-stat-value">{corruptedFrames}</div>
                                </div>

                                <div className="playerStats-stat playerStats-stat-header">
                                    <div className="playerStats-stat-label">Original Media Info</div>
                                    <div className="playerStats-stat-value"></div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Container</div>
                                    <div className="playerStats-stat-value">{originalMediaInfo.container}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Size</div>
                                    <div className="playerStats-stat-value">{originalMediaInfo.size}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Bitrate</div>
                                    <div className="playerStats-stat-value">{originalMediaInfo.bitrate}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Video codec</div>
                                    <div className="playerStats-stat-value">{originalMediaInfo.videoCodec}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Video range type</div>
                                    <div className="playerStats-stat-value">{originalMediaInfo.videoRange}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Audio codec</div>
                                    <div className="playerStats-stat-value">{originalMediaInfo.audioCodec}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Audio bitrate</div>
                                    <div className="playerStats-stat-value">{originalMediaInfo.audioBitrate}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Audio channels</div>
                                    <div className="playerStats-stat-value">{originalMediaInfo.audioChannels}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Audio sample rate</div>
                                    <div className="playerStats-stat-value">{originalMediaInfo.audioSampleRate}</div>
                                </div>
                                <div className="playerStats-stat">
                                    <div className="playerStats-stat-label">Audio bit depth</div>
                                    <div className="playerStats-stat-value">{originalMediaInfo.audioBitDepth}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Metadata & Episodes --- */}
            {item.Type === 'Episode' && (
                <div className="lf-player-content-container">
                    <div className="lf-player-column-left">
                        <div className="lf-player-header-row">
                            <div className="lf-player-title-block">
                                <h4 className="lf-series-link" onClick={() => navigate(`/series/${item.SeriesId}`)}>
                                    {String(item.SeriesName || '')}
                                </h4>
                                <h1 className="lf-episode-name">E{String(item.IndexNumber)} - {String(item.Name || '')}</h1>
                            </div>
                            <div className="lf-player-actions">
                                <button className={`lf-action-btn ${isFavorite ? 'is-active' : ''}`} onClick={toggleFavorite}>
                                    <span className="material-icons" style={{ color: isFavorite ? 'red' : 'inherit' }}>{isFavorite ? 'favorite' : 'favorite_border'}</span>
                                </button>
                            </div>
                        </div>
                        <div className="lf-player-tags-row">
                            {item.OfficialRating && <span className="lf-tag-rating">{String(item.OfficialRating)}</span>}
                            <span className="lf-tag-text">Sub | Dub</span>
                        </div>
                        <div className="lf-player-metadata">
                            <h1>{String(item.Name || '')}</h1>
                            <p className="lf-player-description">{String(item.Overview || '')}</p>
                        </div>
                    </div>

                    <div className="lf-player-column-right">
                        <div className="lf-player-episodes-panel">
                            <div className="lf-episodes-panel-header">
                                <span className="lf-panel-title">Episodes</span>
                                {seasons.length > 1 && (
                                    <div className="season-select-wrapper">
                                        <select
                                            className="lf-season-dropdown"
                                            value={currentSeasonId || ''}
                                            onChange={(e) => handleSeasonChange(e.target.value)}
                                        >
                                            {seasons.map((s) => (
                                                <option key={s.Id} value={s.Id}>
                                                    {s.Name || `Season ${s.IndexNumber}`}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="material-icons dropdown-icon">expand_more</span>
                                    </div>
                                )}
                            </div>
                            <div className="lf-episodes-grid">
                                {episodes.map(ep => (
                                    <div key={ep.Id} className={`lf-episode-card-small ${ep.Id === item.Id ? 'current' : ''} ${ep.UserData?.Played ? 'is-watched' : ''}`} onClick={() => navigate(`/play/${ep.Id}`)}>
                                        <div className="ep-card-img">
                                            <img src={jellyfinService.getImageUrl(ep, 'Primary', { maxWidth: 300 })} alt={ep.Name} onError={(e) => e.target.style.display = 'none'} />
                                            {ep.Id === item.Id && (
                                                <div className="ep-card-playing-overlay">
                                                    <span className="material-icons">play_arrow</span>
                                                </div>
                                            )}
                                            {ep.UserData?.Played && ep.Id !== item.Id && (
                                                <div className="ep-card-watched-badge">
                                                    <span className="material-icons">check</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="ep-card-info">
                                            <div className="ep-card-title"><span className="ep-prefix">E{String(ep.IndexNumber)}</span> - {String(ep.Name || '')}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Player;
