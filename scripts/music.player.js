/**
 * Music Player Integration v3.7 - Weihnachtliche Soundkulisse für Rätsel Winter 2025
 * Copilot Jason v3.7 - Logic & Music Integrator
 */

'use strict';

/**
 * Weihnachtlicher Music Player mit adaptiven Sound-Features
 */
class ChristmasMusicPlayer {
    constructor() {
        this.isInitialized = false;
        this.currentTrack = null;
        this.playlist = new Map();
        this.audioContext = null;
        this.gainNode = null;
        
        // Konfiguration
        this.config = {
            volume: 0.7,
            fadeTime: 2000,
            autoPlay: false,
            adaptiveVolume: true,
            christmasMode: true
        };

        // Event-Handler
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleUserInteraction = this.handleUserInteraction.bind(this);
    }

    /**
     * Initialisiert den Music Player
     */
    async init() {
        try {
            console.log('🎵 Christmas Music Player wird initialisiert...');

            // Audio Context erstellen (nach User-Interaktion)
            this.setupEventListeners();

            // Weihnachts-Playlist laden
            await this.loadChristmasPlaylist();

            // UI Setup
            this.createMusicControls();

            this.isInitialized = true;
            console.log('✅ Christmas Music Player erfolgreich initialisiert');

        } catch (error) {
            console.error('❌ Fehler bei Music Player Initialisierung:', error);
            throw error;
        }
    }

    /**
     * Lädt die Weihnachts-Playlist
     */
    async loadChristmasPlaylist() {
        const tracks = [
            {
                id: 'ambient_snow',
                name: 'Schnee Ambient',
                url: '/audio/snow-ambient.mp3',
                type: 'ambient',
                loop: true,
                volume: 0.4
            },
            {
                id: 'puzzle_success',
                name: 'Rätsel Erfolgssound',
                url: '/audio/success-chime.mp3', 
                type: 'effect',
                volume: 0.8,
                duration: 2000
            },
            {
                id: 'door_open',
                name: 'Türchen Öffnen',
                url: '/audio/door-open.mp3',
                type: 'effect',
                volume: 0.6,
                duration: 1500
            },
            {
                id: 'christmas_bg',
                name: 'Weihnachtsmelodie',
                url: '/audio/christmas-background.mp3',
                type: 'background',
                loop: true,
                volume: 0.5
            },
            {
                id: 'stage_complete',
                name: 'Stage Komplett',
                url: '/audio/stage-complete.mp3',
                type: 'achievement',
                volume: 0.9,
                duration: 3000
            }
        ];

        for (const track of tracks) {
            this.playlist.set(track.id, track);
        }

        console.log(`🎄 ${tracks.length} Weihnachtstracks geladen`);
    }

