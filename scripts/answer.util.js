/**
 * Answer Util - Antwort-Verarbeitung für Rätzel Winter 2025
 * Sichere Behandlung und Verifikation von Rätsel-Antworten
 */

'use strict';

/**
 * Antwort-Utility-Klasse für Rätsel-Verarbeitung
 */
class AnswerUtil {
    constructor() {
        this.isInitialized = false;
        this.answerCache = new Map();
        this.submissionHistory = [];
        this.musicPlayer = null; // Music Integration v3.7
        this.smartLogic = null; // Smart Logic Engine v3.7
        
        // Konfiguration für Antwort-Verarbeitung
        this.config = {
            // Normalisierung
            normalization: {
                lowercase: true,
                removeSpaces: true,
                removeSpecialChars: true,
                removeDiacritics: true
            },
            
            // Validierung
            validation: {
                minLength: 1,
                maxLength: 100,
                allowedChars: /^[a-zA-Z0-9äöüßÄÖÜ\s-_.,:;!?]+$/,
                forbiddenWords: ['test', 'admin', 'password']
            },
            
            // Hash-Verifikation
            hashing: {
                algorithms: ['SHA-256', 'MD5'], // MD5 für Legacy-Support
                saltHandling: 'auto', // auto, manual, none
                iterations: 1000
            },
            
            // Scoring (Enhanced v3.7)
            scoring: {
                basePoints: 10,
                stage2Multiplier: 2,
                timeBonus: true,
                maxTimeBonus: 5,
                consecutiveBonus: true, // Neue Funktion
                hintPenalty: 2, // Punktabzug für Hinweise
                musicMoodBonus: 1 // Christmas Spirit Bonus
            },
            
            // Music Integration v3.7
            audio: {
                playSuccessSounds: true,
                playErrorSounds: true,
                adaptiveVolume: true
            },
            
            // Cache-Einstellungen
            cache: {
                maxEntries: 50,
                ttl: 300000 // 5 Minuten
            }
        };

        // Diakritika-Mapping für Normalisierung
        this.diacriticsMap = {
            'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
            'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
            'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
            'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
            'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
            'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o',
            'ù': 'u', 'ú': 'u', 'û': 'u',
            'ñ': 'n', 'ç': 'c'
        };
    }

    /**
     * Initialisiert das Answer-Utility
     */
    async init() {
        try {
            console.log('💬 Answer-Utility v3.7 wird initialisiert...');
            
            // Music Player Integration
            if (window.ChristmasMusicPlayer && this.config.audio.playSuccessSounds) {
                this.musicPlayer = new window.ChristmasMusicPlayer();
                console.log('🎵 Music Player in Answer Utility integriert');
            }

            // Smart Logic Engine initialisieren 
            this.initSmartLogic();

            // Lade gespeicherte History
            this.loadSubmissionHistory();

            // Setup Cache-Bereinigung
            this.startCacheCleanup();

            // Teste Hash-Funktionen
            await this.testHashFunctions();

            this.isInitialized = true;
            console.log('✅ Answer-Utility v3.7 erfolgreich initialisiert');

        } catch (error) {
            console.error('❌ Fehler bei Answer-Utility-Initialisierung:', error);
            throw error;
        }
    }

    /**
     * Verarbeitet eine Rätsel-Antwort
     */
    async processAnswer(rawAnswer, puzzleData) {
        try {
            console.log('🔍 Verarbeite Antwort...');

            // Rate-Limiting prüfen
            if (!window.SecurityStatic.checkRateLimit('answerSubmission')) {
                throw new Error('Rate-Limit für Antwort-Submissions überschritten');
            }

            // Input-Validierung
            const validation = this.validateAnswer(rawAnswer);
            if (!validation.valid) {
                return this.createErrorResult(validation.error);
            }

            // Antwort normalisieren
            const normalizedAnswer = this.normalizeAnswer(validation.sanitized);

            // Prüfe gegen bekannte Hashes
            const verificationResult = await this.verifyAnswer(normalizedAnswer, puzzleData);

            // Speichere Submission
            this.recordSubmission(rawAnswer, normalizedAnswer, verificationResult, puzzleData);

            // Berechne Punkte bei korrekter Antwort
            if (verificationResult.correct) {
                verificationResult.points = this.calculatePoints(puzzleData, verificationResult.matchedHash);
            }

            // Security-Event loggen
            if (window.SecurityStatic) {
                window.SecurityStatic.logSecurityEvent('answer_submission', {
                    correct: verificationResult.correct,
                    puzzleId: puzzleData.day || 'unknown',
                    points: verificationResult.points || 0
                });
            }

            return verificationResult;

        } catch (error) {
            console.error('❌ Antwort-Verarbeitung fehlgeschlagen:', error);
            return this.createErrorResult(error.message);
        }
    }

