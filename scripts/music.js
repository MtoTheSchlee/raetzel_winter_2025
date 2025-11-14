/**
 * Christmas Music Player v3.9.4 - Extended with Playlist Controls
 * Enhanced with prev/next navigation for Weihnachts-Rätsel-Rallye 2025
 */

'use strict';

class ExtendedChristmasMusicPlayer {
    constructor() {
        this.isInitialized = false;
        this.currentAudio = null;
        this.isPlaying = false;
        this.currentIndex = 0;
        
        // Enhanced Christmas Playlist
        this.PLAYLIST = [
            { id: 'track1', title: 'Weihnachten', src: './music/Weihnachten.mp3.mp3' },
            { id: 'track2', title: 'Rallye Song I', src: './music/Weihnachtsrally Song .mp3' },
            { id: 'track3', title: 'Rallye Song II', src: './music/Weihnatsrally Song ll .mp3' }
        ];

        // DOM-Elemente
        this.playBtn = null;
        this.pauseBtn = null;
        this.trackNameEl = null;
        this.statusEl = null;
        this.volumeSlider = null;
        this.prevBtn = null;
        this.nextBtn = null;
    }

    /**
     * Initialisierung mit erweiterten Controls
     */
    async init() {
        try {
            console.log('🎵 Extended Christmas Music Player wird initialisiert...');
            
            this.setupDOMElements();
            this.createPlaylistControls(); // Neue Prev/Next Buttons
            this.setupEventListeners();
            this.loadTrack(0);
            
            this.isInitialized = true;
            console.log('✅ Extended Christmas Music Player bereit mit Playlist!');
            
        } catch (error) {
            console.error('❌ Extended Music Player Fehler:', error);
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
     * Erstellt Prev/Next Buttons in der bestehenden UI
     */
    createPlaylistControls() {
        const controlsContainer = this.playBtn.parentElement;
        
        if (controlsContainer) {
            // Previous Button
            this.prevBtn = document.createElement('button');
            this.prevBtn.className = 'music-player__btn player-btn-prev';
            this.prevBtn.innerHTML = '<span class="music-player__icon">⏮️</span>';
            this.prevBtn.setAttribute('aria-label', 'Vorheriger Track');
            
            // Next Button  
            this.nextBtn = document.createElement('button');
            this.nextBtn.className = 'music-player__btn player-btn-next';
            this.nextBtn.innerHTML = '<span class="music-player__icon">⏭️</span>';
            this.nextBtn.setAttribute('aria-label', 'Nächster Track');
            
            // Buttons vor Play-Button einfügen
            controlsContainer.insertBefore(this.prevBtn, this.playBtn);
            controlsContainer.insertBefore(this.nextBtn, this.playBtn.nextSibling);
            
            console.log('🎛️ Playlist-Controls erstellt');
        }
    }

    /**
     * Event Listeners Setup mit Playlist-Controls
     */
    setupEventListeners() {
        // Bestehende Play/Pause Buttons
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());

        // Neue Playlist-Controls
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.previousTrack());
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextTrack());
        }

        // Volume Slider
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }

        // Track Ende -> automatisch nächster Track
        document.addEventListener('ended', () => {
            this.nextTrack();
        });

        // Mobile Check
        this.checkMobileDevice();
    }

    /**
     * Lädt einen Track nach Index
     */
    loadTrack(index) {
        // Index validieren mit Wrap-Around
        if (index >= this.PLAYLIST.length) index = 0;
        if (index < 0) index = this.PLAYLIST.length - 1;
        
        const track = this.PLAYLIST[index];
        this.currentIndex = index;
        
        // Alten Audio stoppen
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // Neuen Audio erstellen
        this.currentAudio = new Audio(track.src);
        this.currentAudio.loop = false; // Kein Loop, damit next track funktioniert
        this.currentAudio.volume = this.volumeSlider ? (this.volumeSlider.value / 100) : 0.7;
        
        // UI Update
        this.trackNameEl.textContent = `🎵 ${track.title}`;
        this.statusEl.textContent = 'Bereit';
        
        // Track Events
        this.currentAudio.addEventListener('canplay', () => {
            this.statusEl.textContent = 'Geladen';
        });

        this.currentAudio.addEventListener('error', () => {
            this.statusEl.textContent = 'Fehler beim Laden';
            console.error('❌ Fehler beim Laden von:', track.src);
        });

        this.currentAudio.addEventListener('ended', () => {
            this.nextTrack(); // Auto-next
        });

        console.log('🎵 Track geladen:', track.title, `(${index + 1}/${this.PLAYLIST.length})`);
    }

    /**
     * Vorheriger Track
     */
    previousTrack() {
        const newIndex = this.currentIndex - 1;
        const wasPlaying = this.isPlaying;
        
        this.loadTrack(newIndex);
        
        // Automatisch weiterspielen falls vorher gespielt wurde
        if (wasPlaying) {
            setTimeout(() => this.play(), 100);
        }
        
        console.log('⏮️ Vorheriger Track:', this.PLAYLIST[this.currentIndex].title);
    }

    /**
     * Nächster Track
     */
    nextTrack() {
        const newIndex = this.currentIndex + 1;
        const wasPlaying = this.isPlaying;
        
        this.loadTrack(newIndex);
        
        // Automatisch weiterspielen falls vorher gespielt wurde
        if (wasPlaying) {
            setTimeout(() => this.play(), 100);
        }
        
        console.log('⏭️ Nächster Track:', this.PLAYLIST[this.currentIndex].title);
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
            
            console.log('🎵 Spiele:', this.PLAYLIST[this.currentIndex].title);
            
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
            
            console.log('🎵 Pausiert:', this.PLAYLIST[this.currentIndex].title);
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
     * Mobile Device Check
     */
    checkMobileDevice() {
        const isMobile = /iPhone|iPad|iPod|Android|BlackBerry|Windows Phone/i.test(navigator.userAgent) 
                         || window.innerWidth <= 640;
        
        if (isMobile && this.statusEl) {
            setTimeout(() => {
                if (this.statusEl.textContent === 'Bereit') {
                    this.statusEl.textContent = 'Bereit - Nutze Gerätevolume';
                }
            }, 1000);
        }
    }
}

// Global verfügbar machen
window.ExtendedChristmasMusicPlayer = ExtendedChristmasMusicPlayer;

// Auto-Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        try {
            // Ersetze den einfachen Player durch den erweiterten
            if (window.christmasMusic) {
                console.log('🔄 Ersetze einfachen Player durch erweiterten Player...');
            }
            
            window.christmasMusic = new ExtendedChristmasMusicPlayer();
            await window.christmasMusic.init();
        } catch (error) {
            console.error('❌ Extended Music Player konnte nicht initialisiert werden:', error);
        }
    }, 600); // Etwas später als der einfache Player
});

// Export der Klasse für main.js
window.ExtendedChristmasMusicPlayer = ExtendedChristmasMusicPlayer;

console.log('🎵 Extended Christmas Music Player v3.9.4 loaded');