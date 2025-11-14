/**
 * Test für das neue Zeitmanagement-System
 * Testet WR_TIME API, Kalender-Integration und Türchen-Freischaltung
 */

'use strict';

// Simuliere eine Console für die Tests
const testResults = [];

function testLog(message) {
  testResults.push(message);
  console.log(`🧪 ${message}`);
}

function runTimeTests() {
  testLog('Testing WR_TIME API...');
  
  // 1. Test WR_TIME Existenz
  if (typeof window.WR_TIME !== 'object') {
    testLog('❌ window.WR_TIME nicht verfügbar');
    return false;
  }
  
  // 2. Test API-Funktionen
  const requiredFunctions = [
    'getBerlinNow',
    'formatTimeHHMM', 
    'getNextDailyUnlock',
    'getDoorUnlockDate',
    'isDoorUnlocked',
    'formatCountdown',
    'startClock'
  ];
  
  for (const funcName of requiredFunctions) {
    if (typeof window.WR_TIME[funcName] !== 'function') {
      testLog(`❌ WR_TIME.${funcName}() fehlt`);
      return false;
    } else {
      testLog(`✅ WR_TIME.${funcName}() verfügbar`);
    }
  }
  
  // 3. Test Zeit-Funktionen
  try {
    const now = window.WR_TIME.getBerlinNow();
    testLog(`✅ Aktuelle Zeit: ${window.WR_TIME.formatTimeHHMM(now)}`);
    
    const next = window.WR_TIME.getNextDailyUnlock(now);
    testLog(`✅ Nächste Freischaltung: ${window.WR_TIME.formatTimeHHMM(next)}`);
    
    const countdown = window.WR_TIME.formatCountdown(next.getTime() - now.getTime());
    testLog(`✅ Countdown: ${countdown}`);
    
  } catch (error) {
    testLog(`❌ Zeit-Funktion Fehler: ${error.message}`);
    return false;
  }
  
  // 4. Test Türchen-Logik
  try {
    const now = window.WR_TIME.getBerlinNow();
    
    // Test Türchen 1
    const door1Unlock = window.WR_TIME.getDoorUnlockDate(1);
    const door1Status = window.WR_TIME.isDoorUnlocked(1, now);
    testLog(`✅ Türchen 1: Unlock ${window.WR_TIME.formatTimeHHMM(door1Unlock)}, Status: ${door1Status ? 'OFFEN' : 'GESPERRT'}`);
    
    // Test Türchen 2 (Dev Test)
    const door2Status = window.WR_TIME.isDoorUnlocked(2, now);
    const testTime = new Date(window.WR_TIME.cfg.devTestUnlockISO);
    testLog(`✅ Türchen 2 (Test): Test-Zeit ${window.WR_TIME.formatTimeHHMM(testTime)}, Status: ${door2Status ? 'OFFEN' : 'GESPERRT'}`);
    
    // Test Türchen 24
    const door24Unlock = window.WR_TIME.getDoorUnlockDate(24);
    const door24Status = window.WR_TIME.isDoorUnlocked(24, now);
    testLog(`✅ Türchen 24: Unlock ${window.WR_TIME.formatTimeHHMM(door24Unlock)}, Status: ${door24Status ? 'OFFEN' : 'GESPERRT'}`);
    
  } catch (error) {
    testLog(`❌ Türchen-Test Fehler: ${error.message}`);
    return false;
  }
  
  return true;
}