    /**
     * Validiert eine Antwort
     */
    validateAnswer(answer) {
        if (!answer || typeof answer !== 'string') {
            return { valid: false, error: 'Antwort fehlt oder ist ungültig' };
        }

        const trimmed = answer.trim();
        
        // Längen-Validierung
        if (trimmed.length < this.config.validation.minLength) {
            return { valid: false, error: `Antwort zu kurz (mindestens ${this.config.validation.minLength} Zeichen)` };
        }

        if (trimmed.length > this.config.validation.maxLength) {
            return { valid: false, error: `Antwort zu lang (maximal ${this.config.validation.maxLength} Zeichen)` };
        }

        // Zeichen-Validierung
        if (!this.config.validation.allowedChars.test(trimmed)) {
            return { valid: false, error: 'Antwort enthält ungültige Zeichen' };
        }

        // Verbotene Wörter prüfen
        const lowerAnswer = trimmed.toLowerCase();
        for (const forbidden of this.config.validation.forbiddenWords) {
            if (lowerAnswer.includes(forbidden)) {
                return { valid: false, error: 'Antwort enthält ungültige Begriffe' };
            }
        }

        // Basis-Sanitization
        const sanitized = window.SecurityStatic ? 
            window.SecurityStatic.sanitizeInput(trimmed) : 
            trimmed;

        return { valid: true, sanitized };
    }

    /**
     * Normalisiert eine Antwort für Vergleiche
     */
    normalizeAnswer(answer) {
        let normalized = answer;

        // Kleinschreibung
        if (this.config.normalization.lowercase) {
            normalized = normalized.toLowerCase();
        }

        // Leerzeichen entfernen
        if (this.config.normalization.removeSpaces) {
            normalized = normalized.replace(/\s+/g, '');
        }

        // Diakritika ersetzen
        if (this.config.normalization.removeDiacritics) {
            normalized = this.replaceDiacritics(normalized);
        }

        // Sonderzeichen entfernen
        if (this.config.normalization.removeSpecialChars) {
            normalized = normalized.replace(/[^a-zA-Z0-9]/g, '');
        }

        return normalized;
    }

    /**
     * Ersetzt Diakritika durch normale Zeichen
     */
    replaceDiacritics(text) {
        return text.replace(/[àáâãäåèéêëìíîïòóôõöùúûüñç]/g, (match) => {
            return this.diacriticsMap[match] || match;
        });
    }

