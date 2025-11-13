/**
 * QR Verify - QR-Code-Verifikation für Rätzel Winter 2025
 * Überprüfung von signierten QR-Codes ohne Backend
 */

'use strict';

/**
 * QR-Code Verifikations-Klasse
 */
class QRVerify {
    constructor() {
        this.isInitialized = false;
        this.publicKeys = new Map();
        this.verificationCache = new Map();
        
        // Konfiguration für QR-Verifikation
        this.config = {
            // Unterstützte Signatur-Algorithmen
            supportedAlgorithms: ['ECDSA', 'RSA-PSS', 'HMAC'],
            
            // Timeout für Verifikation
            verificationTimeout: 5000,
            
            // Cache-Einstellungen
            cacheTimeout: 300000, // 5 Minuten
            maxCacheEntries: 100,
            
            // QR-Code Format
            qrFormat: {
                version: '1.0',
                signature: /^v1\.([A-Za-z0-9+\/=]+)\.([A-Za-z0-9+\/=]+)$/,
                maxPayloadSize: 1024
            }
        };

        // Vordefinierte öffentliche Schlüssel (für Demo/Test)
        this.predefinedKeys = {
            'winter2025': {
                algorithm: 'HMAC',
                key: 'winter2025_secret_key_demo_only', // In Produktion: echter Schlüssel
                keyId: 'winter2025',
                description: 'Demo-Schlüssel für Winter Rallye 2025'
            }
        };
    }

    /**
     * Initialisiert den QR-Verifier
     */
    async init() {
        try {
            console.log('🔍 QR-Verifier wird initialisiert...');
            
            // Lade vordefinierte Schlüssel
            await this.loadPredefinedKeys();

            // Setup Cache-Bereinigung
            this.startCacheCleanup();

            // Teste Crypto-Unterstützung
            await this.testCryptoSupport();

            this.isInitialized = true;
            console.log('✅ QR-Verifier initialisiert');

        } catch (error) {
            console.error('❌ Fehler bei QR-Verifier-Initialisierung:', error);
            throw error;
        }
    }

    /**
     * Lädt vordefinierte Schlüssel
     */
    async loadPredefinedKeys() {
        for (const [keyId, keyData] of Object.entries(this.predefinedKeys)) {
            this.publicKeys.set(keyId, keyData);
            console.log(`🔑 Schlüssel geladen: ${keyId}`);
        }
    }

    /**
     * Testet Crypto-API-Unterstützung
     */
    async testCryptoSupport() {
        if (!window.crypto || !window.crypto.subtle) {
            console.warn('⚠️ Web Crypto API nicht verfügbar - verwende Fallback-Methoden');
            return;
        }

        try {
            // Test HMAC-Unterstützung
            const key = await crypto.subtle.generateKey(
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign', 'verify']
            );
            console.log('✅ HMAC-Unterstützung verfügbar');
        } catch (error) {
            console.warn('⚠️ HMAC-Test fehlgeschlagen:', error);
        }
    }

