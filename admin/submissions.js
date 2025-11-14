/**
 * Admin Submissions JavaScript
 * Lädt und zeigt eingereichte Antworten aus localStorage an
 */

'use strict';

class SubmissionsAdmin {
    constructor() {
        this.submissions = [];
        this.filteredSubmissions = [];
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.storageKey = 'wr_submissions_v1';
        
        this.filters = {
            day: '',
            stage: '',
            correct: '',
            userKey: ''
        };
    }

    /**
     * Initialisiert die Admin-Ansicht
     */
    init() {
        console.log('📊 Submissions Admin wird initialisiert...');
        this.loadSubmissions();
        this.calculateStats();
        this.renderTable();
        this.setupEventListeners();
        console.log('✅ Admin-Ansicht initialisiert');
    }

    /**
     * Lädt Submissions aus localStorage
     */
    loadSubmissions() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                this.submissions = JSON.parse(data);
                console.log(`📊 ${this.submissions.length} Submissions geladen`);
            } else {
                this.submissions = [];
                console.log('📊 Keine Submissions gefunden');
            }
        } catch (error) {
            console.error('❌ Fehler beim Laden der Submissions:', error);
            this.submissions = [];
        }
        
        // Sortiere nach Timestamp (neueste zuerst)
        this.submissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        this.filteredSubmissions = [...this.submissions];
    }

    /**
     * Berechnet und zeigt Statistiken
     */
    calculateStats() {
        const total = this.submissions.length;
        const correct = this.submissions.filter(s => s.isCorrect).length;
        const uniqueUsers = new Set(this.submissions.map(s => s.userKey)).size;
        
        // Durchschnittliche Bearbeitungszeit (nur für Stage-2)
        const stage2Submissions = this.submissions.filter(s => s.stage === 2 && s.durationMs);
        const avgDuration = stage2Submissions.length > 0 
            ? stage2Submissions.reduce((sum, s) => sum + s.durationMs, 0) / stage2Submissions.length
            : 0;

        // Update UI
        document.getElementById('total-submissions').textContent = total;
        document.getElementById('correct-submissions').textContent = correct;
        document.getElementById('unique-users').textContent = uniqueUsers;
        document.getElementById('avg-duration').textContent = this.formatDuration(avgDuration);
    }

    /**
     * Wendet Filter an
     */
    applyFilters() {
        const dayFilter = document.getElementById('filter-day').value;
        const stageFilter = document.getElementById('filter-stage').value;
        const correctFilter = document.getElementById('filter-correct').value;
        const userKeyFilter = document.getElementById('search-user').value.toLowerCase().trim();

        this.filteredSubmissions = this.submissions.filter(submission => {
            // Tag Filter
            if (dayFilter && submission.day !== parseInt(dayFilter)) {
                return false;
            }

            // Stage Filter
            if (stageFilter && submission.stage !== parseInt(stageFilter)) {
                return false;
            }

            // Korrektheit Filter
            if (correctFilter && submission.isCorrect.toString() !== correctFilter) {
                return false;
            }

            // User Key Filter
            if (userKeyFilter && !submission.userKey.toLowerCase().includes(userKeyFilter)) {
                return false;
            }

            return true;
        });

        this.currentPage = 1;
        this.renderTable();
        console.log(`🔍 Filter angewendet: ${this.filteredSubmissions.length} von ${this.submissions.length} Submissions`);
    }

    /**
     * Setzt Filter zurück
     */
    resetFilters() {
        document.getElementById('filter-day').value = '';
        document.getElementById('filter-stage').value = '';
        document.getElementById('filter-correct').value = '';
        document.getElementById('search-user').value = '';
        
        this.filteredSubmissions = [...this.submissions];
        this.currentPage = 1;
        this.renderTable();
        console.log('🔄 Filter zurückgesetzt');
    }

    /**
     * Rendert die Tabelle mit aktuellen Daten
     */
    renderTable() {
        const tbody = document.getElementById('submissions-body');
        const emptyState = document.getElementById('empty-state');
        
        if (this.filteredSubmissions.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Paginierung
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageSubmissions = this.filteredSubmissions.slice(startIndex, endIndex);

        // Erstelle Tabellenzeilen
        tbody.innerHTML = pageSubmissions.map(submission => {
            const rowClass = submission.isCorrect ? 'correct' : 'incorrect';
            const durationClass = this.getDurationClass(submission.durationMs);
            
            return `
                <tr class="${rowClass}">
                    <td><span class="user-key">${this.truncateKey(submission.userKey)}</span></td>
                    <td>${submission.day}</td>
                    <td>${submission.stage}</td>
                    <td>${this.escapeHtml(submission.answer_raw || '')}</td>
                    <td>${this.escapeHtml(submission.answer_norm || '')}</td>
                    <td>${submission.isCorrect ? '✅' : '❌'}</td>
                    <td><span class="duration ${durationClass}">${this.formatDuration(submission.durationMs)}</span></td>
                    <td><span class="timestamp">${this.formatTimestamp(submission.timestamp)}</span></td>
                    <td>${submission.source || 'unknown'}</td>
                </tr>
            `;
        }).join('');

        this.renderPagination();
    }

    /**
     * Rendert Paginierung
     */
    renderPagination() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(this.filteredSubmissions.length / this.itemsPerPage);

        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';

        const buttons = [];
        
        // Previous Button
        buttons.push(`
            <button onclick="submissionsAdmin.goToPage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                « Vorherige
            </button>
        `);

        // Page Numbers
        for (let page = 1; page <= totalPages; page++) {
            if (page === 1 || page === totalPages || Math.abs(page - this.currentPage) <= 2) {
                buttons.push(`
                    <button onclick="submissionsAdmin.goToPage(${page})" 
                            class="${page === this.currentPage ? 'active' : ''}">
                        ${page}
                    </button>
                `);
            } else if (page === this.currentPage - 3 || page === this.currentPage + 3) {
                buttons.push('<span>...</span>');
            }
        }

        // Next Button
        buttons.push(`
            <button onclick="submissionsAdmin.goToPage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                Nächste »
            </button>
        `);

        pagination.innerHTML = buttons.join('');
    }

    /**
     * Wechselt zur angegebenen Seite
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredSubmissions.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderTable();
    }

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Auto-Update alle 30 Sekunden
        setInterval(() => {
            this.refreshData();
        }, 30000);
    }

    /**
     * Exportiert Daten als CSV
     */
    exportToCSV() {
        if (this.filteredSubmissions.length === 0) {
            alert('Keine Daten zum Exportieren vorhanden.');
            return;
        }

        const headers = [
            'User Key', 'Tag', 'Stage', 'Antwort Raw', 'Antwort Normalisiert',
            'Korrekt', 'Dauer (ms)', 'Timestamp', 'Quelle'
        ];

        const csvContent = [
            headers.join(','),
            ...this.filteredSubmissions.map(s => [
                s.userKey,
                s.day,
                s.stage,
                `"${(s.answer_raw || '').replace(/"/g, '""')}"`,
                `"${(s.answer_norm || '').replace(/"/g, '""')}"`,
                s.isCorrect,
                s.durationMs || '',
                s.timestamp,
                s.source || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `winterrallye_submissions_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        console.log('📊 CSV Export abgeschlossen');
    }

    /**
     * Löscht alle gespeicherten Daten
     */
    clearAllData() {
        const confirmed = confirm('Sicher? Alle Submissions werden unwiderruflich gelöscht!');
        if (confirmed) {
            localStorage.removeItem(this.storageKey);
            this.submissions = [];
            this.filteredSubmissions = [];
            this.calculateStats();
            this.renderTable();
            console.log('🗑️ Alle Submissions gelöscht');
            alert('Alle Daten wurden gelöscht.');
        }
    }

    /**
     * Lädt Daten neu
     */
    refreshData() {
        this.loadSubmissions();
        this.calculateStats();
        this.applyFilters(); // Behält aktuelle Filter bei
        console.log('🔄 Daten aktualisiert');
    }

    // --- Hilfsfunktionen ---

    formatDuration(ms) {
        if (!ms || ms <= 0) return '—';
        
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${Math.round(ms / 1000)}s`;
        if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
        
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    getDurationClass(ms) {
        if (!ms) return '';
        if (ms < 30000) return 'fast';      // < 30s
        if (ms < 120000) return 'medium';   // < 2min
        return 'slow';                      // >= 2min
    }

    formatTimestamp(timestamp) {
        try {
            return new Date(timestamp).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return timestamp || '—';
        }
    }

    truncateKey(key) {
        return key && key.length > 8 ? `${key.substring(0, 8)}...` : key || 'unknown';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Globale Instanz
const submissionsAdmin = new SubmissionsAdmin();

// Globale Funktionen für HTML Events
function applyFilters() {
    submissionsAdmin.applyFilters();
}

function resetFilters() {
    submissionsAdmin.resetFilters();
}

function exportToCSV() {
    submissionsAdmin.exportToCSV();
}

function clearAllData() {
    submissionsAdmin.clearAllData();
}

function refreshData() {
    submissionsAdmin.refreshData();
}

// Auto-Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => submissionsAdmin.init());
} else {
    submissionsAdmin.init();
}

console.log('✅ Submissions Admin geladen');