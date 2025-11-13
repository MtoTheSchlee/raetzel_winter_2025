/**
 * Calendar Logic - Adventskalender-Funktionalität für Rätsel Winter 2025
 * Verwaltet die 24 Türchen, Stage-System und Rätsel-Loading
 */

'use strict';

/**
 * Kalender-Logik-Klasse für den Adventskalender
 */
class CalendarLogic {
    constructor() {
        this.puzzles = new Map();
        this.calendarGrid = null;
        this.isInitialized = false;
        
        // Konfiguration
        this.config = {
            totalDays: 24,
            stage1Days: 12, // Tag 1-12
            stage2Days: 12, // Tag 13-24
            puzzleBaseUrl: 'public/puzzles/raetsel/',
            releaseTime: { hour: 6, minute: 0 } // 6:00 Uhr morgens
        };

        // Cache für geladene Rätsel
        this.puzzleCache = new Map();
    }

    /**
     * Initialisiert den Kalender
     */
    async init() {
        try {
            console.log('📅 Kalender wird initialisiert...');
            
            this.calendarGrid = document.getElementById('calendar-grid');
            if (!this.calendarGrid) {
                throw new Error('Kalender-Grid Element nicht gefunden');
            }

            // Generiere Kalender-HTML
            this.generateCalendarGrid();

            // Lade Rätsel-Metadaten
            await this.loadPuzzleMetadata();

            // Setup Event-Listener
            this.setupEventListeners();

            // Initial-Update
            this.updateCalendarDisplay();

            this.isInitialized = true;
            console.log('✅ Kalender initialisiert');

        } catch (error) {
            console.error('❌ Fehler bei Kalender-Initialisierung:', error);
            throw error;
        }
    }

    /**
     * Generiert das HTML für den Kalender-Grid
     */
    generateCalendarGrid() {
        // Mische die Tage für interessanteres Layout
        const days = Array.from({ length: this.config.totalDays }, (_, i) => i + 1);
        const shuffledDays = this.shuffleArray([...days]);

        let gridHTML = '';

        shuffledDays.forEach(day => {
            const stage = day <= this.config.stage1Days ? 1 : 2;
            const stageClass = `stage-${stage}`;
            
            gridHTML += `
                <div class="calendar-door calendar-door--locked ${stageClass}"
                     data-day="${day}"
                     data-stage="${stage}"
                     data-action="open-puzzle"
                     data-payload="${day}"
                     role="button"
                     tabindex="0"
                     aria-label="Rätsel Tag ${day}">
                    <div class="calendar-door__number">${day}</div>
                    <div class="calendar-door__icon">🎁</div>
                    <div class="calendar-door__stage-indicator">
                        ${stage === 1 ? '🎯' : '🏆'}
                    </div>
                </div>
            `;
        });

        this.calendarGrid.innerHTML = gridHTML;
    }

    /**
     * Mischt ein Array (Fisher-Yates Algorithmus)
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Lädt Metadaten aller Rätsel
     */
    async loadPuzzleMetadata() {
        try {
            console.log('📦 Lade Rätsel-Metadaten...');
            
            for (let day = 1; day <= this.config.totalDays; day++) {
                try {
                    const metadata = await this.loadPuzzleMetadata(day);
                    if (metadata) {
                        this.puzzles.set(day, metadata);
                    }
                } catch (error) {
                    console.warn(`⚠️ Metadaten für Tag ${day} nicht gefunden:`, error);
                    // Erstelle Standard-Metadaten
                    this.puzzles.set(day, this.createDefaultPuzzleMetadata(day));
                }
            }

            console.log(`✅ ${this.puzzles.size} Rätsel-Metadaten geladen`);

        } catch (error) {
            console.error('❌ Fehler beim Laden der Metadaten:', error);
            // Fallback: Erstelle Standard-Metadaten für alle Tage
            this.createFallbackMetadata();
        }
    }

