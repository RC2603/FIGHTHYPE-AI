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
    punchTimestamps: [],
    powerScores: [],
    lastPunchTime: 0,
    reactionTimes: [],
    communityHighlights: [],
    contestEntries: 0,
    videoErrorOccurred: false,
    shareLinks: {},
    currentHighlight: null,
    sessionId: null
};

// ===== DATABASE =====
const DB = {
    COMMUNITY_KEY: 'fighthype_community',
    SESSIONS_KEY: 'fighthype_sessions',
    SHARE_LINKS_KEY: 'fighthype_share_links',
    
    saveHighlight: function(highlight) {
        try {
            const highlights = this.getHighlights();
            highlights.unshift(highlight);
            if (highlights.length > 50) highlights.pop();
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
    }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 1000);
});

function initializeApp() {
    APP_STATE.contestEntries = parseInt(localStorage.getItem('fh_contest_entries') || '0');
    APP_STATE.communityHighlights = DB.getHighlights();
    APP_STATE.shareLinks = DB.getShareLinks();
    
    setupEventListeners();
    setupModeButtons();
    generateSessionId();
    
    if (window.location.hash === '#community') showCommunity();
}

function setupEventListeners() {
    document.getElementById('file-input').addEventListener('change', handleFileSelect);
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleFileDrop);
    
    const video = document.getElementById('main-video');
    video.addEventListener('loadeddata', handleVideoLoaded);
    video.addEventListener('canplay', handleVideoCanPlay);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('play', () => {
        APP_STATE.isPlaying = true;
        document.getElementById('play-btn').textContent = "⏸";
    });
    video.addEventListener('pause', () => {
        APP_STATE.isPlaying = false;
        document.getElementById('play-btn').textContent = "⏵";
    });
    video.addEventListener('timeupdate', updateRealTimeStats);
    
    document.getElementById('sound-toggle').addEventListener('click', toggleSound);
}

function setupModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            APP_STATE.trainingMode = btn.dataset.mode;
            generateStats();
        });
    });
}

// ===== VIEW MANAGEMENT =====
function switchView(viewName) {
    if (APP_STATE.currentView === 'editor' && viewName !== 'editor') {
        pauseVideo();
    }
    
    document.querySelectorAll('.view').forEach(view => {
        if (view) view.classList.remove('active');
    });
    
    const targetView = document.getElementById(viewName + '-view');
    if (targetView) {
        targetView.classList.add('active');
        APP_STATE.currentView = viewName;
        
        if (viewName === 'community') {
            loadCommunityHighlights();
        }
    }
}

function pauseVideo() {
    const video = document.getElementById('main-video');
    if (video && !video.paused) {
        video.pause();
        APP_STATE.isPlaying = false;
        document.getElementById('play-btn').textContent = "⏵";
    }
}

function showCommunity() {
    switchView('community');
}

// ===== ERROR HANDLING =====
function showError(message, duration = 4000) {
    const errorEl = document.getElementById('error-message');
    if (!errorEl) {
        const newError = document.createElement('div');
        newError.id = 'error-message';
        newError.className = 'error-message';
        document.body.appendChild(newError);
    }
    
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, duration);
}

function clearError() {
    const errorEl = document.getElementById('error-message');
    if (errorEl) errorEl.classList.remove('show');
}

// ===== FILE HANDLING =====
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
}

function handleDragOver(event) {
    event.preventDefault();
    document.getElementById('drop-zone').classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-over');
}

function handleFileDrop(event) {
    event.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-over');
    const file = event.dataTransfer.files[0];
    if (file) processFile(file);
}

function processFile(file) {
    clearError();
    APP_STATE.videoErrorOccurred = false;
    
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!validTypes.some(type => file.type.includes(type.replace('video/', '')))) {
        showError('Please upload MP4, MOV, or WEBM format');
        return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
        showError('File too large. Max 100MB');
        return;
    }
    
    if (APP_STATE.videoUrl) {
        URL.revokeObjectURL(APP_STATE.videoUrl);
        APP_STATE.videoUrl = null;
    }
    
    APP_STATE.videoFile = file;
    
    try {
        APP_STATE.videoUrl = URL.createObjectURL(file);
        startProcessing();
    } catch (error) {
        showError('Error processing video');
        switchView('upload');
    }
}

// ===== VIDEO EVENTS =====
function handleVideoLoaded() {
    APP_STATE.videoErrorOccurred = false;
    const duration = document.getElementById('main-video').duration || 60;
    generatePunchTimestamps(duration);
    resetStats();
}

