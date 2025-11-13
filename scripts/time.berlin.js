/**
 * Time Berlin - Zeitfunktionen für Rätzel Winter 2025
 * Berliner Zeit-Management und Countdown-Funktionalität
 */

'use strict';

/**
 * Berliner Zeit-Klasse für präzise Zeitverwaltung
 */
class TimeBerlin {
    constructor() {
        this.isInitialized = false;
        this.timeZone = 'Europe/Berlin';
        this.offsetCache = new Map();
        this.timeProviders = ['local', 'worldtimeapi', 'manual'];
        this.fallbackOffset = 1; // Standard-Offset für Berlin (MEZ)
        
        // Konfiguration
        this.config = {
            // Puzzle-Release-Zeit
            dailyReleaseTime: {
                hour: 6,
                minute: 0,
                second: 0
            },
            
            // Zeitquellen-Präferenz
            timeSource: 'auto', // auto, local, api, manual
            
            // Cache-Einstellungen
            offsetCacheTimeout: 300000, // 5 Minuten
            
            // API-Einstellungen
            api: {
                timeout: 5000,
                maxRetries: 3,
                endpoints: [
                    'https://worldtimeapi.org/api/timezone/Europe/Berlin'
                ]
            },
            
            // Sommerzeit-Behandlung
            dst: {
                autoDetect: true,
                manualRules: {
                    start: { month: 3, lastSunday: true, hour: 2 },
                    end: { month: 10, lastSunday: true, hour: 3 }
                }
            }
        };

        // Event-Handler für Zeitaktualisierungen
        this.timeUpdateCallbacks = [];
        this.updateInterval = null;
    }

    /**
     * Initialisiert das Zeit-System
     */
    async init() {
        try {
            console.log('🕒 Zeit-System wird initialisiert...');
            
            // Teste Browser-Zeit-APIs
            this.testTimeAPIs();

            // Ermittle präzise Berliner Zeit
            await this.calibrateTime();

            // Starte Zeit-Updates
            this.startTimeUpdates();

            this.isInitialized = true;
            console.log('✅ Zeit-System initialisiert');

        } catch (error) {
            console.error('❌ Fehler bei Zeit-System-Initialisierung:', error);
            // Fallback auf lokale Zeit
            this.initializeFallback();
        }
    }

    /**
     * Testet verfügbare Zeit-APIs
     */
    testTimeAPIs() {
        const available = {};
        
        // Intl.DateTimeFormat
        try {
            const formatter = new Intl.DateTimeFormat('de-DE', {
                timeZone: this.timeZone,
                timeZoneName: 'short'
            });
            available.intl = true;
            console.log('✅ Intl.DateTimeFormat verfügbar');
        } catch (error) {
            available.intl = false;
            console.warn('⚠️ Intl.DateTimeFormat nicht verfügbar');
        }

        // Date.toLocaleString mit timeZone
        try {
            const test = new Date().toLocaleString('de-DE', { timeZone: this.timeZone });
            available.toLocaleString = true;
            console.log('✅ toLocaleString mit timeZone verfügbar');
        } catch (error) {
            available.toLocaleString = false;
            console.warn('⚠️ toLocaleString mit timeZone nicht verfügbar');
        }

        this.apiAvailability = available;
    }

    /**
     * Kalibriert die Zeit mit verschiedenen Quellen
     */
    async calibrateTime() {
        let timeOffset = null;
        
        switch (this.config.timeSource) {
            case 'api':
                timeOffset = await this.getTimeFromAPI();
                break;
            case 'local':
                timeOffset = this.getLocalTimeOffset();
                break;
            case 'manual':
                timeOffset = this.getManualTimeOffset();
                break;
            case 'auto':
            default:
                // Versuche API, fallback auf lokal
                timeOffset = await this.getTimeFromAPI();
                if (timeOffset === null) {
                    timeOffset = this.getLocalTimeOffset();
                }
                break;
        }

        this.currentOffset = timeOffset || this.fallbackOffset;
        
        // Cache den Offset
        this.offsetCache.set('current', {
            offset: this.currentOffset,
            timestamp: Date.now(),
            source: this.determinedSource || 'fallback'
        });

        console.log(`🕒 Zeit kalibriert: Offset ${this.currentOffset}h (${this.determinedSource})`);
    }

    /**
     * Holt Zeit von externer API
     */
    async getTimeFromAPI() {
        for (const endpoint of this.config.api.endpoints) {
            try {
                const response = await this.fetchWithTimeout(endpoint, this.config.api.timeout);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                
                // Parse WorldTimeAPI Response
                if (data.datetime && data.utc_offset) {
                    const serverTime = new Date(data.datetime);
                    const localTime = new Date();
                    const diff = serverTime.getTime() - localTime.getTime();
                    
                    this.determinedSource = 'api';
                    console.log('✅ Zeit von API erhalten:', serverTime.toISOString());
                    
                    return this.parseOffset(data.utc_offset);
                }

            } catch (error) {
                console.warn(`⚠️ API-Zeitabfrage fehlgeschlagen (${endpoint}):`, error.message);
                continue;
            }
        }

        return null;
    }

