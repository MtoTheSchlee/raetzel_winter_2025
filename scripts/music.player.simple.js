/**
 * Christmas Music Player v3.9 - Simplified Integration
 * Nutzt bestehende HTML-Elemente für Music Controls
 */

'use strict';

class ChristmasMusicPlayer {
    constructor() {
        this.isInitialized = false;
        this.currentAudio = null;
        this.isPlaying = false;
        this.currentTrackIndex = 0;
        
        // Christmas Playlist URLs
        this.playlist = [
            {
                name: "🎄 Weihnachten",
                url: "./music/Weihnachten.mp3.mp3"
            },
            {
                name: "🎵 Rallye Song I", 
                url: "./music/Weihnachtsrally Song .mp3"
            },
            {
                name: "🎶 Rallye Song II",
                url: "./music/Weihnatsrally Song ll .mp3"
            }
        ];

        // DOM-Elemente
        this.playBtn = null;
        this.pauseBtn = null;
        this.trackNameEl = null;
        this.statusEl = null;
        this.volumeSlider = null;
    }

    /**
     * Initialisierung des Players
     */
    async init() {
        try {
            console.log('🎵 Christmas Music Player wird initialisiert...');
            
            // DOM-Elemente finden
            this.setupDOMElements();
            
            // Event Listeners
            this.setupEventListeners();
            
            // Ersten Track vorbereiten
            this.loadTrack(0);
            
            this.isInitialized = true;
            console.log('✅ Christmas Music Player bereit!');
            
        } catch (error) {
            console.error('❌ Music Player Fehler:', error);
        }
    }

    /**
     * DOM-Elemente Setup
     */
    setupDOMElements() {
        this.playBtn = document.getElementById('music-play');
        this.pauseBtn = document.getElementById('music-pause');
        this.trackNameEl = document.getElementById('music-track-name');
        this.statusEl = document.getElementById('music-status');
        this.volumeSlider = document.getElementById('music-volume');

        if (!this.playBtn || !this.pauseBtn) {
            throw new Error('Music Player HTML-Elemente nicht gefunden!');
        }
    }

    /**
     * Event Listeners Setup
     */
    setupEventListeners() {
        // Play Button
        this.playBtn.addEventListener('click', () => {
            this.play();
        });

        // Pause Button  
        this.pauseBtn.addEventListener('click', () => {
            this.pause();
        });

        // Volume Slider
        this.volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });

        // Track Ende -> nächster Track
        document.addEventListener('ended', () => {
            this.nextTrack();
        });
    }

    /**
     * Track laden
     */
    loadTrack(index) {
        if (index >= this.playlist.length) index = 0;
        
        const track = this.playlist[index];
        this.currentTrackIndex = index;
        
        // Alten Audio stoppen falls vorhanden
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // Neuen Audio erstellen
        this.currentAudio = new Audio(track.url);
        this.currentAudio.loop = true;
        this.currentAudio.volume = this.volumeSlider.value / 100;
        
        // UI Update
        this.trackNameEl.textContent = track.name;
        this.statusEl.textContent = 'Bereit';
        
        // Event Listener für Audio
        this.currentAudio.addEventListener('canplay', () => {
            this.statusEl.textContent = 'Geladen';
        });

        this.currentAudio.addEventListener('error', () => {
            this.statusEl.textContent = 'Fehler beim Laden';
            console.error('❌ Fehler beim Laden von:', track.url);
        });

        console.log('🎵 Track geladen:', track.name);
    }

    /**
     * Musik abspielen
     */
    async play() {
        if (!this.currentAudio) {
            this.loadTrack(0);
            return;
        }

        try {
            await this.currentAudio.play();
            this.isPlaying = true;
            
            // UI Update
            this.playBtn.style.display = 'none';
            this.pauseBtn.style.display = 'flex';
            this.statusEl.textContent = '▶️ Spielt';
            
            console.log('🎵 Musik wird abgespielt');
            
        } catch (error) {
            console.error('❌ Fehler beim Abspielen:', error);
            this.statusEl.textContent = 'Fehler beim Abspielen';
        }
    }

    /**
     * Musik pausieren
     */
    pause() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.isPlaying = false;
            
            // UI Update
            this.playBtn.style.display = 'flex';
            this.pauseBtn.style.display = 'none';
            this.statusEl.textContent = '⏸️ Pausiert';
            
            console.log('🎵 Musik pausiert');
        }
    }

    /**
     * Lautstärke setzen
     */
    setVolume(volume) {
        if (this.currentAudio) {
            this.currentAudio.volume = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Nächster Track
     */
    nextTrack() {
        const nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        this.loadTrack(nextIndex);
        
        if (this.isPlaying) {
            // Automatisch weiterspielen falls Musik lief
            setTimeout(() => this.play(), 100);
        }
    }

    /**
     * User-freundliche Error Behandlung
     */
    handleAudioError(error) {
        console.error('🎵 Audio Error:', error);
        this.statusEl.textContent = 'Musik nicht verfügbar';
        
        // Fallback: nächster Track versuchen
        setTimeout(() => {
            this.nextTrack();
        }, 2000);
    }
}

// Global verfügbar machen
window.ChristmasMusicPlayer = ChristmasMusicPlayer;

// Auto-Initialisierung wenn DOM ready ist
document.addEventListener('DOMContentLoaded', async () => {
    // Etwas warten bis alle anderen Scripts geladen sind
    setTimeout(async () => {
        try {
            window.christmasMusic = new ChristmasMusicPlayer();
            await window.christmasMusic.init();
        } catch (error) {
            console.error('❌ Music Player konnte nicht initialisiert werden:', error);
        }
    }, 500);
});

console.log('🎵 Christmas Music Player v3.9 loaded');