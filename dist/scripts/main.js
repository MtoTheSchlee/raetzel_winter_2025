/**
 * Main.js - Haupteinstiegspunkt für Rätsel Winter 2025
 * Koordiniert alle Module und initialisiert die Anwendung
 */

'use strict';

/**
 * Hauptanwendungsklasse für die Winter-Stadtrallye
 */
class WinterRallyeApp {
    constructor() {
        this.isInitialized = false;
        this.modules = new Map();
        this.state = {
            currentDay: null,
            solvedPuzzles: new Set(),
            userProgress: {
                totalPoints: 0,
                stage1Progress: 0,
                stage2Progress: 0,
                achievements: []
            },
            lastActivity: null
        };
        
        // Event-Handler Bindung
        this.handleDOMContentLoaded = this.handleDOMContentLoaded.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * Initialisiert die Anwendung nach dem DOM-Load
     */
    async init() {
        try {
            console.log('🎄 Winter Rallye 2025 wird initialisiert...');
            
            // Überprüfe Browser-Kompatibilität
            if (!this.checkBrowserCompatibility()) {
                this.showCompatibilityError();
                return;
            }

            // Lade gespeicherten State
            await this.loadUserState();

            // Initialisiere Module in der richtigen Reihenfolge
            await this.initializeModules();

            // Setup Event-Listener
            this.setupEventListeners();

            // Initialer UI-Update
            this.updateUI();

            // Starte Timer-Updates
            this.startPeriodicUpdates();

            this.isInitialized = true;
            console.log('✅ Anwendung erfolgreich initialisiert');

            // Analytics: App-Start
            if (window.TrackingAdapter) {
                window.TrackingAdapter.track('app_initialized', {
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                });
            }

        } catch (error) {
            console.error('❌ Fehler bei der Initialisierung:', error);
            this.showInitializationError(error);
        }
    }

    /**
     * Überprüft die Browser-Kompatibilität
     */
    checkBrowserCompatibility() {
        // Überprüfe wichtige APIs
        const requiredFeatures = [
            'localStorage',
            'fetch',
            'Promise',
            'Map',
            'Set',
            'JSON'
        ];

        for (const feature of requiredFeatures) {
            if (!window[feature]) {
                console.error(`❌ Browser-Feature nicht unterstützt: ${feature}`);
                return false;
            }
        }

        // Überprüfe Service Worker Support (optional)
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Worker nicht unterstützt - Offline-Funktionen nicht verfügbar');
        }

        return true;
    }