    /**
     * Berechnet lokalen Zeit-Offset für Berlin
     */
    getLocalTimeOffset() {
        try {
            if (this.apiAvailability.intl) {
                // Verwende Intl API für präzisen Offset
                const now = new Date();
                const berlinTime = new Date(now.toLocaleString("en-US", {timeZone: this.timeZone}));
                const localTime = new Date(now.toLocaleString("en-US"));
                
                const offsetMs = berlinTime.getTime() - localTime.getTime();
                const offsetHours = Math.round(offsetMs / (1000 * 60 * 60));
                
                this.determinedSource = 'local-intl';
                return offsetHours;

            } else {
                // Fallback: Manuelle DST-Berechnung
                const now = new Date();
                const offset = this.isDaylightSavingTime(now) ? 2 : 1;
                
                this.determinedSource = 'local-manual';
                return offset;
            }

        } catch (error) {
            console.error('Lokaler Zeit-Offset fehlgeschlagen:', error);
            this.determinedSource = 'fallback';
            return this.fallbackOffset;
        }
    }

    /**
     * Manueller Zeit-Offset (für Tests)
     */
    getManualTimeOffset() {
        const now = new Date();
        const isDST = this.isDaylightSavingTime(now);
        this.determinedSource = 'manual';
        return isDST ? 2 : 1; // MEZ (1) oder MESZ (2)
    }

    /**
     * Parsed UTC-Offset aus String
     */
    parseOffset(offsetString) {
        // Format: "+01:00" oder "+0200"
        const match = offsetString.match(/([+-])(\d{1,2}):?(\d{2})/);
        if (match) {
            const sign = match[1] === '+' ? 1 : -1;
            const hours = parseInt(match[2], 10);
            const minutes = parseInt(match[3], 10);
            
            return sign * (hours + minutes / 60);
        }
        
        return this.fallbackOffset;
    }

    /**
     * Prüft ob gerade Sommerzeit ist
     */
    isDaylightSavingTime(date = new Date()) {
        if (!this.config.dst.autoDetect) {
            return this.manualDSTCheck(date);
        }

        try {
            // Verwende JavaScript's automatische DST-Erkennung
            const january = new Date(date.getFullYear(), 0, 1);
            const july = new Date(date.getFullYear(), 6, 1);
            
            const standardOffset = january.getTimezoneOffset();
            const dstOffset = july.getTimezoneOffset();
            
            // DST ist aktiv wenn der aktuelle Offset anders ist als der Standard-Winter-Offset
            return date.getTimezoneOffset() !== standardOffset;

        } catch (error) {
            console.warn('Automatische DST-Erkennung fehlgeschlagen, verwende manuelle Regeln');
            return this.manualDSTCheck(date);
        }
    }

    /**
     * Manuelle DST-Prüfung nach EU-Regeln
     */
    manualDSTCheck(date) {
        const year = date.getFullYear();
        
        // Letzter Sonntag im März (DST-Beginn)
        const dstStart = this.getLastSunday(year, 3);
        dstStart.setHours(2, 0, 0, 0);
        
        // Letzter Sonntag im Oktober (DST-Ende)
        const dstEnd = this.getLastSunday(year, 10);
        dstEnd.setHours(3, 0, 0, 0);
        
        return date >= dstStart && date < dstEnd;
    }

    /**
     * Findet letzten Sonntag in einem Monat
     */
    getLastSunday(year, month) {
        const date = new Date(year, month, 0); // Letzter Tag des Monats
        const dayOfWeek = date.getDay();
        
        // Gehe zurück zum letzten Sonntag
        const daysBack = dayOfWeek === 0 ? 0 : dayOfWeek;
        date.setDate(date.getDate() - daysBack);
        
        return date;
    }

    /**
     * Gibt aktuelle Berliner Zeit zurück
     */
    getCurrentBerlinTime() {
        try {
            const now = new Date();
            
            if (this.apiAvailability.intl) {
                // Präzise Berliner Zeit via Intl
                return new Date(now.toLocaleString("en-US", {timeZone: this.timeZone}));
            } else {
                // Fallback mit Offset-Berechnung
                const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                return new Date(utc + (this.currentOffset * 3600000));
            }

        } catch (error) {
            console.error('Fehler bei Berliner Zeit-Berechnung:', error);
            // Letzte Rettung: lokale Zeit
            return new Date();
        }
    }

    /**
     * Formatiert Zeit für Anzeige
     */
    formatTime(date = null, format = 'time') {
        const time = date || this.getCurrentBerlinTime();
        
        try {
            switch (format) {
                case 'time':
                    return time.toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                
                case 'datetime':
                    return time.toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                
                case 'date':
                    return time.toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                
                case 'iso':
                    return time.toISOString();
                
                default:
                    return time.toString();
            }

        } catch (error) {
            console.error('Zeit-Formatierung fehlgeschlagen:', error);
            return time.toString();
        }
    }