    /**
     * Verifiziert eine Antwort gegen gespeicherte Hashes
     */
    async verifyAnswer(normalizedAnswer, puzzleData) {
        try {
            const startTime = Date.now();
            
            // Cache prüfen
            const cacheKey = this.getCacheKey(normalizedAnswer, puzzleData);
            const cached = this.answerCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.config.cache.ttl) {
                console.log('📦 Antwort-Verifikation aus Cache');
                return cached.result;
            }

            // Verschiedene Hash-Formate prüfen
            let verificationResult = { correct: false };

            // 1. Direkter Hash-Vergleich
            if (puzzleData.answerHash) {
                verificationResult = await this.verifyAgainstHash(normalizedAnswer, puzzleData.answerHash);
            }

            // 2. Multiple Hashes (für alternative Antworten)
            if (!verificationResult.correct && puzzleData.answerHashes) {
                for (const hash of puzzleData.answerHashes) {
                    const result = await this.verifyAgainstHash(normalizedAnswer, hash);
                    if (result.correct) {
                        verificationResult = result;
                        break;
                    }
                }
            }

            // 3. Plaintext-Vergleich (für Development)
            if (!verificationResult.correct && puzzleData.answerPlaintext) {
                verificationResult = this.verifyAgainstPlaintext(normalizedAnswer, puzzleData.answerPlaintext);
            }

            // 4. Pattern-Matching (für flexible Antworten)
            if (!verificationResult.correct && puzzleData.answerPattern) {
                verificationResult = this.verifyAgainstPattern(normalizedAnswer, puzzleData.answerPattern);
            }

            // Performance-Messung
            const duration = Date.now() - startTime;
            verificationResult.verificationTime = duration;

            // Ergebnis cachen
            this.cacheResult(cacheKey, verificationResult);

            console.log(`⏱️ Antwort-Verifikation dauerte ${duration}ms`);
            return verificationResult;

        } catch (error) {
            console.error('Antwort-Verifikation fehlgeschlagen:', error);
            return {
                correct: false,
                error: error.message,
                verificationTime: Date.now() - (startTime || Date.now())
            };
        }
    }

    /**
     * Verifiziert gegen einen spezifischen Hash
     */
    async verifyAgainstHash(answer, hashValue) {
        try {
            // Parse Hash-Format: "algorithm:salt:hash" oder "salt$hash"
            const hashInfo = this.parseHashFormat(hashValue);
            
            if (hashInfo.algorithm === 'plaintext') {
                return { correct: answer === hashInfo.hash, matchedHash: hashValue };
            }

            // Generiere Hash mit gleichem Salt
            let computedHash;
            if (window.SecurityStatic && window.SecurityStatic.createSecureHash) {
                const result = await window.SecurityStatic.createSecureHash(answer, hashInfo.salt);
                computedHash = result.hash;
            } else {
                computedHash = await this.fallbackHash(answer, hashInfo.salt);
            }

            const isMatch = computedHash === hashValue;
            
            return {
                correct: isMatch,
                matchedHash: isMatch ? hashValue : null,
                algorithm: hashInfo.algorithm,
                saltUsed: hashInfo.salt
            };

        } catch (error) {
            console.error('Hash-Verifikation fehlgeschlagen:', error);
            return { correct: false, error: error.message };
        }
    }

    /**
     * Parsed Hash-Format
     */
    parseHashFormat(hashValue) {
        // Format 1: "algorithm:salt:hash"
        if (hashValue.includes(':')) {
            const parts = hashValue.split(':');
            if (parts.length === 3) {
                return {
                    algorithm: parts[0],
                    salt: parts[1],
                    hash: parts[2]
                };
            }
        }

        // Format 2: "salt$hash"
        if (hashValue.includes('$')) {
            const parts = hashValue.split('$');
            if (parts.length === 2) {
                return {
                    algorithm: 'SHA-256',
                    salt: parts[0],
                    hash: parts[1]
                };
            }
        }

        // Format 3: Nur Hash (kein Salt)
        return {
            algorithm: 'SHA-256',
            salt: '',
            hash: hashValue
        };
    }

    /**
     * Fallback-Hash für ältere Browser
     */
    async fallbackHash(input, salt) {
        const salted = salt + input;
        let hash = 0;
        
        for (let i = 0; i < salted.length; i++) {
            const char = salted.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return salt + '$' + Math.abs(hash).toString(16);
    }

    /**
     * Verifiziert gegen Plaintext (für Development)
     */
    verifyAgainstPlaintext(answer, plaintext) {
        const normalizedPlaintext = this.normalizeAnswer(plaintext);
        const isMatch = answer === normalizedPlaintext;
        
        return {
            correct: isMatch,
            matchedHash: isMatch ? plaintext : null,
            algorithm: 'plaintext'
        };
    }

    /**
     * Verifiziert gegen Pattern/Regex
     */
    verifyAgainstPattern(answer, pattern) {
        try {
            const regex = new RegExp(pattern, 'i');
            const isMatch = regex.test(answer);
            
            return {
                correct: isMatch,
                matchedHash: isMatch ? pattern : null,
                algorithm: 'pattern'
            };

        } catch (error) {
            console.error('Pattern-Verifikation fehlgeschlagen:', error);
            return { correct: false, error: 'Ungültiges Pattern' };
        }
    }

    /**
     * Berechnet Punkte für korrekte Antwort
     */
    calculatePoints(puzzleData, matchedHash) {
        let points = puzzleData.points || this.config.scoring.basePoints;
        
        // Stage-2-Bonus
        const stage = puzzleData.stage || (puzzleData.day > 12 ? 2 : 1);
        if (stage === 2) {
            points *= this.config.scoring.stage2Multiplier;
        }

        // Zeit-Bonus (wenn aktiviert)
        if (this.config.scoring.timeBonus && puzzleData.releaseTime) {
            const timeSinceRelease = Date.now() - new Date(puzzleData.releaseTime).getTime();
            const hoursElapsed = timeSinceRelease / (1000 * 60 * 60);
            
            // Bonus für schnelle Lösung (in den ersten 24 Stunden)
            if (hoursElapsed < 24) {
                const timeBonus = Math.max(0, this.config.scoring.maxTimeBonus * (1 - hoursElapsed / 24));
                points += Math.round(timeBonus);
            }
        }

        return Math.round(points);
    }

    /**
     * Zeichnet eine Submission auf
     */
    recordSubmission(rawAnswer, normalizedAnswer, result, puzzleData) {
        const submission = {
            timestamp: Date.now(),
            rawAnswer: rawAnswer.substring(0, 50), // Begrenzt für Privacy
            normalizedAnswer: normalizedAnswer.substring(0, 50),
            correct: result.correct,
            puzzleId: puzzleData.day || 'unknown',
            points: result.points || 0,
            verificationTime: result.verificationTime || 0
        };

        this.submissionHistory.push(submission);

        // Begrenze History-Größe
        if (this.submissionHistory.length > 100) {
            this.submissionHistory = this.submissionHistory.slice(-50);
        }

        // Speichere in localStorage
        this.saveSubmissionHistory();
    }

    /**
     * Lädt Submission-History aus localStorage
     */
    loadSubmissionHistory() {
        try {
            const saved = localStorage.getItem('winterRallye2025_submissions');
            if (saved) {
                this.submissionHistory = JSON.parse(saved);
                console.log(`📁 ${this.submissionHistory.length} Submissions geladen`);
            }
        } catch (error) {
            console.warn('Fehler beim Laden der Submission-History:', error);
            this.submissionHistory = [];
        }
    }

    /**
     * Speichert Submission-History in localStorage
     */
    saveSubmissionHistory() {
        try {
            localStorage.setItem('winterRallye2025_submissions', JSON.stringify(this.submissionHistory));
        } catch (error) {
            console.warn('Fehler beim Speichern der Submission-History:', error);
        }
    }

    /**
     * Cache-Verwaltung
     */
    getCacheKey(answer, puzzleData) {
        const data = answer + (puzzleData.day || '') + (puzzleData.answerHash || '');
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    cacheResult(key, result) {
        if (this.answerCache.size >= this.config.cache.maxEntries) {
            // Entferne älteste Einträge
            const entries = Array.from(this.answerCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toRemove = Math.floor(this.config.cache.maxEntries * 0.2);
            
            for (let i = 0; i < toRemove; i++) {
                this.answerCache.delete(entries[i][0]);
            }
        }

        this.answerCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, cached] of this.answerCache.entries()) {
                if (now - cached.timestamp > this.config.cache.ttl) {
                    this.answerCache.delete(key);
                }
            }
        }, 60000); // Alle 60 Sekunden
    }

    /**
     * Testet Hash-Funktionen
     */
    async testHashFunctions() {
        try {
            const testAnswer = 'testantwort';
            const testHash = await this.createHashForAnswer(testAnswer);
            const verification = await this.verifyAgainstHash(testAnswer, testHash);
            
            if (!verification.correct) {
                throw new Error('Hash-Funktions-Test fehlgeschlagen');
            }

            console.log('✅ Hash-Funktions-Test erfolgreich');

        } catch (error) {
            console.error('Hash-Funktions-Test fehlgeschlagen:', error);
        }
    }

    /**
     * Erstellt Hash für eine Antwort (Utility für Entwicklung)
     */
    async createHashForAnswer(answer, salt = null) {
        const normalized = this.normalizeAnswer(answer);
        
        if (window.SecurityStatic && window.SecurityStatic.createSecureHash) {
            const result = await window.SecurityStatic.createSecureHash(normalized, salt);
            return result.hash;
        } else {
            return this.fallbackHash(normalized, salt || '');
        }
    }

    /**
     * Erstellt Fehler-Ergebnis
     */
    createErrorResult(message) {
        return {
            correct: false,
            error: message,
            timestamp: Date.now()
        };
    }

    /**
     * Gibt Statistiken über Submissions zurück
     */
    getSubmissionStats() {
        const total = this.submissionHistory.length;
        const correct = this.submissionHistory.filter(s => s.correct).length;
        const totalPoints = this.submissionHistory.reduce((sum, s) => sum + s.points, 0);
        
        return {
            totalSubmissions: total,
            correctSubmissions: correct,
            successRate: total > 0 ? (correct / total) * 100 : 0,
            totalPointsEarned: totalPoints,
            averageVerificationTime: total > 0 ? 
                this.submissionHistory.reduce((sum, s) => sum + s.verificationTime, 0) / total : 0
        };
    }

    /**
     * Setzt Cache und History zurück
     */
    reset() {
        this.answerCache.clear();
        this.submissionHistory = [];
        localStorage.removeItem('winterRallye2025_submissions');
        console.log('🔄 Answer-Utility zurückgesetzt');
    }

    /**
     * Status-Report
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            cacheEntries: this.answerCache.size,
            submissionHistory: this.submissionHistory.length,
            stats: this.getSubmissionStats(),
            config: this.config,
            smartLogic: this.smartLogic?.getStatus() || null,
            musicIntegration: !!this.musicPlayer
        };
    }

    /**
     * Smart Logic Engine Initialisierung (v3.7)
     */
    initSmartLogic() {
        this.smartLogic = {
            patterns: new Map(),
            userBehavior: {
                attemptTiming: [],
                errorPatterns: [],
                successMethods: []
            },
            adaptiveHints: new Map(),

            // Lernalgorithmus für Benutzerverhalten
            analyzePattern(answer, result) {
                const pattern = {
                    length: answer.length,
                    hasNumbers: /\d/.test(answer),
                    hasSpecialChars: /[^a-zA-Z0-9\s]/.test(answer),
                    complexity: this.calculateComplexity(answer),
                    timestamp: Date.now()
                };

                if (result.correct) {
                    this.userBehavior.successMethods.push(pattern);
                } else {
                    this.userBehavior.errorPatterns.push(pattern);
                }

                // Adaptive Hinweise generieren
                this.generateAdaptiveHints(pattern, result);
            },

            calculateComplexity(answer) {
                let complexity = answer.length;
                if (/[A-Z]/.test(answer)) complexity += 2;
                if (/[0-9]/.test(answer)) complexity += 3;
                if (/[^a-zA-Z0-9]/.test(answer)) complexity += 5;
                return Math.min(complexity, 50);
            },

            generateAdaptiveHints(pattern, result) {
                if (!result.correct && pattern.complexity < 5) {
                    this.adaptiveHints.set('simple', 'Versuche eine längere oder komplexere Antwort');
                } else if (!result.correct && pattern.hasNumbers && !pattern.hasSpecialChars) {
                    this.adaptiveHints.set('format', 'Achte auf Sonderzeichen oder Groß-/Kleinschreibung');
                }
            },

            getStatus() {
                return {
                    patterns: this.patterns.size,
                    successMethods: this.userBehavior.successMethods.length,
                    errorPatterns: this.userBehavior.errorPatterns.length,
                    adaptiveHints: Array.from(this.adaptiveHints.keys())
                };
            }
        };
    }

    /**
     * Music Feedback Integration (v3.7) 
     */
    playAnswerFeedback(isCorrect, achievement = null) {
        if (!this.musicPlayer || !this.config.audio.playSuccessSounds) return;

        try {
            if (isCorrect) {
                if (achievement === 'stage_complete') {
                    this.musicPlayer.playChristmasEffect('stage_complete');
                } else {
                    this.musicPlayer.playChristmasEffect('puzzle_success');
                }
            } else {
                // Sanfter Error-Sound (kein Schrecken zur Weihnachtszeit)
                console.log('🔔 Falscher Versuch - weiter probieren!');
            }
        } catch (error) {
            console.error('Music feedback error:', error);
        }
    }

    /**
     * Enhanced Answer Processing mit Music & Smart Logic (v3.7)
     */
    async processAnswerEnhanced(rawAnswer, puzzleData) {
        const result = await this.processAnswer(rawAnswer, puzzleData);
        
        // Smart Logic Analysis
        if (this.smartLogic) {
            this.smartLogic.analyzePattern(rawAnswer, result);
        }

        // Music Feedback
        let achievement = null;
        if (result.correct && puzzleData.isLastOfStage) {
            achievement = 'stage_complete';
        }
        
        this.playAnswerFeedback(result.correct, achievement);

        // Enhanced Result mit Smart Features
        return {
            ...result,
            smartHints: this.smartLogic?.adaptiveHints ? 
                Array.from(this.smartLogic.adaptiveHints.entries()) : [],
            userProgress: this.smartLogic?.userBehavior || null,
            musicPlayed: !!this.musicPlayer
        };
    }
}

// Export für Modulverwendung
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnswerUtil;
}

console.log('💬 AnswerUtil v3.7 mit Smart Logic & Music Integration geladen');

// Globale Instanz erstellen
const answerUtil = new AnswerUtil();

// Export für Module
window.AnswerUtil = answerUtil;