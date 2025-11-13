/**
 * Tracking Adapter - Analytics und Tracking für Rätzel Winter 2025
 * Privacy-respektierendes Tracking ohne externe Services
 */

'use strict';

/**
 * Tracking-Adapter-Klasse für lokale Analytics
 */
class TrackingAdapter {
    constructor() {
        this.isInitialized = false;
        this.eventQueue = [];
        this.sessionData = new Map();
        this.metrics = new Map();
        this.isEnabled = true;
        
        // Konfiguration
        this.config = {
            // Privacy-Einstellungen
            privacy: {
                respectDoNotTrack: true,
                anonymizeData: true,
                localStorageOnly: true,
                dataRetentionDays: 30
            },
            
            // Event-Kategorien
            categories: {
                user: ['app_initialized', 'session_start', 'session_end'],
                puzzle: ['puzzle_opened', 'puzzle_solved', 'answer_submitted'],
                navigation: ['page_view', 'link_clicked', 'modal_opened'],
                performance: ['load_time', 'api_response_time'],
                security: ['security_event', 'qr_verification', 'rate_limit_hit'],
                error: ['javascript_error', 'network_error', 'validation_error']
            },
            
            // Batch-Verarbeitung
            batch: {
                enabled: true,
                maxEvents: 50,
                flushInterval: 30000, // 30 Sekunden
                maxQueueSize: 500
            },
            
            // Storage-Einstellungen
            storage: {
                keyPrefix: 'winterRallye2025_tracking_',
                compression: false,
                encryption: false
            },
            
            // Performance-Monitoring
            performance: {
                trackPageLoad: true,
                trackResourceTiming: false,
                sampleRate: 1.0 // 100% der Events
            }
        };

        // Performance-Start-Zeit
        this.performanceStart = performance.now();
        
        // Event-Bindings
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }

    /**
     * Initialisiert das Tracking-System
     */
    async init() {
        try {
            console.log('📊 Tracking-Adapter wird initialisiert...');
            
            // Prüfe Do-Not-Track
            this.checkDoNotTrack();

            if (!this.isEnabled) {
                console.log('🚫 Tracking deaktiviert (Do Not Track)');
                return;
            }

            // Initialisiere Session
            this.initializeSession();

            // Lade gespeicherte Daten
            this.loadStoredData();

            // Setup Event-Listener
            this.setupEventListeners();

            // Starte Batch-Verarbeitung
            if (this.config.batch.enabled) {
                this.startBatchProcessing();
            }

            // Performance-Tracking
            if (this.config.performance.trackPageLoad) {
                this.trackPageLoad();
            }

            // Bereinige alte Daten
            this.cleanupOldData();

            this.isInitialized = true;
            console.log('✅ Tracking-Adapter initialisiert');

            // Track Initialisierung
            this.track('app_initialized', {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent.substring(0, 100), // Gekürzt für Privacy
                language: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });

        } catch (error) {
            console.error('❌ Fehler bei Tracking-Adapter-Initialisierung:', error);
            this.isEnabled = false;
        }
    }

    /**
     * Prüft Do-Not-Track-Einstellung
     */
    checkDoNotTrack() {
        if (!this.config.privacy.respectDoNotTrack) {
            return;
        }

        // Prüfe Do-Not-Track Header
        const dnt = navigator.doNotTrack || navigator.msDoNotTrack || window.doNotTrack;
        if (dnt === '1' || dnt === 'yes') {
            this.isEnabled = false;
            console.log('🚫 Tracking deaktiviert durch Do-Not-Track');
        }

        // Prüfe lokale Storage-Einstellung
        const userPreference = localStorage.getItem('winterRallye2025_tracking_disabled');
        if (userPreference === 'true') {
            this.isEnabled = false;
            console.log('🚫 Tracking deaktiviert durch Benutzereinstellung');
        }
    }

    /**
     * Initialisiert Session-Daten
     */
    initializeSession() {
        const sessionId = this.generateSessionId();
        const sessionStart = Date.now();
        
        this.sessionData.set('id', sessionId);
        this.sessionData.set('start', sessionStart);
        this.sessionData.set('lastActivity', sessionStart);
        this.sessionData.set('pageViews', 0);
        this.sessionData.set('events', 0);

        // Speichere Session-ID
        sessionStorage.setItem('winterRallye2025_session_id', sessionId);

        console.log('📊 Session initialisiert:', sessionId);
    }