    /**
     * Lädt Metadaten für ein bestimmtes Rätsel
     */
    async loadPuzzleMetadata(day) {
        const url = `${this.config.puzzleBaseUrl}day-${day.toString().padStart(2, '0')}.json`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Validiere Struktur
            this.validatePuzzleData(data, day);
            
            return {
                ...data,
                day,
                loaded: true,
                url
            };

        } catch (error) {
            console.warn(`Rätsel ${day} nicht verfügbar:`, error.message);
            return null;
        }
    }

    /**
     * Validiert Rätsel-Datenstruktur
     */
    validatePuzzleData(data, day) {
        const requiredFields = ['title', 'description', 'type', 'points'];
        
        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`Pflichtfeld '${field}' fehlt`);
            }
        }

        // Typ-spezifische Validierung
        switch (data.type) {
            case 'location':
                if (!data.location || !data.answerHash) {
                    throw new Error('Location-Rätsel benötigt location und answerHash');
                }
                break;
            case 'riddle':
                if (!data.question || !data.answerHash) {
                    throw new Error('Riddle-Rätsel benötigt question und answerHash');
                }
                break;
            case 'qr':
                if (!data.qrSignature || !data.location) {
                    throw new Error('QR-Rätsel benötigt qrSignature und location');
                }
                break;
            default:
                console.warn(`Unbekannter Rätsel-Typ: ${data.type}`);
        }
    }

    /**
     * Erstellt Standard-Metadaten für ein Rätsel
     */
    createDefaultPuzzleMetadata(day) {
        const stage = day <= this.config.stage1Days ? 1 : 2;
        const points = stage === 1 ? 10 : 20;

        return {
            day,
            title: `Rätsel ${day}`,
            description: `Ein spannendes Rätsel für Tag ${day} der Winter-Rallye.`,
            type: 'placeholder',
            points,
            stage,
            difficulty: stage === 1 ? 'easy' : 'medium',
            loaded: false,
            placeholder: true
        };
    }

    /**
     * Erstellt Fallback-Metadaten für alle Tage
     */
    createFallbackMetadata() {
        console.log('🔄 Erstelle Fallback-Metadaten...');
        
        for (let day = 1; day <= this.config.totalDays; day++) {
            if (!this.puzzles.has(day)) {
                this.puzzles.set(day, this.createDefaultPuzzleMetadata(day));
            }
        }
    }

    /**
     * Setup Event-Listener für Kalender-Interaktionen
     */
    setupEventListeners() {
        // Keyboard-Navigation
        this.calendarGrid.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const door = event.target.closest('.calendar-door');
                if (door) {
                    door.click();
                }
            }
        });

        // Touch/Hover-Effekte
        this.calendarGrid.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.calendarGrid.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    /**
     * Touch-Start Handler
     */
    handleTouchStart(event) {
        const door = event.target.closest('.calendar-door');
        if (door && !door.classList.contains('calendar-door--locked')) {
            door.classList.add('touch-active');
        }
    }

    /**
     * Touch-End Handler
     */
    handleTouchEnd(event) {
        const door = event.target.closest('.calendar-door');
        if (door) {
            door.classList.remove('touch-active');
        }
    }

    /**
     * Aktualisiert die Kalender-Anzeige basierend auf aktueller Zeit
     */
    updateCalendarDisplay() {
        if (!this.isInitialized) return;

        try {
            const now = window.TimeBerlin ? window.TimeBerlin.getCurrentBerlinTime() : new Date();
            const currentDecemberDay = this.getCurrentDecemberDay(now);

            this.calendarGrid.querySelectorAll('.calendar-door').forEach(doorElement => {
                const day = parseInt(doorElement.getAttribute('data-day'));
                const puzzle = this.puzzles.get(day);
                
                if (puzzle) {
                    this.updateDoorDisplay(doorElement, day, currentDecemberDay, puzzle);
                }
            });

            // Aktualisiere Stage-Indikatoren
            this.updateStageIndicators();

        } catch (error) {
            console.error('Fehler bei Kalender-Update:', error);
        }
    }

    /**
     * Aktualisiert die Anzeige einer einzelnen Tür
     */
    updateDoorDisplay(doorElement, day, currentDecemberDay, puzzle) {
        // Entferne alle Status-Klassen
        doorElement.classList.remove(
            'calendar-door--locked',
            'calendar-door--available',
            'calendar-door--solved',
            'calendar-door--current'
        );

        // Bestimme Status
        const isAvailable = this.isPuzzleAvailable(day, currentDecemberDay);
        const isSolved = this.isPuzzleSolved(day);
        const isCurrent = day === currentDecemberDay;

        // Setze entsprechende Klasse
        if (isSolved) {
            doorElement.classList.add('calendar-door--solved');
            this.updateDoorIcon(doorElement, '✅');
        } else if (isCurrent && isAvailable) {
            doorElement.classList.add('calendar-door--current');
            this.updateDoorIcon(doorElement, '⭐');
        } else if (isAvailable) {
            doorElement.classList.add('calendar-door--available');
            this.updateDoorIcon(doorElement, '🎁');
        } else {
            doorElement.classList.add('calendar-door--locked');
            this.updateDoorIcon(doorElement, '🔒');
        }

        // Aktualisiere ARIA-Attribute
        doorElement.setAttribute('aria-label', 
            `Rätsel Tag ${day} - ${puzzle.title} - ${this.getDoorStatusText(isSolved, isAvailable)}`
        );

        // Aktiviere/Deaktiviere Interaktion
        if (isAvailable && !isSolved) {
            doorElement.setAttribute('tabindex', '0');
            doorElement.style.cursor = 'pointer';
        } else {
            doorElement.setAttribute('tabindex', '-1');
            doorElement.style.cursor = isSolved ? 'default' : 'not-allowed';
        }
    }

    /**
     * Aktualisiert das Icon einer Tür
     */
    updateDoorIcon(doorElement, icon) {
        const iconElement = doorElement.querySelector('.calendar-door__icon');
        if (iconElement) {
            iconElement.textContent = icon;
        }
    }

    /**
     * Gibt den Status-Text für eine Tür zurück
     */
    getDoorStatusText(isSolved, isAvailable) {
        if (isSolved) return 'Gelöst';
        if (isAvailable) return 'Verfügbar';
        return 'Gesperrt';
    }

    /**
     * Überprüft ob ein Rätsel verfügbar ist
     */
    isPuzzleAvailable(day, currentDecemberDay) {
        // Rätsel ist verfügbar wenn:
        // 1. Es Dezember ist UND der Tag erreicht/überschritten ist
        // 2. ODER es nach Dezember ist (alle Rätsel verfügbar)
        
        if (!currentDecemberDay) {
            // Nicht im Dezember
            const now = new Date();
            return now.getMonth() > 11; // Nach Dezember
        }
        
        return day <= currentDecemberDay;
    }

    /**
     * Überprüft ob ein Rätsel gelöst ist
     */
    isPuzzleSolved(day) {
        // Prüfe gegen globalen App-State
        if (window.WinterRallyeApp && window.WinterRallyeApp.state) {
            return window.WinterRallyeApp.state.solvedPuzzles.has(day);
        }
        
        // Fallback: LocalStorage
        try {
            const savedState = localStorage.getItem('winterRallye2025_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                return (state.solvedPuzzles || []).includes(day);
            }
        } catch (error) {
            console.warn('Fehler beim Prüfen des Solved-Status:', error);
        }
        
        return false;
    }

    /**
     * Berechnet den aktuellen Dezember-Tag
     */
    getCurrentDecemberDay(now = new Date()) {
        const month = now.getMonth() + 1; // 0-basiert
        const date = now.getDate();
        
        if (month === 12) {
            return Math.min(date, 24); // Maximal Tag 24
        } else if (month > 12) {
            return 24; // Nach Dezember: alle verfügbar
        }
        
        return null; // Vor Dezember
    }

    /**
     * Aktualisiert die Stage-Indikatoren
     */
    updateStageIndicators() {
        const stage1Indicator = document.getElementById('stage-1-progress');
        const stage2Indicator = document.getElementById('stage-2-progress');
        
        if (stage1Indicator || stage2Indicator) {
            const progress = this.calculateStageProgress();
            
            if (stage1Indicator) {
                stage1Indicator.textContent = `${progress.stage1}/12`;
            }
            
            if (stage2Indicator) {
                stage2Indicator.textContent = `${progress.stage2}/12`;
            }
        }
    }

    /**
     * Berechnet den Fortschritt für beide Stages
     */
    calculateStageProgress() {
        let stage1Solved = 0;
        let stage2Solved = 0;

        for (let day = 1; day <= this.config.totalDays; day++) {
            if (this.isPuzzleSolved(day)) {
                if (day <= this.config.stage1Days) {
                    stage1Solved++;
                } else {
                    stage2Solved++;
                }
            }
        }

        return { stage1: stage1Solved, stage2: stage2Solved };
    }

    /**
     * Lädt ein vollständiges Rätsel (mit allen Details)
     */
    async getPuzzle(day) {
        try {
            // Prüfe Cache
            if (this.puzzleCache.has(day)) {
                return this.puzzleCache.get(day);
            }

            // Lade aus Metadaten oder vom Server
            const metadata = this.puzzles.get(day);
            if (!metadata || metadata.placeholder) {
                throw new Error(`Rätsel für Tag ${day} nicht verfügbar`);
            }

            let puzzle;
            if (metadata.loaded && metadata.url) {
                // Lade vollständiges Rätsel
                const response = await fetch(metadata.url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                puzzle = await response.json();
            } else {
                // Verwende Metadaten
                puzzle = { ...metadata };
            }

            // Cache das Rätsel
            this.puzzleCache.set(day, puzzle);
            
            console.log(`📦 Rätsel ${day} geladen:`, puzzle.title);
            return puzzle;

        } catch (error) {
            console.error(`Fehler beim Laden von Rätsel ${day}:`, error);
            throw error;
        }
    }

    /**
     * Markiert ein Rätsel als gelöst
     */
    markPuzzleAsSolved(day, points = 0) {
        try {
            // Update global state
            if (window.WinterRallyeApp && window.WinterRallyeApp.state) {
                window.WinterRallyeApp.state.solvedPuzzles.add(day);
                window.WinterRallyeApp.state.userProgress.totalPoints += points;
                
                // Update Stage-Progress
                if (day <= this.config.stage1Days) {
                    window.WinterRallyeApp.state.userProgress.stage1Progress++;
                } else {
                    window.WinterRallyeApp.state.userProgress.stage2Progress++;
                }
            }

            // Aktualisiere Kalender-Display
            this.updateCalendarDisplay();

            // Analytics
            if (window.TrackingAdapter) {
                window.TrackingAdapter.track('puzzle_solved', {
                    day,
                    points,
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`✅ Rätsel ${day} als gelöst markiert (${points} Punkte)`);

        } catch (error) {
            console.error(`Fehler beim Markieren von Rätsel ${day}:`, error);
        }
    }

    /**
     * Setzt den Fortschritt zurück
     */
    resetProgress() {
        this.puzzleCache.clear();
        this.updateCalendarDisplay();
        console.log('🔄 Kalender-Fortschritt zurückgesetzt');
    }

    /**
     * Gibt Statistiken über den Kalender zurück
     */
    getStats() {
        const totalPuzzles = this.config.totalDays;
        const availablePuzzles = Array.from({ length: totalPuzzles }, (_, i) => i + 1)
            .filter(day => this.isPuzzleAvailable(day, this.getCurrentDecemberDay())).length;
        
        const solvedPuzzles = Array.from({ length: totalPuzzles }, (_, i) => i + 1)
            .filter(day => this.isPuzzleSolved(day)).length;

        const progress = this.calculateStageProgress();

        return {
            total: totalPuzzles,
            available: availablePuzzles,
            solved: solvedPuzzles,
            remaining: availablePuzzles - solvedPuzzles,
            stage1: progress.stage1,
            stage2: progress.stage2,
            completionRate: (solvedPuzzles / totalPuzzles) * 100
        };
    }
}

// Globale Instanz erstellen
const calendarLogic = new CalendarLogic();

// Export für Module
window.CalendarLogic = calendarLogic;