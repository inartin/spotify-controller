// Authentication & Authorization
const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_ENDPOINT = 'https://api.spotify.com/v1';
const SCOPES = [
    'user-read-private',
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-modify-playback-state'
];

// Generate a random string for the state parameter
function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Generate a code verifier (random string between 43-128 chars)
function generateCodeVerifier() {
    return generateRandomString(128);
}

// Generate code challenge from verifier using SHA-256
async function generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

// Global variables that will be initialized in initApp()
let loginContainer, dashboard, clientIdInput, saveClientIdButton, loginButton;
let redirectUriElement, albumArt, trackName, artistName, albumName;
let progressBar, currentTimeDisplay, totalTimeDisplay, dateDisplay, playPauseBtn;
let baseUrl, clientId;

// Parse query parameters from URL
function getQueryParams() {
    const queryParams = {};
    const queryString = window.location.search.substring(1);

    if (!queryString) {
        return queryParams;
    }

    queryString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        queryParams[key] = decodeURIComponent(value);
    });

    return queryParams;
}

// Exchange authorization code for an access token
async function exchangeCodeForToken(code) {
    const clientId = localStorage.getItem('spotify_client_id');
    const codeVerifier = localStorage.getItem('spotify_code_verifier');

    if (!clientId || !codeVerifier) {
        throw new Error('Missing client ID or code verifier');
    }

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', baseUrl);
    params.append('code_verifier', codeVerifier);

    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
    }

    return await response.json();
}