function handleVideoCanPlay() {
    APP_STATE.videoErrorOccurred = false;
}

function handleVideoError(event) {
    console.error('Video error:', event);
    
    if (!APP_STATE.videoErrorOccurred) {
        APP_STATE.videoErrorOccurred = true;
        const video = document.getElementById('main-video');
        
        if (video.error) {
            switch(video.error.code) {
                case 3: // MEDIA_ERR_DECODE
                case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                    showError('Video format not supported. Please try MP4 format.');
                    break;
                default:
                    showError('Error playing video.');
            }
        }
    }
}

function handleVideoEnded() {
    resetStats();
    document.getElementById('play-btn').textContent = "⏵";
}

function restartVideo() {
    const video = document.getElementById('main-video');
    if (!video.src || APP_STATE.videoErrorOccurred) return;
    
    resetStats();
    
    try {
        video.currentTime = 0;
        video.play().catch(e => {
            if (e.name !== 'NotAllowedError') {
                showToast('Click play to start video');
            }
        });
        document.getElementById('play-btn').textContent = "⏸";
    } catch (error) {
        console.error('Error restarting video:', error);
    }
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
    
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    const interval = setInterval(() => {
        progress += 2;
        progressFill.style.width = `${progress}%`;
        
        const stepIndex = Math.floor((progress / 100) * steps.length);
        if (steps[stepIndex]) {
            progressText.textContent = steps[stepIndex];
        }
        
        if (progress >= 100) {
            clearInterval(interval);
            finishProcessing();
        }
    }, 60);
}

function finishProcessing() {
    generateStats();
    
    const video = document.getElementById('main-video');
    video.pause();
    APP_STATE.videoErrorOccurred = false;
    
    if (APP_STATE.videoUrl) {
        video.src = APP_STATE.videoUrl;
        video.load();
        video.crossOrigin = 'anonymous';
    } else {
        showError('Video URL not available');
        switchView('upload');
        return;
    }
    
    switchView('editor');
    
    setTimeout(() => {
        if (video.src) {
            video.play().catch(e => {
                document.getElementById('play-btn').textContent = "⏵";
            });
        }
    }, 500);
}

// ===== STATS =====
function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    APP_STATE.sessionId = `FH${id}`;
    document.getElementById('session-id').textContent = `SESSION #${APP_STATE.sessionId}`;
}

function generateStats() {
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
    
    switch (APP_STATE.trainingMode) {
        case 'shadow':
            APP_STATE.totalPunches = Math.floor(Math.random() * 80 + 40);
            APP_STATE.defenseRating = Math.floor(Math.random() * 30 + 60);
            break;
        case 'bag':
            APP_STATE.totalPunches = Math.floor(Math.random() * 100 + 100);
            APP_STATE.defenseRating = Math.floor(Math.random() * 30 + 50);
            break;
        case 'pads':
            APP_STATE.totalPunches = Math.floor(Math.random() * 90 + 60);
            APP_STATE.defenseRating = Math.floor(Math.random() * 25 + 70);
            break;
        case 'spar':
            APP_STATE.totalPunches = Math.floor(Math.random() * 70 + 30);
            APP_STATE.defenseRating = Math.floor(Math.random() * 45 + 40);
            break;
    }
    
    document.getElementById('defense-rating').textContent = `${APP_STATE.defenseRating}%`;
    document.getElementById('stamina').textContent = "100%";
    document.getElementById('intensity').textContent = "Low";
    document.getElementById('reaction-time').textContent = "0.0s";
    document.getElementById('total-strikes').textContent = "0";
    document.getElementById('strike-accuracy').textContent = "0%";
    document.getElementById('max-combo').textContent = "x0";
    
    generateSessionId();
}

function generatePunchTimestamps(duration) {
    APP_STATE.punchTimestamps = [];
    for (let i = 0; i < APP_STATE.totalPunches; i++) {
        APP_STATE.punchTimestamps.push(Math.random() * duration);
    }
    APP_STATE.punchTimestamps.sort((a, b) => a - b);
}