    /**
     * Berechnet Zeit bis zum nächsten Rätsel
     */
    getNextPuzzleTime(currentTime = null) {
        const now = currentTime || this.getCurrentBerlinTime();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth() + 1;
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Nur während Dezember relevant
        if (currentMonth !== 12 || currentDay > 24) {
            return null; // Außerhalb der Rallye-Zeit
        }

        const releaseTime = this.config.dailyReleaseTime;
        let nextReleaseDay = currentDay;
        
        // Wenn heute schon nach Release-Zeit, dann nächster Tag
        if (currentHour > releaseTime.hour || 
            (currentHour === releaseTime.hour && currentMinute >= releaseTime.minute)) {
            nextReleaseDay = currentDay + 1;
        }

        // Letztes Rätsel war Tag 24
        if (nextReleaseDay > 24) {
            return null;
        }

        const nextRelease = new Date(now);
        nextRelease.setDate(nextReleaseDay);
        nextRelease.setHours(releaseTime.hour, releaseTime.minute, releaseTime.second, 0);
        
        return nextRelease;
    }

    /**
     * Formatiert Dauer-Anzeige
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Gibt aktuellen Dezember-Tag zurück
     */
    getCurrentDecemberDay(currentTime = null) {
        const now = currentTime || this.getCurrentBerlinTime();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        
        if (month === 12 && day >= 1 && day <= 24) {
            return day;
        } else if (month > 12) {
            return 24; // Nach Dezember: alle verfügbar
        }
        
        return null; // Vor Dezember
    }

    /**
     * Prüft ob ein Tag verfügbar ist
     */
    isPuzzleDayAvailable(puzzleDay, currentTime = null) {
        const now = currentTime || this.getCurrentBerlinTime();
        const currentDecemberDay = this.getCurrentDecemberDay(now);
        
        if (currentDecemberDay === null) {
            // Vor oder nach Dezember
            const month = now.getMonth() + 1;
            return month > 12; // Nach Dezember: alle verfügbar
        }
        
        // Im Dezember: verfügbar wenn Tag erreicht und nach Release-Zeit
        if (puzzleDay < currentDecemberDay) {
            return true; // Vergangene Tage immer verfügbar
        }
        
        if (puzzleDay === currentDecemberDay) {
            // Heute: prüfe ob Release-Zeit erreicht
            const releaseTime = this.config.dailyReleaseTime;
            const hour = now.getHours();
            const minute = now.getMinutes();
            
            return hour > releaseTime.hour || 
                   (hour === releaseTime.hour && minute >= releaseTime.minute);
        }
        
        return false; // Zukünftige Tage nicht verfügbar
    }

    /**
     * Registriert Callback für Zeit-Updates
     */
    onTimeUpdate(callback) {
        if (typeof callback === 'function') {
            this.timeUpdateCallbacks.push(callback);
        }
    }

    /**
     * Startet regelmäßige Zeit-Updates
     */
    startTimeUpdates() {
        // Update alle Sekunde
        this.updateInterval = setInterval(() => {
            this.notifyTimeUpdate();
        }, 1000);

        // Kalibriere alle 5 Minuten neu
        setInterval(() => {
            this.calibrateTime().catch(error => {
                console.warn('Zeit-Rekalibrierung fehlgeschlagen:', error);
            });
        }, 300000);
    }

    /**
     * Benachrichtigt alle Callbacks über Zeit-Update
     */
    notifyTimeUpdate() {
        const currentTime = this.getCurrentBerlinTime();
        
        this.timeUpdateCallbacks.forEach(callback => {
            try {
                callback(currentTime);
            } catch (error) {
                console.error('Zeit-Update-Callback fehlgeschlagen:', error);
            }
        });
    }

    /**
     * Stoppt Zeit-Updates
     */
    stopTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Fetch mit Timeout
     */
    async fetchWithTimeout(url, timeout) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    /**
     * Fallback-Initialisierung
     */
    initializeFallback() {
        console.warn('⚠️ Zeit-System Fallback aktiviert');
        this.currentOffset = this.fallbackOffset;
        this.determinedSource = 'fallback';
        this.isInitialized = true;
        
        // Starte Updates auch im Fallback
        this.startTimeUpdates();
    }

    /**
     * Bereinigung bei Shutdown
     */
    destroy() {
        this.stopTimeUpdates();
        this.timeUpdateCallbacks = [];
        this.offsetCache.clear();
        console.log('🕒 Zeit-System beendet');
    }

    /**
     * Status-Report
     */
    getStatus() {
        const now = this.getCurrentBerlinTime();
        
        return {
            initialized: this.isInitialized,
            currentTime: now.toISOString(),
            timeZone: this.timeZone,
            offset: this.currentOffset,
            source: this.determinedSource,
            isDST: this.isDaylightSavingTime(now),
            currentDecemberDay: this.getCurrentDecemberDay(now),
            nextPuzzleTime: this.getNextPuzzleTime(now)?.toISOString() || null,
            apiAvailability: this.apiAvailability,
            config: this.config
        };
    }
}

// Globale Instanz erstellen
const timeBerlin = new TimeBerlin();

// Export für Module
window.TimeBerlin = timeBerlin;