import { Jellyfin } from '@jellyfin/sdk';
import { UserApi } from '@jellyfin/sdk/lib/generated-client/api/user-api';
import { UserLibraryApi } from '@jellyfin/sdk/lib/generated-client/api/user-library-api';
import { UserViewsApi } from '@jellyfin/sdk/lib/generated-client/api/user-views-api';
import { ItemsApi } from '@jellyfin/sdk/lib/generated-client/api/items-api';
import { TvShowsApi } from '@jellyfin/sdk/lib/generated-client/api/tv-shows-api';
import { LibraryApi } from '@jellyfin/sdk/lib/generated-client/api/library-api';
import { SubtitleApi } from '@jellyfin/sdk/lib/generated-client/api/subtitle-api';
import { PlaystateApi } from '@jellyfin/sdk/lib/generated-client/api/playstate-api';
import { DisplayPreferencesApi } from '@jellyfin/sdk/lib/generated-client/api/display-preferences-api';
import { QuickConnectApi } from '@jellyfin/sdk/lib/generated-client/api/quick-connect-api';
import { ImageApi } from '@jellyfin/sdk/lib/generated-client/api/image-api';
import { PluginsApi } from '@jellyfin/sdk/lib/generated-client/api/plugins-api';
import { MediaInfoApi } from '@jellyfin/sdk/lib/generated-client/api/media-info-api';
import { SystemApi } from '@jellyfin/sdk/lib/generated-client/api/system-api';
import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';
import { SyncPlayApi } from '@jellyfin/sdk/lib/generated-client/api/sync-play-api';
import { ItemLookupApi } from '@jellyfin/sdk/lib/generated-client/api/item-lookup-api';
import { SearchApi } from '@jellyfin/sdk/lib/generated-client/api/search-api';

class JellyfinService {
    constructor() {
        let deviceId = null;
        try {
            deviceId = localStorage.getItem('legitflix_device_id');
            if (!deviceId) {
                deviceId = 'legitflix-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                localStorage.setItem('legitflix_device_id', deviceId);
            }
        } catch (e) {
            deviceId = 'legitflix-web-fallback';
        }

        this.jellyfin = new Jellyfin({
            clientInfo: { name: 'LegitFlix Client', version: '1.0.0.18' },
            deviceInfo: { name: 'LegitFlix Web', id: deviceId }
        });
        this.api = null;
        this.playerListeners = new Set();
        this.activeWs = null;
        this.wsKeepAliveInterval = null;
        this.reconnectTimeout = null;
        this.isWSEnabled = false;
    }

    initialize(accessToken = null, basePath = null) {
        let url = basePath;
        if (!url) {
            if (window.ApiClient && typeof window.ApiClient.serverAddress === 'function') {
                url = window.ApiClient.serverAddress();
            }
            if (!url && this.api?.basePath) {
                url = this.api.basePath;
            }
            if (!url) {
                url = window.location.origin;
            }
        }

        let token = accessToken;
        if (!token) {
            if (window.ApiClient && typeof window.ApiClient.accessToken === 'function') {
                token = window.ApiClient.accessToken();
            }
            if (!token && this.api?.accessToken) {
                token = this.api.accessToken;
            }
        }

        this.api = this.jellyfin.createApi(
            url,
            token
        );

        this.api.user = new UserApi(this.api.configuration);
        this.api.userLibrary = new UserLibraryApi(this.api.configuration);
        this.api.userViews = new UserViewsApi(this.api.configuration);
        this.api.items = new ItemsApi(this.api.configuration);
        this.api.tvShows = new TvShowsApi(this.api.configuration);
        this.api.library = new LibraryApi(this.api.configuration);
        this.api.subtitle = new SubtitleApi(this.api.configuration);
        this.api.playstate = new PlaystateApi(this.api.configuration);
        this.api.displayPreferences = new DisplayPreferencesApi(this.api.configuration);
        this.api.quickConnect = new QuickConnectApi(this.api.configuration);
        this.api.image = new ImageApi(this.api.configuration);
        this.api.plugins = new PluginsApi(this.api.configuration);
        this.api.mediaInfo = new MediaInfoApi(this.api.configuration);
        this.api.session = new SessionApi(this.api.configuration);
        this.api.syncPlay = new SyncPlayApi(this.api.configuration);
        this.api.itemLookup = new ItemLookupApi(this.api.configuration);
        this.api.search = new SearchApi(this.api.configuration);

        console.log("[LegitFlix] API Initialized. Access Token present:", !!token);
    }

    async getCurrentUser() {
        // Return cached user instantly if available
        if (this._cachedUser) return this._cachedUser;
        // If a fetch is already in-flight, piggyback on it
        if (this._userPromise) return this._userPromise;

        this._userPromise = this._resolveCurrentUser();
        try {
            const user = await this._userPromise;
            this._cachedUser = user;
            return user;
        } finally {
            this._userPromise = null;
        }
    }

    clearUserCache() {
        this._cachedUser = null;
        this._userPromise = null;
    }

