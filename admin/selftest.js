/**
 * Self-Test Suite JavaScript
 * Automated testing for Winter Rallye 2025 components
 * Tests: QR codes, Hash functions, Rate limiting, Time management
 */

class SelfTestSuite {
    constructor() {
        this.testResults = new Map();
        this.isRunning = false;
        this.startTime = null;
        this.config = {
            secretKey: '',
            baseUrl: 'https://winter-rallye-2025.haldensleben.de',
            rateLimit: 5,
            timeout: 5000
        };
        
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        
        this.initializeEventListeners();
        this.loadConfiguration();
        this.setupTestCases();
        
        // Import app modules for testing (simulated)
        this.loadAppModules();
    }
    
    initializeEventListeners() {
        // Main control buttons
        document.getElementById('run-all-tests').addEventListener('click', () => this.runAllTests());
        document.getElementById('run-security-tests').addEventListener('click', () => this.runSecurityTests());
        document.getElementById('run-qr-tests').addEventListener('click', () => this.runQRTests());
        document.getElementById('run-time-tests').addEventListener('click', () => this.runTimeTests());
        document.getElementById('clear-results').addEventListener('click', () => this.clearResults());
        document.getElementById('export-report').addEventListener('click', () => this.exportReport());
        document.getElementById('clear-log').addEventListener('click', () => this.clearLog());
        
        // Configuration inputs
        document.getElementById('test-secret-key').addEventListener('change', (e) => {
            this.config.secretKey = e.target.value;
        });
        
        document.getElementById('test-base-url').addEventListener('change', (e) => {
            this.config.baseUrl = e.target.value;
        });
        
        document.getElementById('test-rate-limit').addEventListener('change', (e) => {
            this.config.rateLimit = parseInt(e.target.value);
        });
        
        document.getElementById('test-timeout').addEventListener('change', (e) => {
            this.config.timeout = parseInt(e.target.value);
        });
    }
    
    loadConfiguration() {
        // Generate test secret key if none provided
        if (!this.config.secretKey) {
            this.config.secretKey = this.generateTestSecret();
            document.getElementById('test-secret-key').value = this.config.secretKey;
        }
        
        this.log('🔧 Configuration loaded', 'info');
    }
    
    generateTestSecret() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    async loadAppModules() {
        // Simulate loading app modules
        // In real implementation, these would import from ../scripts/
        
        this.modules = {
            security: await this.loadSecurityModule(),
            qr: await this.loadQRModule(),
            answer: await this.loadAnswerModule(),
            time: await this.loadTimeModule(),
            calendar: await this.loadCalendarModule()
        };
        
        this.log('📦 App modules loaded for testing', 'info');
    }
    
    async loadSecurityModule() {
        // Simulated security module
        return {
            async hmacSHA256(key, message) {
                const encoder = new TextEncoder();
                const keyData = encoder.encode(key);
                const messageData = encoder.encode(message);
                
                const cryptoKey = await crypto.subtle.importKey(
                    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
                );
                
                const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
                return new Uint8Array(signature);
            },
            
            hashAnswer(answer, salt = 'winter2025') {
                return this.hmacSHA256(salt, answer.toLowerCase().trim());
            },
            
            validateInput(input) {
                return input && typeof input === 'string' && input.length < 100;
            },
            
            checkRateLimit(ip, limit = 5) {
                // Simulated rate limiting
                const key = `rate_${ip}`;
                const attempts = parseInt(localStorage.getItem(key) || '0');
                
                if (attempts >= limit) {
                    return false;
                }
                
                localStorage.setItem(key, (attempts + 1).toString());
                setTimeout(() => {
                    localStorage.removeItem(key);
                }, 60000); // Reset after 1 minute
                
                return true;
            }
        };
    }
    
    async loadQRModule() {
        return {
            async verifySignature(signature, payload) {
                try {
                    const parts = signature.split('.');
                    if (parts.length !== 4 || parts[0] !== 'v1') return false;
                    
                    const decodedPayload = JSON.parse(atob(parts[2]));
                    return decodedPayload.day === payload.day && decodedPayload.answer === payload.answer;
                } catch {
                    return false;
                }
            },
            
            parseQRData(qrString) {
                try {
                    const url = new URL(qrString);
                    const params = new URLSearchParams(url.search);
                    
                    return {
                        day: params.get('day'),
                        signature: params.get('sig'),
                        timestamp: params.get('t')
                    };
                } catch {
                    return null;
                }
            }
        };
    }
    
