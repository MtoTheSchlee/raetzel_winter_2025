/**
 * Modal Confirm - Bestätigungs-Modals für Rätzel Winter 2025
 * Sichere und benutzerfreundliche Bestätigungsdialoge
 */

'use strict';

/**
 * Modal-Bestätigungs-Klasse für sichere User-Interaktionen
 */
class ModalConfirm {
    constructor() {
        this.isInitialized = false;
        this.activeModal = null;
        this.modalQueue = [];
        this.templates = new Map();
        
        // Konfiguration
        this.config = {
            // Animation-Einstellungen
            animation: {
                duration: 250,
                easing: 'ease-in-out'
            },
            
            // Auto-Close Einstellungen
            autoClose: {
                enabled: false,
                timeout: 10000, // 10 Sekunden
                showCountdown: true
            },
            
            // Escape-Taste Behandlung
            escapeKey: {
                enabled: true,
                action: 'cancel' // cancel, confirm, none
            },
            
            // Click-Outside Behandlung
            clickOutside: {
                enabled: true,
                action: 'cancel' // cancel, confirm, none
            },
            
            // CSS-Klassen
            cssClasses: {
                modal: 'modal-confirm',
                overlay: 'modal-confirm__overlay',
                content: 'modal-confirm__content',
                header: 'modal-confirm__header',
                body: 'modal-confirm__body',
                footer: 'modal-confirm__footer',
                button: 'modal-confirm__button',
                primary: 'modal-confirm__button--primary',
                secondary: 'modal-confirm__button--secondary',
                danger: 'modal-confirm__button--danger'
            }
        };

        // Standard-Templates
        this.defaultTemplates = {
            confirm: {
                title: 'Bestätigen',
                message: 'Sind Sie sicher?',
                confirmText: 'Ja',
                cancelText: 'Abbrechen',
                type: 'primary'
            },
            
            delete: {
                title: 'Löschen bestätigen',
                message: 'Diese Aktion kann nicht rückgängig gemacht werden.',
                confirmText: 'Löschen',
                cancelText: 'Abbrechen',
                type: 'danger'
            },
            
            warning: {
                title: 'Warnung',
                message: 'Diese Aktion hat Konsequenzen.',
                confirmText: 'Fortfahren',
                cancelText: 'Abbrechen',
                type: 'warning'
            },

            reset: {
                title: 'Fortschritt zurücksetzen',
                message: 'Ihr gesamter Fortschritt wird gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
                confirmText: 'Zurücksetzen',
                cancelText: 'Abbrechen',
                type: 'danger'
            }
        };

        // Event-Bindings
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }

    /**
     * Initialisiert das Modal-System
     */
    async init() {
        try {
            console.log('📋 Modal-Confirm wird initialisiert...');
            
            // Lade Templates
            this.loadTemplates();

            // Setup globale Event-Listener
            this.setupGlobalListeners();

            // Erstelle Container falls nicht vorhanden
            this.ensureModalContainer();

            this.isInitialized = true;
            console.log('✅ Modal-Confirm initialisiert');

        } catch (error) {
            console.error('❌ Fehler bei Modal-Confirm-Initialisierung:', error);
            throw error;
        }
    }

    /**
     * Lädt vordefinierte Templates
     */
    loadTemplates() {
        for (const [key, template] of Object.entries(this.defaultTemplates)) {
            this.templates.set(key, template);
        }
        console.log(`📋 ${this.templates.size} Templates geladen`);
    }

    /**
     * Setup globale Event-Listener
     */
    setupGlobalListeners() {
        document.addEventListener('keydown', this.handleKeydown);
        
        // Page Visibility Change (pause auto-close wenn Tab nicht aktiv)
        document.addEventListener('visibilitychange', () => {
            if (this.activeModal && this.activeModal.autoCloseTimer) {
                if (document.hidden) {
                    this.pauseAutoClose();
                } else {
                    this.resumeAutoClose();
                }
            }
        });
    }

    /**
     * Stellt sicher, dass ein Modal-Container existiert
     */
    ensureModalContainer() {
        let container = document.getElementById('modal-confirm-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modal-confirm-container';
            container.className = 'modal-confirm-container';
            document.body.appendChild(container);
        }
        this.container = container;
    }

