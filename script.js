// ===== GLOBAL STATE =====
const APP_STATE = {
    currentView: 'upload',
    videoUrl: null,
    videoFile: null,
    isPlaying: false,
    isMuted: false,
    showRobot: true,
    showHud: true,
    trainingMode: 'shadow',
    
    // Stats
    sessionId: null,
    punchCount: 0,
    totalPunches: 0,
    currentPower: 0,
    peakPower: 0,
    avgPower: 0,
    comboCount: 0,
    maxCombo: 0,
    strikeAccuracy: 0,
    defenseRating: 0,
    reactionTime: 0,
    stamina: 100,
    intensity: 'Low',
    
    // Processing
    punchTimestamps: [],
    powerScores: [],
    lastPunchTime: 0,
    reactionTimes: [],
    
    // Community
    communityHighlights: [],
    
    // Contest
    contestEntries: 0,
    
    // Video state
    videoErrorOccurred: false,
    
    // Share data
    shareLinks: {},
    currentHighlight: null
};

// ===== SIMPLE DATABASE (LocalStorage) =====
const DB = {
    COMMUNITY_KEY: 'fighthype_community',
    SESSIONS_KEY: 'fighthype_sessions',
    SHARE_LINKS_KEY: 'fighthype_share_links',
    
    saveHighlight: function(highlight) {
        try {
            const highlights = this.getHighlights();
            highlights.unshift(highlight);
            
            // Keep only latest 50 highlights
            if (highlights.length > 50) {
                highlights.pop();
            }
            
            localStorage.setItem(this.COMMUNITY_KEY, JSON.stringify(highlights));
            return true;
        } catch (error) {
            console.error('Error saving highlight:', error);
            return false;
        }
    },
    
    getHighlights: function() {
        try {
            const data = localStorage.getItem(this.COMMUNITY_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting highlights:', error);
            return [];
        }
    },
    
    saveShareLink: function(shareId, data) {
        try {
            const links = this.getShareLinks();
            links[shareId] = data;
            localStorage.setItem(this.SHARE_LINKS_KEY, JSON.stringify(links));
            return true;
        } catch (error) {
            console.error('Error saving share link:', error);
            return false;
        }
    },
    
    getShareLinks: function() {
        try {
            const data = localStorage.getItem(this.SHARE_LINKS_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error getting share links:', error);
            return {};
        }
    },
    
    getShareLink: function(shareId) {
        const links = this.getShareLinks();
        return links[shareId] || null;
    },
    
    saveSession: function(sessionData) {
        try {
            localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessionData));
            return true;
        } catch (error) {
            console.error('Error saving session:', error);
            return false;
        }
    },
    
    getSession: function() {
        try {
            const data = localStorage.getItem(this.SESSIONS_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    },
    
    clearVideoCache: function() {
        // Clear any video URLs from localStorage that might be causing issues
        const session = this.getSession();
        if (session && session.videoUrl) {
            try {
                URL.revokeObjectURL(session.videoUrl);
            } catch (e) {
                console.log('Error revoking URL:', e);
            }
        }
    }
};

// ===== DOM ELEMENTS =====
const elements = {
    // Views
    views: {
        upload: document.getElementById('upload-view'),
        processing: document.getElementById('processing-view'),
        editor: document.getElementById('editor-view'),
        community: document.getElementById('community-view')
    },
    
    // Upload elements
    fileInput: document.getElementById('file-input'),
    dropZone: document.getElementById('drop-zone'),
    
    // Processing elements
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    
    // Video elements
    video: document.getElementById('main-video'),
    playBtn: document.getElementById('play-btn'),
    restartBtn: document.getElementById('restart-btn'),
    muteBtn: document.getElementById('mute-btn'),
    robotBtn: document.getElementById('robot-btn'),
    hudBtn: document.getElementById('hud-btn'),
    fitBtn: document.getElementById('fit-btn'),
    
    // HUD elements
    hudPunches: document.getElementById('hud-punches'),
    hudSpeed: document.getElementById('hud-speed'),
    hudPower: document.getElementById('hud-power'),
    hudCombo: document.getElementById('hud-combo'),
    
    // Stats elements
    sessionId: document.getElementById('session-id'),
    currentPowerValue: document.getElementById('current-power-value'),
    powerFill: document.getElementById('power-fill'),
    powerIndicator: document.getElementById('power-indicator'),
    currentPower: document.getElementById('current-power'),
    peakPower: document.getElementById('peak-power'),
    avgPower: document.getElementById('avg-power'),
    totalStrikes: document.getElementById('total-strikes'),
    strikeSpeed: document.getElementById('strike-speed'),
    strikeAccuracy: document.getElementById('strike-accuracy'),
    maxCombo: document.getElementById('max-combo'),
    defenseRating: document.getElementById('defense-rating'),
    reactionTime: document.getElementById('reaction-time'),
    stamina: document.getElementById('stamina'),
    intensity: document.getElementById('intensity'),
    
    // Community elements
    communityGrid: document.getElementById('community-grid'),
    
    // Modal
    shareModal: document.getElementById('share-modal'),
    sharePreview: document.getElementById('share-preview'),
    
    // Toast
    toast: document.getElementById('toast'),
    
    // Loading screen
    loadingScreen: document.getElementById('loading-screen'),
    
    // Error message element (we'll create it)
    errorMessage: null
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    hideLoadingScreen();
});

function initializeApp() {
    // Create error message element if it doesn't exist
    createErrorMessageElement();
    
    // Clear any cached video URLs to prevent browser issues
    DB.clearVideoCache();
    
    // Initialize from localStorage
    APP_STATE.contestEntries = parseInt(localStorage.getItem('fh_contest_entries') || '0');
    APP_STATE.communityHighlights = DB.getHighlights();
    APP_STATE.shareLinks = DB.getShareLinks();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize mode buttons
    setupModeButtons();
    
    // Generate initial session ID
    generateSessionId();
    
    // Check for share link in URL
    checkForShareLink();
    
    // Load community highlights if on community view
    if (window.location.hash === '#community') {
        showCommunity();
    }
}

function createErrorMessageElement() {
    elements.errorMessage = document.createElement('div');
    elements.errorMessage.className = 'error-message';
    elements.errorMessage.id = 'error-message';
    document.body.appendChild(elements.errorMessage);
}

function hideLoadingScreen() {
    setTimeout(() => {
        elements.loadingScreen.classList.add('hidden');
    }, 1000);
}

function setupEventListeners() {
    // File input
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleFileDrop);
    
    // Video events
    elements.video.addEventListener('loadeddata', handleVideoLoaded);
    elements.video.addEventListener('canplay', handleVideoCanPlay);
    elements.video.addEventListener('error', handleVideoError);
    elements.video.addEventListener('ended', handleVideoEnded);
    elements.video.addEventListener('play', () => {
        APP_STATE.isPlaying = true;
        elements.playBtn.textContent = "⏸";
    });
    elements.video.addEventListener('pause', () => {
        APP_STATE.isPlaying = false;
        elements.playBtn.textContent = "⏵";
    });
    elements.video.addEventListener('timeupdate', updateRealTimeStats);
    
    // Sound toggle
    document.getElementById('sound-toggle').addEventListener('click', toggleSound);
    
    // Handle view switching (stop video when leaving editor)
    document.addEventListener('viewChanged', handleViewChange);
}