function resetStats() {
    APP_STATE.punchCount = 0;
    APP_STATE.currentPower = 0;
    APP_STATE.comboCount = 0;
    APP_STATE.lastPunchTime = 0;
    APP_STATE.reactionTimes = [];
    APP_STATE.powerScores = [];
    
    document.getElementById('hud-punches').textContent = '0';
    document.getElementById('hud-combo').textContent = 'x1';
    document.getElementById('hud-power').textContent = '0%';
    
    updatePowerMeter(0);
    document.getElementById('total-strikes').textContent = '0';
    document.getElementById('strike-accuracy').textContent = '0%';
    document.getElementById('max-combo').textContent = 'x0';
    document.getElementById('stamina').textContent = '100%';
    document.getElementById('intensity').textContent = 'Low';
    document.getElementById('reaction-time').textContent = '0.0s';
}

// ===== REAL-TIME UPDATES =====
function updateRealTimeStats() {
    if (!APP_STATE.isPlaying) return;
    
    const currentTime = document.getElementById('main-video').currentTime;
    const baseSpeed = APP_STATE.trainingMode === 'spar' ? 65 : 
                     APP_STATE.trainingMode === 'pads' ? 55 : 
                     APP_STATE.trainingMode === 'bag' ? 45 : 35;
    
    const wave = Math.sin(currentTime * 2);
    const variance = wave * 15;
    const noise = (Math.random() * 6) - 3;
    const liveSpeed = Math.max(0, Math.floor(baseSpeed + variance + noise));
    
    document.getElementById('hud-speed').textContent = liveSpeed;
    document.getElementById('strike-speed').textContent = `${liveSpeed} KM/H`;
    
    const punchesSoFar = APP_STATE.punchTimestamps.filter(t => t <= currentTime).length;
    
    if (punchesSoFar > APP_STATE.punchCount) {
        handlePunch(punchesSoFar, currentTime);
    }
    
    if (APP_STATE.totalPunches > 0) {
        APP_STATE.strikeAccuracy = Math.min(100, Math.floor((APP_STATE.punchCount / APP_STATE.totalPunches) * 100));
        document.getElementById('strike-accuracy').textContent = `${APP_STATE.strikeAccuracy}%`;
    }
    
    const staminaLoss = (currentTime / (document.getElementById('main-video').duration || 60)) * 100;
    APP_STATE.stamina = Math.max(20, 100 - staminaLoss);
    document.getElementById('stamina').textContent = `${Math.round(APP_STATE.stamina)}%`;
    
    if (APP_STATE.comboCount >= 8) {
        APP_STATE.intensity = "Extreme";
    } else if (APP_STATE.comboCount >= 5) {
        APP_STATE.intensity = "High";
    } else if (APP_STATE.comboCount >= 3) {
        APP_STATE.intensity = "Medium";
    } else {
        APP_STATE.intensity = "Low";
    }
    document.getElementById('intensity').textContent = APP_STATE.intensity;
    
    if (APP_STATE.reactionTimes.length > 0) {
        const avgReaction = APP_STATE.reactionTimes.reduce((a, b) => a + b, 0) / APP_STATE.reactionTimes.length;
        APP_STATE.reactionTime = avgReaction;
        document.getElementById('reaction-time').textContent = `${avgReaction.toFixed(1)}s`;
    }
}

function handlePunch(punchesSoFar, currentTime) {
    APP_STATE.punchCount = punchesSoFar;
    const timeSinceLastPunch = currentTime - APP_STATE.lastPunchTime;
    
    if (timeSinceLastPunch < 2.0) {
        APP_STATE.comboCount++;
        if (APP_STATE.comboCount > APP_STATE.maxCombo) {
            APP_STATE.maxCombo = APP_STATE.comboCount;
            document.getElementById('max-combo').textContent = `x${APP_STATE.maxCombo}`;
        }
    } else {
        APP_STATE.comboCount = 1;
    }
    
    APP_STATE.reactionTimes.push(timeSinceLastPunch);
    APP_STATE.lastPunchTime = currentTime;
    
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
    
    if (calculatedPower > APP_STATE.peakPower) {
        APP_STATE.peakPower = calculatedPower;
        document.getElementById('peak-power').textContent = Math.round(APP_STATE.peakPower);
    }
    
    APP_STATE.avgPower = Math.floor(APP_STATE.powerScores.reduce((a, b) => a + b, 0) / APP_STATE.powerScores.length);
    document.getElementById('avg-power').textContent = Math.round(APP_STATE.avgPower);
    
    updatePowerMeter(calculatedPower);
    triggerPunchEffects();
    
    document.getElementById('hud-punches').textContent = APP_STATE.punchCount;
    document.getElementById('hud-combo').textContent = `x${APP_STATE.comboCount}`;
    document.getElementById('total-strikes').textContent = APP_STATE.punchCount;
    
    playPunchSound();
}