    /**
     * Zeigt ein Bestätigungs-Modal
     */
    async confirm(options = {}) {
        return new Promise((resolve) => {
            const modalConfig = this.buildModalConfig(options);
            
            // Wenn bereits ein Modal aktiv ist, zur Warteschlange hinzufügen
            if (this.activeModal) {
                this.modalQueue.push({ config: modalConfig, resolve });
                return;
            }

            this.showModal(modalConfig, resolve);
        });
    }

    /**
     * Baut die Modal-Konfiguration auf
     */
    buildModalConfig(options) {
        // Verwende Template falls angegeben
        let baseConfig = {};
        if (options.template && this.templates.has(options.template)) {
            baseConfig = { ...this.templates.get(options.template) };
        }

        // Merge mit übergebenen Optionen
        const config = {
            ...baseConfig,
            ...options,
            id: this.generateModalId(),
            timestamp: Date.now()
        };

        // Validiere Konfiguration
        this.validateModalConfig(config);

        return config;
    }

    /**
     * Validiert Modal-Konfiguration
     */
    validateModalConfig(config) {
        if (!config.message && !config.html) {
            throw new Error('Modal benötigt message oder html');
        }

        if (!config.confirmText) {
            config.confirmText = 'OK';
        }

        if (!config.cancelText) {
            config.cancelText = 'Abbrechen';
        }

        if (!config.type) {
            config.type = 'primary';
        }
    }

    /**
     * Zeigt das Modal an
     */
    showModal(config, resolve) {
        try {
            // Erstelle Modal-Element
            const modalElement = this.createModalElement(config);
            
            // Füge zum Container hinzu
            this.container.appendChild(modalElement);
            
            // Setup Modal-Objekt
            this.activeModal = {
                element: modalElement,
                config,
                resolve,
                autoCloseTimer: null,
                autoClosePaused: false
            };

            // Event-Listener für dieses Modal
            this.setupModalListeners(modalElement, config, resolve);

            // Animation: Einblenden
            this.animateIn(modalElement);

            // Auto-Close Setup
            if (config.autoClose) {
                this.setupAutoClose(config.autoClose);
            }

            // Accessibility: Focus Management
            this.manageFocus(modalElement);

            // Security: Rate-Limiting
            if (window.SecurityStatic) {
                window.SecurityStatic.logSecurityEvent('modal_opened', {
                    type: config.type,
                    template: config.template
                });
            }

            console.log('📋 Modal geöffnet:', config.title || 'Unbekannt');

        } catch (error) {
            console.error('Fehler beim Anzeigen des Modals:', error);
            resolve(false);
        }
    }

