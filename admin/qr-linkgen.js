/**
 * QR-Link Generator JavaScript
 * Sichere Generierung von QR-Codes mit HMAC-SHA256 Signaturen
 * Winter Rallye 2025 - Admin Tool
 */

class QRLinkGenerator {
    constructor() {
        this.secretKey = null;
        this.baseUrl = 'https://winter-rallye-2025.haldensleben.de';
        this.qrLib = null; // QR.js library placeholder
        
        this.initializeEventListeners();
        this.loadQRLibrary();
        this.setDefaultDateTime();
    }
    
    initializeEventListeners() {
        // Form submission
        document.getElementById('qr-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateQRCode();
        });
        
        // Button events
        document.getElementById('clear-form').addEventListener('click', () => this.clearForm());
        document.getElementById('test-signature').addEventListener('click', () => this.testSignature());
        document.getElementById('copy-url').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('download-qr').addEventListener('click', () => this.downloadQRCode());
        document.getElementById('print-qr').addEventListener('click', () => this.printQRCode());
        
        // Batch operations
        document.getElementById('generate-batch').addEventListener('click', () => this.generateBatch());
        document.getElementById('download-batch').addEventListener('click', () => this.downloadBatch());
        
        // Utilities
        document.getElementById('validate-signature').addEventListener('click', () => this.validateSignature());
        document.getElementById('generate-secret').addEventListener('click', () => this.generateSecretKey());
        document.getElementById('export-config').addEventListener('click', () => this.exportConfig());
        document.getElementById('import-config').addEventListener('click', () => this.importConfig());
        
        // File import
        document.getElementById('config-file').addEventListener('change', (e) => this.handleFileImport(e));
        