function setupModeButtons() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            APP_STATE.trainingMode = btn.dataset.mode;
            generateStats();
        });
    });
}

// ===== VIEW MANAGEMENT =====
function switchView(viewName) {
    // Pause video if leaving editor view
    if (APP_STATE.currentView === 'editor' && viewName !== 'editor') {
        pauseVideo();
    }
    
    // Hide all views
    Object.values(elements.views).forEach(view => {
        if (view) view.classList.remove('active');
    });
    
    // Show requested view
    if (elements.views[viewName]) {
        elements.views[viewName].classList.add('active');
        APP_STATE.currentView = viewName;
        
        // Trigger view change event
        document.dispatchEvent(new CustomEvent('viewChanged', { 
            detail: { from: APP_STATE.currentView, to: viewName }
        }));
        
        // Load community highlights if switching to community view
        if (viewName === 'community') {
            loadCommunityHighlights();
        }
    }
}

function handleViewChange(event) {
    const { to } = event.detail;
    
    // If going to community or upload, ensure video is paused
    if (to !== 'editor') {
        pauseVideo();
    }
}

function pauseVideo() {
    if (elements.video && !elements.video.paused) {
        elements.video.pause();
        APP_STATE.isPlaying = false;
        elements.playBtn.textContent = "⏵";
    }
}

function showCommunity() {
    switchView('community');
}

// ===== ERROR HANDLING FUNCTIONS =====
function showError(message, duration = 4000) {
    if (elements.errorMessage) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.classList.add('show');
        
        setTimeout(() => {
            elements.errorMessage.classList.remove('show');
        }, duration);
    }
}

function clearError() {
    if (elements.errorMessage) {
        elements.errorMessage.classList.remove('show');
    }
}

// ===== FILE HANDLING & VIDEO FIXES =====
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
}

function handleDragOver(event) {
    event.preventDefault();
    elements.dropZone.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    elements.dropZone.classList.remove('drag-over');
}

function handleFileDrop(event) {
    event.preventDefault();
    elements.dropZone.classList.remove('drag-over');
    
    const file = event.dataTransfer.files[0];
    if (file) processFile(file);
}

function processFile(file) {
    // Clear any previous errors
    clearError();
    
    // Reset error flag
    APP_STATE.videoErrorOccurred = false;
    
    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
    if (!validTypes.some(type => file.type.includes(type.replace('video/', '')))) {
        showError('Please upload MP4, MOV, or WEBM format');
        return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
        showError('File too large. Max 100MB');
        return;
    }
    
    // Clean up previous video URL to prevent memory leaks
    if (APP_STATE.videoUrl) {
        URL.revokeObjectURL(APP_STATE.videoUrl);
        APP_STATE.videoUrl = null;
    }
    
    // Store the file object for later use
    APP_STATE.videoFile = file;
    
    try {
        // Create object URL
        APP_STATE.videoUrl = URL.createObjectURL(file);
        
        // Start processing
        startProcessing();
    } catch (error) {
        console.error('Error creating video URL:', error);
        showError('Error processing video. Please try another file.');
        switchView('upload');
    }
}

function handleVideoLoaded() {
    // Reset error flag when video loads successfully
    APP_STATE.videoErrorOccurred = false;
    
    // Generate punch timestamps based on video duration
    const duration = elements.video.duration || 60;
    generatePunchTimestamps(duration);
    
    // Reset stats when video loads
    resetStats();
}

function handleVideoCanPlay() {
    // Video is ready to play
    console.log('Video can play');
    APP_STATE.videoErrorOccurred = false;
}

function handleVideoError(event) {
    console.error('Video error details:', {
        error: elements.video.error,
        errorCode: elements.video.error ? elements.video.error.code : 'No error code',
        src: elements.video.src,
        networkState: elements.video.networkState,
        readyState: elements.video.readyState
    });
    
    // Only show error if we haven't already shown one recently
    if (!APP_STATE.videoErrorOccurred) {
        APP_STATE.videoErrorOccurred = true;
        
        // Check the actual error
        if (elements.video.error) {
            switch(elements.video.error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    console.log('Video playback aborted');
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    showError('Network error. Please check your connection.');
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    showError('Video format not supported. Please try MP4 format.');
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    showError('Video format not supported. Please try MP4 format.');
                    break;
                default:
                    showError('Error playing video. Please try another file.');
            }
        } else if (elements.video.src && elements.video.src.includes('blob:')) {
            // This might be a CORS issue with blob URL
            console.log('Possible CORS issue with blob URL');
        }
    }
}