    async _resolveCurrentUser() {
        // If we are running in a WebView/wrapper where window.ApiClient might be injected asynchronously,
        // poll for it for a short duration.
        const isWrapper = window.location.protocol === 'file:' ||
            window.location.protocol.startsWith('app') ||
            window.location.protocol.startsWith('capacitor') ||
            window.location.hostname === 'localhost' ||
            window.location.pathname.includes('/LegitFlix/Client/');

        if (isWrapper && !window.ApiClient) {
            console.log("[LegitFlix] Wrapper/PWA detected. Waiting for window.ApiClient to be injected...");
            for (let i = 0; i < 40; i++) { // Poll for up to 2 seconds (40 * 50ms)
                await new Promise(resolve => setTimeout(resolve, 50));
                if (window.ApiClient) {
                    console.log("[LegitFlix] window.ApiClient injected successfully after " + ((i + 1) * 50) + "ms");
                    break;
                }
            }
        }

        if (window.ApiClient) {
            try {
                // Also wait for serverAddress and accessToken to be populated if needed
                for (let i = 0; i < 20; i++) {
                    const addr = typeof window.ApiClient.serverAddress === 'function' ? window.ApiClient.serverAddress() : null;
                    const token = typeof window.ApiClient.accessToken === 'function' ? window.ApiClient.accessToken() : null;
                    if (addr && token) {
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                const user = await window.ApiClient.getCurrentUser();
                if (user) {
                    const token = typeof window.ApiClient.accessToken === 'function' ? window.ApiClient.accessToken() : null;
                    const basePath = typeof window.ApiClient.serverAddress === 'function' ? window.ApiClient.serverAddress() : null;
                    if (token && basePath) {
                        if (!this.api || this.api.accessToken !== token || this.api.basePath !== basePath) {
                            console.log("[LegitFlix] Syncing API with window.ApiClient. Token & BasePath updated.");
                            this.initialize(token, basePath);
                        }
                    }
                }
                return user;
            } catch (e) {
                console.warn("Failed to get current user from window.ApiClient", e);
            }
        }

        // Check localStorage for the active user credentials
        const storedCreds = localStorage.getItem('jellyfin_credentials');
        if (storedCreds) {
            try {
                const parsed = JSON.parse(storedCreds);
                if (parsed.Servers && parsed.Servers.length > 0) {
                    const activeServer = parsed.Servers.find(s => s.AccessToken && s.UserId);
                    if (activeServer) {
                        // Ensure API is initialized with the correct token
                        if (!this.api || this.api.accessToken !== activeServer.AccessToken) {
                            console.log("[LegitFlix] Initializing API with stored token");
                            this.initialize(activeServer.AccessToken);
                        }

                        try {
                            const response = await this.api.user.getUserById({ userId: activeServer.UserId });
                            return response.data;
                        } catch (apiError) {
                            console.error("[LegitFlix] Token check failed.", apiError);
                            // Only logout if explicitly unauthorized (401)
                            if (apiError.response && apiError.response.status === 401) {
                                console.warn("[LegitFlix] Token expired or invalid (401). Logging out.");
                                this.logout();
                            }
                            // Otherwise (network error, server down), keep the token.
                            // The app will redirect to login because we return null, 
                            // but the user won't have to re-enter credentials once the server is back.
                            return null;
                        }
                    }
                }
            } catch (e) {
                console.error("[LegitFlix] Failed to parse jellyfin_credentials", e);
            }
        }

        return null;
    }

    // --- Auth Flow Methods ---

    async validateServer(url) {
        let cleanUrl = url.trim();
        // Auto-add protocol if missing
        if (!cleanUrl.match(/^https?:\/\//)) {
            cleanUrl = `http://${cleanUrl}`;
        }

        // Strip trailing slash
        let baseUrl = cleanUrl.replace(/\/$/, "");

        // Error handling for common typos (e.g. 'locahost')
        if (baseUrl.includes('locahost') || baseUrl.includes('loacalhost') || baseUrl.includes('loaclhost')) {
            console.warn("[LegitFlix] Detected potential typo in localhost URL:", baseUrl);
        }

        try {
            // Instantiate official SystemApi from the Jellyfin SDK
            const systemApi = new SystemApi({ basePath: baseUrl });
            const response = await systemApi.getPublicSystemInfo();
            return { valid: true, data: response.data, baseUrl };
        } catch (e) {
            console.error("[LegitFlix] Server validation failed for", baseUrl, e);

            let msg = "Connection failed.";
            const isNetworkError = !e.response;

            if (isNetworkError) {
                msg = "Network error or CORS blocked.";
                if (baseUrl.includes('locahost') || baseUrl.includes('loacalhost') || baseUrl.includes('loaclhost')) {
                    msg = "Typo detected: Did you mean 'localhost'? (Currently: '" + baseUrl.split('//')[1].split(':')[0] + "')";
                } else if (baseUrl.includes('localhost')) {
                    msg += " Try using '127.0.0.1' instead of 'localhost', or ensure the server is running.";
                } else if (window.location.protocol === 'https:' && baseUrl.startsWith('http:')) {
                    msg += " Mixed Content blocked: Cannot connect to an HTTP server from an HTTPS site.";
                } else {
                    msg += " Ensure the server is running and reachable.";
                }
            } else if (e.response) {
                msg = `Server responded with ${e.response.status} ${e.response.statusText}`;
            }
            return { valid: false, error: msg };
        }
    }

    async getPublicUsers() {
        if (!this.api) this.initialize();
        const response = await this.api.user.getPublicUsers();
        return response.data;
    }

    async authenticateUser(username, password) {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.user.authenticateUserByName({
                authenticateUserByName: {
                    Username: username,
                    Pw: password
                }
            });

            // Save Session
            const authResult = response.data;
            if (authResult.AccessToken && authResult.User) {
                this.initialize(authResult.AccessToken);

                // Store in LocalStorage (Simple format for now)
                const storedData = {
                    Servers: [{
                        DateLastAccessed: new Date().toISOString(),
                        AccessToken: authResult.AccessToken,
                        UserId: authResult.User.Id,
                        Name: authResult.User.Name,
                        ManualAddress: this.api.basePath
                    }]
                };
                localStorage.setItem('jellyfin_credentials', JSON.stringify(storedData));
                return authResult.User;
            }
        } catch (e) {
            console.error("Authentication failed", e);
            throw e;
        }
        return null;
    }

    async getItem(userId, itemId) {
        if (!this.api) this.initialize();
        const response = await this.api.userLibrary.getItem({ userId, itemId });
        return response.data;
    }

    async getSimilarItems(userId, itemId) {
        if (!this.api) this.initialize();
        const response = await this.api.library.getSimilarItems({ userId, itemId, limit: 24 });
        return response.data;
    }

    async getItems(userId, query) {
        if (!this.api) this.initialize();
        const response = await this.api.items.getItems({ userId, ...query });
        return response.data;
    }

    async markPlayed(userId, itemId, isPlayed) {
        if (!this.api) this.initialize();
        try {
            if (isPlayed) {
                const response = await this.api.playstate.markPlayedItem({ itemId, userId });
                return response.data;
            } else {
                const response = await this.api.playstate.markUnplayedItem({ itemId, userId });
                return response.data;
            }
        } catch (error) {
            console.error("markPlayed failed", error);
            throw error;
        }
    }

    async updateUserData(userId, itemId, userData) {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.items.updateItemUserData({
                itemId,
                userId,
                updateUserItemDataDto: userData
            });
            return response.data;
        } catch (error) {
            console.error("updateUserData failed", error);
            throw error;
        }
    }

    async markFavorite(userId, itemId, isFavorite) {
        if (!this.api) this.initialize();
        if (isFavorite) {
            return await this.api.userLibrary.markFavoriteItem({ userId, itemId });
        } else {
            return await this.api.userLibrary.unmarkFavoriteItem({ userId, itemId });
        }
    }

    async getSeasons(userId, seriesId) {
        if (!this.api) this.initialize();
        const response = await this.api.tvShows.getSeasons({ userId, seriesId });
        return response.data.Items || [];
    }

    async getEpisodes(userId, seriesId, seasonId) {
        if (!this.api) this.initialize();
        const user = await this.getCurrentUser();
        const response = await this.api.tvShows.getEpisodes({
            userId,
            seriesId,
            seasonId,
            fields: ['MediaSources', 'RunTimeTicks', 'UserData', 'Overview', 'Path'],
            includeMissingEpisodes: user?.Configuration?.DisplayMissingEpisodes ?? false,
            includeUnairedEpisodes: user?.Configuration?.DisplayUnairedEpisodes ?? false
        });
        return response.data.Items || [];
    }

    async getNextUp(userId, seriesId) {
        if (!this.api) this.initialize();
        const response = await this.api.tvShows.getNextUp({ userId, seriesId, limit: 1 });
        return response.data;
    }

    async getUserViews(userId) {
        if (!this.api) this.initialize();
        const response = await this.api.userViews.getUserViews({ userId });
        return response.data;
    }

    async getSeries(userId, seriesId) {
        if (!this.api) this.initialize();
        const fields = ['Overview', 'Genres', 'Studios', 'OfficialRating', 'CommunityRating', 'ImageTags', 'BackdropImageTags', 'People', 'RemoteTrailers', 'LocalTrailers', 'ChildCount', 'MediaSources'];
        const response = await this.api.userLibrary.getItem({
            userId,
            itemId: seriesId,
            fields: fields
        });
        return response.data;
    }

    async getResumeItems(userId, limit = 12) {
        try {
            const fields = 'PrimaryImageAspectRatio,Overview,ImageTags,ProductionYear,RunTimeTicks,CommunityRating,OfficialRating,UserData';
            const response = await this.makeRequest(`/UserItems/Resume?userId=${userId}&limit=${limit}&fields=${fields}`);
            if (response && response.Items) {
                return response;
            } else if (Array.isArray(response)) {
                return { Items: response };
            }
            return { Items: [] };
        } catch (error) {
            console.error("getResumeItems failed", error);
            return { Items: [] };
        }
    }

    async getHistoryItems(userId, limit = 50) {
        if (!this.api) this.initialize();
        const response = await this.api.tvShows.getNextUp({
            userId,
            limit,
            fields: ['PrimaryImageAspectRatio', 'Overview', 'ImageTags', 'ProductionYear', 'RunTimeTicks', 'CommunityRating', 'OfficialRating', 'UserData']
        });
        return response.data;
    }

    async hideFromResume(itemId) {
        if (!this.api) this.initialize();
        const user = await this.getCurrentUser();
        if (!user) return;

        try {
            // Clear playback position ticks to hide from "Continue Watching"
            return await this.updateUserData(user.Id, itemId, {
                PlaybackPositionTicks: 0
            });
        } catch (e) {
            console.error("hideFromResume failed", e);
            throw e;
        }
    }

    async getItemDetails(userIdOrItemId, itemId = null) {
        if (!this.api) this.initialize();
        let resolvedUserId = userIdOrItemId;
        let resolvedItemId = itemId;

        // If only one argument is provided, it's the itemId.
        if (itemId === null) {
            resolvedItemId = userIdOrItemId;
            try {
                const user = await this.getCurrentUser();
                resolvedUserId = user?.Id;
            } catch (e) {
                console.warn("Failed to get current user in getItemDetails", e);
            }
        }

        try {
            const fields = ['Path', 'ProviderIds', 'RemoteTrailers', 'LocalTrailers', 'People', 'Studios', 'Genres', 'Overview', 'ProductionYear', 'OfficialRating', 'RunTimeTicks', 'Tags', 'ImageTags', 'MediaStreams', 'UserData', 'MediaSources', 'Trickplay', 'Chapters', 'Width', 'Height', 'ChildCount', 'RecursiveItemCount'];
            const response = await this.api.userLibrary.getItem({
                userId: resolvedUserId,
                itemId: resolvedItemId,
                fields: fields
            });
            return response.data;
        } catch (error) {
            console.error('getItemDetails failed', error);
            // Fallback to raw request without user context
            try {
                return await this.makeRequest(`/Items/${resolvedItemId}?Fields=Path,ProviderIds,ProductionYear,RemoteTrailers,LocalTrailers,People,Studios,Genres,Overview,OfficialRating,RunTimeTicks,Tags,ImageTags,MediaStreams,UserData,MediaSources`);
            } catch (e) {
                console.error('getItemDetails raw fallback failed', e);
                return null;
            }
        }
    }

    async refreshItem(itemId) {
        if (!this.api) this.initialize();
        try {
            await this.makeRequest(
                `/Items/${itemId}/Refresh?metadataRefreshMode=Default&imageRefreshMode=Default&replaceAllMetadata=false&replaceAllImages=false`,
                'POST'
            );
            return true;
        } catch (e) {
            console.error("Failed to refresh item", e);
            return false;
        }
    }

    async getExternalIdInfos(itemId) {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.itemLookup.getExternalIdInfos({ itemId });
            return response.data || [];
        } catch (e) {
            console.error("getExternalIdInfos failed", e);
            return [];
        }
    }