function updatePowerMeter(power) {
    const powerPercent = Math.min(100, Math.max(0, power));
    
    document.getElementById('power-fill').style.width = `${powerPercent}%`;
    document.getElementById('power-indicator').style.left = `calc(${powerPercent}% - 8px)`;
    document.getElementById('current-power-value').textContent = `${Math.round(powerPercent)}%`;
    document.getElementById('current-power').textContent = Math.round(powerPercent);
    document.getElementById('hud-power').textContent = `${Math.round(powerPercent)}%`;
}

function triggerPunchEffects() {
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
    
    document.querySelectorAll('.hit-zone').forEach(zone => {
        zone.classList.add('active');
        setTimeout(() => zone.classList.remove('active'), 500);
    });
    
    const videoStage = document.getElementById('video-stage');
    videoStage.style.filter = 'hue-rotate(90deg)';
    setTimeout(() => videoStage.style.filter = '', 100);
}

// ===== AUDIO =====
function playPunchSound() {
    if (APP_STATE.isMuted) return;
    
    try {
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
        console.log("Audio not supported");
    }
}

// ===== CONTROLS =====
function toggleSound() {
    APP_STATE.isMuted = !APP_STATE.isMuted;
    document.getElementById('main-video').muted = APP_STATE.isMuted;
    
    const soundBtn = document.getElementById('sound-toggle');
    if (APP_STATE.isMuted) {
        soundBtn.textContent = "🔇 MUTED";
        soundBtn.style.color = "#ff0055";
    } else {
        soundBtn.textContent = "🔊 SOUND";
        soundBtn.style.color = "";
    }
}

function togglePlay() {
    const video = document.getElementById('main-video');
    if (!video.src || APP_STATE.videoErrorOccurred) return;
    
    if (video.paused) {
        video.play().catch(e => {
            if (e.name !== 'NotAllowedError') {
                showError('Error playing video');
            }
        });
        document.getElementById('play-btn').textContent = "⏸";
    } else {
        video.pause();
        document.getElementById('play-btn').textContent = "⏵";
    }
}

function toggleMute() {
    APP_STATE.isMuted = !APP_STATE.isMuted;
    const video = document.getElementById('main-video');
    video.muted = APP_STATE.isMuted;
    
    const muteBtn = document.getElementById('mute-btn');
    if (APP_STATE.isMuted) {
        muteBtn.textContent = "🔇";
        muteBtn.style.color = "#ff0055";
    } else {
        muteBtn.textContent = "🔊";
        muteBtn.style.color = "";
    }
}

function toggleRobot() {
    APP_STATE.showRobot = !APP_STATE.showRobot;
    const robot = document.getElementById('robot-overlay');
    
    if (APP_STATE.showRobot) {
        robot.style.opacity = '0.8';
        document.getElementById('robot-btn').classList.add('active');
    } else {
        robot.style.opacity = '0';
        document.getElementById('robot-btn').classList.remove('active');
    }
}

function toggleHud() {
    APP_STATE.showHud = !APP_STATE.showHud;
    const hudElements = document.querySelectorAll('.hud-container');
    
    hudElements.forEach(el => {
        el.style.opacity = APP_STATE.showHud ? '1' : '0';
    });
    
    document.getElementById('hud-btn').classList.toggle('active');
}

function toggleFit() {
    const video = document.getElementById('main-video');
    if (video.style.objectFit === 'contain') {
        video.style.objectFit = 'cover';
    } else {
        video.style.objectFit = 'contain';
    }
}

// ===== SHARE SYSTEM =====
function generateShareLink() {
    const shareId = 'SH' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
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
            speed: document.getElementById('hud-speed').textContent,
            mode: APP_STATE.trainingMode,
            peakPower: APP_STATE.peakPower,
            avgPower: APP_STATE.avgPower,
            defenseRating: APP_STATE.defenseRating,
            reactionTime: APP_STATE.reactionTime,
            stamina: APP_STATE.stamina,
            intensity: APP_STATE.intensity
        }
    };
    
    DB.saveShareLink(shareId, shareData);
    
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#share=${shareId}`;
    
    return {
        url: shareUrl,
        id: shareId,
        data: shareData
    };
}