function handleVideoEnded() {
    // Reset stats when video ends
    resetStats();
    elements.playBtn.textContent = "⏵";
}

function restartVideo() {
    if (!elements.video.src || APP_STATE.videoErrorOccurred) {
        console.log('Cannot restart video: No source or previous error');
        return;
    }
    
    // Reset stats
    resetStats();
    
    try {
        // Restart video
        elements.video.currentTime = 0;
        elements.video.play().catch(e => {
            console.log("Play error after restart:", e);
            // Don't show error for autoplay errors
            if (e.name !== 'NotAllowedError') {
                showToast('Click play to start video');
            }
        });
        
        elements.playBtn.textContent = "⏸";
    } catch (error) {
        console.error('Error restarting video:', error);
    }
}

function resetStats() {
    // Reset all counters
    APP_STATE.punchCount = 0;
    APP_STATE.currentPower = 0;
    APP_STATE.comboCount = 0;
    APP_STATE.lastPunchTime = 0;
    APP_STATE.reactionTimes = [];
    APP_STATE.powerScores = [];
    
    // Reset HUD
    elements.hudPunches.textContent = '0';
    elements.hudCombo.textContent = 'x1';
    elements.hudPower.textContent = '0%';
    
    // Reset stats panel
    updatePowerMeter(0);
    elements.totalStrikes.textContent = '0';
    elements.strikeAccuracy.textContent = '0%';
    elements.maxCombo.textContent = 'x0';
    elements.stamina.textContent = '100%';
    elements.intensity.textContent = 'Low';
    elements.reactionTime.textContent = '0.0s';
}

// ===== PROCESSING =====
function startProcessing() {
    switchView('processing');
    
    let progress = 0;
    const steps = [
        "Reading video data...",
        "Extracting motion frames...",
        "Analyzing strike patterns...",
        "Calculating power metrics...",
        "Generating AI insights...",
        "Creating combat profile..."
    ];
    
    const interval = setInterval(() => {
        progress += 2;
        elements.progressFill.style.width = `${progress}%`;
        
        const stepIndex = Math.floor((progress / 100) * steps.length);
        if (steps[stepIndex]) {
            elements.progressText.textContent = steps[stepIndex];
        }
        
        if (progress >= 100) {
            clearInterval(interval);
            finishProcessing();
        }
    }, 60);
}

function finishProcessing() {
    // Generate stats for current mode
    generateStats();
    
    // Reset video element properly
    elements.video.pause();
    
    // Clear any previous error
    APP_STATE.videoErrorOccurred = false;
    
    // Set the video source
    if (APP_STATE.videoUrl) {
        elements.video.src = APP_STATE.videoUrl;
        elements.video.load();
        
        // Add crossorigin attribute to handle CORS issues
        elements.video.crossOrigin = 'anonymous';
        
        // Add event listener for when video is ready
        elements.video.addEventListener('loadedmetadata', () => {
            console.log('Video metadata loaded, duration:', elements.video.duration);
        });
    } else {
        console.error('No video URL available');
        showError('Video URL not available. Please upload again.');
        switchView('upload');
        return;
    }
    
    // Switch to editor view
    switchView('editor');
    
    // Try to play automatically with better error handling
    setTimeout(() => {
        if (elements.video.src) {
            elements.video.play().catch(e => {
                console.log("Autoplay blocked, showing play button:", e);
                // Don't show error for autoplay errors
                elements.playBtn.textContent = "⏵";
            });
        }
    }, 500);
    
    // Save session to localStorage
    DB.saveSession({
        videoUrl: APP_STATE.videoUrl,
        timestamp: Date.now()
    });
}

// ===== STATS GENERATION =====
function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    APP_STATE.sessionId = `FH${id}`;
    elements.sessionId.textContent = `SESSION #${APP_STATE.sessionId}`;
}

function generateStats() {
    // Reset all stats
    APP_STATE.punchCount = 0;
    APP_STATE.currentPower = 0;
    APP_STATE.peakPower = 0;
    APP_STATE.avgPower = 0;
    APP_STATE.comboCount = 0;
    APP_STATE.maxCombo = 0;
    APP_STATE.strikeAccuracy = 0;
    APP_STATE.powerScores = [];
    APP_STATE.lastPunchTime = 0;
    APP_STATE.reactionTimes = [];
    
    // Generate stats based on training mode
    switch (APP_STATE.trainingMode) {
        case 'shadow':
            APP_STATE.totalPunches = Math.floor(Math.random() * (120 - 40) + 40);
            APP_STATE.defenseRating = Math.floor(Math.random() * (90 - 60) + 60);
            break;
        case 'bag':
            APP_STATE.totalPunches = Math.floor(Math.random() * (200 - 100) + 100);
            APP_STATE.defenseRating = Math.floor(Math.random() * (80 - 50) + 50);
            break;
        case 'pads':
            APP_STATE.totalPunches = Math.floor(Math.random() * (150 - 60) + 60);
            APP_STATE.defenseRating = Math.floor(Math.random() * (95 - 70) + 70);
            break;
        case 'spar':
            APP_STATE.totalPunches = Math.floor(Math.random() * (100 - 30) + 30);
            APP_STATE.defenseRating = Math.floor(Math.random() * (85 - 40) + 40);
            break;
    }
    
    // Update UI
    elements.defenseRating.textContent = `${APP_STATE.defenseRating}%`;
    elements.stamina.textContent = "100%";
    elements.intensity.textContent = "Low";
    elements.reactionTime.textContent = "0.0s";
    elements.totalStrikes.textContent = "0";
    elements.strikeAccuracy.textContent = "0%";
    elements.maxCombo.textContent = "x0";
    
    // Generate new session ID
    generateSessionId();
}