// Initialize DOM elements and set up event listeners
function initializeDOMElements() {
    // Get DOM elements
    loginContainer = document.getElementById('login-container');
    dashboard = document.getElementById('dashboard');
    clientIdInput = document.getElementById('client-id-input');
    saveClientIdButton = document.getElementById('save-client-id');
    loginButton = document.getElementById('login-button');
    redirectUriElement = document.getElementById('redirect-uri');
    albumArt = document.getElementById('album-art');
    trackName = document.getElementById('track-name');
    artistName = document.getElementById('artist-name');
    albumName = document.getElementById('album-name');
    progressBar = document.getElementById('progress-bar');
    currentTimeDisplay = document.getElementById('current-time');
    totalTimeDisplay = document.getElementById('total-time');
    dateDisplay = document.getElementById('date-display');
    playPauseBtn = document.getElementById('play-pause-btn');

    // Get the base URL for redirect URI
    baseUrl = window.location.origin + window.location.pathname;

    // Set the redirect URI text and URL example
    redirectUriElement.textContent = baseUrl;
    const urlExample = document.getElementById('url-example');
    urlExample.textContent = baseUrl + '#client_id=YOUR_CLIENT_ID';

    // Add copy button functionality
    const copyUriButton = document.getElementById('copy-uri');
    if (copyUriButton) {
        copyUriButton.addEventListener('click', () => {
            navigator.clipboard.writeText(baseUrl).then(() => {
                copyUriButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyUriButton.textContent = 'Copy';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });
    }
}

// Initialize client ID from URL or localStorage
function initializeClientId() {
    // Check URL hash for client ID first
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const urlClientId = urlParams.get('client_id');

    if (urlClientId) {
        clientId = urlClientId;
        localStorage.setItem('spotify_client_id', clientId);
        history.replaceState(null, null, window.location.pathname);
        clientIdInput.value = clientId;
        loginButton.classList.remove('hidden');
    } else {
        clientId = localStorage.getItem('spotify_client_id');
        if (clientId) {
            clientIdInput.value = clientId;
            loginButton.classList.remove('hidden');
        }
    }
}

// Set up event listeners
function setupEventListeners() {
    // Save Client ID to localStorage
    saveClientIdButton.addEventListener('click', () => {
        const newClientId = clientIdInput.value.trim();
        if (newClientId) {
            localStorage.setItem('spotify_client_id', newClientId);
            clientId = newClientId;
            loginButton.classList.remove('hidden');
            alert('Client ID saved successfully!');
        } else {
            alert('Please enter a valid Client ID');
        }
    });

    // Handle Login
    loginButton.addEventListener('click', async () => {
        if (!clientId) {
            alert('Please enter your Spotify Client ID first');
            return;
        }

        const codeVerifier = generateCodeVerifier();
        localStorage.setItem('spotify_code_verifier', codeVerifier);

        const codeChallenge = await generateCodeChallenge(codeVerifier);

        const state = generateRandomString(16);
        localStorage.setItem('spotify_auth_state', state);

        const authUrl = new URL(SPOTIFY_AUTH_ENDPOINT);
        const params = {
            client_id: clientId,
            redirect_uri: baseUrl,
            scope: SCOPES.join(' '),
            response_type: 'code',
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            state: state,
            show_dialog: true
        };

        authUrl.search = new URLSearchParams(params).toString();
        window.location.href = authUrl.toString();
    });
}

// Initialize app
async function initApp() {
    // Initialize DOM elements first
    initializeDOMElements();
    
    // Initialize client ID handling
    initializeClientId();
    
    // Set up event listeners
    setupEventListeners();

    // Initialize the clock
    initializeClock();

    const queryParams = getQueryParams();
    const code = queryParams.code;
    const state = queryParams.state;
    const error = queryParams.error;

    if (error) {
        console.error(`Authorization error: ${error}`);
        alert(`Authorization failed: ${error}`);
        return;
    }

    if (code) {
        try {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('code');
            currentUrl.searchParams.delete('state');
            window.history.replaceState({}, document.title, currentUrl.toString());

            const storedState = localStorage.getItem('spotify_auth_state');
            if (state !== storedState) {
                throw new Error('State mismatch, possible CSRF attack');
            }

            const data = await exchangeCodeForToken(code);

            const accessToken = data.access_token;
            const refreshToken = data.refresh_token;
            const expiresIn = data.expires_in;
            const tokenTimestamp = Date.now();

            localStorage.setItem('spotify_access_token', accessToken);
            localStorage.setItem('spotify_refresh_token', refreshToken);
            localStorage.setItem('spotify_token_timestamp', tokenTimestamp);
            localStorage.setItem('spotify_token_expires_in', expiresIn);

            loginContainer.style.display = 'none';
            dashboard.style.display = 'grid';

            setupSpotify(accessToken);
            return;
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            alert(`Authentication error: ${error.message}`);
        }
    }

    // Check if we have a valid stored token
    const storedToken = localStorage.getItem('spotify_access_token');
    const storedTimestamp = localStorage.getItem('spotify_token_timestamp');
    const storedExpiresIn = localStorage.getItem('spotify_token_expires_in');

    if (storedToken && storedTimestamp && storedExpiresIn) {
        const now = Date.now();
        const elapsed = (now - storedTimestamp) / 1000;

        if (elapsed < storedExpiresIn) {
            loginContainer.style.display = 'none';
            dashboard.style.display = 'grid';
            setupSpotify(storedToken);
            return;
        } else {
            try {
                await refreshAccessToken();
                loginContainer.style.display = 'none';
                dashboard.style.display = 'grid';
                setupSpotify(localStorage.getItem('spotify_access_token'));
                return;
            } catch (error) {
                console.error('Error refreshing token:', error);
            }
        }
    }

    loginContainer.style.display = 'block';
    dashboard.style.display = 'none';
}

// Refresh the access token using the refresh token
async function refreshAccessToken() {
    const clientId = localStorage.getItem('spotify_client_id');
    const refreshToken = localStorage.getItem('spotify_refresh_token');

    if (!clientId || !refreshToken) {
        throw new Error('Missing client ID or refresh token');
    }

    try {
        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);

        const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!response.ok) {
            throw new Error(`Refresh token request failed: ${response.status}`);
        }

        const data = await response.json();

        localStorage.setItem('spotify_access_token', data.access_token);
        localStorage.setItem('spotify_token_timestamp', Date.now());
        localStorage.setItem('spotify_token_expires_in', data.expires_in);

        if (data.refresh_token) {
            localStorage.setItem('spotify_refresh_token', data.refresh_token);
        }

        return data;
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw error;
    }
}

// Clock functionality
function initializeClock() {
    // Update digital time, date, and analog clock
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();

    // Update date
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
    dateDisplay.textContent = dateString;

    // Update analog clock
    updateAnalogClock(now);
}