    /**
     * Erstellt das Modal-HTML-Element
     */
    createModalElement(config) {
        const modal = document.createElement('div');
        modal.className = `${this.config.cssClasses.modal} ${this.config.cssClasses.modal}--${config.type}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `modal-title-${config.id}`);
        modal.setAttribute('aria-describedby', `modal-body-${config.id}`);

        modal.innerHTML = `
            <div class="${this.config.cssClasses.overlay}"></div>
            <div class="${this.config.cssClasses.content}">
                ${this.createModalHeader(config)}
                ${this.createModalBody(config)}
                ${this.createModalFooter(config)}
            </div>
        `;

        return modal;
    }

    /**
     * Erstellt Modal-Header
     */
    createModalHeader(config) {
        if (!config.title) return '';

        return `
            <div class="${this.config.cssClasses.header}">
                <h2 id="modal-title-${config.id}" class="modal-confirm__title">
                    ${this.escapeHtml(config.title)}
                </h2>
                ${config.showCloseButton !== false ? `
                    <button class="modal-confirm__close" aria-label="Schließen">
                        <span aria-hidden="true">&times;</span>
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Erstellt Modal-Body
     */
    createModalBody(config) {
        let content = '';
        
        if (config.html) {
            content = config.html; // Raw HTML (Vorsicht!)
        } else if (config.message) {
            content = `<p>${this.escapeHtml(config.message)}</p>`;
        }

        // Auto-Close-Countdown
        if (config.autoClose && this.config.autoClose.showCountdown) {
            content += `
                <div class="modal-confirm__countdown" id="countdown-${config.id}" style="display: none;">
                    Modal schließt automatisch in <span class="countdown-timer">-</span> Sekunden.
                </div>
            `;
        }

        return `
            <div class="${this.config.cssClasses.body}" id="modal-body-${config.id}">
                ${content}
            </div>
        `;
    }

    /**
     * Erstellt Modal-Footer
     */
    createModalFooter(config) {
        const buttons = [];

        // Cancel-Button (falls gewünscht)
        if (config.showCancel !== false) {
            buttons.push(`
                <button class="${this.config.cssClasses.button} ${this.config.cssClasses.secondary} modal-cancel"
                        type="button">
                    ${this.escapeHtml(config.cancelText)}
                </button>
            `);
        }

        // Confirm-Button
        buttons.push(`
            <button class="${this.config.cssClasses.button} ${this.config.cssClasses[config.type]} modal-confirm"
                    type="button" autofocus>
                ${this.escapeHtml(config.confirmText)}
            </button>
        `);

        return `
            <div class="${this.config.cssClasses.footer}">
                ${buttons.join('')}
            </div>
        `;
    }

    /**
     * Setup Event-Listener für ein Modal
     */
    setupModalListeners(modalElement, config, resolve) {
        // Confirm-Button
        const confirmBtn = modalElement.querySelector('.modal-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.closeModal(true);
            });
        }

        // Cancel-Button
        const cancelBtn = modalElement.querySelector('.modal-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal(false);
            });
        }

        // Close-Button
        const closeBtn = modalElement.querySelector('.modal-confirm__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal(false);
            });
        }

        // Overlay-Click
        const overlay = modalElement.querySelector(`.${this.config.cssClasses.overlay}`);
        if (overlay && this.config.clickOutside.enabled) {
            overlay.addEventListener('click', () => {
                if (this.config.clickOutside.action === 'cancel') {
                    this.closeModal(false);
                } else if (this.config.clickOutside.action === 'confirm') {
                    this.closeModal(true);
                }
            });
        }
    }

    /**
     * Animation: Modal einblenden
     */
    animateIn(modalElement) {
        modalElement.style.opacity = '0';
        modalElement.style.transform = 'scale(0.95)';
        modalElement.style.transition = `all ${this.config.animation.duration}ms ${this.config.animation.easing}`;

        // Force reflow
        modalElement.offsetHeight;

        modalElement.style.opacity = '1';
        modalElement.style.transform = 'scale(1)';
    }

    /**
     * Animation: Modal ausblenden
     */
    async animateOut(modalElement) {
        return new Promise((resolve) => {
            modalElement.style.transition = `all ${this.config.animation.duration}ms ${this.config.animation.easing}`;
            modalElement.style.opacity = '0';
            modalElement.style.transform = 'scale(0.95)';

            setTimeout(() => {
                if (modalElement.parentNode) {
                    modalElement.parentNode.removeChild(modalElement);
                }
                resolve();
            }, this.config.animation.duration);
        });
    }

    /**
     * Schließt das aktive Modal
     */
    async closeModal(confirmed = false) {
        if (!this.activeModal) return;

        try {
            // Auto-Close Timer stoppen
            this.clearAutoClose();

            // Animation: Ausblenden
            await this.animateOut(this.activeModal.element);

            // Resolve Promise
            this.activeModal.resolve(confirmed);

            // Bereinigung
            this.activeModal = null;

            // Body-Scroll wieder aktivieren
            document.body.style.overflow = '';

            // Security-Event
            if (window.SecurityStatic) {
                window.SecurityStatic.logSecurityEvent('modal_closed', { confirmed });
            }

            console.log('📋 Modal geschlossen:', confirmed ? 'Bestätigt' : 'Abgebrochen');

            // Nächstes Modal aus Warteschlange
            this.processQueue();

        } catch (error) {
            console.error('Fehler beim Schließen des Modals:', error);
            this.activeModal.resolve(false);
            this.activeModal = null;
        }
    }

    /**
     * Verarbeitet die Modal-Warteschlange
     */
    processQueue() {
        if (this.modalQueue.length === 0) return;

        const next = this.modalQueue.shift();
        this.showModal(next.config, next.resolve);
    }

    /**
     * Setup Auto-Close-Funktionalität
     */
    setupAutoClose(autoCloseConfig) {
        if (!autoCloseConfig || !autoCloseConfig.enabled) return;

        const timeout = autoCloseConfig.timeout || this.config.autoClose.timeout;
        const showCountdown = autoCloseConfig.showCountdown !== false;

        if (showCountdown) {
            this.startCountdown(timeout);
        }

        this.activeModal.autoCloseTimer = setTimeout(() => {
            if (this.activeModal) {
                this.closeModal(autoCloseConfig.action === 'confirm');
            }
        }, timeout);
    }

    /**
     * Startet Countdown-Anzeige
     */
    startCountdown(totalTime) {
        const countdownEl = document.getElementById(`countdown-${this.activeModal.config.id}`);
        if (!countdownEl) return;

        const timerEl = countdownEl.querySelector('.countdown-timer');
        countdownEl.style.display = 'block';

        let remaining = Math.ceil(totalTime / 1000);

        const updateCountdown = () => {
            if (timerEl && remaining > 0) {
                timerEl.textContent = remaining;
                remaining--;
                
                if (!this.activeModal?.autoClosePaused) {
                    setTimeout(updateCountdown, 1000);
                }
            }
        };

        updateCountdown();
    }

    /**
     * Pausiert Auto-Close
     */
    pauseAutoClose() {
        if (this.activeModal && this.activeModal.autoCloseTimer) {
            this.activeModal.autoClosePaused = true;
        }
    }

    /**
     * Setzt Auto-Close fort
     */
    resumeAutoClose() {
        if (this.activeModal && this.activeModal.autoClosePaused) {
            this.activeModal.autoClosePaused = false;
        }
    }

    /**
     * Löscht Auto-Close Timer
     */
    clearAutoClose() {
        if (this.activeModal && this.activeModal.autoCloseTimer) {
            clearTimeout(this.activeModal.autoCloseTimer);
            this.activeModal.autoCloseTimer = null;
        }
    }

    /**
     * Focus-Management für Accessibility
     */
    manageFocus(modalElement) {
        // Body-Scroll deaktivieren
        document.body.style.overflow = 'hidden';

        // Focus auf ersten Button
        const firstButton = modalElement.querySelector('button');
        if (firstButton) {
            setTimeout(() => {
                firstButton.focus();
            }, this.config.animation.duration);
        }

        // Trap Focus innerhalb des Modals
        this.trapFocus(modalElement);
    }

    /**
     * Trap Focus innerhalb des Modals
     */
    trapFocus(modalElement) {
        const focusableElements = modalElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        modalElement.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }

    /**
     * Globaler Keydown-Handler
     */
    handleKeydown(event) {
        if (!this.activeModal) return;

        if (event.key === 'Escape' && this.config.escapeKey.enabled) {
            event.preventDefault();
            
            if (this.config.escapeKey.action === 'cancel') {
                this.closeModal(false);
            } else if (this.config.escapeKey.action === 'confirm') {
                this.closeModal(true);
            }
        }
    }

    /**
     * Click-Outside-Handler
     */
    handleClickOutside(event) {
        if (!this.activeModal || !this.config.clickOutside.enabled) return;

        const modalContent = this.activeModal.element.querySelector(`.${this.config.cssClasses.content}`);
        if (modalContent && !modalContent.contains(event.target)) {
            if (this.config.clickOutside.action === 'cancel') {
                this.closeModal(false);
            } else if (this.config.clickOutside.action === 'confirm') {
                this.closeModal(true);
            }
        }
    }

    /**
     * HTML escaping für Sicherheit
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Generiert eindeutige Modal-ID
     */
    generateModalId() {
        return 'modal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Schließt alle Modals
     */
    closeAll() {
        if (this.activeModal) {
            this.closeModal(false);
        }
        
        this.modalQueue = [];
    }

    /**
     * Registriert neues Template
     */
    registerTemplate(name, template) {
        this.templates.set(name, template);
    }

    /**
     * Schnell-Methoden für häufige Anwendungsfälle
     */
    async confirmDelete(message = null) {
        return this.confirm({
            template: 'delete',
            ...(message && { message })
        });
    }

    async confirmReset(message = null) {
        return this.confirm({
            template: 'reset',
            ...(message && { message })
        });
    }

    async showWarning(message) {
        return this.confirm({
            template: 'warning',
            message
        });
    }

    /**
     * Bereinigung
     */
    destroy() {
        this.closeAll();
        document.removeEventListener('keydown', this.handleKeydown);
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        console.log('📋 Modal-Confirm beendet');
    }

    /**
     * Status-Report
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            activeModal: !!this.activeModal,
            queueLength: this.modalQueue.length,
            templates: Array.from(this.templates.keys()),
            config: this.config
        };
    }
}

// Globale Instanz erstellen
const modalConfirm = new ModalConfirm();

// Export für Module
window.ModalConfirm = modalConfirm;