function generatePunchTimestamps(duration) {
    APP_STATE.punchTimestamps = [];
    for (let i = 0; i < APP_STATE.totalPunches; i++) {
        APP_STATE.punchTimestamps.push(Math.random() * duration);
    }
    APP_STATE.punchTimestamps.sort((a, b) => a - b);
}

// ===== REAL-TIME UPDATES =====
function updateRealTimeStats() {
    if (!APP_STATE.isPlaying) return;
    
    const currentTime = elements.video.currentTime;
    
    // Update speed display with variation
    const baseSpeed = APP_STATE.trainingMode === 'spar' ? 65 : 
                     APP_STATE.trainingMode === 'pads' ? 55 : 
                     APP_STATE.trainingMode === 'bag' ? 45 : 35;
    
    const wave = Math.sin(currentTime * 2);
    const variance = wave * 15;
    const noise = (Math.random() * 6) - 3;
    const liveSpeed = Math.max(0, Math.floor(baseSpeed + variance + noise));
    
    elements.hudSpeed.textContent = liveSpeed;
    elements.strikeSpeed.textContent = `${liveSpeed} KM/H`;
    
    // Check for punches
    const punchesSoFar = APP_STATE.punchTimestamps.filter(t => t <= currentTime).length;
    
    if (punchesSoFar > APP_STATE.punchCount) {
        handlePunch(punchesSoFar, currentTime);
    }
    
    // Update accuracy
    if (APP_STATE.totalPunches > 0) {
        APP_STATE.strikeAccuracy = Math.min(100, Math.floor((APP_STATE.punchCount / APP_STATE.totalPunches) * 100));
        elements.strikeAccuracy.textContent = `${APP_STATE.strikeAccuracy}%`;
    }
    
    // Update stamina (decreases over time)
    const staminaLoss = (currentTime / (elements.video.duration || 60)) * 100;
    APP_STATE.stamina = Math.max(20, 100 - staminaLoss);
    elements.stamina.textContent = `${Math.round(APP_STATE.stamina)}%`;
    
    // Update intensity based on combo
    if (APP_STATE.comboCount >= 8) {
        APP_STATE.intensity = "Extreme";
    } else if (APP_STATE.comboCount >= 5) {
        APP_STATE.intensity = "High";
    } else if (APP_STATE.comboCount >= 3) {
        APP_STATE.intensity = "Medium";
    } else {
        APP_STATE.intensity = "Low";
    }
    elements.intensity.textContent = APP_STATE.intensity;
    
    // Update reaction time average
    if (APP_STATE.reactionTimes.length > 0) {
        const avgReaction = APP_STATE.reactionTimes.reduce((a, b) => a + b, 0) / APP_STATE.reactionTimes.length;
        APP_STATE.reactionTime = avgReaction;
        elements.reactionTime.textContent = `${avgReaction.toFixed(1)}s`;
    }
}

function handlePunch(punchesSoFar, currentTime) {
    APP_STATE.punchCount = punchesSoFar;
    
    // Calculate time since last punch
    const timeSinceLastPunch = currentTime - APP_STATE.lastPunchTime;
    
    // Update combo
    if (timeSinceLastPunch < 2.0) {
        APP_STATE.comboCount++;
        if (APP_STATE.comboCount > APP_STATE.maxCombo) {
            APP_STATE.maxCombo = APP_STATE.comboCount;
            elements.maxCombo.textContent = `x${APP_STATE.maxCombo}`;
        }
    } else {
        APP_STATE.comboCount = 1;
    }
    
    // Store reaction time
    APP_STATE.reactionTimes.push(timeSinceLastPunch);
    APP_STATE.lastPunchTime = currentTime;
    
    // Calculate power for this punch
    let basePower;
    switch (APP_STATE.trainingMode) {
        case 'shadow': basePower = 40 + Math.random() * 30; break;
        case 'bag': basePower = 50 + Math.random() * 35; break;
        case 'pads': basePower = 60 + Math.random() * 35; break;
        case 'spar': basePower = 70 + Math.random() * 25; break;
    }
    
    const comboMultiplier = 1 + (Math.min(APP_STATE.comboCount, 10) * 0.05);
    const calculatedPower = Math.min(100, Math.floor(basePower * comboMultiplier));
    
    APP_STATE.currentPower = calculatedPower;
    APP_STATE.powerScores.push(calculatedPower);
    
    // Update peak power
    if (calculatedPower > APP_STATE.peakPower) {
        APP_STATE.peakPower = calculatedPower;
        elements.peakPower.textContent = Math.round(APP_STATE.peakPower);
    }
    
    // Update average power
    APP_STATE.avgPower = Math.floor(APP_STATE.powerScores.reduce((a, b) => a + b, 0) / APP_STATE.powerScores.length);
    elements.avgPower.textContent = Math.round(APP_STATE.avgPower);
    
    // Update power meter
    updatePowerMeter(calculatedPower);
    
    // Trigger visual effects
    triggerPunchEffects();
    
    // Update UI
    elements.hudPunches.textContent = APP_STATE.punchCount;
    elements.hudCombo.textContent = `x${APP_STATE.comboCount}`;
    elements.totalStrikes.textContent = APP_STATE.punchCount;
    
    // Play punch sound
    playPunchSound();
}

function updatePowerMeter(power) {
    const powerPercent = Math.min(100, Math.max(0, power));
    
    elements.powerFill.style.width = `${powerPercent}%`;
    elements.powerIndicator.style.left = `calc(${powerPercent}% - 8px)`;
    elements.currentPowerValue.textContent = `${Math.round(powerPercent)}%`;
    elements.currentPower.textContent = Math.round(powerPercent);
    elements.hudPower.textContent = `${Math.round(powerPercent)}%`;
}