function showShareLinkModal() {
    const shareInfo = generateShareLink();
    APP_STATE.currentHighlight = shareInfo;
    
    document.getElementById('share-preview').innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; margin-bottom: 10px;">🥊</div>
            <h3 style="margin-bottom: 10px;">Your FIGHTHYPE Highlight</h3>
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
    
    document.getElementById('share-modal').classList.add('active');
}

function copyShareLink() {
    const input = document.getElementById('share-link-input');
    if (input) {
        input.select();
        
        try {
            navigator.clipboard.writeText(input.value).then(() => {
                showToast('Link copied!');
            }).catch(() => {
                document.execCommand('copy');
                showToast('Link copied!');
            });
        } catch (error) {
            input.select();
            document.execCommand('copy');
            showToast('Link copied!');
        }
    }
}

// ===== COMMUNITY =====
function loadCommunityHighlights() {
    const grid = document.getElementById('community-grid');
    grid.innerHTML = '<div class="loading-community"><div class="loader-ring"></div><p>Loading community highlights...</p></div>';
    
    setTimeout(() => {
        const highlights = DB.getHighlights();
        
        if (highlights.length === 0) {
            grid.innerHTML = `
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
        
        grid.innerHTML = html;
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
        username: username
    };
    
    if (DB.saveHighlight(highlight)) {
        showToast('Shared to community!');
        if (APP_STATE.currentView === 'community') {
            loadCommunityHighlights();
        }
    } else {
        showToast('Error sharing');
    }
}

function viewCommunityHighlight(index) {
    const highlights = DB.getHighlights();
    if (highlights[index]) {
        const highlight = highlights[index];
        alert(`Highlight:\n\nSession: ${highlight.sessionId}\nPower: ${highlight.power}%\nStrikes: ${highlight.strikes}\nCombo: x${highlight.combo}\nMode: ${highlight.mode}\nUser: ${highlight.username || 'Anonymous'}`);
    }
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// ===== UTILITIES =====
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ===== APP CONTROLS =====
function resetApp() {
    clearError();
    APP_STATE.videoErrorOccurred = false;
    
    if (APP_STATE.videoUrl) {
        URL.revokeObjectURL(APP_STATE.videoUrl);
        APP_STATE.videoUrl = null;
    }
    
    const video = document.getElementById('main-video');
    video.pause();
    video.src = '';
    video.load();
    
    document.getElementById('file-input').value = '';
    APP_STATE.videoFile = null;
    
    APP_STATE.isPlaying = false;
    APP_STATE.punchCount = 0;
    APP_STATE.currentPower = 0;
    APP_STATE.peakPower = 0;
    APP_STATE.avgPower = 0;
    APP_STATE.comboCount = 0;
    APP_STATE.maxCombo = 0;
    APP_STATE.strikeAccuracy = 0;
    
    document.getElementById('play-btn').textContent = "⏵";
    document.getElementById('mute-btn').textContent = "🔊";
    
    switchView('upload');
}

// ===== EXPORT FUNCTIONS =====
// Make functions available globally
window.switchView = switchView;
window.showCommunity = showCommunity;
window.resetApp = resetApp;
window.togglePlay = togglePlay;
window.restartVideo = restartVideo;
window.toggleMute = toggleMute;
window.toggleRobot = toggleRobot;
window.toggleHud = toggleHud;
window.toggleFit = toggleFit;
window.generateHighlight = function() {
    showToast('Generating highlight...');
    setTimeout(() => showShareLinkModal(), 1000);
};
window.downloadImage = function() {
    showToast('Download feature coming soon!');
};
window.showShareOptions = showShareLinkModal;
window.shareToCommunity = shareToCommunity;
window.closeModal = function() {
    document.getElementById('share-modal').classList.remove('active');
};
window.shareToInstagram = function() {
    window.open('https://www.instagram.com/', '_blank');
    showToast('Upload to Instagram with #FIGHTHYPEChallenge');
};
window.shareToTikTok = function() {
    window.open('https://www.tiktok.com/upload?lang=en', '_blank');
    showToast('Upload to TikTok with #FIGHTHYPEChallenge');
};
window.shareToTwitter = function() {
    const text = encodeURIComponent(`Scored ${Math.round(APP_STATE.currentPower)}% power on @FightHypeAI! #FIGHTHYPEChallenge`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    showToast('Shared to Twitter!');
};
window.loadCommunityHighlights = loadCommunityHighlights;
window.copyShareLink = copyShareLink;

// ===== PWA SUPPORT =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(error => {
            console.log('ServiceWorker failed:', error);
        });
    });
}
