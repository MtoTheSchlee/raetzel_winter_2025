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

            // Starte Kalender und Zeit-System
            this.initCalendarAndTime();

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
            { name: 'tracking', instance: window.TrackingAdapter, required: false },
            { name: 'extendedMusic', instance: window.ExtendedChristmasMusicPlayer, required: false }
        ];

        for (const config of moduleConfigs) {
            try {
                if (config.instance) {
                    // Spezielle Behandlung für Extended Music Player
                    if (config.name === 'extendedMusic') {
                        // Erstelle Instanz des erweiterten Music Players
                        window.extendedChristmasMusic = new config.instance();
                        this.modules.set(config.name, window.extendedChristmasMusic);
                        console.log(`🎵 Extended Christmas Music Player initialisiert`);
                    } else {
                        // Initialisiere das Modul falls es eine init-Methode hat
                        if (typeof config.instance.init === 'function') {
                            await config.instance.init();
                        }
                        
                        this.modules.set(config.name, config.instance);
                        console.log(`✅ Modul ${config.name} initialisiert`);
                    }
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
                navMenu.classList.toggle('nav-menu--open');
                
                // ARIA für Accessibility
                const isOpen = navMenu.classList.contains('nav-menu--open');
                navToggle.setAttribute('aria-expanded', isOpen.toString());
            });
        }

        // Top-Bar Music Toggle
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) {
            musicToggle.addEventListener('click', () => {
                // Trigger für erweiterten Musikplayer
                if (window.extendedChristmasMusic) {
                    if (window.extendedChristmasMusic.isPlaying) {
                        window.extendedChristmasMusic.pause();
                        musicToggle.textContent = 'Musik abspielen';
                    } else {
                        window.extendedChristmasMusic.play();
                        musicToggle.textContent = 'Musik pausieren';
                    }
                } else {
                    console.log('🎵 Erweiteter Musikplayer noch nicht initialisiert');
                }
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
                    if (navMenu && navMenu.classList.contains('nav-menu--open')) {
                        navMenu.classList.remove('nav-menu--open');
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
                case 'submit-stage2-answer':
                    await this.submitStage2Answer(payload, event);
                    break;
                case 'show-hint':
                    this.showHint(payload);
                    break;
                case 'reset-progress':
                    this.confirmResetProgress();
                    break;
                case 'close-modal':
                    this.closeCurrentModal(event);
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
     * Behandelt Stage-2 Antwort-Eingabe
     * @param {string} payload - Data-day oder zusätzliche Informationen
     * @param {Event} event - Click-Event für Kontext
     */
    async submitStage2Answer(payload, event) {
        try {
            console.log('🎯 Stage-2 Antwort wird eingereicht...');

            // Ermittle Tag aus Button oder payload
            const day = parseInt(payload || event.target.getAttribute('data-day'));
            if (!day || day < 1 || day > 24) {
                console.error('❌ Ungültiger Tag für Stage-2 Antwort:', day);
                this.showErrorMessage('Ungültiger Tag angegeben.');
                return;
            }

            // Finde Antwort-Input-Feld
            const answerInput = document.getElementById('stage2-answer');
            if (!answerInput) {
                console.error('❌ Stage-2 Antwort-Eingabefeld nicht gefunden');
                this.showErrorMessage('Eingabefeld nicht gefunden.');
                return;
            }

            const answerText = answerInput.value.trim();
            if (!answerText) {
                console.warn('⚠️ Leere Antwort bei Stage-2');
                answerInput.focus();
                return;
            }

            // Disable Submit-Button während Verarbeitung
            const submitBtn = event.target;
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Wird gesendet...';

            try {
                // Session-ID aus Modal holen
                const modal = document.getElementById('puzzle-modal');
                const sessionId = modal ? modal.getAttribute('data-stage2-session') : null;

                if (!sessionId) {
                    console.warn('⚠️ Keine Session-ID gefunden, erstelle neue');
                }

                // Hole Puzzle-Daten für answer_meta
                const calendar = this.modules.get('calendar');
                const puzzleData = calendar ? await calendar.getPuzzle(day) : null;
                const answerMeta = puzzleData?.stage2?.answer_meta || {};

                // AnswersStore verwenden falls verfügbar
                if (window.AnswersStore) {
                    // Erstelle Payload im erwarteten Format
                    const payload = {
                        day,
                        sessionId,
                        answer_raw: answerText,
                        stage2Config: answerMeta
                    };

                    const result = await window.WR_ANSWER_STORE.submitStage2Answer(payload);
                    
                    if (result && result.ok) {
                        console.log('✅ Stage-2 Antwort erfolgreich eingereicht:', result);
                        
                        // Zeige spezifische Success-Message falls verfügbar
                        const successMsg = answerMeta.success_message || 'Deine Antwort wurde erfolgreich eingereicht! 🎉';
                        this.showSuccessMessage(successMsg);
                        
                        // Modal schließen nach kurzer Verzögerung
                        setTimeout(() => {
                            this.closeCurrentModal();
                        }, 2000);
                        
                    } else {
                        console.error('❌ Stage-2 Antwort-Einreichung fehlgeschlagen:', result);
                        
                        // Zeige spezifische Error-Message falls verfügbar
                        const errorMsg = answerMeta.error_message || result?.errorMessage || 'Antwort konnte nicht gesendet werden.';
                        this.showErrorMessage(errorMsg);
                    }
                } else {
                    // Fallback ohne AnswersStore
                    console.warn('⚠️ AnswersStore nicht verfügbar, nutze Fallback');
                    this.saveStage2AnswerFallback(day, answerText, sessionId);
                    this.showSuccessMessage('Antwort wurde lokal gespeichert.');
                }

            } finally {
                // Submit-Button wieder aktivieren
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }

        } catch (error) {
            console.error('❌ Fehler bei Stage-2 Antwort-Einreichung:', error);
            this.showErrorMessage('Fehler beim Senden der Antwort.');
        }
    }

    /**
     * Fallback-Speicherung für Stage-2 Antworten (ohne AnswersStore)
     * @param {number} day - Tag des Rätsels
     * @param {string} answer - Antwort-Text
     * @param {string} sessionId - Session-ID
     */
    saveStage2AnswerFallback(day, answer, sessionId) {
        try {
            const timestamp = new Date().toISOString();
            const answerData = {
                day,
                answer,
                sessionId,
                timestamp,
                type: 'stage2'
            };

            // In localStorage speichern
            const key = `stage2_answer_day${day}`;
            localStorage.setItem(key, JSON.stringify(answerData));
            
            console.log('💾 Stage-2 Antwort lokal gespeichert:', answerData);
            
        } catch (error) {
            console.error('❌ Fehler beim lokalen Speichern der Stage-2 Antwort:', error);
        }
    }

    /**
     * Schließt das aktuell geöffnete Modal
     * @param {Event} event - Optional: Click-Event
     */
    closeCurrentModal(event) {
        try {
            const modal = document.getElementById('puzzle-modal');
            if (modal) {
                const calendar = this.modules.get('calendar');
                if (calendar && typeof calendar.closeModal === 'function') {
                    calendar.closeModal(modal);
                } else {
                    // Fallback
                    modal.style.display = 'none';
                    modal.classList.remove('show', 'modal-visible');
                    document.body.classList.remove('modal-open');
                }
                console.log('✅ Modal geschlossen');
            }
        } catch (error) {
            console.error('❌ Fehler beim Schließen des Modals:', error);
        }
    }

    /**
     * Zeigt eine Erfolgsmeldung an
     * @param {string} message - Nachricht
     */
    showSuccessMessage(message) {
        // Nutze existing Notification-System oder erstelle einfache Anzeige
        if (window.showNotification && typeof window.showNotification === 'function') {
            window.showNotification(message, 'success');
        } else {
            // Einfacher Alert als Fallback
            alert(`✅ ${message}`);
        }
        console.log('✅ Erfolg:', message);
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
                // Zeige spezifische Hinweise je nach WR_TIME Status
                if (window.WR_TIME && day === window.WR_TIME.cfg.devTestDay) {
                    const testTime = new Date(window.WR_TIME.cfg.devTestUnlockISO);
                    this.showErrorMessage(`Türchen ${day} wird um ${window.WR_TIME.formatTimeHHMM(testTime)} Uhr freigeschaltet!`);
                } else {
                    this.showErrorMessage(`Türchen ${day} wird um 09:00 Uhr am ${day}. Dezember freigeschaltet!`);
                }
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
     * Zeigt ein Rätsel im Modal an
     */
    displayPuzzleModal(puzzle) {
        try {
            const modal = document.getElementById('puzzle-modal');
            const title = modal.querySelector('.modal__title');
            const body = modal.querySelector('.modal__body');
            const actions = modal.querySelector('.modal__actions');

            if (!modal || !title || !body) {
                console.error('❌ Modal-Elemente nicht gefunden');
                return false;
            }

            // Bestimme Stage basierend auf puzzle.day
            const day = puzzle.day || puzzle.meta?.day;
            const stage = day <= 12 ? 1 : 2;

            // Verwende Stage-spezifische Daten
            const stageData = puzzle[`stage${stage}`] || puzzle;
            
            // Modal-Titel
            title.textContent = stageData.title || 'Rätsel-Details';

            // Modal-Inhalt für Stage 1
            if (stage === 1) {
                body.innerHTML = `
                    <div class="puzzle-content">
                        <div class="puzzle-teaser">
                            ${stageData.teaser || ''}
                        </div>
                        <div class="puzzle-riddle">
                            ${stageData.riddle_html || ''}
                        </div>
                        <div class="puzzle-answer-section">
                            <label for="puzzle-answer">Deine Antwort:</label>
                            <input type="text" id="puzzle-answer" placeholder="Antwort eingeben...">
                            <button type="button" data-action="submit-answer" data-payload="${day}">
                                Antwort prüfen
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // Stage 2 - verwende renderStage2HintView über CalendarLogic
                const calendarModule = this.modules.get('calendar');
                if (calendarModule && calendarModule.renderStage2HintView) {
                    calendarModule.renderStage2HintView(day, puzzle);
                    return true;
                } else {
                    console.warn('⚠️ renderStage2HintView nicht verfügbar, verwende Fallback');
                    body.innerHTML = `
                        <div class="puzzle-content">
                            <h3>Rätsel Tag ${day}</h3>
                            <p>Details werden geladen...</p>
                        </div>
                    `;
                }
            }

            // Modal öffnen
            this.openModal(modal);

            console.log(`✅ Modal für Tag ${day}, Stage ${stage} angezeigt`);
            return true;

        } catch (error) {
            console.error('❌ Fehler beim Anzeigen des Rätsels im Modal:', error);
            return false;
        }
    }

    /**
     * Überprüft ob ein Rätsel verfügbar ist
     */
    isPuzzleAvailable(day, currentTime) {
        // Verwende neue WR_TIME API falls verfügbar
        if (window.WR_TIME && typeof window.WR_TIME.isDoorUnlocked === 'function') {
            return window.WR_TIME.isDoorUnlocked(day, currentTime);
        }
        
        // Fallback: Alte Logik
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
            this.updateUserKeyDisplay();
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
     * Aktualisiert die User-Key Anzeige
     */
    updateUserKeyDisplay() {
        const userKeyDisplay = document.getElementById('user-key-display');
        if (!userKeyDisplay) return;

        try {
            const userKey = window.WR_USER_KEY;
            if (userKey && userKey !== 'unknown') {
                // Zeige nur die letzten 4 Zeichen für bessere Sicherheit
                const maskedKey = userKey.length > 4 
                    ? `****-${userKey.slice(-4)}` 
                    : userKey;
                userKeyDisplay.textContent = maskedKey;
                userKeyDisplay.setAttribute('data-full-key', userKey);
            } else {
                userKeyDisplay.textContent = 'nicht verfügbar';
            }
        } catch (error) {
            console.error('Fehler bei User-Key Anzeige:', error);
            userKeyDisplay.textContent = 'fehler beim Laden';
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
     * Initialisiert Kalender und Zeit-System
     */
    initCalendarAndTime() {
        try {
            // 1. Initialisiere Kalender falls verfügbar
            if (window.CalendarLogic) {
                if (typeof window.CalendarLogic.init === 'function') {
                    window.CalendarLogic.init();
                    console.log('✅ Kalender initialisiert');
                } else {
                    console.warn('⚠️ CalendarLogic.init() nicht verfügbar');
                }
            } else {
                console.warn('⚠️ CalendarLogic Modul nicht geladen');
            }

            // 2. Starte Zeit-System falls verfügbar
            if (window.WR_TIME) {
                window.WR_TIME.startClock();
                console.log('✅ WR_TIME Uhr gestartet');
            } else {
                console.warn('⚠️ WR_TIME Modul nicht geladen');
            }

            // 3. Prüfe URL-Parameter für automatisches Türchen-Öffnen
            this.checkAutoOpenDoor();

        } catch (error) {
            console.error('❌ Fehler bei Kalender/Zeit-Initialisierung:', error);
        }
    }

    /**
     * Prüft URL-Parameter und öffnet Türchen automatisch falls verfügbar
     */
    checkAutoOpenDoor() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const dayParam = urlParams.get('day');
            const stageParam = urlParams.get('stage');
            const qrParam = urlParams.get('qr');
            
            if (dayParam) {
                const day = parseInt(dayParam);
                if (day >= 1 && day <= 24) {
                    // Prüfe ob das Türchen verfügbar ist
                    const now = window.WR_TIME ? window.WR_TIME.getBerlinNow() : new Date();
                    if (this.isPuzzleAvailable(day, now)) {
                        
                        // Stage-2 QR-Code spezielle Behandlung
                        if (stageParam === '2' && qrParam) {
                            this.handleStage2QRCode(day, qrParam);
                            return;
                        }
                        
                        // Warte kurz, dann öffne das Türchen normal
                        setTimeout(() => {
                            this.openPuzzle(day);
                            console.log(`🎁 Automatisch geöffnet: Türchen ${day}`);
                        }, 500);
                    } else {
                        console.log(`⏳ Türchen ${day} noch nicht verfügbar`);
                    }
                } else {
                    console.warn(`❌ Ungültiger day Parameter: ${dayParam}`);
                }
            }
        } catch (error) {
            console.error('❌ Fehler beim Auto-Open Check:', error);
        }
    }

    /**
     * Behandelt Stage-2 QR-Code Aufrufe
     * @param {number} day - Tag des Rätsels (1-24)
     * @param {string} qrToken - QR-Code Token für Verifikation
     */
    async handleStage2QRCode(day, qrToken) {
        try {
            console.log(`🔍 Verarbeite Stage-2 QR-Code für Tag ${day}:`, qrToken);

            // QR-Code Verifikation
            const qrVerify = this.modules.get('qrVerify');
            if (!qrVerify) {
                console.warn('⚠️ QR-Verifizierungs-Modul nicht verfügbar, nutze Test-Modus');
                // Test-Modus: Alle QR-Codes als gültig betrachten
                if (qrToken === 'test' || qrToken.includes('test')) {
                    console.log('🧪 Test-Modus: QR-Code als gültig betrachtet');
                } else {
                    this.showErrorMessage('QR-Code Verifikation nicht möglich. Nutze ?qr=test für Tests.');
                    return;
                }
            } else {
                // Verifiziere QR-Token
                const qrResult = await qrVerify.verifyToken(qrToken, { day, stage: 2 });
                if (!qrResult || !qrResult.valid) {
                    console.error('❌ QR-Code Verifikation fehlgeschlagen:', qrResult);
                    this.showErrorMessage('Ungültiger QR-Code. Bitte versuche es erneut.');
                    return;
                }
                console.log('✅ QR-Code erfolgreich verifiziert:', qrResult);
            }

            // Lade Puzzle-Daten
            const calendar = this.modules.get('calendar');
            if (!calendar) {
                console.error('❌ Kalender-Modul nicht verfügbar');
                this.showErrorMessage('Kalender nicht verfügbar.');
                return;
            }

            const puzzle = await calendar.getPuzzle(day);
            if (!puzzle || !puzzle.stage2) {
                console.error('❌ Keine Stage-2 Daten für Tag gefunden:', day);
                this.showErrorMessage('Stage-2 Daten nicht verfügbar.');
                return;
            }

            // Zeige Stage-2 Hinweisansicht
            const renderOptions = {
                fromQr: true,
                sessionId: this.generateSessionId(),
                qrContext: {
                    token: qrToken,
                    verificationResult: qrResult,
                    timestamp: new Date().toISOString()
                }
            };

            const success = calendar.renderStage2HintView(day, puzzle, renderOptions);
            if (!success) {
                console.error('❌ Fehler beim Rendern der Stage-2 Ansicht');
                this.showErrorMessage('Stage-2 Ansicht konnte nicht geladen werden.');
                return;
            }

            console.log('🎯 Stage-2 QR-Code erfolgreich verarbeitet');

            // URL bereinigen (Optional)
            if (window.history && window.history.replaceState) {
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            }

        } catch (error) {
            console.error('❌ Fehler bei Stage-2 QR-Code Verarbeitung:', error);
            this.showErrorMessage('QR-Code konnte nicht verarbeitet werden.');
        }
    }

    /**
     * Generiert eine eindeutige Session-ID für Stage-2 Tracking
     * @returns {string} Eindeutige Session-ID
     */
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `stage2_${timestamp}_${random}`;
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