function triggerPunchEffects() {
    // Animate robot arms
    const leftArm = document.getElementById('robot-arm-left');
    const rightArm = document.getElementById('robot-arm-right');
    
    const punchSide = Math.random() > 0.5 ? 'left' : 'right';
    if (punchSide === 'left') {
        leftArm.style.transform = 'rotate(-45deg) translateX(-20px)';
        setTimeout(() => leftArm.style.transform = '', 200);
    } else {
        rightArm.style.transform = 'rotate(45deg) translateX(20px)';
        setTimeout(() => rightArm.style.transform = '', 200);
    }
    
    // Flash hit zones
    document.querySelectorAll('.hit-zone').forEach(zone => {
        zone.classList.add('active');
        setTimeout(() => zone.classList.remove('active'), 500);
    });
    
    // Add glitch effect to video container
    const videoStage = document.getElementById('video-stage');
    videoStage.style.filter = 'hue-rotate(90deg)';
    setTimeout(() => videoStage.style.filter = '', 100);
}

// ===== AUDIO =====
function playPunchSound() {
    if (APP_STATE.isMuted) return;
    
    try {
        // Create punch sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log("Audio context not supported");
    }
}

function toggleSound() {
    APP_STATE.isMuted = !APP_STATE.isMuted;
    elements.video.muted = APP_STATE.isMuted;
    
    const soundBtn = document.getElementById('sound-toggle');
    if (APP_STATE.isMuted) {
        soundBtn.textContent = "🔇 MUTED";
        soundBtn.style.color = "#ff0055";
    } else {
        soundBtn.textContent = "🔊 SOUND";
        soundBtn.style.color = "";
    }
}

// ===== VIDEO CONTROLS =====
function togglePlay() {
    if (!elements.video.src || APP_STATE.videoErrorOccurred) {
        console.log('Cannot play video: No source or previous error');
        return;
    }
    
    if (elements.video.paused) {
        elements.video.play().catch(e => {
            console.log("Play error:", e);
            // Don't show error for autoplay errors
            if (e.name !== 'NotAllowedError') {
                showError('Error playing video. Please try again.');
            }
        });
        elements.playBtn.textContent = "⏸";
    } else {
        elements.video.pause();
        elements.playBtn.textContent = "⏵";
    }
}

function toggleMute() {
    APP_STATE.isMuted = !APP_STATE.isMuted;
    elements.video.muted = APP_STATE.isMuted;
    
    if (APP_STATE.isMuted) {
        elements.muteBtn.textContent = "🔇";
        elements.muteBtn.style.color = "#ff0055";
    } else {
        elements.muteBtn.textContent = "🔊";
        elements.muteBtn.style.color = "";
    }
}

function toggleRobot() {
    APP_STATE.showRobot = !APP_STATE.showRobot;
    const robot = document.getElementById('robot-overlay');
    
    if (APP_STATE.showRobot) {
        robot.style.opacity = '0.8';
        elements.robotBtn.classList.add('active');
    } else {
        robot.style.opacity = '0';
        elements.robotBtn.classList.remove('active');
    }
}

function toggleHud() {
    APP_STATE.showHud = !APP_STATE.showHud;
    const hudElements = document.querySelectorAll('.hud-container');
    
    hudElements.forEach(el => {
        el.style.opacity = APP_STATE.showHud ? '1' : '0';
    });
    
    elements.hudBtn.classList.toggle('active');
}

function toggleFit() {
    if (elements.video.style.objectFit === 'contain') {
        elements.video.style.objectFit = 'cover';
        elements.fitBtn.textContent = "⛶";
    } else {
        elements.video.style.objectFit = 'contain';
        elements.fitBtn.textContent = "⛶";
    }
}

// ===== SHARE LINK SYSTEM =====
function generateShareLink() {
    // Create a unique share ID
    const shareId = 'SH' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Create share data
    const shareData = {
        id: shareId,
        sessionId: APP_STATE.sessionId,
        timestamp: Date.now(),
        stats: {
            power: Math.round(APP_STATE.currentPower),
            strikes: APP_STATE.punchCount,
            combo: APP_STATE.comboCount,
            maxCombo: APP_STATE.maxCombo,
            accuracy: APP_STATE.strikeAccuracy,
            speed: elements.hudSpeed.textContent,
            mode: APP_STATE.trainingMode,
            peakPower: APP_STATE.peakPower,
            avgPower: APP_STATE.avgPower,
            defenseRating: APP_STATE.defenseRating,
            reactionTime: APP_STATE.reactionTime,
            stamina: APP_STATE.stamina,
            intensity: APP_STATE.intensity
        },
        videoData: APP_STATE.videoUrl ? {
            hasVideo: true,
            // Note: We can't share blob URLs, so we'll use the file if available
            fileName: APP_STATE.videoFile ? APP_STATE.videoFile.name : 'boxing-training.mp4'
        } : { hasVideo: false }
    };
    
    // Save to localStorage
    DB.saveShareLink(shareId, shareData);
    
    // Generate the shareable link
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#share=${shareId}`;
    
    return {
        url: shareUrl,
        id: shareId,
        data: shareData
    };
}