    async searchRemoteItems(itemId, itemType, searchInfo) {
        if (!this.api) this.initialize();
        try {
            const requestParam = {
                SearchInfo: searchInfo,
                ItemId: itemId
            };
            if (itemType === 'Series') {
                const response = await this.api.itemLookup.getSeriesRemoteSearchResults({
                    seriesInfoRemoteSearchQuery: requestParam
                });
                return response.data || [];
            } else {
                const response = await this.api.itemLookup.getMovieRemoteSearchResults({
                    movieInfoRemoteSearchQuery: requestParam
                });
                return response.data || [];
            }
        } catch (e) {
            console.error("searchRemoteItems failed", e);
            return [];
        }
    }

    async applyRemoteSearch(itemId, searchResult, replaceAllImages = false) {
        if (!this.api) this.initialize();
        try {
            await this.api.itemLookup.applySearchCriteria({
                itemId,
                remoteSearchResult: searchResult,
                replaceAllImages
            });
            return true;
        } catch (e) {
            console.error("applyRemoteSearch failed", e);
            return false;
        }
    }

    async getLatestItems(userId, parentId) {
        if (!this.api) this.initialize();
        try {
            const user = await this.getCurrentUser();
            const query = {
                userId,
                parentId,
                sortBy: ['DateCreated'],
                sortOrder: ['Descending'],
                includeItemTypes: ['Movie', 'Series'],
                recursive: true,
                fields: ['PrimaryImageAspectRatio', 'Overview', 'ImageTags', 'ProductionYear', 'RunTimeTicks', 'CommunityRating', 'OfficialRating', 'ChildCount', 'UserData']
            };
            if (user?.Configuration?.HidePlayedInLatest) {
                query.filters = ['IsUnplayed'];
            }
            const response = await this.api.items.getItems(query);
            return response.data;
        } catch (error) {
            console.error('getLatestItems failed', error);
            return { Items: [] };
        }
    }