    /**
     * Verrifiziert einen QR-Code
     */
    async verifyQRCode(qrData, expectedData = {}) {
        try {
            console.log('🔍 Verifiziere QR-Code...');

            // Rate-Limiting prüfen
            if (!window.SecurityStatic.checkRateLimit('qrScan')) {
                throw new Error('Rate-Limit für QR-Scans überschritten');
            }

            // Input-Validierung
            const validation = this.validateQRInput(qrData);
            if (!validation.valid) {
                throw new Error(`Ungültiger QR-Code: ${validation.error}`);
            }

            // Prüfe Cache
            const cacheKey = this.getCacheKey(qrData);
            const cached = this.verificationCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout) {
                console.log('📦 QR-Verifikation aus Cache');
                return cached.result;
            }

            // Parse QR-Code-Format
            const parsed = this.parseQRCode(qrData);
            if (!parsed) {
                throw new Error('QR-Code-Format nicht erkannt');
            }

            // Verifikation durchführen
            const verificationResult = await this.performVerification(parsed, expectedData);

            // Ergebnis cachen
            this.cacheVerificationResult(cacheKey, verificationResult);

            // Security-Event loggen
            if (window.SecurityStatic) {
                window.SecurityStatic.logSecurityEvent('qr_verification', {
                    success: verificationResult.valid,
                    keyId: parsed.keyId,
                    algorithm: parsed.algorithm
                });
            }

            return verificationResult;

        } catch (error) {
            console.error('❌ QR-Verifikation fehlgeschlagen:', error);
            
            // Security-Event für Fehler loggen
            if (window.SecurityStatic) {
                window.SecurityStatic.logSecurityEvent('qr_verification_failed', {
                    error: error.message,
                    qrData: qrData.substring(0, 50) + '...' // Nur Anfang für Logs
                });
            }

            return {
                valid: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Validiert QR-Code-Input
     */
    validateQRInput(qrData) {
        if (!qrData || typeof qrData !== 'string') {
            return { valid: false, error: 'QR-Daten fehlen oder sind ungültig' };
        }

        if (qrData.length > this.config.qrFormat.maxPayloadSize) {
            return { valid: false, error: 'QR-Code zu groß' };
        }

        // Basis-Sanitization
        const sanitized = qrData.trim();
        if (sanitized.length === 0) {
            return { valid: false, error: 'QR-Code ist leer' };
        }

        return { valid: true, sanitized };
    }

    /**
     * Parsed QR-Code-Format
     */
    parseQRCode(qrData) {
        try {
            // Unterstützte Formate:
            // 1. Signiertes Format: "v1.{signature}.{payload}"
            // 2. HMAC Format: "hmac.{keyId}.{signature}.{payload}"
            // 3. Einfaches Format: "{payload}" (für Tests)

            // Prüfe signiertes Format v1
            const v1Match = qrData.match(this.config.qrFormat.signature);
            if (v1Match) {
                return this.parseV1Format(v1Match[1], v1Match[2]);
            }

            // Prüfe HMAC-Format
            if (qrData.startsWith('hmac.')) {
                return this.parseHMACFormat(qrData);
            }

            // Prüfe einfaches Format (für Development/Tests)
            if (qrData.startsWith('{') && qrData.endsWith('}')) {
                return this.parseSimpleFormat(qrData);
            }

            // Base64-Dekodierung versuchen
            try {
                const decoded = atob(qrData);
                const parsed = JSON.parse(decoded);
                return this.parseJSONFormat(parsed);
            } catch (e) {
                // Nicht Base64/JSON
            }

            console.warn('Unbekanntes QR-Code-Format:', qrData.substring(0, 50));
            return null;

        } catch (error) {
            console.error('QR-Code-Parsing fehlgeschlagen:', error);
            return null;
        }
    }

    /**
     * Parsed v1-Format
     */
    parseV1Format(signatureB64, payloadB64) {
        try {
            const signature = atob(signatureB64);
            const payload = JSON.parse(atob(payloadB64));

            return {
                version: '1.0',
                algorithm: payload.algorithm || 'HMAC',
                keyId: payload.keyId || 'winter2025',
                signature,
                payload,
                originalData: payloadB64
            };

        } catch (error) {
            console.error('V1-Format-Parsing fehlgeschlagen:', error);
            return null;
        }
    }

    /**
     * Parsed HMAC-Format
     */
    parseHMACFormat(qrData) {
        try {
            // Format: "hmac.keyId.signature.payload"
            const parts = qrData.split('.');
            if (parts.length !== 4) {
                throw new Error('Ungültiges HMAC-Format');
            }

            const [, keyId, signatureHex, payloadB64] = parts;
            const payload = JSON.parse(atob(payloadB64));

            return {
                version: 'hmac',
                algorithm: 'HMAC',
                keyId,
                signature: signatureHex,
                payload,
                originalData: payloadB64
            };

        } catch (error) {
            console.error('HMAC-Format-Parsing fehlgeschlagen:', error);
            return null;
        }
    }

    /**
     * Parsed einfaches JSON-Format
     */
    parseSimpleFormat(qrData) {
        try {
            const payload = JSON.parse(qrData);
            
            return {
                version: 'simple',
                algorithm: 'none',
                keyId: null,
                signature: null,
                payload,
                originalData: qrData
            };

        } catch (error) {
            console.error('Simple-Format-Parsing fehlgeschlagen:', error);
            return null;
        }
    }

    /**
     * Parsed JSON-Format aus Base64
     */
    parseJSONFormat(parsed) {
        return {
            version: parsed.version || 'json',
            algorithm: parsed.algorithm || 'none',
            keyId: parsed.keyId || null,
            signature: parsed.signature || null,
            payload: parsed.payload || parsed,
            originalData: JSON.stringify(parsed)
        };
    }

    /**
     * Führt die eigentliche Verifikation durch
     */
    async performVerification(parsed, expectedData) {
        const startTime = Date.now();

        try {
            // Timeout-Schutz
            return await this.withTimeout(
                this.verifySignature(parsed, expectedData),
                this.config.verificationTimeout
            );

        } catch (error) {
            if (error.name === 'TimeoutError') {
                throw new Error('Verifikation-Timeout');
            }
            throw error;

        } finally {
            const duration = Date.now() - startTime;
            console.log(`⏱️ Verifikation dauerte ${duration}ms`);
        }
    }

    /**
     * Verifiziert die Signatur
     */
    async verifySignature(parsed, expectedData) {
        switch (parsed.algorithm) {
            case 'HMAC':
                return await this.verifyHMAC(parsed, expectedData);
            case 'ECDSA':
                return await this.verifyECDSA(parsed, expectedData);
            case 'RSA-PSS':
                return await this.verifyRSAPSS(parsed, expectedData);
            case 'none':
                return this.verifyPlaintext(parsed, expectedData);
            default:
                throw new Error(`Ununterstützter Algorithmus: ${parsed.algorithm}`);
        }
    }

    /**
     * HMAC-Verifikation
     */
    async verifyHMAC(parsed, expectedData) {
        try {
            const keyData = this.publicKeys.get(parsed.keyId);
            if (!keyData) {
                throw new Error(`Unbekannte Key-ID: ${parsed.keyId}`);
            }

            if (window.crypto && window.crypto.subtle) {
                // Verwende Web Crypto API
                return await this.verifyHMACWebCrypto(parsed, keyData, expectedData);
            } else {
                // Fallback für ältere Browser
                return this.verifyHMACFallback(parsed, keyData, expectedData);
            }

        } catch (error) {
            console.error('HMAC-Verifikation fehlgeschlagen:', error);
            return {
                valid: false,
                error: error.message,
                algorithm: 'HMAC',
                keyId: parsed.keyId,
                timestamp: Date.now()
            };
        }
    }

    /**
     * HMAC-Verifikation mit Web Crypto API
     */
    async verifyHMACWebCrypto(parsed, keyData, expectedData) {
        const encoder = new TextEncoder();
        const keyBytes = encoder.encode(keyData.key);

        // Import key
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        // Berechne erwartete Signatur
        const dataToSign = encoder.encode(parsed.originalData);
        const expectedSignature = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
        const expectedHex = Array.from(new Uint8Array(expectedSignature))
            .map(b => b.toString(16).padStart(2, '0')).join('');

        // Vergleiche mit übergebener Signatur
        const isValid = parsed.signature === expectedHex;

        // Zusätzliche Datenvalidierung
        const dataValid = this.validateExpectedData(parsed.payload, expectedData);

        return {
            valid: isValid && dataValid.valid,
            error: isValid ? dataValid.error : 'Ungültige Signatur',
            algorithm: 'HMAC',
            keyId: parsed.keyId,
            payload: parsed.payload,
            timestamp: Date.now()
        };
    }

    /**
     * HMAC-Fallback für ältere Browser
     */
    verifyHMACFallback(parsed, keyData, expectedData) {
        // Einfacher String-Vergleich (weniger sicher)
        const expectedPayload = JSON.stringify(expectedData);
        const receivedPayload = JSON.stringify(parsed.payload);

        // In einer echten Implementierung würde hier eine Crypto-Bibliothek verwendet
        const isValid = this.simpleHashCompare(
            keyData.key + parsed.originalData,
            parsed.signature
        );

        const dataValid = this.validateExpectedData(parsed.payload, expectedData);

        return {
            valid: isValid && dataValid.valid,
            error: isValid ? dataValid.error : 'Ungültige Signatur (Fallback)',
            algorithm: 'HMAC-Fallback',
            keyId: parsed.keyId,
            payload: parsed.payload,
            timestamp: Date.now()
        };
    }

    /**
     * Plaintext-Verifikation (für Tests)
     */
    verifyPlaintext(parsed, expectedData) {
        console.warn('⚠️ Plaintext-Verifikation - nicht für Produktion geeignet');
        
        const dataValid = this.validateExpectedData(parsed.payload, expectedData);

        return {
            valid: dataValid.valid,
            error: dataValid.error,
            algorithm: 'plaintext',
            keyId: null,
            payload: parsed.payload,
            timestamp: Date.now()
        };
    }

    /**
     * Validiert erwartete Daten gegen QR-Payload
     */
    validateExpectedData(payload, expectedData) {
        if (!expectedData || Object.keys(expectedData).length === 0) {
            return { valid: true }; // Keine spezifischen Erwartungen
        }

        for (const [key, expectedValue] of Object.entries(expectedData)) {
            const actualValue = payload[key];

            if (actualValue === undefined) {
                return {
                    valid: false,
                    error: `Erforderliches Feld '${key}' fehlt`
                };
            }

            if (expectedValue !== null && actualValue !== expectedValue) {
                return {
                    valid: false,
                    error: `Feld '${key}': erwartet '${expectedValue}', erhalten '${actualValue}'`
                };
            }
        }

        return { valid: true };
    }

    /**
     * Einfacher Hash-Vergleich für Fallback
     */
    simpleHashCompare(input, expected) {
        // FNV-1a Hash (Demo-Zwecke)
        let hash = 2166136261;
        for (let i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        
        const computed = (hash >>> 0).toString(16);
        return computed === expected;
    }

    /**
     * Timeout-Wrapper für async Funktionen
     */
    withTimeout(promise, timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => {
                    const error = new Error('Timeout');
                    error.name = 'TimeoutError';
                    reject(error);
                }, timeout);
            })
        ]);
    }

    /**
     * Cache-Verwaltung
     */
    getCacheKey(qrData) {
        // Simple hash für Cache-Key
        let hash = 0;
        for (let i = 0; i < qrData.length; i++) {
            const char = qrData.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    cacheVerificationResult(key, result) {
        // Prüfe Cache-Größe
        if (this.verificationCache.size >= this.config.maxCacheEntries) {
            // Entferne älteste Einträge
            const entries = Array.from(this.verificationCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toRemove = Math.floor(this.config.maxCacheEntries * 0.2);
            
            for (let i = 0; i < toRemove; i++) {
                this.verificationCache.delete(entries[i][0]);
            }
        }

        this.verificationCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, cached] of this.verificationCache.entries()) {
                if (now - cached.timestamp > this.config.cacheTimeout) {
                    this.verificationCache.delete(key);
                }
            }
        }, 60000); // Alle 60 Sekunden
    }

    /**
     * Generiert Test-QR-Codes (für Development)
     */
    generateTestQR(data, keyId = 'winter2025') {
        try {
            const payload = {
                ...data,
                keyId,
                timestamp: Date.now(),
                algorithm: 'HMAC'
            };

            const payloadB64 = btoa(JSON.stringify(payload));
            
            // Einfache Demo-Signatur (nicht sicher!)
            const demoSignature = this.simpleHash(payloadB64);
            
            return `hmac.${keyId}.${demoSignature}.${payloadB64}`;

        } catch (error) {
            console.error('Test-QR-Generierung fehlgeschlagen:', error);
            return null;
        }
    }

    simpleHash(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Status-Report
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            loadedKeys: this.publicKeys.size,
            cacheEntries: this.verificationCache.size,
            cryptoSupport: !!(window.crypto && window.crypto.subtle),
            config: this.config
        };
    }
}

// Globale Instanz erstellen
const qrVerify = new QRVerify();

// Export für Module
window.QRVerify = qrVerify;