function showShareLinkModal() {
    // Generate share link
    const shareInfo = generateShareLink();
    APP_STATE.currentHighlight = shareInfo;
    
    // Update modal content
    elements.sharePreview.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; margin-bottom: 10px;">🥊</div>
            <h3 style="margin-bottom: 10px; font-family: var(--font-heading);">Your FIGHTHYPE Highlight</h3>
            <p style="color: #888; margin-bottom: 15px;">
                Power: <strong style="color: #00ff9d;">${shareInfo.data.stats.power}%</strong> • 
                Strikes: <strong>${shareInfo.data.stats.strikes}</strong> • 
                Combo: <strong style="color: #ff0055;">x${shareInfo.data.stats.combo}</strong>
            </p>
            <div class="share-link-container">
                <input type="text" readonly class="share-link-input" value="${shareInfo.url}" id="share-link-input">
                <button onclick="copyShareLink()" class="copy-link-btn">📋 COPY LINK</button>
            </div>
            <p style="font-size: 0.9rem; color: #666; margin-top: 15px;">
                Anyone with this link can view your highlight!
            </p>
        </div>
    `;
    
    // Update platform buttons
    const platformButtons = document.querySelector('.platform-buttons');
    if (platformButtons) {
        platformButtons.innerHTML = `
            <button onclick="shareToInstagram()" class="platform-btn instagram">
                📷 Instagram
            </button>
            <button onclick="shareToTikTok()" class="platform-btn tiktok">
                🎵 TikTok
            </button>
            <button onclick="shareToTwitterWithLink()" class="platform-btn twitter">
                🐦 Twitter
            </button>
            <button onclick="shareToCommunity()" class="platform-btn community">
                🌐 Community
            </button>
        `;
    }
    
    // Show modal
    elements.shareModal.classList.add('active');
}

function copyShareLink() {
    const input = document.getElementById('share-link-input');
    if (input) {
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            navigator.clipboard.writeText(input.value).then(() => {
                showToast('Link copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                document.execCommand('copy');
                showToast('Link copied to clipboard!');
            });
        } catch (error) {
            // Final fallback
            input.select();
            document.execCommand('copy');
            showToast('Link copied to clipboard!');
        }
    }
}

function shareToTwitterWithLink() {
    if (!APP_STATE.currentHighlight) return;
    
    const text = encodeURIComponent(
        `Just scored ${APP_STATE.currentHighlight.data.stats.power}% power on @FightHypeAI! ` +
        `${APP_STATE.currentHighlight.data.stats.strikes} strikes with ${APP_STATE.currentHighlight.data.stats.combo}x combo. ` +
        `Check out my highlight: ${APP_STATE.currentHighlight.url} #FIGHTHYPEChallenge #BoxingTech`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    trackSocialShare('twitter');
}

function checkForShareLink() {
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
        const shareId = hash.split('=')[1];
        loadShareLink(shareId);
    }
}

function loadShareLink(shareId) {
    const shareData = DB.getShareLink(shareId);
    if (shareData) {
        // Show a view of the shared highlight
        showSharedHighlight(shareData);
    } else {
        showError('Share link not found or expired');
    }
}

function showSharedHighlight(shareData) {
    // Create a simple view to show the shared highlight
    const html = `
        <div class="shared-highlight-view">
            <div class="shared-header">
                <h2>🥊 SHARED HIGHLIGHT</h2>
                <p>Session: ${shareData.sessionId}</p>
            </div>
            <div class="shared-stats">
                <div class="shared-stat">
                    <span class="stat-label">POWER</span>
                    <span class="stat-value" style="color: #00ff9d;">${shareData.stats.power}%</span>
                </div>
                <div class="shared-stat">
                    <span class="stat-label">STRIKES</span>
                    <span class="stat-value">${shareData.stats.strikes}</span>
                </div>
                <div class="shared-stat">
                    <span class="stat-label">COMBO</span>
                    <span class="stat-value" style="color: #ff0055;">x${shareData.stats.combo}</span>
                </div>
                <div class="shared-stat">
                    <span class="stat-label">MODE</span>
                    <span class="stat-value">${shareData.stats.mode.toUpperCase()}</span>
                </div>
            </div>
            <div class="shared-details">
                <p><strong>Peak Power:</strong> ${shareData.stats.peakPower}%</p>
                <p><strong>Accuracy:</strong> ${shareData.stats.accuracy}%</p>
                <p><strong>Strike Speed:</strong> ${shareData.stats.speed} KM/H</p>
                <p><strong>Defense Rating:</strong> ${shareData.stats.defenseRating}%</p>
                <p><strong>Reaction Time:</strong> ${shareData.stats.reactionTime}s</p>
            </div>
            <div class="shared-actions">
                <button onclick="switchView('upload')" class="nav-btn">
                    🥊 CREATE YOUR OWN
                </button>
                <button onclick="shareToCommunityFromHighlight('${shareData.id}')" class="share-btn community">
                    🌐 SHARE TO COMMUNITY
                </button>
            </div>
        </div>
    `;
    
    // Create a modal or replace content to show this
    const container = document.createElement('div');
    container.className = 'shared-container';
    container.innerHTML = html;
    
    // You could show this in a modal or replace the current view
    document.body.appendChild(container);
    // For now, we'll just show an alert with the stats
    alert(`Shared Highlight:\n\nSession: ${shareData.sessionId}\nPower: ${shareData.stats.power}%\nStrikes: ${shareData.stats.strikes}\nCombo: x${shareData.stats.combo}\nMode: ${shareData.stats.mode}`);
}