function runCalendarTests() {
  testLog('Testing Kalender Integration...');
  
  // 1. Test CalendarLogic Existenz
  if (typeof window.CalendarLogic !== 'object') {
    testLog('❌ window.CalendarLogic nicht verfügbar');
    return false;
  }
  
  // 2. Test Kalender Grid
  const calendarGrid = document.getElementById('calendar-grid');
  if (!calendarGrid) {
    testLog('❌ #calendar-grid Element nicht gefunden');
    return false;
  }
  
  // 3. Test Türchen im DOM
  const doors = calendarGrid.querySelectorAll('.calendar-door');
  testLog(`✅ ${doors.length} Türchen im DOM gefunden`);
  
  if (doors.length !== 24) {
    testLog(`⚠️ Erwartet 24 Türchen, gefunden ${doors.length}`);
  }
  
  // 4. Test Türchen-Attribute
  let correctDoors = 0;
  doors.forEach(door => {
    const day = door.getAttribute('data-day');
    const action = door.getAttribute('data-action');
    
    if (day && action === 'open-puzzle') {
      correctDoors++;
    }
  });
  
  testLog(`✅ ${correctDoors} Türchen korrekt konfiguriert`);
  
  return true;
}

function runUITests() {
  testLog('Testing UI Elemente...');
  
  // 1. Test Uhr-Elemente
  const currentTime = document.getElementById('current-time');
  const countdown = document.getElementById('countdown');
  
  if (!currentTime) {
    testLog('❌ #current-time Element nicht gefunden');
    return false;
  }
  
  if (!countdown) {
    testLog('❌ #countdown Element nicht gefunden');
    return false;
  }
  
  testLog(`✅ Uhr-Elemente gefunden: Zeit="${currentTime.textContent}", Countdown="${countdown.textContent}"`);
  
  // 2. Test ob Uhr läuft
  const initialTime = currentTime.textContent;
  setTimeout(() => {
    const newTime = currentTime.textContent;
    if (newTime !== initialTime && newTime !== '--:--') {
      testLog('✅ Uhr läuft und aktualisiert sich');
    } else {
      testLog('⚠️ Uhr scheint nicht zu laufen');
    }
  }, 2000);
  
  return true;
}

function runIntegrationTests() {
  testLog('Testing Integration...');
  
  // Test ob WinterRallyeApp existiert und initialisiert ist
  const app = document.querySelector('.winter-rallye-app, #app, main');
  if (!app) {
    testLog('❌ App-Container nicht gefunden');
    return false;
  }
  
  testLog('✅ App-Container gefunden');
  
  // Test ob alle Module geladen sind
  const modules = ['WR_TIME', 'CalendarLogic'];
  let loadedModules = 0;
  
  modules.forEach(module => {
    if (window[module]) {
      loadedModules++;
      testLog(`✅ ${module} geladen`);
    } else {
      testLog(`❌ ${module} nicht geladen`);
    }
  });
  
  testLog(`✅ ${loadedModules}/${modules.length} Module geladen`);
  
  return loadedModules === modules.length;
}

// Führe alle Tests aus
function runAllTests() {
  testLog('🎄 Starting Weihnachts-Rätsel-Rallye 2025 Tests...');
  testLog('');
  
  const timeTestResult = runTimeTests();
  testLog('');
  
  const calendarTestResult = runCalendarTests();
  testLog('');
  
  const uiTestResult = runUITests();
  testLog('');
  
  const integrationTestResult = runIntegrationTests();
  testLog('');
  
  // Zusammenfassung
  const totalTests = 4;
  let passedTests = 0;
  
  if (timeTestResult) passedTests++;
  if (calendarTestResult) passedTests++;
  if (uiTestResult) passedTests++;
  if (integrationTestResult) passedTests++;
  
  testLog(`📊 ERGEBNIS: ${passedTests}/${totalTests} Test-Suites bestanden`);
  
  if (passedTests === totalTests) {
    testLog('🎉 ALLE TESTS BESTANDEN! System ist bereit für Türchen-Freischaltung.');
  } else {
    testLog('⚠️ EINIGE TESTS FEHLGESCHLAGEN. Bitte Fehler beheben.');
  }
  
  return passedTests === totalTests;
}

// Auto-Start wenn DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(runAllTests, 1000); // Warte 1s für Module-Initialisierung
  });
} else {
  setTimeout(runAllTests, 1000);
}

// Export für manuelle Tests
window.timeSystemTest = {
  runAllTests,
  runTimeTests,
  runCalendarTests,
  runUITests,
  runIntegrationTests,
  getResults: () => testResults
};