function updateAnalogClock(date) {
    const hours = date.getHours() % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // Calculate angles (in degrees) - trying without the -90 offset first
    const secondAngle = (seconds * 6); // 6 degrees per second
    const minuteAngle = (minutes * 6) + (seconds * 0.1); // 6 degrees per minute + smooth seconds  
    const hourAngle = (hours * 30) + (minutes * 0.5); // 30 degrees per hour + smooth minutes

    // Get clock hands
    const hourHand = document.getElementById('hour-hand');
    const minuteHand = document.getElementById('minute-hand');
    const secondHand = document.getElementById('second-hand');

    // Apply rotations using SVG transform attribute
    if (hourHand) {
        hourHand.setAttribute('transform', `rotate(${hourAngle} 100 100)`);
    } else {
    }
    if (minuteHand) {
        minuteHand.setAttribute('transform', `rotate(${minuteAngle} 100 100)`);
    } else {
        console.log('Minute hand element not found!');
    }
    if (secondHand) {
        secondHand.setAttribute('transform', `rotate(${secondAngle} 100 100)`);
    } else {
        console.log('Second hand element not found!');
    }
}

// Track state to avoid unnecessary UI updates
let currentTrackId = null;
let currentAlbumId = null;
let currentProgressMs = 0;
let currentPlayState = null;
let isUpdatingBackground = false;
let currentBackgroundUrl = null;

// Global click handling variables
let clickTimer = null;
let clickCount = 0;
const DOUBLE_CLICK_DELAY = 300; // milliseconds