// ===== COMMUNITY FEATURES =====
function loadCommunityHighlights() {
    elements.communityGrid.innerHTML = '<div class="loading-community"><div class="loader-ring"></div><p>Loading community highlights...</p></div>';
    
    // Simulate loading delay
    setTimeout(() => {
        const highlights = DB.getHighlights();
        
        if (highlights.length === 0) {
            elements.communityGrid.innerHTML = `
                <div class="empty-community">
                    <div style="font-size: 4rem; margin-bottom: 20px;">🥊</div>
                    <h3>No Highlights Yet</h3>
                    <p>Be the first to share your training highlights!</p>
                    <button onclick="switchView('upload')" class="nav-btn" style="margin-top: 20px;">
                        CREATE YOUR FIRST HIGHLIGHT
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        highlights.forEach((highlight, index) => {
            html += `
                <div class="community-card">
                    <div class="community-card-header">
                        <span class="community-session">${highlight.sessionId}</span>
                        <span class="community-time">${formatTimeAgo(highlight.timestamp)}</span>
                    </div>
                    <div class="community-card-preview">
                        <div class="community-stats">
                            <div class="community-stat">
                                <span class="stat-label">POWER</span>
                                <span class="stat-value" style="color: #00ff9d;">${highlight.power}%</span>
                            </div>
                            <div class="community-stat">
                                <span class="stat-label">STRIKES</span>
                                <span class="stat-value">${highlight.strikes}</span>
                            </div>
                            <div class="community-stat">
                                <span class="stat-label">COMBO</span>
                                <span class="stat-value" style="color: #ff0055;">x${highlight.combo}</span>
                            </div>
                        </div>
                        <div class="community-mode">
                            <span class="mode-badge">${highlight.mode.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="community-card-footer">
                        <div class="community-user">
                            <span class="user-icon">🥊</span>
                            <span class="user-name">${highlight.username || 'Fighter'}</span>
                        </div>
                        <button onclick="viewCommunityHighlight(${index})" class="view-btn">
                            VIEW DETAILS
                        </button>
                    </div>
                </div>
            `;
        });
        
        elements.communityGrid.innerHTML = html;
    }, 500);
}

function shareToCommunity() {
    const username = prompt('Enter your fighter name (optional):') || 'Fighter';
    
    const highlight = {
        sessionId: APP_STATE.sessionId,
        timestamp: Date.now(),
        power: Math.round(APP_STATE.currentPower),
        strikes: APP_STATE.punchCount,
        combo: APP_STATE.comboCount,
        mode: APP_STATE.trainingMode,
        username: username,
        image: generateCommunityPreviewImage()
    };
    
    if (DB.saveHighlight(highlight)) {
        showToast('Highlight shared to community!');
        if (APP_STATE.currentView === 'community') {
            loadCommunityHighlights();
        }
    } else {
        showToast('Error sharing to community. Please try again.');
    }
}

function generateCommunityPreviewImage() {
    // In a real app, this would generate a thumbnail
    // For demo purposes, we'll return a data URL with stats
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 400;
    canvas.height = 200;
    
    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add stats
    ctx.font = 'bold 30px Orbitron';
    ctx.fillStyle = '#00ff9d';
    ctx.textAlign = 'center';
    ctx.fillText(`POWER: ${Math.round(APP_STATE.currentPower)}%`, canvas.width / 2, 80);
    
    ctx.font = '25px Teko';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${APP_STATE.punchCount} STRIKES`, canvas.width / 2, 120);
    ctx.fillText(`x${APP_STATE.comboCount} COMBO`, canvas.width / 2, 150);
    
    // Add session ID
    ctx.font = '15px Orbitron';
    ctx.fillStyle = '#888888';
    ctx.fillText(APP_STATE.sessionId, canvas.width / 2, 180);
    
    return canvas.toDataURL('image/jpeg', 0.8);
}

function viewCommunityHighlight(index) {
    const highlights = DB.getHighlights();
    if (highlights[index]) {
        const highlight = highlights[index];
        alert(`Highlight Details:\n\nSession: ${highlight.sessionId}\nPower: ${highlight.power}%\nStrikes: ${highlight.strikes}\nCombo: x${highlight.combo}\nMode: ${highlight.mode}\nUser: ${highlight.username || 'Anonymous'}`);
    }
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// ===== SHARING & DOWNLOAD =====
function generateHighlight() {
    showToast('Generating highlight reel...');
    
    try {
        // Create canvas for the highlight
        const canvas = document.createElement('canvas');
        const video = elements.video;
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        
        // Draw current video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add stats overlay
        addHighlightOverlay(ctx, canvas.width, canvas.height);
        
        // Convert to data URL and download
        const dataURL = canvas.toDataURL('image/jpeg', 0.9);
        downloadFile(dataURL, `FIGHTHYPE-${APP_STATE.sessionId}.jpg`);
        
        // Track contest entry
        trackContestEntry();
        
        showToast('Highlight reel downloaded!');
        
        // Show share options
        setTimeout(() => {
            showShareOptions();
        }, 1000);
        
    } catch (error) {
        console.error('Error generating highlight:', error);
        showToast('Error generating highlight. Please try again.');
    }
}

function downloadImage() {
    // Create a simpler shareable image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1200;
    canvas.height = 630; // Social media optimized size
    
    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#00ff9d');
    gradient.addColorStop(1, '#00e5ff');
    
    // Title
    ctx.font = 'bold 80px Orbitron';
    ctx.fillStyle = gradient;
    ctx.textAlign = 'center';
    ctx.fillText('FIGHTHYPE AI', canvas.width / 2, 150);
    
    // Stats
    ctx.font = '50px Teko';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`POWER: ${Math.round(APP_STATE.currentPower)}%`, canvas.width / 2, 280);
    ctx.fillText(`STRIKES: ${APP_STATE.punchCount}`, canvas.width / 2, 350);
    ctx.fillText(`COMBO: x${APP_STATE.comboCount}`, canvas.width / 2, 420);
    
    // Contest info
    ctx.font = '30px Oswald';
    ctx.fillStyle = '#ff0055';
    ctx.fillText('#FIGHTHYPEChallenge', canvas.width / 2, 520);
    
    // Website
    ctx.font = '20px Orbitron';
    ctx.fillStyle = '#888888';
    ctx.fillText('fighthype.ai', canvas.width / 2, 580);
    
    // Download
    const dataURL = canvas.toDataURL('image/png');
    downloadFile(dataURL, `FIGHTHYPE-Shared-${APP_STATE.sessionId}.png`);
    
    trackContestEntry();
    showToast('Share image downloaded!');
}

function addHighlightOverlay(ctx, width, height) {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    // Border
    ctx.strokeStyle = '#00ff9d';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    
    // Title
    ctx.font = 'bold 60px Orbitron';
    ctx.fillStyle = '#00ff9d';
    ctx.textAlign = 'center';
    ctx.fillText('FIGHTHYPE AI HIGHLIGHT', width / 2, 100);
    
    // Session ID
    ctx.font = '30px Teko';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`SESSION ${APP_STATE.sessionId}`, width / 2, 150);
    
    // Stats grid
    const stats = [
        { label: 'TOTAL STRIKES', value: APP_STATE.punchCount, color: '#ffffff' },
        { label: 'POWER LEVEL', value: `${Math.round(APP_STATE.currentPower)}%`, color: '#00ff9d' },
        { label: 'MAX COMBO', value: `x${APP_STATE.maxCombo}`, color: '#ff0055' },
        { label: 'ACCURACY', value: `${APP_STATE.strikeAccuracy}%`, color: '#ffffff' },
        { label: 'STRIKE SPEED', value: `${elements.hudSpeed.textContent} KM/H`, color: '#00e5ff' },
        { label: 'REACTION TIME', value: `${APP_STATE.reactionTime.toFixed(1)}s`, color: '#00ff9d' }
    ];
    
    const startX = width / 2 - 250;
    const startY = 200;
    
    stats.forEach((stat, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = startX + (col * 500);
        const y = startY + (row * 100);
        
        ctx.font = '20px Oswald';
        ctx.fillStyle = '#888888';
        ctx.textAlign = 'left';
        ctx.fillText(stat.label, x, y);
        
        ctx.font = 'bold 40px Teko';
        ctx.fillStyle = stat.color;
        ctx.fillText(stat.value, x, y + 50);
    });
    
    // Contest info
    ctx.font = 'bold 40px Orbitron';
    ctx.fillStyle = '#ff0055';
    ctx.textAlign = 'center';
    ctx.fillText('#FIGHTHYPEChallenge', width / 2, height - 80);
    
    // Website
    ctx.font = '20px Orbitron';
    ctx.fillStyle = '#888888';
    ctx.fillText('fighthype.ai', width / 2, height - 30);
}

function downloadFile(dataURL, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== SOCIAL SHARING =====
function showShareOptions() {
    // Use the new share link modal
    showShareLinkModal();
}

function closeModal() {
    elements.shareModal.classList.remove('active');
}

function shareToInstagram() {
    // Instagram doesn't allow direct sharing from web, so we guide the user
    window.open('https://www.instagram.com/', '_blank');
    showToast('Upload your downloaded image to Instagram Stories! Use #FIGHTHYPEChallenge');
    trackSocialShare('instagram');
}

function shareToTikTok() {
    window.open('https://www.tiktok.com/upload?lang=en', '_blank');
    showToast('Upload as TikTok video with #FIGHTHYPEChallenge in caption!');
    trackSocialShare('tiktok');
}

function shareToTwitter() {
    const text = encodeURIComponent(
        `Just scored ${Math.round(APP_STATE.currentPower)}% power on @FightHypeAI! ` +
        `${APP_STATE.punchCount} strikes with ${APP_STATE.comboCount}x combo. ` +
        `Try it yourself! #FIGHTHYPEChallenge #BoxingTech`
    );
    const url = encodeURIComponent('https://fighthype.ai');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    trackSocialShare('twitter');
}

function trackContestEntry() {
    APP_STATE.contestEntries++;
    localStorage.setItem('fh_contest_entries', APP_STATE.contestEntries.toString());
}

function trackSocialShare(platform) {
    // Basic tracking (in production, use analytics)
    console.log(`Shared to ${platform}`, {
        session: APP_STATE.sessionId,
        power: APP_STATE.currentPower,
        strikes: APP_STATE.punchCount,
        timestamp: Date.now()
    });
    
    showToast('✅ Shared! You are entered in the contest.');
}

// ===== APP CONTROLS =====
function resetApp() {
    // Clear any errors
    clearError();
    
    // Reset error flag
    APP_STATE.videoErrorOccurred = false;
    
    // Clean up video URL to prevent memory leaks
    if (APP_STATE.videoUrl) {
        try {
            URL.revokeObjectURL(APP_STATE.videoUrl);
        } catch (e) {
            console.log('Error revoking URL during reset:', e);
        }
        APP_STATE.videoUrl = null;
    }
    
    // Stop video
    elements.video.pause();
    elements.video.src = '';
    elements.video.load();
    
    // Reset file input
    elements.fileInput.value = '';
    APP_STATE.videoFile = null;
    
    // Reset state
    APP_STATE.isPlaying = false;
    APP_STATE.punchCount = 0;
    APP_STATE.currentPower = 0;
    APP_STATE.peakPower = 0;
    APP_STATE.avgPower = 0;
    APP_STATE.comboCount = 0;
    APP_STATE.maxCombo = 0;
    APP_STATE.strikeAccuracy = 0;
    
    // Clear session from localStorage
    localStorage.removeItem(DB.SESSIONS_KEY);
    
    // Reset UI elements
    elements.playBtn.textContent = "⏵";
    elements.muteBtn.textContent = "🔊";
    
    // Switch to upload view
    switchView('upload');
}

// ===== UTILITIES =====
function showToast(message, duration = 3000) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, duration);
}

// ===== ERROR HANDLING =====
window.addEventListener('error', function(event) {
    console.error('App error:', event.error);
    // Don't show toast for general errors to avoid spam
});

// ===== OFFLINE SUPPORT =====
window.addEventListener('online', () => {
    showToast('Back online!');
});

window.addEventListener('offline', () => {
    showToast('You are offline. Some features may not work.');
});

// ===== PWA SUPPORT =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}