    getBasePath() {
        if (window.ApiClient && typeof window.ApiClient.serverAddress === 'function') {
            const addr = window.ApiClient.serverAddress();
            if (addr) return addr;
        }
        if (this.api?.basePath) {
            return this.api.basePath;
        }
        if (this.api?.configuration?.basePath) {
            return this.api.configuration.basePath;
        }
        const storedCreds = localStorage.getItem('jellyfin_credentials');
        if (storedCreds) {
            try {
                const parsed = JSON.parse(storedCreds);
                if (parsed.Servers && parsed.Servers.length > 0) {
                    const activeServer = parsed.Servers.find(s => s.Address || s.ManualAddress);
                    if (activeServer) return activeServer.Address || activeServer.ManualAddress;
                }
            } catch (e) { }
        }
        return window.location.origin;
    }

    getUserImageUrl(userId, options = {}) {
        if (!userId) return '';

        // 1. Check cached custom avatars (Netflix or custom uploaded) in localStorage
        try {
            const cachedAvatars = JSON.parse(localStorage.getItem('legitflix_user_avatars') || '{}');
            if (cachedAvatars[userId]) {
                return cachedAvatars[userId];
            }
        } catch (e) { }

        // 2. Build URL using tag if provided
        const { quality = 90, tag = null } = options;
        const baseUrl = this.getBasePath();

        if (tag) {
            return `${baseUrl}/Users/${userId}/Images/Primary?tag=${tag}&quality=${quality}`;
        }

        // 3. Fall back to standard Jellyfin URL or default Netflix avatar
        // Since we don't have a tag or cached avatar, the user likely doesn't have an image set in Jellyfin.
        // Return the default Netflix style avatar path.
        const buildBasePath = import.meta.env.PROD ? '/LegitFlix/Client' : '';
        return `${buildBasePath}/avatars/Netflix/010c7b9061ece2fbf7bbb8d9bb6d2bee16f4a68c.png`;
    }

    getImageUrl(item, type = 'Primary', options = {}) {
        if (!item || !item.Id) return '';
        const { maxWidth = 800, quality = 90 } = options;
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const tag = item.ImageTags && item.ImageTags[type] ? `&tag=${item.ImageTags[type]}` : '';
        return `${baseUrl}/Items/${item.Id}/Images/${type}?maxWidth=${maxWidth}&quality=${quality}${tag}`;
    }


    getPlaybackUrl(itemId) {
        // Returns the internal player route (used with react-router HashRouter)
        return `#/play/${itemId}`;
    }

    getStreamUrl(itemId, audioStreamIndex = null, subtitleStreamIndex = null, mediaSourceId = null, playSessionId = null, maxBitrate = null) {
        if (!this.api) this.initialize();
        const token = this.api.accessToken;
        const deviceId = this.jellyfin.deviceInfo.id;
        const baseUrl = this.api.configuration?.basePath || this.api.basePath || window.location.origin;
        const sessionId = playSessionId || `LegitFlix-${Date.now()}`;

        let url = `${baseUrl}/Videos/${itemId}/master.m3u8?PlaySessionId=${sessionId}&api_key=${token}&DeviceId=${deviceId}&VideoCodec=h264,hevc,vp9,av1&AudioCodec=aac,mp3&TranscodingContainer=ts&TranscodingProtocol=hls`;

        if (mediaSourceId) {
            url += `&MediaSourceId=${mediaSourceId}`;
        }

        if (audioStreamIndex !== null && audioStreamIndex !== undefined) {
            url += `&AudioStreamIndex=${audioStreamIndex}`;
        }

        if (subtitleStreamIndex !== null && subtitleStreamIndex !== undefined) {
            url += `&SubtitleStreamIndex=${subtitleStreamIndex}`;
            url += `&SubtitleMethod=Encode`;
        }

        if (maxBitrate) {
            url += `&VideoBitrate=${maxBitrate}`;
            url += `&MaxStreamingBitrate=${maxBitrate}`;
            url += `&AudioBitrate=192000`;
        }

        return url;
    }

    getDirectStreamUrl(itemId, mediaSourceId) {
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration?.basePath || this.api.basePath || window.location.origin;
        const token = this.api.accessToken;
        return `${baseUrl}/Videos/${itemId}/stream?static=true&MediaSourceId=${mediaSourceId}&api_key=${token}`;
    }

    async reportPlaybackStart(itemId, ticks = 0, mediaSourceId = null, audioIndex = null, subtitleIndex = null, playSessionId = null) {
        try {
            const body = {
                ItemId: itemId,
                MediaSourceId: mediaSourceId || itemId,
                PositionTicks: ticks,
                AudioStreamIndex: audioIndex !== null ? audioIndex : undefined,
                SubtitleStreamIndex: subtitleIndex !== null ? subtitleIndex : undefined,
                PlaySessionId: playSessionId || undefined
            };
            await this.makeRequest('/Sessions/Playing', 'POST', body);
            console.log("[Jellyfin] Playback started reported via makeRequest.");
        } catch (e) {
            console.warn("Report playback start failed (silent)", e);
        }
    }

    async reportPlaybackProgress(itemId, ticks, isPaused, mediaSourceId, playSessionId = null) {
        try {
            const body = {
                ItemId: itemId,
                MediaSourceId: mediaSourceId || itemId,
                PositionTicks: ticks,
                IsPaused: isPaused,
                EventName: 'TimeUpdate',
                PlaySessionId: playSessionId || undefined
            };
            await this.makeRequest('/Sessions/Playing/Progress', 'POST', body);
        } catch (e) {
            console.warn("Report progress failed (silent)", e);
        }
    }

    async reportPlaybackStopped(itemId, ticks, playSessionId = null) {
        try {
            const body = {
                ItemId: itemId,
                PositionTicks: ticks,
                PlaySessionId: playSessionId || undefined
            };
            await this.makeRequest('/Sessions/Playing/Stopped', 'POST', body);
        } catch (e) {
            console.warn("Report stop failed (silent)", e);
        }
    }