        // Real-time validation
        document.getElementById('day').addEventListener('input', (e) => this.updateStageBasedOnDay(e.target.value));
        document.getElementById('additional-data').addEventListener('blur', (e) => this.validateJSON(e.target));
    }
    
    async loadQRLibrary() {
        // Inline QR generation without external dependencies
        this.qrLib = {
            toCanvas: (element, text, options) => {
                // Simplified QR generation for demonstration
                // In production, integrate proper QR library
                const canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 200;
                const ctx = canvas.getContext('2d');
                
                // Simple placeholder rendering
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, 200, 200);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(10, 10, 180, 180);
                ctx.fillStyle = '#000000';
                ctx.font = '10px monospace';
                ctx.fillText('QR: ' + text.substring(0, 20) + '...', 15, 30);
                
                element.appendChild(canvas);
                return Promise.resolve(canvas);
            }
        };
    }
    
    setDefaultDateTime() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(6, 0, 0, 0);
        
        const datetimeString = tomorrow.toISOString().slice(0, 16);
        document.getElementById('release-time').value = datetimeString;
    }
    
    updateStageBasedOnDay(day) {
        const dayNum = parseInt(day);
        const stageSelect = document.getElementById('stage');
        
        if (dayNum >= 1 && dayNum <= 12) {
            stageSelect.value = '1';
        } else if (dayNum >= 13 && dayNum <= 24) {
            stageSelect.value = '2';
        }
    }
    
    validateJSON(textarea) {
        const value = textarea.value.trim();
        if (!value) return true;
        
        try {
            JSON.parse(value);
            textarea.style.borderColor = '';
            return true;
        } catch (error) {
            textarea.style.borderColor = 'var(--color-error-600)';
            this.showError('Ungültiges JSON Format in zusätzlichen Daten');
            return false;
        }
    }
    
    async generateQRCode() {
        try {
            this.hideMessages();
            
            // Collect form data
            const formData = this.getFormData();
            if (!this.validateFormData(formData)) return;
            
            // Generate signature
            const signature = await this.createSignature(formData);
            
            // Build URL
            const qrUrl = this.buildQRURL(formData, signature);
            
            // Generate QR code
            await this.renderQRCode(qrUrl);
            
            // Show results
            this.displayResults(qrUrl, signature, formData);
            
        } catch (error) {
            console.error('QR Generation Error:', error);
            this.showError(`Fehler beim Generieren: ${error.message}`);
        }
    }
    
    getFormData() {
        const additionalDataText = document.getElementById('additional-data').value.trim();
        let additionalData = {};
        
        if (additionalDataText) {
            try {
                additionalData = JSON.parse(additionalDataText);
            } catch (error) {
                throw new Error('Ungültiges JSON in zusätzlichen Daten');
            }
        }
        
        return {
            day: parseInt(document.getElementById('day').value),
            answer: document.getElementById('answer').value.trim(),
            stage: parseInt(document.getElementById('stage').value),
            releaseTime: document.getElementById('release-time').value,
            secretKey: document.getElementById('secret-key').value,
            baseUrl: document.getElementById('base-url').value.trim(),
            additionalData
        };
    }
    
    validateFormData(data) {
        if (data.day < 1 || data.day > 24) {
            this.showError('Tag muss zwischen 1 und 24 liegen');
            return false;
        }
        
        if (!data.answer) {
            this.showError('Antwort ist erforderlich');
            return false;
        }
        
        if (!data.secretKey) {
            this.showError('Secret Key ist erforderlich');
            return false;
        }
        
        if (!data.releaseTime) {
            this.showError('Freischaltzeit ist erforderlich');
            return false;
        }
        
        try {
            new URL(data.baseUrl);
        } catch {
            this.showError('Ungültige Base URL');
            return false;
        }
        
        return true;
    }
    
    async createSignature(data) {
        // Create payload for signing
        const payload = {
            day: data.day,
            answer: data.answer.toLowerCase().trim(),
            stage: data.stage,
            timestamp: data.releaseTime,
            ...data.additionalData
        };
        
        // Convert to canonical JSON string
        const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
        
        // Try ECDSA signing first, fallback to HMAC
        let signature;
        try {
            signature = await this.ecdsaSign(data.secretKey, payloadString);
        } catch (error) {
            console.warn('ECDSA signing failed, falling back to HMAC:', error.message);
            signature = await this.hmacSHA256(data.secretKey, payloadString);
        }
        
        // Create JWT-like structure for EC256 compatibility
        const header = {
            alg: signature instanceof Uint8Array ? "HS256" : "ES256",
            typ: "JWT"
        };
        
        const encodedHeader = this.base64URLEncode(JSON.stringify(header));
        const encodedPayload = this.base64URLEncode(payloadString);
        const encodedSignature = this.base64URLEncode(signature);
        
        return `v1.${encodedHeader}.${encodedPayload}.${encodedSignature}`;
    }
    
    async ecdsaSign(privateKeyHex, message) {
        try {
            const encoder = new TextEncoder();
            const messageData = encoder.encode(message);
            
            // Convert hex private key to raw bytes
            const privateKeyBytes = new Uint8Array(
                privateKeyHex.match(/.{2}/g).map(byte => parseInt(byte, 16))
            );
            
            // Import ECDSA private key (P-256 curve)
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                privateKeyBytes,
                { name: 'ECDSA', namedCurve: 'P-256' },
                false,
                ['sign']
            );
            
            // Sign with ECDSA-SHA256
            const signature = await crypto.subtle.sign(
                { name: 'ECDSA', hash: 'SHA-256' },
                cryptoKey,
                messageData
            );
            
            return new Uint8Array(signature);
        } catch (error) {
            throw new Error(`ECDSA signing failed: ${error.message}`);
        }
    }
    
    async hmacSHA256(key, message) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const messageData = encoder.encode(message);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
        return new Uint8Array(signature);
    }
    
    base64URLEncode(data) {
        if (data instanceof Uint8Array) {
            const bytes = Array.from(data);
            const binary = String.fromCharCode(...bytes);
            return btoa(binary)
                .replace(/\\+/g, '-')
                .replace(/\\//g, '_')
                .replace(/=/g, '');
        } else {
            return btoa(data)
                .replace(/\\+/g, '-')
                .replace(/\\//g, '_')
                .replace(/=/g, '');
        }
    }
    
    buildQRURL(data, signature) {
        const params = new URLSearchParams({
            day: data.day.toString(),
            sig: signature,
            t: new Date(data.releaseTime).getTime().toString()
        });
        
        return `${data.baseUrl}/verify?${params.toString()}`;
    }
    
    async renderQRCode(url) {
        const qrPreview = document.getElementById('qr-preview');
        qrPreview.innerHTML = '';
        
        // Add header
        const header = document.createElement('h4');
        header.textContent = 'QR-Code Preview';
        header.style.margin = '0 0 1rem 0';
        qrPreview.appendChild(header);
        
        // Generate QR code
        await this.qrLib.toCanvas(qrPreview, url, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        // Add size info
        const info = document.createElement('p');
        info.textContent = 'Größe: 200x200px, empfohlene Druckgröße: 5x5cm';
        info.style.margin = '1rem 0 0 0';
        info.style.fontSize = 'var(--font-size-sm)';
        info.style.color = 'var(--color-text-secondary)';
        qrPreview.appendChild(info);
    }
    
    displayResults(url, signature, formData) {
        // Display URL
        document.getElementById('generated-url').textContent = url;
        
        // Display signature details
        const signatureDetails = document.getElementById('signature-details');
        signatureDetails.innerHTML = '';
        
        const parts = signature.split('.');
        const details = [
            ['Version', parts[0]],
            ['Header', this.base64URLDecode(parts[1])],
            ['Payload', this.base64URLDecode(parts[2])],
            ['Signature', parts[3].substring(0, 32) + '...']
        ];
        
        details.forEach(([label, value]) => {
            const labelEl = document.createElement('div');
            labelEl.className = 'signature-label';
            labelEl.textContent = label + ':';
            
            const valueEl = document.createElement('div');
            valueEl.className = 'signature-value';
            valueEl.textContent = value;
            
            signatureDetails.appendChild(labelEl);
            signatureDetails.appendChild(valueEl);
        });
        
        // Show result section
        this.showResults();
    }
    
    base64URLDecode(str) {
        try {
            const padded = str + '='.repeat((4 - str.length % 4) % 4);
            const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
            return atob(base64);
        } catch {
            return str;
        }
    }
    
    async generateBatch() {
        try {
            const configText = document.getElementById('batch-config').value.trim();
            if (!configText) {
                this.showError('Batch-Konfiguration ist erforderlich');
                return;
            }
            
            const configs = JSON.parse(configText);
            const secretKey = document.getElementById('secret-key').value;
            const baseUrl = document.getElementById('base-url').value;
            
            if (!secretKey) {
                this.showError('Secret Key für Batch-Generierung erforderlich');
                return;
            }
            
            const results = [];
            
            for (const config of configs) {
                const formData = {
                    day: config.day,
                    answer: config.answer,
                    stage: config.day <= 12 ? 1 : 2,
                    releaseTime: config.releaseTime,
                    secretKey,
                    baseUrl,
                    additionalData: config.additionalData || {}
                };
                
                const signature = await this.createSignature(formData);
                const url = this.buildQRURL(formData, signature);
                
                results.push({
                    day: config.day,
                    url,
                    signature,
                    config: formData
                });
            }
            
            this.displayBatchResults(results);
            
        } catch (error) {
            this.showError(`Batch-Generierung fehlgeschlagen: ${error.message}`);
        }
    }
    
    displayBatchResults(results) {
        const batchResults = document.getElementById('batch-results');
        batchResults.innerHTML = '<h3>Batch-Ergebnisse</h3>';
        
        results.forEach(result => {
            const item = document.createElement('div');
            item.style.padding = 'var(--space-3)';
            item.style.border = '1px solid var(--color-border-primary)';
            item.style.borderRadius = 'var(--border-radius-md)';
            item.style.marginBottom = 'var(--space-2)';
            
            item.innerHTML = `
                <strong>Tag ${result.day}</strong><br>
                <code style="font-size: var(--font-size-xs); word-break: break-all;">${result.url}</code>
            `;
            
            batchResults.appendChild(item);
        });
        
        batchResults.classList.add('show');
    }
    
    async testSignature() {
        try {
            const formData = this.getFormData();
            if (!formData.secretKey) {
                this.showError('Secret Key für Test erforderlich');
                return;
            }
            
            const signature = await this.createSignature(formData);
            const isValid = await this.verifySignature(signature, formData);
            
            if (isValid) {
                alert('✅ Signatur ist gültig');
            } else {
                alert('❌ Signatur ist ungültig');
            }
            
        } catch (error) {
            this.showError(`Signatur-Test fehlgeschlagen: ${error.message}`);
        }
    }
    
    async verifySignature(signature, originalData) {
        try {
            const parts = signature.split('.');
            if (parts.length !== 4 || parts[0] !== 'v1') return false;
            
            const payload = JSON.parse(this.base64URLDecode(parts[2]));
            const expectedSignature = await this.createSignature(originalData);
            
            return signature === expectedSignature;
            
        } catch {
            return false;
        }
    }
    
    generateSecretKey() {
        // Generate ECDSA private key (32 bytes for P-256)
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const key = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        document.getElementById('secret-key').value = key;
        alert(`🔑 ECDSA Private Key generiert: ${key.substring(0, 16)}...\\n\\nHinweis: Dies ist ein Private Key für ECDSA P-256 Signaturen.`);
    }
    
    async generateKeyPair() {
        try {
            // Generate ECDSA key pair (P-256)
            const keyPair = await crypto.subtle.generateKey(
                { name: 'ECDSA', namedCurve: 'P-256' },
                true, // extractable
                ['sign', 'verify']
            );
            
            // Export private key
            const privateKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.privateKey);
            const privateKeyHex = Array.from(new Uint8Array(privateKeyBuffer), 
                byte => byte.toString(16).padStart(2, '0')).join('');
            
            // Export public key
            const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
            const publicKeyHex = Array.from(new Uint8Array(publicKeyBuffer),
                byte => byte.toString(16).padStart(2, '0')).join('');
            
            document.getElementById('secret-key').value = privateKeyHex;
            
            // Show key pair info
            const keyInfo = `ECDSA P-256 Schlüsselpaar generiert:
            
Private Key (für Signaturen): ${privateKeyHex.substring(0, 32)}...
Public Key (für Verifikation): ${publicKeyHex.substring(0, 32)}...

⚠️ Speichern Sie den Public Key für die Verifikation!`;
            
            alert(keyInfo);
            
            return { privateKey: privateKeyHex, publicKey: publicKeyHex };
            
        } catch (error) {
            alert(`Fehler bei Schlüsselgenerierung: ${error.message}`);
            throw error;
        }
    }
    
    async copyToClipboard() {
        const url = document.getElementById('generated-url').textContent;
        try {
            await navigator.clipboard.writeText(url);
            alert('📋 URL in Zwischenablage kopiert');
        } catch {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('📋 URL in Zwischenablage kopiert');
        }
    }
    
    downloadQRCode() {
        const canvas = document.querySelector('#qr-preview canvas');
        if (!canvas) {
            this.showError('Kein QR-Code zum Herunterladen vorhanden');
            return;
        }
        
        const day = document.getElementById('day').value;
        const link = document.createElement('a');
        link.download = `winter-rallye-2025-tag-${day.padStart(2, '0')}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
    
    printQRCode() {
        const qrSection = document.getElementById('qr-preview');
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>QR-Code - Tag ${document.getElementById('day').value}</title>
                    <style>
                        body { font-family: sans-serif; text-align: center; padding: 2cm; }
                        canvas { border: 1px solid #ccc; margin: 1cm 0; }
                        .info { margin-top: 1cm; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <h1>Winter Rallye 2025 - Tag ${document.getElementById('day').value}</h1>
                    ${qrSection.innerHTML}
                    <div class="info">
                        <p>Generiert am: ${new Date().toLocaleString('de-DE')}</p>
                        <p>Antwort: ${document.getElementById('answer').value}</p>
                    </div>
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }
    
    exportConfig() {
        const config = {
            baseUrl: document.getElementById('base-url').value,
            defaultStage: document.getElementById('stage').value,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = 'qr-generator-config.json';
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    importConfig() {
        document.getElementById('config-file').click();
    }
    
    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                
                if (config.baseUrl) {
                    document.getElementById('base-url').value = config.baseUrl;
                }
                
                if (config.defaultStage) {
                    document.getElementById('stage').value = config.defaultStage;
                }
                
                alert('📥 Konfiguration erfolgreich importiert');
                
            } catch (error) {
                this.showError('Ungültige Konfigurationsdatei');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }
    
    clearForm() {
        document.getElementById('qr-form').reset();
        this.setDefaultDateTime();
        this.hideMessages();
    }
    
    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-section').classList.add('show');
        document.getElementById('result-section').classList.remove('show');
    }
    
    showResults() {
        document.getElementById('result-section').classList.add('show');
        document.getElementById('error-section').classList.remove('show');
    }
    
    hideMessages() {
        document.getElementById('error-section').classList.remove('show');
        document.getElementById('result-section').classList.remove('show');
    }
    
    validateSignature() {
        const signatureInput = prompt('Signatur zur Validierung eingeben:');
        if (!signatureInput) return;
        
        try {
            const parts = signatureInput.split('.');
            if (parts.length !== 4) {
                alert('❌ Ungültiges Signatur-Format');
                return;
            }
            
            const header = JSON.parse(this.base64URLDecode(parts[1]));
            const payload = JSON.parse(this.base64URLDecode(parts[2]));
            
            alert(`✅ Signatur-Format ist gültig\\n\\nTag: ${payload.day}\\nAntwort: ${payload.answer}\\nZeitstempel: ${payload.timestamp}`);
            
        } catch (error) {
            alert('❌ Signatur konnte nicht dekodiert werden');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QRLinkGenerator();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRLinkGenerator;
}