    /**
     * Lädt gespeicherte Tracking-Daten
     */
    loadStoredData() {
        try {
            // Lade Metriken
            const metricsKey = this.config.storage.keyPrefix + 'metrics';
            const storedMetrics = localStorage.getItem(metricsKey);
            
            if (storedMetrics) {
                const parsed = JSON.parse(storedMetrics);
                for (const [key, value] of Object.entries(parsed)) {
                    this.metrics.set(key, value);
                }
                console.log(`📊 ${Object.keys(parsed).length} Metriken geladen`);
            }

        } catch (error) {
            console.warn('Fehler beim Laden der Tracking-Daten:', error);
        }
    }

    /**
     * Setup Event-Listener
     */
    setupEventListeners() {
        // Page Unload
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        
        // Visibility Change
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Error Tracking
        window.addEventListener('error', (event) => {
            this.trackError('javascript_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Unhandled Promise Rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError('promise_rejection', {
                reason: event.reason?.toString() || 'Unknown'
            });
        });

        // Performance Entries (falls unterstützt)
        if ('PerformanceObserver' in window && this.config.performance.trackResourceTiming) {
            this.setupPerformanceObserver();
        }
    }

    /**
     * Setup Performance Observer
     */
    setupPerformanceObserver() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'navigation') {
                        this.trackPerformance('navigation', {
                            loadTime: entry.loadEventEnd - entry.loadEventStart,
                            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                            firstPaint: entry.responseEnd - entry.requestStart
                        });
                    }
                }
            });

            observer.observe({ entryTypes: ['navigation'] });

        } catch (error) {
            console.warn('Performance Observer Setup fehlgeschlagen:', error);
        }
    }

    /**
     * Tracked ein Event
     */
    track(eventName, data = {}, category = 'user') {
        if (!this.isEnabled || !this.isInitialized) {
            return;
        }

        try {
            // Sample-Rate prüfen
            if (Math.random() > this.config.performance.sampleRate) {
                return;
            }

            const event = {
                name: eventName,
                category: this.determineCategory(eventName),
                timestamp: Date.now(),
                sessionId: this.sessionData.get('id'),
                data: this.sanitizeData(data),
                sequence: this.sessionData.get('events') + 1
            };

            // Event zur Queue hinzufügen
            this.eventQueue.push(event);

            // Event-Counter erhöhen
            this.sessionData.set('events', event.sequence);
            this.sessionData.set('lastActivity', event.timestamp);

            // Metrik aktualisieren
            this.updateMetric(eventName);

            // Sofortige Verarbeitung für kritische Events
            if (this.isCriticalEvent(eventName)) {
                this.flushQueue();
            }

            console.log(`📊 Event tracked: ${eventName}`, data);

        } catch (error) {
            console.error('Fehler beim Event-Tracking:', error);
        }
    }

    /**
     * Bestimmt Kategorie für Event
     */
    determineCategory(eventName) {
        for (const [category, events] of Object.entries(this.config.categories)) {
            if (events.includes(eventName)) {
                return category;
            }
        }
        return 'user'; // Default
    }

    /**
     * Sanitiert Event-Daten für Privacy
     */
    sanitizeData(data) {
        if (!this.config.privacy.anonymizeData) {
            return data;
        }

        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            // Entferne persönliche Daten
            if (this.isPersonalData(key)) {
                continue;
            }

            // Beschränke String-Länge
            if (typeof value === 'string' && value.length > 100) {
                sanitized[key] = value.substring(0, 100) + '...';
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Prüft ob ein Feld persönliche Daten enthält
     */
    isPersonalData(key) {
        const personalFields = ['email', 'name', 'address', 'phone', 'ip'];
        return personalFields.some(field => key.toLowerCase().includes(field));
    }

    /**
     * Prüft ob Event kritisch ist (sofortige Verarbeitung)
     */
    isCriticalEvent(eventName) {
        const criticalEvents = ['session_end', 'javascript_error', 'security_event'];
        return criticalEvents.includes(eventName);
    }

    /**
     * Aktualisiert Metrik-Counter
     */
    updateMetric(eventName) {
        const current = this.metrics.get(eventName) || 0;
        this.metrics.set(eventName, current + 1);
    }

    /**
     * Tracked Performance-Metrik
     */
    trackPerformance(name, metrics) {
        this.track('performance_' + name, metrics, 'performance');
    }

    /**
     * Tracked Fehler
     */
    trackError(type, errorData) {
        this.track('error_' + type, errorData, 'error');
    }

    /**
     * Tracked Page Load Performance
     */
    trackPageLoad() {
        window.addEventListener('load', () => {
            const loadTime = performance.now() - this.performanceStart;
            
            this.trackPerformance('page_load', {
                loadTime: Math.round(loadTime),
                readyState: document.readyState
            });
        });
    }

    /**
     * Startet Batch-Verarbeitung
     */
    startBatchProcessing() {
        setInterval(() => {
            if (this.eventQueue.length > 0) {
                this.flushQueue();
            }
        }, this.config.batch.flushInterval);

        // Flush bei maximaler Queue-Größe
        setInterval(() => {
            if (this.eventQueue.length >= this.config.batch.maxEvents) {
                this.flushQueue();
            }
        }, 1000);
    }

    /**
     * Verarbeitet Event-Queue
     */
    flushQueue() {
        if (this.eventQueue.length === 0) {
            return;
        }

        try {
            // Kopiere und leere Queue
            const events = [...this.eventQueue];
            this.eventQueue = [];

            // Speichere Events
            this.storeEvents(events);

            console.log(`📊 ${events.length} Events verarbeitet`);

        } catch (error) {
            console.error('Fehler beim Flush der Event-Queue:', error);
            // Events zurück zur Queue hinzufügen
            this.eventQueue.unshift(...events);
        }
    }

    /**
     * Speichert Events im localStorage
     */
    storeEvents(events) {
        if (!this.config.privacy.localStorageOnly) {
            return;
        }

        try {
            const storageKey = this.config.storage.keyPrefix + 'events_' + Date.now();
            const compressed = this.config.storage.compression ? 
                this.compressData(events) : 
                JSON.stringify(events);

            localStorage.setItem(storageKey, compressed);

            // Speichere auch aggregierte Metriken
            this.storeMetrics();

        } catch (error) {
            console.error('Fehler beim Speichern der Events:', error);
            
            // Versuche Platz zu schaffen
            this.cleanupStorage();
        }
    }

    /**
     * Speichert Metriken
     */
    storeMetrics() {
        try {
            const metricsKey = this.config.storage.keyPrefix + 'metrics';
            const metricsObject = Object.fromEntries(this.metrics);
            
            localStorage.setItem(metricsKey, JSON.stringify({
                ...metricsObject,
                lastUpdate: Date.now(),
                sessionId: this.sessionData.get('id')
            }));

        } catch (error) {
            console.error('Fehler beim Speichern der Metriken:', error);
        }
    }

    /**
     * Bereinigt alte Daten
     */
    cleanupOldData() {
        const cutoffDate = Date.now() - (this.config.privacy.dataRetentionDays * 24 * 60 * 60 * 1000);
        const prefix = this.config.storage.keyPrefix;

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            
            if (key && key.startsWith(prefix + 'events_')) {
                const timestamp = parseInt(key.split('_').pop());
                
                if (timestamp < cutoffDate) {
                    localStorage.removeItem(key);
                    console.log(`🧹 Alte Tracking-Daten entfernt: ${key}`);
                }
            }
        }
    }

    /**
     * Bereinigt Storage bei Platzmangel
     */
    cleanupStorage() {
        try {
            const prefix = this.config.storage.keyPrefix + 'events_';
            const keys = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keys.push(key);
                }
            }

            // Sortiere nach Timestamp (älteste zuerst)
            keys.sort();

            // Entferne älteste Einträge
            const toRemove = Math.ceil(keys.length * 0.3);
            for (let i = 0; i < toRemove; i++) {
                localStorage.removeItem(keys[i]);
            }

            console.log(`🧹 ${toRemove} alte Event-Batches entfernt`);

        } catch (error) {
            console.error('Storage-Bereinigung fehlgeschlagen:', error);
        }
    }

    /**
     * Generiert Session-ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Komprimiert Daten (einfache Implementierung)
     */
    compressData(data) {
        // Einfache JSON-Komprimierung durch Entfernen von Whitespace
        // In einer echten Implementierung könnte hier LZ-String o.ä. verwendet werden
        return JSON.stringify(data);
    }

    /**
     * Event-Handler für Before-Unload
     */
    handleBeforeUnload() {
        // Track Session-Ende
        this.track('session_end', {
            duration: Date.now() - this.sessionData.get('start'),
            pageViews: this.sessionData.get('pageViews'),
            totalEvents: this.sessionData.get('events')
        });

        // Flush finale Events
        this.flushQueue();
    }

    /**
     * Event-Handler für Visibility Change
     */
    handleVisibilityChange() {
        if (document.hidden) {
            this.track('page_hidden');
        } else {
            this.track('page_visible');
            this.sessionData.set('lastActivity', Date.now());
        }
    }

    /**
     * Tracked Page View
     */
    trackPageView(path = null) {
        const pageViews = this.sessionData.get('pageViews') + 1;
        this.sessionData.set('pageViews', pageViews);

        this.track('page_view', {
            path: path || window.location.pathname,
            referrer: document.referrer,
            pageNumber: pageViews
        }, 'navigation');
    }

    /**
     * Tracked Custom Conversion
     */
    trackConversion(conversionName, value = null) {
        this.track('conversion_' + conversionName, {
            value,
            timestamp: Date.now()
        }, 'user');
    }

    /**
     * Exportiert alle Tracking-Daten
     */
    exportData() {
        const data = {
            session: Object.fromEntries(this.sessionData),
            metrics: Object.fromEntries(this.metrics),
            events: this.getStoredEvents(),
            config: this.config
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * Holt gespeicherte Events
     */
    getStoredEvents() {
        const events = [];
        const prefix = this.config.storage.keyPrefix + 'events_';

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key && key.startsWith(prefix)) {
                try {
                    const stored = localStorage.getItem(key);
                    const parsed = JSON.parse(stored);
                    events.push(...parsed);
                } catch (error) {
                    console.warn(`Fehler beim Laden von ${key}:`, error);
                }
            }
        }

        return events.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Löscht alle Tracking-Daten
     */
    clearAllData() {
        const prefix = this.config.storage.keyPrefix;

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            
            if (key && key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        }

        this.eventQueue = [];
        this.metrics.clear();
        this.sessionData.clear();

        console.log('🧹 Alle Tracking-Daten gelöscht');
    }

    /**
     * Deaktiviert Tracking
     */
    disable() {
        this.isEnabled = false;
        localStorage.setItem('winterRallye2025_tracking_disabled', 'true');
        this.clearAllData();
        
        console.log('🚫 Tracking deaktiviert');
    }

    /**
     * Aktiviert Tracking
     */
    enable() {
        localStorage.removeItem('winterRallye2025_tracking_disabled');
        this.isEnabled = true;
        
        if (!this.isInitialized) {
            this.init();
        }
        
        console.log('✅ Tracking aktiviert');
    }

    /**
     * Bereinigung
     */
    destroy() {
        this.handleBeforeUnload();
        
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        console.log('📊 Tracking-Adapter beendet');
    }

    /**
     * Status-Report
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            enabled: this.isEnabled,
            sessionId: this.sessionData.get('id'),
            queueLength: this.eventQueue.length,
            totalEvents: this.sessionData.get('events') || 0,
            metricsCount: this.metrics.size,
            config: this.config
        };
    }

    /**
     * Analytics-Dashboard-Daten
     */
    getDashboardData() {
        const events = this.getStoredEvents();
        const now = Date.now();
        const dayAgo = now - (24 * 60 * 60 * 1000);

        return {
            overview: {
                totalEvents: events.length,
                uniqueSessions: new Set(events.map(e => e.sessionId)).size,
                recentEvents: events.filter(e => e.timestamp > dayAgo).length
            },
            
            eventCounts: Object.fromEntries(this.metrics),
            
            timeline: this.groupEventsByHour(events),
            
            categories: this.groupEventsByCategory(events),
            
            performance: this.aggregatePerformanceMetrics(events)
        };
    }

    /**
     * Gruppiert Events nach Stunden
     */
    groupEventsByHour(events) {
        const groups = {};
        
        events.forEach(event => {
            const hour = new Date(event.timestamp).toISOString().substr(0, 13) + ':00';
            groups[hour] = (groups[hour] || 0) + 1;
        });

        return groups;
    }

    /**
     * Gruppiert Events nach Kategorien
     */
    groupEventsByCategory(events) {
        const groups = {};
        
        events.forEach(event => {
            const category = event.category || 'unknown';
            groups[category] = (groups[category] || 0) + 1;
        });

        return groups;
    }

    /**
     * Aggregiert Performance-Metriken
     */
    aggregatePerformanceMetrics(events) {
        const perfEvents = events.filter(e => e.category === 'performance');
        
        if (perfEvents.length === 0) {
            return null;
        }

        const loadTimes = perfEvents
            .filter(e => e.data && e.data.loadTime)
            .map(e => e.data.loadTime);

        return {
            count: perfEvents.length,
            averageLoadTime: loadTimes.length > 0 ? 
                Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length) : null,
            minLoadTime: loadTimes.length > 0 ? Math.min(...loadTimes) : null,
            maxLoadTime: loadTimes.length > 0 ? Math.max(...loadTimes) : null
        };
    }
}

// Globale Instanz erstellen
const trackingAdapter = new TrackingAdapter();

// Export für Module
window.TrackingAdapter = trackingAdapter;