    // --- Trickplay ---
    async getTrickplayManifest(itemId) {
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const token = this.api.accessToken;

        // Use X-Emby-Authorization for better compatibility
        const authHeader = `MediaBrowser Client="${this.jellyfin.clientInfo.name}", Device="${this.jellyfin.deviceInfo.name}", DeviceId="${this.jellyfin.deviceInfo.id}", Version="${this.jellyfin.clientInfo.version}", Token="${token}"`;

        const tryFetch = async (endpoint) => {
            const url = `${baseUrl}${endpoint}`;
            console.log(`[Trickplay] Attempting to fetch manifest from: ${url}`);

            try {
                // Try with both header and query param for maximum reliability
                const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}api_key=${token}`, {
                    headers: {
                        'X-Emby-Authorization': authHeader,
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('[Trickplay] Manifest loaded successfully from', endpoint);
                    return data;
                }
                console.debug(`[Trickplay] Fetch from ${endpoint} failed with status: ${response.status}`);
            } catch (err) {
                console.warn(`[Trickplay] Error fetching from ${endpoint}:`, err);
            }
            return null;
        };

        // Try standard endpoint first, then /Info fallback
        let manifest = await tryFetch(`/Videos/${itemId}/Trickplay`);
        if (!manifest) {
            manifest = await tryFetch(`/Videos/${itemId}/Trickplay/Info`);
        }

        return manifest;
    }

    getSubtitleUrl(itemId, mediaSourceId, streamIndex) {
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const token = this.api.accessToken;
        return `${baseUrl}/Videos/${itemId}/${mediaSourceId}/Subtitles/${streamIndex}/0/Stream.vtt?api_key=${token}`;
    }

    getRawSubtitleUrl(itemId, mediaSourceId, streamIndex, format) {
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const token = this.api.accessToken;
        // Format can be 'srt', 'ass', 'ssa' etc.
        return `${baseUrl}/Videos/${itemId}/${mediaSourceId}/Subtitles/${streamIndex}/0/Stream.${format}?api_key=${token}`;
    }

    getTrickplayTileUrl(itemId, width, index, mediaSourceId = null) {
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const token = this.api.accessToken;
        let url = `${baseUrl}/Videos/${itemId}/Trickplay/${width}/${index}.jpg?api_key=${token}`;
        if (mediaSourceId) {
            url += `&mediaSourceId=${mediaSourceId}`;
        }
        return url;
    }

    async deleteSubtitle(itemId, index) {
        if (!this.api) this.initialize();
        try {
            // Note: index is usually the MediaStreamIndex
            const response = await this.api.subtitle.deleteSubtitle({ itemId, index });
            return response.data;
        } catch (e) {
            console.error("Failed to delete subtitle", e);
            throw e;
        }
    }

    async searchRemoteSubtitles(itemId, language) {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.subtitle.searchRemoteSubtitles({
                itemId,
                language,
                isPerfectMatch: false
            });
            return response.data;
        } catch (e) {
            console.error("Failed to search subtitles", e);
            return [];
        }
    }

    async downloadRemoteSubtitles(itemId, subtitleId) {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.subtitle.downloadRemoteSubtitles({
                itemId,
                subtitleId
            });
            return response.data;
        } catch (e) {
            console.error("Failed to download subtitle", e);
            throw e;
        }
    }

    async getMediaStreams(userId, itemId) {
        if (!this.api) this.initialize();
        const item = await this.getItemDetails(userId, itemId);
        if (item && item.MediaSources && item.MediaSources[0]) {
            return item.MediaSources[0].MediaStreams || [];
        }
        return [];
    }

    async updatePassword(userId, currentPw, newPw) {
        if (!this.api) this.initialize();
        try {
            await this.api.user.updateUserPassword({
                userId,
                updateUserPassword: {
                    CurrentPw: currentPw,
                    NewPw: newPw
                }
            });
            return true;
        } catch (error) {
            console.error("updatePassword failed", error);
            throw error;
        }
    }

    async updateUserConfiguration(userId, config) {
        if (!this.api) this.initialize();
        try {
            await this.api.user.updateUserConfiguration({
                userId,
                userConfiguration: config
            });
            return true;
        } catch (error) {
            console.error("updateUserConfiguration failed", error);
            throw error;
        }
    }

    async getInstalledPlugins() {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.plugins.getPlugins();
            return response.data || [];
        } catch (error) {
            console.error("getInstalledPlugins failed", error);
            return [];
        }
    }

    async getPlaybackInfo(itemId, userId, maxBitrate = null, audioStreamIndex = null, subtitleStreamIndex = null, mediaSourceId = null) {
        if (!this.api) this.initialize();
        try {
            const deviceProfile = {
                MaxStaticMusicBitrate: 8000000,
                MaxStaticBitrate: 140000000,
                MusicStreamingTranscodingBitrate: 192000,
                DirectPlayProfiles: [
                    {
                        Container: "mp4,m4v,mov,mkv",
                        Type: "Video",
                        VideoCodec: "h264,vp8,vp9,av1",
                        AudioCodec: "aac,mp3,opus,flac,vorbis"
                    }
                ],
                TranscodingProfiles: [
                    {
                        Container: "ts",
                        Type: "Video",
                        AudioCodec: "aac,mp3",
                        VideoCodec: "h264",
                        Protocol: "hls"
                    }
                ],
                ContainerProfiles: [],
                CodecProfiles: [],
                ResponseProfiles: [],
                SubtitleProfiles: [
                    {
                        Format: "vtt",
                        Method: "External"
                    },
                    {
                        Format: "srt",
                        Method: "External"
                    }
                ]
            };

            const response = await this.api.mediaInfo.getPostedPlaybackInfo({
                itemId,
                userId,
                playbackInfoDto: {
                    UserId: userId,
                    MaxStreamingBitrate: maxBitrate || 140000000,
                    AudioStreamIndex: audioStreamIndex !== null ? audioStreamIndex : undefined,
                    SubtitleStreamIndex: subtitleStreamIndex !== null ? subtitleStreamIndex : undefined,
                    MediaSourceId: mediaSourceId || undefined,
                    DeviceProfile: deviceProfile,
                    EnableDirectPlay: true,
                    EnableDirectStream: true,
                    EnableTranscoding: true,
                    AllowVideoStreamCopy: true,
                    AllowAudioStreamCopy: true
                }
            });
            return response.data;
        } catch (error) {
            console.error("getPlaybackInfo failed", error);
            throw error;
        }
    }

    async getAllBackdrops(userId, limit = 50) {
        if (!this.api) this.initialize();
        const response = await this.api.items.getItems({
            userId,
            includeItemTypes: ['Movie', 'Series'],
            imageTypes: ['Backdrop'],
            sortBy: ['Random'],
            limit,
            recursive: true,
            fields: ['BackdropImageTags']
        });
        return response.data?.Items || [];
    }

    async searchItems(userId, searchTerm, includeItemTypes = [], parentId = null) {
        if (!this.api) this.initialize();
        try {
            const query = {
                searchTerm: searchTerm,
                userId: userId,
                includeItemTypes: includeItemTypes,
                limit: 20
            };

            if (parentId && parentId !== 'All') {
                query.parentId = parentId;
            }

            const response = await this.api.search.getSearchHints(query);
            const hints = response.data?.SearchHints || [];

            // Map SearchHint objects to standard Item objects expected by the UI
            const items = hints.map(hint => ({
                Id: hint.Id || hint.ItemId,
                Name: hint.Name,
                Type: hint.Type,
                ProductionYear: hint.ProductionYear,
                ImageTags: hint.PrimaryImageTag ? { Primary: hint.PrimaryImageTag } : {},
                PrimaryImageAspectRatio: hint.PrimaryImageAspectRatio
            }));

            return { Items: items };
        } catch (error) {
            console.error("searchItems via search API failed", error);
            return { Items: [] };
        }
    }

    async getDisplayPreferences(displayPreferencesId) {
        if (!this.api) this.initialize();
        try {
            const userId = this.api.user?.id || (await this.getCurrentUser())?.Id;
            const client = "LegitFlixClient";
            const response = await this.api.displayPreferences.getDisplayPreferences({
                displayPreferencesId,
                client,
                userId
            });
            return response.data;
        } catch (error) {
            console.error("getDisplayPreferences failed", error);
            return null;
        }
    }

    async updateDisplayPreferences(displayPreferencesId, preferences) {
        if (!this.api) this.initialize();
        try {
            const userId = this.api.user?.id || (await this.getCurrentUser())?.Id;
            const client = "LegitFlixClient";
            await this.api.displayPreferences.updateDisplayPreferences({
                displayPreferencesId,
                client,
                userId,
                displayPreferencesDto: preferences
            });
            return true;
        } catch (error) {
            console.error("updateDisplayPreferences failed", error);
            throw error;
        }
    }

    async quickConnect(code) {
        if (!this.api) this.initialize();
        try {
            const userId = this.api.user?.id || (await this.getCurrentUser())?.Id;
            await this.api.quickConnect.authorizeQuickConnect({
                code,
                userId
            });
            return true;
        } catch (error) {
            console.error("quickConnect failed", error);
            throw new Error('Quick Connect failed. Check the code.');
        }
    }

    // --- Quick Connect Login Flow ---

    async initiateQuickConnect() {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.quickConnect.initiateQuickConnect();
            return response.data; // { Code, Secret, Expiry }
        } catch (error) {
            console.error("initiateQuickConnect failed", error);
            throw new Error('Failed to initiate Quick Connect');
        }
    }

    async checkQuickConnectStatus(secret) {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.quickConnect.getQuickConnectState({ secret });
            const data = response.data;
            if (data.Authenticated) {
                // Call the official authenticateWithQuickConnect API to retrieve the token and user
                const authResponse = await this.api.user.authenticateWithQuickConnect({
                    quickConnectDto: {
                        Secret: secret
                    }
                });
                const authData = authResponse.data;
                if (authData && authData.AccessToken) {
                    const token = authData.AccessToken;
                    const userProfile = authData.User;

                    // Save Session
                    this.initialize(token);

                    const storedData = {
                        Servers: [{
                            DateLastAccessed: new Date().toISOString(),
                            AccessToken: token,
                            UserId: userProfile.Id,
                            Name: userProfile.Name,
                            ManualAddress: this.api.basePath
                        }]
                    };
                    localStorage.setItem('jellyfin_credentials', JSON.stringify(storedData));

                    return userProfile;
                }
            }
        } catch (error) {
            console.error("checkQuickConnectStatus failed", error);
        }
        return null; // Not authorized yet
    }

    async logout() {
        console.log('[LegitFlix] Logging out...');

        // 1. Try generic ApiClient logout if available (might do server calls)
        if (window.ApiClient) {
            try {
                // Just close session, don't let it redirect yet
                await window.ApiClient.logout();
            } catch (e) {
                console.warn("ApiClient logout failed", e);
            }
        }

        // 2. Clear Local Storage
        localStorage.removeItem('jellyfin_credentials');

        // 3. Clear user cache & Instance
        this.clearUserCache();
        this.api = null;

        // 4. Redirect to Select User
        // This satisfies "Add back support to use my original account" (Switch User)
        window.location.href = '/#/login/select-user';
    }

    async uploadUserImage(userId, type, file) {
        if (!this.api) this.initialize();
        try {
            if (type !== 'Primary') {
                throw new Error(`Unsupported image type '${type}' for user upload`);
            }

            // Convert file/blob to raw base64 string (Jellyfin UserImage endpoint expects base64)
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result;
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });

            let baseUrl = this.api?.configuration?.basePath || '';
            let token = this.api?.accessToken || this.api?.configuration?.accessToken;

            if (window.ApiClient) {
                token = token || window.ApiClient.accessToken();
                baseUrl = baseUrl || window.ApiClient.serverAddress();
            }

            const authHeader = `MediaBrowser Client="${this.jellyfin.clientInfo.name}", Device="${this.jellyfin.deviceInfo.name}", DeviceId="${this.jellyfin.deviceInfo.id}", Version="${this.jellyfin.clientInfo.version}", Token="${token}"`;

            const url = `${baseUrl}/UserImage?userId=${userId}&api_key=${token}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Emby-Authorization': authHeader,
                    'X-Emby-Token': token,
                    'X-MediaBrowser-Token': token,
                    'Content-Type': 'image/*'
                },
                body: base64Data
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Upload failed with status ${response.status}: ${text}`);
            }
            return true;
        } catch (error) {
            console.error("uploadUserImage failed", error);
            throw error;
        }
    }

    async deleteUserImage(userId, type) {
        if (!this.api) this.initialize();
        try {
            if (type !== 'Primary') {
                throw new Error(`Unsupported image type '${type}' for user deletion`);
            }

            let baseUrl = this.api?.configuration?.basePath || '';
            let token = this.api?.accessToken || this.api?.configuration?.accessToken;

            if (window.ApiClient) {
                token = token || window.ApiClient.accessToken();
                baseUrl = baseUrl || window.ApiClient.serverAddress();
            }

            const authHeader = `MediaBrowser Client="${this.jellyfin.clientInfo.name}", Device="${this.jellyfin.deviceInfo.name}", DeviceId="${this.jellyfin.deviceInfo.id}", Version="${this.jellyfin.clientInfo.version}", Token="${token}"`;

            const url = `${baseUrl}/UserImage?userId=${userId}&api_key=${token}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'X-Emby-Authorization': authHeader,
                    'X-Emby-Token': token,
                    'X-MediaBrowser-Token': token
                }
            });

            if (!response.ok && response.status !== 404) {
                const text = await response.text();
                throw new Error(`Delete failed with status ${response.status}: ${text}`);
            }
            return true;
        } catch (error) {
            console.error("deleteUserImage failed", error);
            throw error;
        }
    }
    async deleteItem(itemId) {
        if (!this.api) this.initialize();
        const response = await this.api.items.deleteItem({ itemId });
        return response.data;
    }

    getDownloadUrl(itemId) {
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const token = this.api.accessToken;
        return `${baseUrl}/Items/${itemId}/Download?api_key=${token}`;
    }

    // --- Player Observer Registry ---
    registerPlayer(listener) {
        this.playerListeners.add(listener);
        return () => this.playerListeners.delete(listener);
    }

    notifyPlayer(event, data) {
        this.playerListeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (err) {
                console.error("[LegitFlix] Error in player listener:", err);
            }
        });
    }

    // --- WebSocket Implementation ---
    getWebSocketUrl() {
        let baseUrl = this.getBasePath();
        let token = this.api?.accessToken || this.api?.configuration?.accessToken;
        if (window.ApiClient) {
            token = token || window.ApiClient.accessToken();
            baseUrl = baseUrl || window.ApiClient.serverAddress();
        }

        if (!baseUrl) return null;

        // Remove trailing slashes
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        // Change http(s) to ws(s)
        let wsUrl = baseUrl.replace(/^http/i, 'ws');
        const deviceId = this.jellyfin.deviceInfo.id;

        return `${wsUrl}/socket?api_key=${token}&deviceId=${deviceId}`;
    }

    connectWebSocket() {
        this.isWSEnabled = true;

        // Avoid duplicate sockets
        if (this.activeWs) {
            if (this.activeWs.readyState === WebSocket.OPEN || this.activeWs.readyState === WebSocket.CONNECTING) {
                return;
            }
            this.disconnectWebSocket();
        }

        const url = this.getWebSocketUrl();
        if (!url) {
            console.warn("[LegitFlix] Cannot connect WebSocket: no server URL / token available.");
            return;
        }

        console.log("[LegitFlix] Connecting to Jellyfin WebSocket...");
        try {
            const ws = new WebSocket(url);
            this.activeWs = ws;

            ws.onopen = () => {
                console.log("[LegitFlix] WebSocket connected.");

                // Send Identity/SessionsStart
                try {
                    ws.send(JSON.stringify({
                        MessageType: 'SessionsStart',
                        Data: '0,1000'
                    }));
                } catch (e) {
                    console.error("[LegitFlix] Failed to send SessionsStart", e);
                }

                // Start Keep-Alive every 15 seconds
                if (this.wsKeepAliveInterval) clearInterval(this.wsKeepAliveInterval);
                this.wsKeepAliveInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        try {
                            ws.send(JSON.stringify({ MessageType: 'KeepAlive' }));
                        } catch { }
                    }
                }, 15000);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    // Notify any active player listeners
                    if (message.MessageType === 'SyncPlayCommand') {
                        this.notifyPlayer('SyncPlayCommand', message.Data);
                    } else if (message.MessageType === 'SyncPlayGroupUpdate') {
                        this.notifyPlayer('SyncPlayGroupUpdate', message.Data);
                    } else if (message.MessageType === 'Play') {
                        this.notifyPlayer('Play', message.Data);
                    } else if (message.MessageType === 'Playstate') {
                        this.notifyPlayer('Playstate', message.Data);
                    } else if (message.MessageType === 'GeneralCommand') {
                        this.notifyPlayer('GeneralCommand', message.Data);
                    }
                } catch (err) {
                    // Ignore non-json messages
                }
            };

            ws.onclose = () => {
                console.log("[LegitFlix] WebSocket closed.");
                this.cleanupWS();

                // Reconnect if WebSocket should be active
                if (this.isWSEnabled) {
                    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
                    this.reconnectTimeout = setTimeout(() => {
                        this.connectWebSocket();
                    }, 5000);
                }
            };

            ws.onerror = (err) => {
                console.error("[LegitFlix] WebSocket error:", err);
            };

        } catch (e) {
            console.error("[LegitFlix] Failed to open WebSocket:", e);
        }
    }

    cleanupWS() {
        if (this.wsKeepAliveInterval) {
            clearInterval(this.wsKeepAliveInterval);
            this.wsKeepAliveInterval = null;
        }
    }

    disconnectWebSocket() {
        this.isWSEnabled = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.cleanupWS();
        if (this.activeWs) {
            try {
                this.activeWs.close();
            } catch { }
            this.activeWs = null;
        }
        console.log("[LegitFlix] WebSocket disconnected.");
    }

    // --- Sessions & Cast APIs ---
    async getSessions() {
        return await this.makeRequest('/Sessions');
    }

    /**
     * Returns all active remote sessions suitable for "Cast to Device".
     * Excludes own session, cutoff increased to 300 seconds (5 mins) for TVs.
     */
    async getSessionsForCast(activeWithinSeconds = 300) {
        const allSessions = await this.getSessions() || [];
        const myDeviceId = this.jellyfin.deviceInfo.id;
        const cutoff = Date.now() - activeWithinSeconds * 1000;
        return allSessions.filter(s => {
            // Exclude our own session
            if (s.DeviceId === myDeviceId) return false;
            // Filter to recently active sessions
            if (s.LastActivityDate) {
                const lastActive = new Date(s.LastActivityDate).getTime();
                if (lastActive < cutoff) return false;
            }
            return true;
        });
    }

    async reportSessionCapabilities() {
        try {
            await this.makeRequest('/Sessions/Capabilities/Full', 'POST', {
                PlayableMediaTypes: ['Video', 'Audio'],
                SupportedCommands: ['Play', 'PlayState', 'Seek', 'SetVolume', 'ToggleMute'],
                SupportsMediaControl: true,
                SupportsContentUploading: false,
                SupportsPersistentIdentifier: true,
                SupportsSync: false
            });
            console.log('[LegitFlix] Session capabilities reported.');
        } catch (e) {
            console.warn('[LegitFlix] Could not report session capabilities:', e);
        }
    }

    async playOnSession(sessionId, itemId) {
        return await this.makeRequest(`/Sessions/${sessionId}/Playing?itemIds=${itemId}&playCommand=PlayNow`, 'POST');
    }

    async sendPlaystateCommand(sessionId, command, seekPositionTicks = null) {
        let query = '';
        if (seekPositionTicks !== null) {
            query = `?seekPositionTicks=${seekPositionTicks}`;
        }
        return await this.makeRequest(`/Sessions/${sessionId}/Playing/${command}${query}`, 'POST');
    }

    // --- SyncPlay REST APIs ---
    async getSyncPlayGroups() {
        return await this.makeRequest('/SyncPlay/List');
    }

    async joinSyncPlayGroup(groupId) {
        // Automatically ensure WebSocket is active when joining SyncPlay
        this.connectWebSocket();
        return await this.makeRequest('/SyncPlay/Join', 'POST', {
            GroupId: groupId
        });
    }

    async leaveSyncPlayGroup() {
        this.disconnectWebSocket();
        return await this.makeRequest('/SyncPlay/Leave', 'POST');
    }

    async createSyncPlayGroup(name) {
        const res = await this.makeRequest('/SyncPlay/New', 'POST', {
            GroupName: name
        });
        // Auto connect socket on group creation
        this.connectWebSocket();
        return res;
    }

    async syncPlayPause() {
        return await this.makeRequest('/SyncPlay/Pause', 'POST');
    }

    async syncPlayUnpause() {
        return await this.makeRequest('/SyncPlay/Unpause', 'POST');
    }

    async syncPlaySeek(positionTicks) {
        return await this.makeRequest('/SyncPlay/Seek', 'POST', {
            PositionTicks: positionTicks
        });
    }

    async syncPlayBuffering(positionTicks, isPlaying) {
        return await this.makeRequest('/SyncPlay/Buffering', 'POST', {
            PositionTicks: positionTicks,
            IsPlaying: isPlaying,
            When: new Date().toISOString()
        });
    }

    async syncPlayReady(positionTicks, isPlaying) {
        return await this.makeRequest('/SyncPlay/Ready', 'POST', {
            PositionTicks: positionTicks,
            IsPlaying: isPlaying,
            When: new Date().toISOString()
        });
    }

    async syncPlayPing(positionTicks) {
        return await this.makeRequest('/SyncPlay/Ping', 'POST', {
            Ping: positionTicks
        });
    }

    async makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
        if (!this.api) this.initialize();
        let baseUrl = this.getBasePath();
        let token = this.api?.accessToken || this.api?.configuration?.accessToken;
        if (window.ApiClient) {
            token = token || window.ApiClient.accessToken();
            baseUrl = baseUrl || window.ApiClient.serverAddress();
        }

        const authHeader = `MediaBrowser Client="${this.jellyfin.clientInfo.name}", Device="${this.jellyfin.deviceInfo.name}", DeviceId="${this.jellyfin.deviceInfo.id}", Version="${this.jellyfin.clientInfo.version}", Token="${token}"`;

        const sep = endpoint.includes('?') ? '&' : '?';
        const url = `${baseUrl}${endpoint}${sep}api_key=${token}`;

        const reqHeaders = {
            'X-Emby-Authorization': authHeader,
            'X-Emby-Token': token,
            'X-MediaBrowser-Token': token,
            ...headers
        };

        const config = {
            method,
            headers: reqHeaders
        };

        if (body) {
            config.body = typeof body === 'object' ? JSON.stringify(body) : body;
            if (typeof body === 'object') {
                reqHeaders['Content-Type'] = 'application/json';
            }
        }

        const response = await fetch(url, config);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Request to ${endpoint} failed (${response.status}): ${text}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            return text;
        }
    }

    async getCollections(userId) {
        return await this.makeRequest(`/Items?includeItemTypes=BoxSet&userId=${userId}&recursive=true`);
    }

    async addToCollection(collectionId, itemId) {
        return await this.makeRequest(`/Collections/${collectionId}/Items?ids=${itemId}`, 'POST');
    }

    async createCollection(name, itemId) {
        return await this.makeRequest(`/Collections?name=${encodeURIComponent(name)}&ids=${itemId}`, 'POST');
    }

    async getPlaylists(userId) {
        return await this.makeRequest(`/Items?includeItemTypes=Playlist&userId=${userId}&recursive=true`);
    }

    async addToPlaylist(playlistId, itemId, userId = null) {
        let uId = userId;
        if (!uId) {
            const user = await this.getCurrentUser();
            uId = user?.Id;
        }
        return await this.makeRequest(`/Playlists/${playlistId}/Items?ids=${itemId}${uId ? `&userId=${uId}` : ''}`, 'POST');
    }

    async createPlaylist(name, itemId, userId = null) {
        let uId = userId;
        if (!uId) {
            const user = await this.getCurrentUser();
            uId = user?.Id;
        }
        return await this.makeRequest(`/Playlists?name=${encodeURIComponent(name)}&ids=${itemId}${uId ? `&userId=${uId}` : ''}`, 'POST');
    }

    async getMetadataEditor(itemId) {
        return await this.makeRequest(`/Items/${itemId}/MetadataEditor`);
    }

    async updateItemMetadata(itemId, metadata) {
        return await this.makeRequest(`/Items/${itemId}`, 'POST', metadata);
    }

    async getItemImages(itemId) {
        return await this.makeRequest(`/Items/${itemId}/Images`);
    }

    async deleteItemImage(itemId, imageType, index = null) {
        const path = index !== null ? `/Items/${itemId}/Images/${imageType}/${index}` : `/Items/${itemId}/Images/${imageType}`;
        return await this.makeRequest(path, 'DELETE');
    }

    async uploadItemImage(itemId, imageType, file, index = null) {
        if (!this.api) this.initialize();
        let baseUrl = this.getBasePath();
        let token = this.api?.accessToken || this.api?.configuration?.accessToken;
        if (window.ApiClient) {
            token = token || window.ApiClient.accessToken();
            baseUrl = baseUrl || window.ApiClient.serverAddress();
        }

        const authHeader = `MediaBrowser Client="${this.jellyfin.clientInfo.name}", Device="${this.jellyfin.deviceInfo.name}", DeviceId="${this.jellyfin.deviceInfo.id}", Version="${this.jellyfin.clientInfo.version}", Token="${token}"`;

        const path = index !== null ? `${imageType}/${index}` : imageType;
        const url = `${baseUrl}/Items/${itemId}/Images/${path}?api_key=${token}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Emby-Authorization': authHeader,
                'X-Emby-Token': token,
                'X-MediaBrowser-Token': token,
                'Content-Type': file.type || 'image/jpeg'
            },
            body: file
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Upload image failed (${response.status}): ${text}`);
        }
        return true;
    }

    async getRemoteImageProviders(itemId) {
        return await this.makeRequest(`/Items/${itemId}/RemoteImages/Providers`);
    }

    async getRemoteImages(itemId, params = {}) {
        const queryParams = new URLSearchParams();
        if (params.type) queryParams.append('type', params.type);
        if (params.providerName) queryParams.append('providerName', params.providerName);
        if (params.includeAllLanguages !== undefined) queryParams.append('includeAllLanguages', params.includeAllLanguages);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.startIndex) queryParams.append('startIndex', params.startIndex);

        return await this.makeRequest(`/Items/${itemId}/RemoteImages?${queryParams.toString()}`);
    }

    async downloadRemoteImage(itemId, type, imageUrl) {
        return await this.makeRequest(`/Items/${itemId}/RemoteImages/Download?type=${type}&imageUrl=${encodeURIComponent(imageUrl)}`, 'POST');
    }

    async groupVersions(ids) {
        const idList = Array.isArray(ids) ? ids.join(',') : ids;
        return await this.makeRequest(`/Videos/Merge?ids=${idList}`, 'POST');
    }
}

const jellyfinService = new JellyfinService();
export { jellyfinService };
export default jellyfinService;