    /**
     * Lädt den gespeicherten Benutzer-State aus localStorage
     */
    async loadUserState() {
        try {
            const savedState = localStorage.getItem('winterRallye2025_state');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                
                // Validiere und merge State
                this.state = {
                    ...this.state,
                    ...parsedState,
                    solvedPuzzles: new Set(parsedState.solvedPuzzles || [])
                };

                console.log('📁 Benutzer-State geladen:', this.state);
            }
        } catch (error) {
            console.warn('⚠️ Fehler beim Laden des States:', error);
            // Bei Fehlern den State zurücksetzen
            this.resetUserState();
        }
    }

    /**
     * Initialisiert alle benötigten Module
     */
    async initializeModules() {
        const moduleConfigs = [
            { name: 'security', instance: window.SecurityStatic, required: true },
            { name: 'time', instance: window.TimeBerlin, required: true },
            { name: 'calendar', instance: window.CalendarLogic, required: true },
            { name: 'qrVerify', instance: window.QRVerify, required: true },
            { name: 'answerUtil', instance: window.AnswerUtil, required: true },
            { name: 'modalConfirm', instance: window.ModalConfirm, required: false },
            { name: 'tracking', instance: window.TrackingAdapter, required: false }
        ];

        for (const config of moduleConfigs) {
            try {
                if (config.instance) {
                    // Initialisiere das Modul falls es eine init-Methode hat
                    if (typeof config.instance.init === 'function') {
                        await config.instance.init();
                    }
                    
                    this.modules.set(config.name, config.instance);
                    console.log(`✅ Modul ${config.name} initialisiert`);
                } else if (config.required) {
                    throw new Error(`Erforderliches Modul ${config.name} nicht gefunden`);
                } else {
                    console.warn(`⚠️ Optionales Modul ${config.name} nicht verfügbar`);
                }
            } catch (error) {
                console.error(`❌ Fehler bei Initialisierung von ${config.name}:`, error);
                if (config.required) {
                    throw error;
                }
            }
        }
    }

    /**
     * Richtet alle Event-Listener ein
     */
    setupEventListeners() {
        // DOM Events
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        
        // Window Events
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Navigation
        this.setupNavigation();

        // Modal Events
        this.setupModalEvents();

        console.log('👂 Event-Listener eingerichtet');
    }

    /**
     * Richtet die Navigation ein
     */
    setupNavigation() {
        // Mobile Navigation Toggle
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('is-open');
                
                // ARIA für Accessibility
                const isOpen = navMenu.classList.contains('is-open');
                navToggle.setAttribute('aria-expanded', isOpen.toString());
            });
        }

        // Smooth Scrolling für Anker-Links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });

                    // Schließe mobile Navigation
                    if (navMenu && navMenu.classList.contains('is-open')) {
                        navMenu.classList.remove('is-open');
                        navToggle.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });
    }

    /**
     * Richtet Modal-Events ein
     */
    setupModalEvents() {
        const puzzleModal = document.getElementById('puzzle-modal');
        const modalClose = document.getElementById('modal-close');
        
        if (puzzleModal && modalClose) {
            modalClose.addEventListener('click', () => {
                this.closeModal(puzzleModal);
            });

            // Schließen bei Overlay-Klick
            puzzleModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal__overlay')) {
                    this.closeModal(puzzleModal);
                }
            });
        }

        // Escape-Taste zum Schließen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.is-open');
                if (openModal) {
                    this.closeModal(openModal);
                }
            }
        });
    }

    /**
     * Globaler Click-Handler für Event-Delegation
     */
    handleGlobalClick(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const payload = target.getAttribute('data-payload');
        
        this.handleAction(action, payload, event);
    }

    /**
     * Globaler Keydown-Handler
     */
    handleGlobalKeydown(event) {
        // Shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'k':
                    event.preventDefault();
                    // Schnellsuche oder Kommandopalette (zukünftig)
                    break;
                case 'r':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.refreshData();
                    }
                    break;
            }
        }
    }

    /**
     * Behandelt Aktionen basierend auf data-action Attributen
     */
    async handleAction(action, payload, event) {
        try {
            switch (action) {
                case 'open-puzzle':
                    await this.openPuzzle(parseInt(payload));
                    break;
                case 'submit-answer':
                    await this.submitAnswer(payload);
                    break;
                case 'show-hint':
                    this.showHint(payload);
                    break;
                case 'reset-progress':
                    this.confirmResetProgress();
                    break;
                default:
                    console.warn(`Unbekannte Aktion: ${action}`);
            }
        } catch (error) {
            console.error(`Fehler bei Aktion ${action}:`, error);
            this.showErrorMessage(`Fehler bei ${action}: ${error.message}`);
        }
    }

    /**
     * Öffnet ein Rätsel
     */
    async openPuzzle(day) {
        try {
            const calendarModule = this.modules.get('calendar');
            if (!calendarModule) {
                throw new Error('Kalender-Modul nicht verfügbar');
            }

            const puzzle = await calendarModule.getPuzzle(day);
            if (!puzzle) {
                throw new Error(`Rätsel für Tag ${day} nicht gefunden`);
            }

            // Überprüfe Verfügbarkeit
            const timeModule = this.modules.get('time');
            const currentTime = timeModule ? timeModule.getCurrentBerlinTime() : new Date();
            
            if (!this.isPuzzleAvailable(day, currentTime)) {
                this.showErrorMessage(`Dieses Rätsel ist noch nicht verfügbar!`);
                return;
            }

            // Öffne Modal mit Rätsel
            this.displayPuzzleModal(puzzle);

            // Analytics
            if (this.modules.get('tracking')) {
                this.modules.get('tracking').track('puzzle_opened', {
                    day,
                    timestamp: currentTime.toISOString()
                });
            }

        } catch (error) {
            console.error('Fehler beim Öffnen des Rätsels:', error);
            this.showErrorMessage('Das Rätsel konnte nicht geladen werden.');
        }
    }

    /**
     * Überprüft ob ein Rätsel verfügbar ist
     */
    isPuzzleAvailable(day, currentTime) {
        // Dezember-Tage: 1-24
        const currentDate = new Date(currentTime);
        const currentMonth = currentDate.getMonth() + 1; // 0-basiert
        const currentDay = currentDate.getDate();
        
        // Nur im Dezember oder danach
        if (currentMonth < 12) {
            return false;
        }
        
        // Tag muss erreicht sein
        if (currentMonth === 12 && currentDay < day) {
            return false;
        }
        
        return true;
    }

    /**
     * Aktualisiert die UI-Elemente
     */
    updateUI() {
        try {
            this.updateTimeDisplay();
            this.updateProgressDisplay();
            this.updateCalendarDisplay();
            this.updateStatsDisplay();
        } catch (error) {
            console.error('Fehler beim UI-Update:', error);
        }
    }

    /**
     * Aktualisiert die Zeitanzeige
     */
    updateTimeDisplay() {
        const timeModule = this.modules.get('time');
        if (!timeModule) return;

        const currentTime = timeModule.getCurrentBerlinTime();
        const timeElement = document.getElementById('current-time');
        
        if (timeElement) {
            timeElement.textContent = timeModule.formatTime(currentTime);
        }

        // Countdown bis zum nächsten Rätsel
        this.updateCountdown(currentTime);
    }

    /**
     * Aktualisiert den Countdown
     */
    updateCountdown(currentTime) {
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;

        const timeModule = this.modules.get('time');
        const nextPuzzleTime = timeModule.getNextPuzzleTime(currentTime);
        
        if (nextPuzzleTime) {
            const timeUntil = nextPuzzleTime.getTime() - currentTime.getTime();
            countdownElement.textContent = timeModule.formatDuration(timeUntil);
        } else {
            countdownElement.textContent = 'Alle Rätsel verfügbar';
        }
    }

    /**
     * Aktualisiert die Fortschrittsanzeige
     */
    updateProgressDisplay() {
        const { solvedPuzzles, userProgress } = this.state;
        
        // Fortschrittsbalken
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill && progressText) {
            const totalPuzzles = 24;
            const progress = (solvedPuzzles.size / totalPuzzles) * 100;
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }

        // Stage-Fortschritte
        this.updateStageProgress();
    }

    /**
     * Aktualisiert die Stage-Fortschritte
     */
    updateStageProgress() {
        const stage1Progress = document.getElementById('stage-1-progress');
        const stage2Progress = document.getElementById('stage-2-progress');
        
        if (stage1Progress) {
            stage1Progress.textContent = `${this.state.userProgress.stage1Progress}/12`;
        }
        
        if (stage2Progress) {
            stage2Progress.textContent = `${this.state.userProgress.stage2Progress}/12`;
        }
    }

    /**
     * Aktualisiert die Statistik-Anzeige
     */
    updateStatsDisplay() {
        const currentDayEl = document.getElementById('current-day');
        const solvedCountEl = document.getElementById('solved-count');
        const totalPointsEl = document.getElementById('total-points');

        const timeModule = this.modules.get('time');
        if (timeModule && currentDayEl) {
            const currentDay = timeModule.getCurrentDecemberDay();
            currentDayEl.textContent = currentDay || '--';
        }

        if (solvedCountEl) {
            solvedCountEl.textContent = this.state.solvedPuzzles.size;
        }

        if (totalPointsEl) {
            totalPointsEl.textContent = this.state.userProgress.totalPoints;
        }
    }

    /**
     * Startet periodische Updates
     */
    startPeriodicUpdates() {
        // Aktualisiere Zeit jede Sekunde
        setInterval(() => {
            this.updateTimeDisplay();
        }, 1000);

        // Aktualisiere UI alle 30 Sekunden
        setInterval(() => {
            this.updateUI();
        }, 30000);

        // Speichere State alle 5 Minuten
        setInterval(() => {
            this.saveUserState();
        }, 300000);
    }

    /**
     * Speichert den Benutzer-State
     */
    saveUserState() {
        try {
            const stateToSave = {
                ...this.state,
                solvedPuzzles: Array.from(this.state.solvedPuzzles),
                lastSaved: new Date().toISOString()
            };

            localStorage.setItem('winterRallye2025_state', JSON.stringify(stateToSave));
            console.log('💾 State gespeichert');
        } catch (error) {
            console.error('Fehler beim Speichern des States:', error);
        }
    }

    /**
     * Setzt den Benutzer-State zurück
     */
    resetUserState() {
        this.state = {
            currentDay: null,
            solvedPuzzles: new Set(),
            userProgress: {
                totalPoints: 0,
                stage1Progress: 0,
                stage2Progress: 0,
                achievements: []
            },
            lastActivity: null
        };
        
        localStorage.removeItem('winterRallye2025_state');
        console.log('🔄 State zurückgesetzt');
    }

    /**
     * Event-Handler für Sichtbarkeitsänderungen
     */
    handleVisibilityChange() {
        if (!document.hidden && this.isInitialized) {
            // App wieder aktiv - aktualisiere UI
            this.updateUI();
        }
    }

    /**
     * Event-Handler für Browser-Resize
     */
    handleResize() {
        // Debounce für Performance
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.updateCalendarDisplay();
        }, 250);
    }

    /**
     * Event-Handler für Before-Unload
     */
    handleBeforeUnload() {
        // Speichere State vor dem Verlassen
        this.saveUserState();
    }

    /**
     * Event-Handler für DOM-Content-Loaded
     */
    handleDOMContentLoaded() {
        this.init();
    }

    /**
     * Zeigt eine Fehlermeldung an
     */
    showErrorMessage(message) {
        // Einfache Toast-Nachricht (kann erweitert werden)
        const toast = document.createElement('div');
        toast.className = 'toast toast--error';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * Zeigt Kompatibilitäts-Fehler
     */
    showCompatibilityError() {
        document.body.innerHTML = `
            <div class="error-page">
                <h1>Browser nicht unterstützt</h1>
                <p>Diese Anwendung benötigt einen moderneren Browser.</p>
                <p>Bitte aktualisieren Sie Ihren Browser oder verwenden Sie:</p>
                <ul>
                    <li>Chrome 60+</li>
                    <li>Firefox 55+</li>
                    <li>Safari 12+</li>
                    <li>Edge 79+</li>
                </ul>
            </div>
        `;
    }

    /**
     * Zeigt Initialisierungs-Fehler
     */
    showInitializationError(error) {
        console.error('Initialisierungsfehler:', error);
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'init-error';
        errorMessage.innerHTML = `
            <h2>🎄 Ups! Etwas ist schief gelaufen</h2>
            <p>Die Winter-Rallye konnte nicht geladen werden.</p>
            <button onclick="window.location.reload()">Seite neu laden</button>
            <details>
                <summary>Technische Details</summary>
                <pre>${error.message}</pre>
            </details>
        `;
        
        document.body.appendChild(errorMessage);
    }

    // Weitere Utility-Methoden...
    openModal(modal) {
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modal) {
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    updateCalendarDisplay() {
        const calendarModule = this.modules.get('calendar');
        if (calendarModule) {
            calendarModule.updateDisplay();
        }
    }

    refreshData() {
        console.log('🔄 Daten werden aktualisiert...');
        this.updateUI();
    }
}

// Globale Instanz erstellen
const app = new WinterRallyeApp();

// Initialisierung bei DOM-Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', app.handleDOMContentLoaded);
} else {
    // DOM bereits geladen
    app.handleDOMContentLoaded();
}

// Globale Referenz für Debugging
window.WinterRallyeApp = app;