// Format time from ms to M:SS
function formatTime(ms) {
    if (isNaN(ms) || ms < 0) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Update progress bar appearance based on play state
function updateProgressBarState(isPlaying) {
    progressBar.classList.remove('paused', 'not-playing');

    if (isPlaying === null || isPlaying === undefined) {
        // Not playing anything
        progressBar.classList.add('not-playing');
    } else if (isPlaying === false) {
        // Paused
        progressBar.classList.add('paused');
    }
    // If isPlaying === true, no additional class needed (default green color)
}

// Update play/pause button icon based on play state
function updatePlayPauseButton(isPlaying) {
    const icon = playPauseBtn.querySelector('.material-icons');
    playPauseBtn.classList.remove('playing', 'paused', 'not-playing');

    if (isPlaying === true) {
        icon.textContent = 'pause';
        playPauseBtn.classList.add('playing');
    } else if (isPlaying === false) {
        icon.textContent = 'play_arrow';
        playPauseBtn.classList.add('paused');
    } else {
        icon.textContent = 'play_arrow';
        playPauseBtn.classList.add('not-playing');
    }
}

// Timer for updating the playback position without API calls
let playbackTimerId = null;

function startPlaybackTimer() {
    // Clear any existing timer
    if (playbackTimerId) {
        clearInterval(playbackTimerId);
    }

    // Update playback position every second if music is playing
    playbackTimerId = setInterval(() => {
        if (currentPlayState) {
            // Only increment if currently playing
            currentProgressMs += 1000; // Add 1 second

            // Update UI
            progressBar.value = currentProgressMs;
            currentTimeDisplay.textContent = formatTime(currentProgressMs);
        }
    }, 1000);
}

// Set up Spotify functionality
function setupSpotify(token) {
    // Set up event listeners for progress bar
    progressBar.addEventListener('input', () => {
        // Optional: Could provide visual feedback while dragging
    });

    progressBar.addEventListener('change', () => {
        const newPosition = parseInt(progressBar.value);
        spotifyApiCall('PUT', `/me/player/seek?position_ms=${newPosition}`);
        setTimeout(getCurrentlyPlaying, 250); // Quicker update after seek
    });

    // Set up play/pause button
    playPauseBtn.addEventListener('click', async () => {
        if (currentPlayState === true) {
            // Currently playing, so pause
            await spotifyApiCall('PUT', '/me/player/pause');
        } else {
            // Currently paused or not playing, so play
            await spotifyApiCall('PUT', '/me/player/play');
        }
        // Quick update after play/pause
        setTimeout(getCurrentlyPlaying, 250);
    });

    // Set up global click/tap functionality
    setupGlobalClickHandlers();

    // Start polling for current track
    getCurrentlyPlaying();

    // Start separate timer for updating playback position
    startPlaybackTimer();

    // Adaptive polling
    let pollingInterval = 2000;
    const maxPollingInterval = 10000;
    let inactiveTime = 0;

    function adaptivePolling() {
        getCurrentlyPlaying()
            .then(hasActivity => {
                if (hasActivity) {
                    inactiveTime = 0;
                    pollingInterval = 2000;
                } else {
                    inactiveTime += pollingInterval;
                    if (inactiveTime > 30000) {
                        pollingInterval = Math.min(pollingInterval * 1.5, maxPollingInterval);
                    }
                }
                setTimeout(adaptivePolling, pollingInterval);
            });
    }

    adaptivePolling();
}

// Set up global click handlers for play/pause and next track
function setupGlobalClickHandlers() {
    document.addEventListener('click', handleGlobalClick, true);
}

// Handle global clicks with single/double click detection
function handleGlobalClick(event) {
    // Only handle clicks when dashboard is visible
    if (dashboard.style.display === 'none') return;

    // Check if click is on excluded elements
    if (isExcludedElement(event.target)) return;

    // Prevent the click from bubbling to avoid conflicts
    event.preventDefault();
    event.stopPropagation();

    clickCount++;

    if (clickCount === 1) {
        // Set timer for single click
        clickTimer = setTimeout(() => {
            handleSingleClick();
            resetClickCounter();
        }, DOUBLE_CLICK_DELAY);
    } else if (clickCount === 2) {
        // Clear single click timer and handle double click
        clearTimeout(clickTimer);
        handleDoubleClick();
        resetClickCounter();
    }
}

// Reset click counter
function resetClickCounter() {
    clickCount = 0;
    clickTimer = null;
}

// Check if clicked element should be excluded from global handlers
function isExcludedElement(element) {
    // List of selectors for elements to exclude
    const excludedSelectors = [
        '#progress-bar',
        '#play-pause-btn',
        '#login-container',
        '#login-container *',
        'button',
        'input',
        'a',
        '.setup-instructions',
        '.setup-instructions *'
    ];

    // Check if element or any parent matches excluded selectors
    let currentElement = element;
    while (currentElement && currentElement !== document.body) {
        for (const selector of excludedSelectors) {
            try {
                if (currentElement.matches && currentElement.matches(selector)) {
                    return true;
                }
            } catch (e) {
                // Ignore invalid selectors
            }
        }
        currentElement = currentElement.parentElement;
    }

    return false;
}

// Handle single click - play/pause
async function handleSingleClick() {
    // Trigger border glow effect
    triggerBorderGlow('play-pause');
    
    if (currentPlayState === true) {
        // Currently playing, so pause
        await spotifyApiCall('PUT', '/me/player/pause');
    } else if (currentPlayState === false) {
        // Currently paused, so play
        await spotifyApiCall('PUT', '/me/player/play');
    }
    // Quick update after play/pause
    setTimeout(getCurrentlyPlaying, 250);
}

// Handle double click - next track
async function handleDoubleClick() {
    // Trigger border glow effect
    triggerBorderGlow('next-track');
    
    await spotifyApiCall('POST', '/me/player/next');
    // Quick update after next track
    setTimeout(getCurrentlyPlaying, 500);
}

// Trigger border glow effect
function triggerBorderGlow(action) {
    const body = document.body;
    const dashboard = document.getElementById('dashboard');
    
    // Remove any existing glow classes
    body.classList.remove('glow-play-pause', 'glow-next-track');
    
    // Remove any existing glow overlay
    const existingOverlay = document.querySelector('.glow-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create and add glow overlay element
    const glowOverlay = document.createElement('div');
    glowOverlay.className = 'glow-overlay';
    
    // Add the appropriate glow class
    if (action === 'play-pause') {
        body.classList.add('glow-play-pause');
        glowOverlay.classList.add('play-pause');
        
        // Add overlay to DOM
        document.body.appendChild(glowOverlay);
        
        // Remove glow class and overlay after animation
        setTimeout(() => {
            body.classList.remove('glow-play-pause');
            if (glowOverlay.parentNode) {
                glowOverlay.remove();
            }
        }, 600);
    } else if (action === 'next-track') {
        body.classList.add('glow-next-track');
        glowOverlay.classList.add('next-track');
        
        // Add overlay to DOM
        document.body.appendChild(glowOverlay);
        
        // Remove glow class and overlay after animation
        setTimeout(() => {
            body.classList.remove('glow-next-track');
            if (glowOverlay.parentNode) {
                glowOverlay.remove();
            }
        }, 800);
    }
}

// Make API calls to Spotify
async function spotifyApiCall(method, endpoint, body = null) {
    const token = localStorage.getItem('spotify_access_token');
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
        try {
            const response = await fetch(`${SPOTIFY_API_ENDPOINT}${endpoint}`, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: body ? JSON.stringify(body) : null
            });

            if (response.status === 401) {
                try {
                    await refreshAccessToken();
                    retryCount++;
                    continue;
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    localStorage.removeItem('spotify_access_token');
                    localStorage.removeItem('spotify_refresh_token');
                    alert('Your session has expired. Please log in again.');
                    window.location.reload();
                    return null;
                }
            }

            if (response.status === 204) {
                return true;
            }

            if (response.ok) {
                if (response.status !== 204) {
                    const text = await response.text();
                    if (!text) return null;

                    try {
                        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                            return JSON.parse(text);
                        } else {
                            console.log('Non-JSON response:', text);
                            return null;
                        }
                    } catch (parseError) {
                        console.error('JSON Parse Error:', parseError);
                        console.log('Response text:', text);
                        return null;
                    }
                }
                return true;
            } else if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 5;
                console.log(`Rate limited, waiting ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                retryCount++;
                continue;
            } else {
                console.error('API Error:', response.status);
                return null;
            }
        } catch (error) {
            console.error('API Request Failed:', error);
            if (retryCount < maxRetries) {
                const waitTime = Math.pow(2, retryCount) * 1000;
                console.log(`Retrying in ${waitTime / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                retryCount++;
                continue;
            }
            return null;
        }
    }
    return null;
}

