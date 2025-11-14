/**
 * Time Berlin - Zeitfunktionen für Rätzel Winter 2025
 * Vereinfachte Berliner Zeit-Management für Türchen-Freischaltung
 */

'use strict';

// Konfiguration für Zeitmanagement
const WR_TIME_CFG = {
  timeZone: 'Europe/Berlin',
  dailyUnlockHour: 9,
  dailyUnlockMinute: 0,
  devTestUnlockISO: new Date().toISOString(), // SOFORTIGER TEST
  devTestDay: 2
};

// Globale Interval-ID für die Uhr
let clockIntervalId = null;

/**
 * Liefert ein Date-Objekt, das die aktuelle Zeit repräsentiert
 */
function getBerlinNow() {
  return new Date();
}

/**
 * Formatiert ein Date-Objekt zu HH:MM im 24h-Format
 */
function formatTimeHHMM(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return hours + ':' + minutes;
}

/**
 * Berechnet den nächsten Freischaltzeitpunkt für 09:00 Uhr
 */
function getNextDailyUnlock(now) {
  const today = new Date(now);
  today.setHours(WR_TIME_CFG.dailyUnlockHour, WR_TIME_CFG.dailyUnlockMinute, 0, 0);
  
  if (now < today) {
    return today;
  } else {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
}

/**
 * Berechnet den regulären Freischaltzeitpunkt für ein Türchen
 */
function getDoorUnlockDate(day) {
  const year = 2025;
  const month = 11; // Dezember (0-indexiert)
  const date = new Date(year, month, day, WR_TIME_CFG.dailyUnlockHour, WR_TIME_CFG.dailyUnlockMinute, 0, 0);
  return date;
}

/**
 * Prüft, ob ein Türchen freigeschaltet ist
 */
function isDoorUnlocked(day, now) {
  // Prüfe zuerst die DEV-Sonderregel für Türchen 2
  if (day === WR_TIME_CFG.devTestDay) {
    const devTestUnlock = new Date(WR_TIME_CFG.devTestUnlockISO);
    if (now >= devTestUnlock) {
      return true;
    }
  }
  
  // Reguläre Freischaltung
  const unlockDate = getDoorUnlockDate(day);
  return now >= unlockDate;
}

/**
 * Berechnet den aktuellen Dezember-Tag
 */
function getCurrentDecemberDay(now = new Date()) {
  const month = now.getMonth() + 1; // 0-basiert
  const date = now.getDate();
  
  if (month === 12) {
    return Math.min(date, 24); // Maximal Tag 24
  } else if (month > 12) {
    return 24; // Nach Dezember: alle verfügbar
  }
  
  return null; // Vor Dezember
}

/**
 * Formatiert einen Countdown in HH:MM:SS Format
 */
function formatCountdown(deltaMs) {
  if (deltaMs <= 0) {
    return '00:00:00';
  }
  
  const totalSeconds = Math.floor(deltaMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = function(n) { return n.toString().padStart(2, '0'); };
  return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

/**
 * Startet die Uhr mit automatischer Aktualisierung
 */
function startClock() {
  // Beende vorheriges Interval falls vorhanden
  if (clockIntervalId) {
    clearInterval(clockIntervalId);
  }
  
  const currentTimeElement = document.getElementById('current-time');
  const countdownElement = document.getElementById('countdown');
  
  if (!currentTimeElement || !countdownElement) {
    console.warn('WR_TIME: Uhren-Elemente nicht gefunden (#current-time oder #countdown)');
    return;
  }
  
  // Sofortiges Update
  updateClock();
  
  // Starte Interval für regelmäßige Updates
  clockIntervalId = setInterval(updateClock, 1000);
  
  function updateClock() {
    try {
      const now = getBerlinNow();
      
      // Aktualisiere aktuelle Zeit
      currentTimeElement.textContent = formatTimeHHMM(now);
      
      // Berechne und zeige Countdown
      const next = getNextDailyUnlock(now);
      const delta = next.getTime() - now.getTime();
      countdownElement.textContent = formatCountdown(delta);
      
    } catch (error) {
      console.error('WR_TIME: Fehler beim Clock-Update:', error);
    }
  }
}

// Globale API für Zeitmanagement
window.WR_TIME = {
  cfg: WR_TIME_CFG,
  getBerlinNow: getBerlinNow,
  formatTimeHHMM: formatTimeHHMM,
  getNextDailyUnlock: getNextDailyUnlock,
  getDoorUnlockDate: getDoorUnlockDate,
  isDoorUnlocked: isDoorUnlocked,
  getCurrentDecemberDay: getCurrentDecemberDay,
  formatCountdown: formatCountdown,
  startClock: startClock
};

console.log('✅ WR_TIME Modul geladen');
