/**
 * Answers Store - Zentrale Funktionen für Stage-2 Antwort-Tracking und Speicherung
 * Verwaltet Zeit-Tracking, Normalisierung, Validierung und Backend-Submission
 */

'use strict';

/**
 * Stage-2 Answer Store Klasse
 */
class AnswersStore {
    constructor() {
        this.stage2Sessions = new Map(); // In-memory stage2 start-times
        this.config = {
            localStorageKey: 'wr_submissions_v1',
            sessionStorageKey: 'wr_stage2_sessions_v1',
            maxSubmissionsInMemory: 1000
        };
        this.isInitialized = false;
    }

    /**
     * Initialisiert den Answers Store
     */
    async init() {
        try {
            console.log('📝 Answers Store wird initialisiert...');
            
            // Lade bestehende Stage-2 Sessions aus sessionStorage
            this.loadSessionData();
            
            // Cleanup alte Einträge
            this.cleanupOldSessions();
            
            this.isInitialized = true;
            console.log('✅ Answers Store initialisiert');
            
        } catch (error) {
            console.error('❌ Fehler bei Answers Store Initialisierung:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Startet Stage-2 Zeit-Tracking für einen Tag
     * @param {number} day - Tag des Rätsels (1-24)
     * @param {Object} puzzleMeta - Metadaten des Rätsels
     * @param {Object} qrContext - QR-Code Kontext (payload, signature, etc.)
     * @returns {Object} Session-Info
     */
    trackStage2Start(day, puzzleMeta, qrContext) {
        try {
            const sessionId = `day${day}_${Date.now()}`;
            const startTime = Date.now();
            
            const sessionInfo = {
                sessionId,
                day,
                startedAt: startTime,
                puzzleMeta,
                qrContext: qrContext || {},
                userAgent: navigator.userAgent,
                pageUrl: window.location.href
            };
            
            // Speichere in Memory
            this.stage2Sessions.set(sessionId, sessionInfo);
            
            // Speichere in sessionStorage als Backup
            this.saveSessionData();
            
            console.log(`⏱️ Stage-2 Zeit-Tracking gestartet für Tag ${day}:`, sessionInfo);
            
            return sessionInfo;
            
        } catch (error) {
            console.error('❌ Fehler beim Stage-2 Start-Tracking:', error);
            return null;
        }
    }

    /**
     * Sendet eine Stage-2 Antwort ab
     * @param {Object} payload - Antwort-Payload
     * @returns {Promise<Object>} Result mit { ok, localSaved, serverSaved, errorMessage }
     */
    async submitStage2Answer(payload) {
        try {
            const {
                day,
                sessionId,
                answer_raw,
                stage2Config = {}
            } = payload;

            console.log(`📝 Stage-2 Antwort wird abgesendet für Tag ${day}:`, { answer_raw });

            // 1. Hole Session-Info
            const sessionInfo = this.stage2Sessions.get(sessionId);
            if (!sessionInfo) {
                throw new Error('Stage-2 Session nicht gefunden');
            }

            // 2. Normalisiere Antwort
            const answer_norm = await this.normalizeAnswer(answer_raw, stage2Config);
            
            // 3. Prüfe Antwort-Korrektheit (falls Hashes verfügbar)
            const isCorrect = await this.validateAnswer(answer_norm, stage2Config);
            
            // 4. Berechne Zeit-Tracking
            const submittedAt = Date.now();
            const durationMs = submittedAt - sessionInfo.startedAt;
            
            // 5. Baue Submission-Objekt
            const submission = {
                userKey: window.WR_USER_KEY || 'unknown',
                day,
                stage: 2,
                answer_raw,
                answer_norm,
                isCorrect,
                startedAt: sessionInfo.startedAt,
                submittedAt,
                durationMs,
                source: 'qr-stage2',
                qrPayloadDecoded: sessionInfo.qrContext.payload || null,
                userAgent: sessionInfo.userAgent,
                pageUrl: sessionInfo.pageUrl,
                timestamp: new Date().toISOString(),
                sessionId,
                points: stage2Config.points || 0
            };

            console.log('📊 Submission-Objekt erstellt:', submission);

            // 6. Speichere lokal
            const localSaved = await this.saveToLocalStorage(submission);
            
            // 7. Sende an Server (falls konfiguriert)
            const serverResult = await this.submitToServer(submission);
            
            // 8. Cleanup Session
            this.stage2Sessions.delete(sessionId);
            this.saveSessionData();
            
            // 9. Erstelle Result
            const result = {
                ok: true,
                localSaved,
                serverSaved: serverResult.success,
                serverError: serverResult.error,
                isCorrect,
                durationMs,
                submittedAt
            };

            console.log('✅ Stage-2 Submission abgeschlossen:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Fehler beim Stage-2 Submit:', error);
            return {
                ok: false,
                localSaved: false,
                serverSaved: false,
                errorMessage: error.message
            };
        }
    }

    /**
     * Normalisiert eine Antwort basierend auf den Konfigurationsregeln
     * @param {string} answer - Rohtext der Antwort
     * @param {Object} config - Konfiguration mit normalize-Regeln und accepted-Array
     * @returns {Promise<string>} Normalisierte Antwort
     */
    async normalizeAnswer(answer, config) {
        try {
            if (!answer || typeof answer !== 'string') {
                return '';
            }

            let normalized = answer;

            // Parse Normalisierungsregeln
            const normalizeRule = config.normalize || 'lowercase, trim, collapse-spaces';
            const rules = normalizeRule.split(',').map(rule => rule.trim());

            // Wende Regeln in Reihenfolge an
            for (const rule of rules) {
                switch (rule) {
                    case 'lowercase':
                        normalized = normalized.toLowerCase();
                        break;
                    case 'trim':
                        normalized = normalized.trim();
                        break;
                    case 'collapse-spaces':
                        normalized = normalized.replace(/\s+/g, ' ');
                        break;
                    case 'replace-ä->ae':
                        normalized = normalized.replace(/ä/g, 'ae');
                        break;
                    case 'replace-ö->oe':
                        normalized = normalized.replace(/ö/g, 'oe');
                        break;
                    case 'replace-ü->ue':
                        normalized = normalized.replace(/ü/g, 'ue');
                        break;
                    case 'replace-ß->ss':
                        normalized = normalized.replace(/ß/g, 'ss');
                        break;
                    case 'remove-spaces':
                        normalized = normalized.replace(/\s/g, '');
                        break;
                    case 'remove-punctuation':
                        normalized = normalized.replace(/[.,;:!?-]/g, '');
                        break;
                    default:
                        console.warn(`⚠️ Unbekannte Normalisierungsregel: ${rule}`);
                }
            }

            console.log(`🔄 Antwort-Normalisierung: "${answer}" → "${normalized}"`);
            return normalized;
                
        } catch (error) {
            console.warn('⚠️ Normalisierung fehlgeschlagen, nutze Fallback:', error);
            return answer.toLowerCase().trim().replace(/\s+/g, ' ');
        }
    }

    /**
     * Validiert eine normalisierte Antwort gegen accepted-Array oder salted Hashes
     * @param {string} normalizedAnswer - Normalisierte Antwort
     * @param {Object} config - Stage-2 Konfiguration mit accepted-Array oder answer_hashes
     * @returns {Promise<boolean>} True wenn korrekt
     */
    async validateAnswer(normalizedAnswer, config) {
        try {
            // Methode 1: Prüfe gegen accepted-Array (für Tests)
            if (config.accepted && Array.isArray(config.accepted)) {
                const isAccepted = config.accepted.includes(normalizedAnswer);
                console.log(`✅ Antwort-Validierung via accepted-Array: "${normalizedAnswer}" → ${isAccepted}`);
                return isAccepted;
            }

            // Methode 2: Prüfe gegen salted Hashes (für Production)
            if (config.answer_hashes && Array.isArray(config.answer_hashes)) {
                // Nutze SecurityStatic für Hash-Validierung
                if (window.SecurityStatic && typeof window.SecurityStatic.validateAnswerHash === 'function') {
                    const salt = config.salt || '';
                    
                    for (const hash of config.answer_hashes) {
                        const isValid = await window.SecurityStatic.validateAnswerHash(normalizedAnswer, hash, salt);
                        if (isValid) {
                            console.log('✅ Stage-2 Antwort korrekt validiert via Hash');
                            return true;
                        }
                    }
                    
                    console.log('❌ Stage-2 Antwort ungültig');
                    return false;
                }

                console.warn('⚠️ SecurityStatic nicht verfügbar für Hash-Validierung');
                return false;
            }

            // Fallback: Keine Validierung konfiguriert
            console.log('📝 Keine Validierung konfiguriert, markiere als korrekt');
            return true;
            
        } catch (error) {
            console.error('❌ Fehler bei Antwort-Validierung:', error);
            return false;
        }
    }

    /**
     * Speichert Submission in localStorage
     * @param {Object} submission - Submission-Objekt
     * @returns {Promise<boolean>} True wenn erfolgreich
     */
    async saveToLocalStorage(submission) {
        try {
            if (!window.WR_ANSWER_CFG?.enableLocalBackup) {
                console.log('📝 LocalStorage Backup deaktiviert');
                return false;
            }

            // Hole bestehende Submissions
            const existingData = localStorage.getItem(this.config.localStorageKey) || '[]';
            const submissions = JSON.parse(existingData);
            
            // Füge neue Submission hinzu
            submissions.push(submission);
            
            // Cleanup: Behalte nur die letzten N Submissions
            if (submissions.length > this.config.maxSubmissionsInMemory) {
                submissions.splice(0, submissions.length - this.config.maxSubmissionsInMemory);
            }
            
            // Speichere zurück
            localStorage.setItem(this.config.localStorageKey, JSON.stringify(submissions));
            
            console.log(`💾 Submission lokal gespeichert. Total: ${submissions.length}`);
            return true;
            
        } catch (error) {
            console.error('❌ Fehler beim lokalen Speichern:', error);
            return false;
        }
    }

    /**
     * Sendet Submission an Backend-Server
     * @param {Object} submission - Submission-Objekt
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async submitToServer(submission) {
        try {
            const endpoint = window.WR_ANSWER_CFG?.submitEndpoint;
            
            if (!endpoint || endpoint.trim() === '') {
                console.log('📝 Kein Server-Endpoint konfiguriert, nur lokale Speicherung');
                return { success: false, error: 'No endpoint configured' };
            }

            const timeoutMs = window.WR_ANSWER_CFG?.timeoutMs || 8000;
            const headers = window.WR_ANSWER_CFG?.headers || { 'Content-Type': 'application/json' };

            console.log(`🌐 Sende Submission an ${endpoint}...`);

            // Erstelle AbortController für Timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(submission),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Server-Submission erfolgreich:', result);
            
            return { success: true, response: result };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('⏰ Server-Submission timeout');
                return { success: false, error: 'Request timeout' };
            }
            
            console.error('❌ Server-Submission fehlgeschlagen:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Lädt Session-Daten aus sessionStorage
     */
    loadSessionData() {
        try {
            const sessionData = sessionStorage.getItem(this.config.sessionStorageKey);
            if (sessionData) {
                const sessions = JSON.parse(sessionData);
                this.stage2Sessions = new Map(Object.entries(sessions));
                console.log(`📥 ${this.stage2Sessions.size} Stage-2 Sessions aus sessionStorage geladen`);
            }
        } catch (error) {
            console.warn('⚠️ Fehler beim Laden der Session-Daten:', error);
        }
    }

    /**
     * Speichert Session-Daten in sessionStorage
     */
    saveSessionData() {
        try {
            const sessionsObj = Object.fromEntries(this.stage2Sessions);
            sessionStorage.setItem(this.config.sessionStorageKey, JSON.stringify(sessionsObj));
        } catch (error) {
            console.warn('⚠️ Fehler beim Speichern der Session-Daten:', error);
        }
    }

    /**
     * Cleanup alte Sessions (älter als 4 Stunden)
     */
    cleanupOldSessions() {
        const maxAge = 4 * 60 * 60 * 1000; // 4 Stunden
        const now = Date.now();
        
        let cleaned = 0;
        for (const [sessionId, sessionInfo] of this.stage2Sessions) {
            if (now - sessionInfo.startedAt > maxAge) {
                this.stage2Sessions.delete(sessionId);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 ${cleaned} alte Stage-2 Sessions bereinigt`);
            this.saveSessionData();
        }
    }

    /**
     * Holt alle lokalen Submissions für Debug/Admin
     * @returns {Array} Array von Submission-Objekten
     */
    getAllLocalSubmissions() {
        try {
            const data = localStorage.getItem(this.config.localStorageKey) || '[]';
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Fehler beim Laden lokaler Submissions:', error);
            return [];
        }
    }

    /**
     * Löscht alle lokalen Submissions (Admin-Funktion)
     */
    clearAllLocalSubmissions() {
        try {
            localStorage.removeItem(this.config.localStorageKey);
            console.log('🗑️ Alle lokalen Submissions gelöscht');
            return true;
        } catch (error) {
            console.error('❌ Fehler beim Löschen lokaler Submissions:', error);
            return false;
        }
    }
}

// Globale Instanz erstellen
const answersStore = new AnswersStore();

// Export als WR_ANSWER_STORE für globale API
window.WR_ANSWER_STORE = answersStore;

console.log('✅ Answers Store Modul als WR_ANSWER_STORE geladen');