// Get and display currently playing track
async function getCurrentlyPlaying() {
    try {
        const data = await spotifyApiCall('GET', '/me/player/currently-playing');
        let activityDetectedForPolling = false;

        if (data && data.item) {
            const newTrackId = data.item.id;
            const newAlbumId = data.item.album ? data.item.album.id : null;
            const newPlayState = data.is_playing;
            const newProgress = typeof data.progress_ms !== 'undefined' ? data.progress_ms : currentProgressMs;

            const trackChanged = currentTrackId !== newTrackId;
            const albumChanged = newAlbumId !== currentAlbumId;
            const playStateChanged = currentPlayState !== newPlayState;
            const progressChanged = currentProgressMs !== newProgress;

            if (trackChanged) {
                trackName.textContent = data.item.name;
                artistName.textContent = data.item.artists.map(artist => artist.name).join(', ');
                albumName.textContent = data.item.album ? data.item.album.name : '';
                currentTrackId = newTrackId;
                activityDetectedForPolling = true;

                // Fetch artist image when track changes
                if (data.item.artists && data.item.artists.length > 0) {
                    const artistId = data.item.artists[0].id;
                    fetchArtistImage(artistId);
                } else {
                    updateBackground();
                }
            }

            if (playStateChanged || trackChanged) {
                currentPlayState = newPlayState;
                // Update progress bar class based on play state
                updateProgressBarState(newPlayState);
                // Update play/pause button
                updatePlayPauseButton(newPlayState);
                // Restart the playback timer when play state changes
                startPlaybackTimer();
                activityDetectedForPolling = true;
            }

            if (progressChanged || trackChanged) {
                if (data.item.duration_ms) {
                    progressBar.max = data.item.duration_ms;
                    totalTimeDisplay.textContent = formatTime(data.item.duration_ms);
                }
                progressBar.value = newProgress;
                currentTimeDisplay.textContent = formatTime(newProgress);
                currentProgressMs = newProgress;
                if (progressChanged && !trackChanged && !playStateChanged) activityDetectedForPolling = true;
            }

            if (newAlbumId && (albumChanged || !albumArt.hasChildNodes())) {
                currentAlbumId = newAlbumId;
                const albumArtCacheKey = `spotify_album_art_${newAlbumId}`;
                let cachedArtUrl = localStorage.getItem(albumArtCacheKey);

                if (cachedArtUrl) {
                    const img = new Image();
                    img.onload = () => {
                        albumArt.innerHTML = `<img src="${cachedArtUrl}" alt="Album Art" style="width:100%; height:100%; border-radius:8px;">`;
                    };
                    img.onerror = () => {
                        localStorage.removeItem(albumArtCacheKey);
                        if (data.item.album) {
                            fetchAndSetAlbumArt(data.item.album, newAlbumId);
                        } else {
                            albumArt.innerHTML = '';
                        }
                    };
                    img.src = cachedArtUrl;
                } else if (data.item.album && data.item.album.images && data.item.album.images.length > 0) {
                    fetchAndSetAlbumArt(data.item.album, newAlbumId);
                } else {
                    albumArt.innerHTML = '';
                }
                activityDetectedForPolling = true;
            }
            return activityDetectedForPolling;
        } else if (currentTrackId !== null) {
            currentTrackId = null;
            currentPlayState = null;
            currentAlbumId = null;
            currentProgressMs = 0;
            trackName.textContent = 'Not Playing';
            artistName.textContent = '-';
            albumName.textContent = '';
            albumArt.innerHTML = '';
            progressBar.value = 0;
            progressBar.max = 0;
            currentTimeDisplay.textContent = '0:00';
            totalTimeDisplay.textContent = '0:00';

            // Update progress bar class for not playing state
            updateProgressBarState(null);
            // Update play/pause button for not playing state
            updatePlayPauseButton(null);

            // Clear the playback timer when playback stops
            if (playbackTimerId) {
                clearInterval(playbackTimerId);
                playbackTimerId = null;
            }

            document.body.style.setProperty('--album-bg', 'none');
            return true;
        }

        return activityDetectedForPolling;
    } catch (error) {
        console.error('Error updating player:', error);
        return false;
    }
}