    /**
     * Erstellt Music Control UI
     */
    createMusicControls() {
        const existingControls = document.getElementById('music-controls');
        if (existingControls) {
            existingControls.remove();
        }

        const controlsHtml = `
            <div id="music-controls" class="music-controls">
                <button id="music-toggle" class="music-toggle" aria-label="Musik an/aus">
                    🎵
                </button>
                <div class="volume-container">
                    <input type="range" id="volume-slider" class="volume-slider" 
                           min="0" max="100" value="${this.config.volume * 100}"
                           aria-label="Lautstärke">
                    <span class="volume-icon">🔊</span>
                </div>
                <div class="now-playing" id="now-playing" style="display: none;">
                    <span class="track-name"></span>
                </div>
            </div>

            <style>
                .music-controls {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 15px;
                    padding: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    backdrop-filter: blur(10px);
                    border: 2px solid #c41e3a;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 1000;
                    transition: all 0.3s ease;
                }

                .music-controls:hover {
                    background: rgba(255, 255, 255, 0.95);
                    transform: translateY(-2px);
                }

                .music-toggle {
                    background: #c41e3a;
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .music-toggle:hover {
                    background: #a01729;
                    transform: scale(1.1);
                }

                .music-toggle.playing {
                    background: #228b22;
                }

                .volume-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .volume-slider {
                    width: 80px;
                    height: 4px;
                    border-radius: 2px;
                    background: #ddd;
                    outline: none;
                    cursor: pointer;
                }

                .volume-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #c41e3a;
                    cursor: pointer;
                }

                .now-playing {
                    font-size: 12px;
                    color: #666;
                    font-weight: 500;
                    max-width: 120px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .volume-icon {
                    font-size: 14px;
                    opacity: 0.7;
                }

                @media (max-width: 768px) {
                    .music-controls {
                        top: 10px;
                        right: 10px;
                        padding: 8px;
                        gap: 8px;
                    }
                    
                    .volume-slider {
                        width: 60px;
                    }
                    
                    .now-playing {
                        display: none !important;
                    }
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', controlsHtml);
        this.setupControlEventListeners();
    }

    /**
     * Event Listeners für Music Controls
     */
    setupControlEventListeners() {
        const toggleButton = document.getElementById('music-toggle');
        const volumeSlider = document.getElementById('volume-slider');

        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.toggleMusic();
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.setVolume(volume);
            });
        }
    }

    /**
     * Spielt einen Track ab
     */
    async playTrack(trackId, options = {}) {
        if (!this.isInitialized) {
            console.warn('Music Player nicht initialisiert');
            return;
        }

        const track = this.playlist.get(trackId);
        if (!track) {
            console.warn(`Track ${trackId} nicht gefunden`);
            return;
        }

        try {
            // Audio Context erstellen falls nötig
            if (!this.audioContext) {
                await this.initAudioContext();
            }

            // Neues Audio Element erstellen
            const audio = new Audio(track.url);
            audio.volume = (track.volume || 1) * this.config.volume;
            audio.loop = track.loop || false;

            // Event Listeners
            audio.addEventListener('loadstart', () => {
                console.log(`🎵 Lade ${track.name}...`);
            });

            audio.addEventListener('canplaythrough', () => {
                console.log(`✅ ${track.name} bereit`);
                this.updateNowPlaying(track.name);
            });

            audio.addEventListener('ended', () => {
                if (!track.loop) {
                    this.onTrackEnded(trackId);
                }
            });

            audio.addEventListener('error', (e) => {
                console.error(`❌ Fehler beim Laden von ${track.name}:`, e);
            });

            // Abspielen
            await audio.play();
            this.currentTrack = { ...track, audioElement: audio };

            // Auto-Stop für Effect-Sounds
            if (track.type === 'effect' && track.duration) {
                setTimeout(() => {
                    this.stopTrack();
                }, track.duration);
            }

            return audio;

        } catch (error) {
            console.error(`❌ Fehler beim Abspielen von ${track.name}:`, error);
        }
    }

    /**
     * Audio Context initialisieren
     */
    async initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            
            // Unlock Audio Context nach User-Interaktion
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            console.log('🔊 Audio Context initialisiert');
        } catch (error) {
            console.error('❌ Audio Context Fehler:', error);
        }
    }

    /**
     * Musik Toggle
     */
    toggleMusic() {
        const toggleButton = document.getElementById('music-toggle');
        
        if (this.currentTrack && this.currentTrack.audioElement) {
            if (this.currentTrack.audioElement.paused) {
                this.resumeMusic();
                toggleButton?.classList.add('playing');
            } else {
                this.pauseMusic();
                toggleButton?.classList.remove('playing');
            }
        } else {
            // Starte Hintergrundmusik
            this.playTrack('christmas_bg');
            toggleButton?.classList.add('playing');
        }
    }

    /**
     * Musik pausieren
     */
    pauseMusic() {
        if (this.currentTrack?.audioElement) {
            this.currentTrack.audioElement.pause();
        }
    }

    /**
     * Musik fortsetzen
     */
    resumeMusic() {
        if (this.currentTrack?.audioElement) {
            this.currentTrack.audioElement.play();
        }
    }

    /**
     * Track stoppen
     */
    stopTrack() {
        if (this.currentTrack?.audioElement) {
            this.currentTrack.audioElement.pause();
            this.currentTrack.audioElement.currentTime = 0;
            this.currentTrack = null;
            this.updateNowPlaying('');
        }
    }

    /**
     * Lautstärke setzen
     */
    setVolume(volume) {
        this.config.volume = Math.max(0, Math.min(1, volume));
        
        if (this.currentTrack?.audioElement) {
            this.currentTrack.audioElement.volume = this.config.volume * (this.currentTrack.volume || 1);
        }

        if (this.gainNode) {
            this.gainNode.gain.value = this.config.volume;
        }
    }

    /**
     * Now Playing Update
     */
    updateNowPlaying(trackName) {
        const nowPlaying = document.getElementById('now-playing');
        const trackNameEl = nowPlaying?.querySelector('.track-name');
        
        if (trackNameEl) {
            trackNameEl.textContent = trackName;
            nowPlaying.style.display = trackName ? 'block' : 'none';
        }
    }

    /**
     * Track Ende Handler
     */
    onTrackEnded(trackId) {
        console.log(`🎵 Track ${trackId} beendet`);
        this.currentTrack = null;
        this.updateNowPlaying('');
        
        const toggleButton = document.getElementById('music-toggle');
        toggleButton?.classList.remove('playing');
    }

    /**
     * Event Listeners Setup
     */
    setupEventListeners() {
        // Visibility Change für Auto-Pause
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        // User Interaction für Audio Unlock
        document.addEventListener('click', this.handleUserInteraction, { once: true });
        document.addEventListener('touchstart', this.handleUserInteraction, { once: true });
    }

    /**
     * Visibility Change Handler
     */
    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseMusic();
        } else if (this.config.autoPlay) {
            this.resumeMusic();
        }
    }

    /**
     * User Interaction Handler
     */
    async handleUserInteraction() {
        if (!this.audioContext) {
            await this.initAudioContext();
        }
    }

    /**
     * Spezielle Christmas Effects
     */
    playChristmasEffect(effectType) {
        const effectMap = {
            'door_open': 'door_open',
            'puzzle_success': 'puzzle_success', 
            'stage_complete': 'stage_complete'
        };

        const trackId = effectMap[effectType];
        if (trackId) {
            this.playTrack(trackId);
        }
    }

    /**
     * Adaptive Volume basierend auf Tageszeit
     */
    updateAdaptiveVolume() {
        if (!this.config.adaptiveVolume) return;

        const now = new Date();
        const hour = now.getHours();

        let adaptiveVolume = 1;

        // Leiser in der Nacht (22-6 Uhr)
        if (hour >= 22 || hour <= 6) {
            adaptiveVolume = 0.3;
        }
        // Moderater am Morgen (6-9 Uhr)
        else if (hour <= 9) {
            adaptiveVolume = 0.6;
        }
        // Normal am Tag (9-22 Uhr)
        else {
            adaptiveVolume = 0.8;
        }

        this.setVolume(adaptiveVolume);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopTrack();
        
        if (this.audioContext) {
            this.audioContext.close();
        }

        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        const controls = document.getElementById('music-controls');
        if (controls) {
            controls.remove();
        }

        console.log('🎵 Christmas Music Player cleanup durchgeführt');
    }
}

// Export für Modulverwendung
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChristmasMusicPlayer;
}

// Global verfügbar machen
window.ChristmasMusicPlayer = ChristmasMusicPlayer;

console.log('🎵 ChristmasMusicPlayer v3.7 geladen - Ready for Christmas Magic!');