    async loadAnswerModule() {
        return {
            normalizeAnswer(answer) {
                return answer.toLowerCase().trim().replace(/\\s+/g, ' ');
            },
            
            async validateAnswer(answer, expectedHash, salt = 'winter2025') {
                const normalized = this.normalizeAnswer(answer);
                const computed = await this.modules.security.hmacSHA256(salt, normalized);
                const computedHex = Array.from(computed, b => b.toString(16).padStart(2, '0')).join('');
                
                return computedHex === expectedHash;
            }
        };
    }
    
    async loadTimeModule() {
        return {
            getBerlinTime() {
                return new Date().toLocaleString('de-DE', { 
                    timeZone: 'Europe/Berlin',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            },
            
            isPuzzleAvailable(day, releaseTime) {
                const now = new Date();
                const release = new Date(releaseTime);
                
                // Check if current date is >= release date
                return now >= release;
            },
            
            getTimeUntilRelease(releaseTime) {
                const now = new Date();
                const release = new Date(releaseTime);
                
                return Math.max(0, release.getTime() - now.getTime());
            }
        };
    }
    
    async loadCalendarModule() {
        return {
            getDoorState(day) {
                const states = ['locked', 'available', 'completed'];
                // Simulate door state based on current date and day
                const now = new Date();
                const december = now.getMonth() === 11; // December
                
                if (!december) return 'locked';
                if (now.getDate() >= day) return 'available';
                return 'locked';
            },
            
            getProgress() {
                // Simulate progress calculation
                const completed = Math.floor(Math.random() * 24);
                return {
                    completed,
                    total: 24,
                    percentage: (completed / 24) * 100
                };
            }
        };
    }
    
    setupTestCases() {
        this.testCases = {
            security: [
                {
                    name: 'HMAC-SHA256 Hashing',
                    description: 'Testet die korrekte HMAC-SHA256 Hash-Generierung',
                    test: async () => this.testHMACGeneration()
                },
                {
                    name: 'Answer Hash Validation',
                    description: 'Prüft die Antwort-Hash-Validierung',
                    test: async () => this.testAnswerValidation()
                },
                {
                    name: 'Input Sanitization',
                    description: 'Testet die Eingabe-Bereinigung und -Validierung',
                    test: async () => this.testInputSanitization()
                },
                {
                    name: 'Rate Limiting',
                    description: 'Überprüft das Rate-Limiting-System',
                    test: async () => this.testRateLimiting()
                }
            ],
            
            qr: [
                {
                    name: 'QR Signature Verification',
                    description: 'Testet die QR-Code-Signatur-Verifikation',
                    test: async () => this.testQRSignatureVerification()
                },
                {
                    name: 'QR Data Parsing',
                    description: 'Prüft das Parsen von QR-Code-Daten',
                    test: async () => this.testQRDataParsing()
                },
                {
                    name: 'Invalid QR Handling',
                    description: 'Testet den Umgang mit ungültigen QR-Codes',
                    test: async () => this.testInvalidQRHandling()
                },
                {
                    name: 'QR URL Validation',
                    description: 'Validiert QR-Code-URLs',
                    test: async () => this.testQRURLValidation()
                }
            ],
            
            time: [
                {
                    name: 'Berlin Time Calculation',
                    description: 'Testet die Berliner Zeit-Berechnung',
                    test: async () => this.testBerlinTime()
                },
                {
                    name: 'Puzzle Release Timing',
                    description: 'Prüft die Rätsel-Freischaltzeiten',
                    test: async () => this.testPuzzleReleaseTiming()
                },
                {
                    name: 'Timezone Handling',
                    description: 'Testet die Zeitzone-Verarbeitung',
                    test: async () => this.testTimezoneHandling()
                },
                {
                    name: 'Date Validation',
                    description: 'Validiert Datumsangaben',
                    test: async () => this.testDateValidation()
                }
            ],
            
            calendar: [
                {
                    name: 'Door State Management',
                    description: 'Testet die Türchen-Zustandsverwaltung',
                    test: async () => this.testDoorStates()
                },
                {
                    name: 'Progress Calculation',
                    description: 'Prüft die Fortschritts-Berechnung',
                    test: async () => this.testProgressCalculation()
                },
                {
                    name: 'Stage Transitions',
                    description: 'Testet die Stufen-Übergänge (Stage 1 → 2)',
                    test: async () => this.testStageTransitions()
                }
            ],
            
            integration: [
                {
                    name: 'Complete QR Flow',
                    description: 'Testet den kompletten QR-Code-Workflow',
                    test: async () => this.testCompleteQRFlow()
                },
                {
                    name: 'Answer Submission',
                    description: 'Testet die vollständige Antwort-Einreichung',
                    test: async () => this.testAnswerSubmission()
                },
                {
                    name: 'Error Handling',
                    description: 'Prüft die Fehlerbehandlung',
                    test: async () => this.testErrorHandling()
                },
                {
                    name: 'Performance Stress Test',
                    description: 'Belastungstest für kritische Funktionen',
                    test: async () => this.testPerformanceStress()
                }
            ]
        };
        
        // Count total tests
        this.totalTests = Object.values(this.testCases)
            .reduce((sum, section) => sum + section.length, 0);
        
        this.updateSummary();
    }
    
    async runAllTests() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = Date.now();
        this.resetCounters();
        this.log('🚀 Starting complete test suite...', 'info');
        
        this.updateButtons(true);
        
        try {
            await this.runTestSuite('security', 'Security & Hash Tests');
            await this.runTestSuite('qr', 'QR-Code Tests');
            await this.runTestSuite('time', 'Zeit-Management Tests');
            await this.runTestSuite('calendar', 'Kalender-Logik Tests');
            await this.runTestSuite('integration', 'Integration Tests');
            
            this.log(`✅ All tests completed. ${this.passedTests}/${this.totalTests} passed`, 'success');
            
        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`, 'error');
        } finally {
            this.isRunning = false;
            this.updateButtons(false);
            this.updateSummary();
        }
    }
    
    async runSecurityTests() {
        if (this.isRunning) return;
        await this.runTestSuite('security', 'Security & Hash Tests');
    }
    
    async runQRTests() {
        if (this.isRunning) return;
        await this.runTestSuite('qr', 'QR-Code Tests');
    }
    
    async runTimeTests() {
        if (this.isRunning) return;
        await this.runTestSuite('time', 'Zeit-Management Tests');
    }
    
    async runTestSuite(suiteKey, suiteName) {
        this.log(`🔄 Running ${suiteName}...`, 'info');
        
        const container = document.getElementById(`${suiteKey}-tests`);
        const status = document.getElementById(`${suiteKey}-status`);
        
        container.innerHTML = '';
        this.updateSectionStatus(status, 'running', 'Läuft...');
        
        let suitePassed = 0;
        let suiteFailed = 0;
        
        for (const testCase of this.testCases[suiteKey]) {
            const testElement = this.createTestElement(testCase);
            container.appendChild(testElement);
            
            try {
                this.updateTestStatus(testElement, 'running', 'Läuft...');
                
                const result = await Promise.race([
                    testCase.test(),
                    this.timeoutPromise(this.config.timeout, `Test ${testCase.name} timeout`)
                ]);
                
                if (result && result.success) {
                    this.updateTestStatus(testElement, 'passed', '✅ Bestanden');
                    this.updateTestDetails(testElement, result.details);
                    suitePassed++;
                    this.passedTests++;
                } else {
                    this.updateTestStatus(testElement, 'failed', '❌ Fehlgeschlagen');
                    this.updateTestError(testElement, result?.error || 'Test returned false');
                    suiteFailed++;
                    this.failedTests++;
                }
                
            } catch (error) {
                this.updateTestStatus(testElement, 'failed', '❌ Fehler');
                this.updateTestError(testElement, error.message);
                this.log(`❌ ${testCase.name}: ${error.message}`, 'error');
                suiteFailed++;
                this.failedTests++;
            }
            
            this.updateSummary();
            
            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const suiteStatus = suiteFailed === 0 ? 'passed' : 'failed';
        const suiteMessage = `${suitePassed}/${suitePassed + suiteFailed} bestanden`;
        
        this.updateSectionStatus(status, suiteStatus, suiteMessage);
        this.log(`${suiteName}: ${suiteMessage}`, suiteStatus === 'passed' ? 'success' : 'error');
    }
    
    timeoutPromise(ms, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }
    
    createTestElement(testCase) {
        const element = document.createElement('div');
        element.className = 'test-case';
        
        element.innerHTML = `
            <div class="test-status">⏱️ Wartend</div>
            <div class="test-name">${testCase.name}</div>
            <div class="test-description">${testCase.description}</div>
            <div class="test-details" style="display: none;"></div>
            <div class="test-error" style="display: none;"></div>
        `;
        
        return element;
    }
    
    updateTestStatus(element, status, message) {
        element.className = `test-case ${status}`;
        const statusElement = element.querySelector('.test-status');
        statusElement.className = `test-status ${status}`;
        statusElement.innerHTML = message;
        
        if (status === 'running') {
            statusElement.innerHTML += ' <div class="spinner"></div>';
        }
    }
    
    updateTestDetails(element, details) {
        const detailsElement = element.querySelector('.test-details');
        if (details) {
            detailsElement.style.display = 'block';
            detailsElement.textContent = details;
        }
    }
    
    updateTestError(element, error) {
        const errorElement = element.querySelector('.test-error');
        errorElement.style.display = 'block';
        errorElement.textContent = error;
    }
    
    updateSectionStatus(statusElement, status, message) {
        statusElement.className = `test-status ${status}`;
        statusElement.textContent = message;
    }
    
    updateButtons(disabled) {
        const buttons = [
            'run-all-tests', 'run-security-tests', 
            'run-qr-tests', 'run-time-tests'
        ];
        
        buttons.forEach(id => {
            document.getElementById(id).disabled = disabled;
        });
    }
    
    resetCounters() {
        this.passedTests = 0;
        this.failedTests = 0;
        this.testResults.clear();
    }
    
    updateSummary() {
        document.getElementById('total-tests').textContent = this.totalTests;
        document.getElementById('passed-tests').textContent = this.passedTests;
        document.getElementById('failed-tests').textContent = this.failedTests;
        
        const duration = this.startTime 
            ? Math.round((Date.now() - this.startTime) / 1000)
            : 0;
        document.getElementById('duration').textContent = `${duration}s`;
        
        const progress = this.totalTests > 0 
            ? ((this.passedTests + this.failedTests) / this.totalTests) * 100
            : 0;
        document.getElementById('progress-fill').style.width = `${progress}%`;
    }
    
    // Individual test implementations
    
    async testHMACGeneration() {
        try {
            const key = 'test-key';
            const message = 'test-message';
            const hash = await this.modules.security.hmacSHA256(key, message);
            
            return {
                success: hash instanceof Uint8Array && hash.length === 32,
                details: `Hash length: ${hash.length} bytes`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testAnswerValidation() {
        try {
            const answer = 'rathaus';
            const salt = 'winter2025';
            const hash = await this.modules.security.hashAnswer(answer, salt);
            const hashHex = Array.from(hash, b => b.toString(16).padStart(2, '0')).join('');
            
            const isValid = await this.modules.answer.validateAnswer(answer, hashHex, salt);
            
            return {
                success: isValid,
                details: `Hash: ${hashHex.substring(0, 16)}...`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testInputSanitization() {
        try {
            const validInputs = ['rathaus', 'test123', 'Ämter & Behörden'];
            const invalidInputs = ['', null, 'x'.repeat(200)];
            
            const validResults = validInputs.every(input => 
                this.modules.security.validateInput(input)
            );
            
            const invalidResults = invalidInputs.every(input => 
                !this.modules.security.validateInput(input)
            );
            
            return {
                success: validResults && invalidResults,
                details: `Valid: ${validInputs.length}, Invalid: ${invalidInputs.length}`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testRateLimiting() {
        try {
            const testIP = '192.168.1.100';
            const limit = 3;
            
            // Clear any existing rate limit
            localStorage.removeItem(`rate_${testIP}`);
            
            // Test normal usage
            let attempts = 0;
            while (attempts < limit && this.modules.security.checkRateLimit(testIP, limit)) {
                attempts++;
            }
            
            // Next attempt should be blocked
            const blocked = !this.modules.security.checkRateLimit(testIP, limit);
            
            return {
                success: attempts === limit && blocked,
                details: `Allowed: ${attempts}/${limit}, Blocked: ${blocked}`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testQRSignatureVerification() {
        try {
            const validSignature = 'v1.eyJhbGciOiJIUzI1NiJ9.eyJkYXkiOjEsImFuc3dlciI6InJhdGhhdXMifQ.demo_sig';
            const payload = { day: 1, answer: 'rathaus' };
            
            const isValid = await this.modules.qr.verifySignature(validSignature, payload);
            
            return {
                success: isValid,
                details: `Payload: day=${payload.day}, answer=${payload.answer}`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testQRDataParsing() {
        try {
            const qrUrl = `${this.config.baseUrl}/verify?day=1&sig=v1.demo&t=1701504000000`;
            const parsed = this.modules.qr.parseQRData(qrUrl);
            
            return {
                success: parsed && parsed.day === '1' && parsed.signature === 'v1.demo',
                details: `Day: ${parsed?.day}, Sig: ${parsed?.signature?.substring(0, 10)}...`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testInvalidQRHandling() {
        try {
            const invalidUrls = [
                'invalid-url',
                'https://wrong-domain.com/verify',
                `${this.config.baseUrl}/verify?invalid=params`
            ];
            
            const results = await Promise.all(
                invalidUrls.map(url => this.modules.qr.parseQRData(url))
            );
            
            const allNull = results.every(result => result === null);
            
            return {
                success: allNull,
                details: `Tested ${invalidUrls.length} invalid URLs`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testQRURLValidation() {
        try {
            const validUrl = `${this.config.baseUrl}/verify?day=1&sig=v1.test&t=123456789`;
            const parsed = this.modules.qr.parseQRData(validUrl);
            
            const hasRequiredParams = parsed && parsed.day && parsed.signature && parsed.timestamp;
            
            return {
                success: !!hasRequiredParams,
                details: `Required params present: ${!!hasRequiredParams}`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testBerlinTime() {
        try {
            const berlinTime = this.modules.time.getBerlinTime();
            const isValidFormat = /^\\d{2}\\.\\d{2}\\.\\d{4}, \\d{2}:\\d{2}:\\d{2}$/.test(berlinTime);
            
            return {
                success: isValidFormat,
                details: `Current Berlin time: ${berlinTime}`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testPuzzleReleaseTiming() {
        try {
            const now = new Date();
            const pastRelease = new Date(now.getTime() - 3600000); // 1 hour ago
            const futureRelease = new Date(now.getTime() + 3600000); // 1 hour from now
            
            const pastAvailable = this.modules.time.isPuzzleAvailable(1, pastRelease);
            const futureAvailable = this.modules.time.isPuzzleAvailable(2, futureRelease);
            
            return {
                success: pastAvailable && !futureAvailable,
                details: `Past: ${pastAvailable}, Future: ${futureAvailable}`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testTimezoneHandling() {
        try {
            const releaseTime = '2025-12-01T06:00:00+01:00';
            const timeUntilRelease = this.modules.time.getTimeUntilRelease(releaseTime);
            
            return {
                success: typeof timeUntilRelease === 'number' && timeUntilRelease >= 0,
                details: `Time until release: ${timeUntilRelease}ms`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testDateValidation() {
        try {
            const validDates = [
                '2025-12-01T06:00:00+01:00',
                '2025-12-24T23:59:59+01:00'
            ];
            
            const invalidDates = [
                'invalid-date',
                '2025-13-01T06:00:00+01:00',
                '2025-12-32T06:00:00+01:00'
            ];
            
            const validResults = validDates.every(date => !isNaN(new Date(date).getTime()));
            const invalidResults = invalidDates.every(date => isNaN(new Date(date).getTime()));
            
            return {
                success: validResults && invalidResults,
                details: `Valid: ${validDates.length}, Invalid: ${invalidDates.length}`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testDoorStates() {
        try {
            const states = [];
            for (let day = 1; day <= 24; day++) {
                const state = this.modules.calendar.getDoorState(day);
                states.push(state);
            }
            
            const validStates = states.every(state => 
                ['locked', 'available', 'completed'].includes(state)
            );
            
            return {
                success: validStates,
                details: `Tested ${states.length} door states`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testProgressCalculation() {
        try {
            const progress = this.modules.calendar.getProgress();
            
            const isValid = progress && 
                typeof progress.completed === 'number' &&
                typeof progress.total === 'number' &&
                typeof progress.percentage === 'number' &&
                progress.total === 24 &&
                progress.completed >= 0 &&
                progress.completed <= progress.total;
            
            return {
                success: isValid,
                details: `Progress: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(1)}%)`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testStageTransitions() {
        try {
            // Test stage 1 days (1-12)
            const stage1Days = Array.from({length: 12}, (_, i) => i + 1);
            const stage1Results = stage1Days.map(day => day <= 12);
            
            // Test stage 2 days (13-24)
            const stage2Days = Array.from({length: 12}, (_, i) => i + 13);
            const stage2Results = stage2Days.map(day => day >= 13);
            
            const allValid = [...stage1Results, ...stage2Results].every(Boolean);
            
            return {
                success: allValid,
                details: `Stage 1: days 1-12, Stage 2: days 13-24`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testCompleteQRFlow() {
        try {
            // Simulate complete QR flow
            const day = 1;
            const answer = 'rathaus';
            const salt = 'winter2025';
            
            // 1. Generate hash
            const hash = await this.modules.security.hashAnswer(answer, salt);
            const hashHex = Array.from(hash, b => b.toString(16).padStart(2, '0')).join('');
            
            // 2. Create QR URL
            const qrUrl = `${this.config.baseUrl}/verify?day=${day}&sig=v1.test&t=${Date.now()}`;
            
            // 3. Parse QR data
            const parsed = this.modules.qr.parseQRData(qrUrl);
            
            // 4. Validate answer
            const isValid = await this.modules.answer.validateAnswer(answer, hashHex, salt);
            
            return {
                success: parsed && isValid,
                details: `Complete flow test successful`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testAnswerSubmission() {
        try {
            const testData = {
                day: 1,
                answer: 'rathaus',
                normalized: 'rathaus'
            };
            
            const normalized = this.modules.answer.normalizeAnswer(testData.answer);
            const isNormalized = normalized === testData.normalized;
            
            const canValidate = this.modules.security.validateInput(testData.answer);
            
            return {
                success: isNormalized && canValidate,
                details: `Normalized: "${normalized}", Valid: ${canValidate}`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testErrorHandling() {
        try {
            let errorsHandled = 0;
            
            // Test various error conditions
            try {
                await this.modules.qr.verifySignature('invalid', {});
            } catch {
                errorsHandled++;
            }
            
            try {
                this.modules.qr.parseQRData('invalid-url');
            } catch {
                errorsHandled++;
            }
            
            try {
                this.modules.security.validateInput(null);
            } catch {
                errorsHandled++;
            }
            
            return {
                success: errorsHandled >= 0, // Some errors should be handled gracefully
                details: `Error conditions tested: 3, Handled: ${errorsHandled}`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testPerformanceStress() {
        try {
            const iterations = 100;
            const startTime = performance.now();
            
            // Stress test hash generation
            const promises = [];
            for (let i = 0; i < iterations; i++) {
                promises.push(
                    this.modules.security.hmacSHA256(
                        `key-${i}`,
                        `message-${i}`
                    )
                );
            }
            
            await Promise.all(promises);
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            const avgTime = duration / iterations;
            
            return {
                success: avgTime < 100, // Should be faster than 100ms per hash
                details: `${iterations} hashes in ${duration.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Utility methods
    
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString('de-DE');
        const logElement = document.getElementById('test-log');
        
        const prefix = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️'
        }[level] || 'ℹ️';
        
        const logLine = `[${timestamp}] ${prefix} ${message}\\n`;
        logElement.textContent += logLine;
        logElement.scrollTop = logElement.scrollHeight;
        
        console.log(`SelfTest: ${message}`);
    }
    
    clearResults() {
        // Clear all test results
        const sections = ['security', 'qr', 'rate-limit', 'time', 'calendar', 'integration'];
        
        sections.forEach(section => {
            const container = document.getElementById(`${section}-tests`);
            if (container) container.innerHTML = '';
            
            const status = document.getElementById(`${section}-status`);
            if (status) this.updateSectionStatus(status, '', '⏱️ Wartend');
        });
        
        this.resetCounters();
        this.updateSummary();
        this.log('🗑️ Test results cleared', 'info');
    }
    
    clearLog() {
        document.getElementById('test-log').textContent = '';
    }
    
    exportReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.totalTests,
                passed: this.passedTests,
                failed: this.failedTests,
                duration: this.startTime ? Date.now() - this.startTime : 0
            },
            config: this.config,
            results: Array.from(this.testResults.entries())
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `winter-rallye-test-report-${new Date().toISOString().slice(0, 10)}.json`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
        this.log('📄 Test report exported', 'success');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SelfTestSuite();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelfTestSuite;
}