// Fetch artist image and use it for background
async function fetchArtistImage(artistId) {
    if (isUpdatingBackground) return;
    isUpdatingBackground = true;

    try {
        if (!artistId) {
            await updateBackground();
            return;
        }

        const artistImageCacheKey = `spotify_artist_image_${artistId}`;
        const cachedArtistImageUrl = localStorage.getItem(artistImageCacheKey);

        if (cachedArtistImageUrl) {
            if (currentBackgroundUrl !== cachedArtistImageUrl) {
                await setBackgroundImage(cachedArtistImageUrl);
                currentBackgroundUrl = cachedArtistImageUrl;
            }
            return;
        }

        const artistData = await spotifyApiCall('GET', `/artists/${artistId}`);
        if (artistData && artistData.images && artistData.images.length > 0) {
            const artistImageUrl = artistData.images[0].url;
            if (currentBackgroundUrl !== artistImageUrl) {
                try {
                    localStorage.setItem(artistImageCacheKey, artistImageUrl);
                } catch (e) {
                    console.warn("Could not cache artist image, localStorage might be full.", e);
                }
                await setBackgroundImage(artistImageUrl);
                currentBackgroundUrl = artistImageUrl;
            }
        } else {
            await updateBackground();
        }
    } catch (error) {
        console.error("Error fetching artist image:", error);
        await updateBackground();
    } finally {
        isUpdatingBackground = false;
    }
}

// Helper function to preload an image
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}

// Helper function to set background image with transition
async function setBackgroundImage(imageUrl) {
    await preloadImage(imageUrl);

    document.body.style.setProperty('--album-bg-next', `url("${imageUrl}")`);

    await new Promise(resolve => setTimeout(resolve, 50));

    document.body.style.setProperty('--bg-opacity', '0');

    await new Promise(resolve => setTimeout(resolve, 100));

    document.body.style.setProperty('--album-bg', `url("${imageUrl}")`);
    document.body.style.setProperty('--album-bg-next', 'none');
    document.body.style.setProperty('--bg-opacity', '1');
}

// Helper function to update the background with current album art
async function updateBackground() {
    if (!currentAlbumId) return;

    try {
        const albumArtCacheKey = `spotify_album_art_${currentAlbumId}`;
        const cachedArtUrl = localStorage.getItem(albumArtCacheKey);

        if (cachedArtUrl && currentBackgroundUrl !== cachedArtUrl) {
            await setBackgroundImage(cachedArtUrl);
            currentBackgroundUrl = cachedArtUrl;
        }
    } catch (error) {
        console.error("Error updating background:", error);
    }
}

// Helper function to fetch, display, and cache album art
async function fetchAndSetAlbumArt(albumData, albumId) {
    if (albumData && albumData.images && albumData.images.length > 0) {
        const imageUrl = albumData.images[0].url;
        const albumArtCacheKey = `spotify_album_art_${albumId}`;

        const img = new Image();
        img.onload = async () => {
            albumArt.innerHTML = `<img src="${imageUrl}" alt="Album Art" style="width:100%; height:100%; border-radius:8px;">`;
            try {
                localStorage.setItem(albumArtCacheKey, imageUrl);
            } catch (e) {
                console.warn("Could not cache album art, localStorage might be full.", e);
            }
        };
        img.onerror = () => {
            console.error("Failed to load album art image:", imageUrl);
            albumArt.innerHTML = '';
        };
        img.src = imageUrl;
    } else {
        albumArt.innerHTML = '';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);