#!/usr/bin/env node
/**
 * Test-Script für Weihnachts-Rätsel-Rallye 2025
 * Überprüft alle wichtigen Dateien und Funktionen
 */

const fs = require('fs');
const path = require('path');

console.log('🎄 Testing Weihnachts-Rätsel-Rallye 2025...\n');

// Zu überprüfende Dateien
const filesToCheck = [
    'index.html',
    'styles/styles.css',
    'styles/tokens.css', 
    'styles/utilities.css',
    'scripts/main.js',
    'scripts/music.js',
    'scripts/security.static.js',
    'scripts/calendar.logic.js',
    'scripts/answer.util.js',
    'scripts/time.berlin.js',
    'scripts/qr.verify.js',
    'scripts/modal.confirm.js',
    'scripts/tracking.adapter.js',
    'scripts/app.logic.js'
];

let allTestsPassed = true;

// 1. Dateienexistenz-Test
console.log('📁 Überprüfe Dateienexistenz...');
for (const file of filesToCheck) {
    const exists = fs.existsSync(file);
    if (exists) {
        const stats = fs.statSync(file);
        console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    } else {
        console.log(`❌ ${file} - NICHT GEFUNDEN`);
        allTestsPassed = false;
    }
}

// 2. HTML-Struktur-Test
console.log('\n🌐 Überprüfe HTML-Struktur...');
try {
    const htmlContent = fs.readFileSync('index.html', 'utf8');
    
    const checks = [
        { name: 'DOCTYPE', pattern: /<!DOCTYPE html>/i },
        { name: 'Charset UTF-8', pattern: /<meta charset="utf-8">/i },
        { name: 'Viewport Meta', pattern: /<meta name="viewport"/i },
        { name: 'Extended Music Player', pattern: /scripts\/music\.js/ },
        { name: 'Top-Bar Element', pattern: /<div[^>]*top-bar/ },
        { name: 'Music Toggle', pattern: /music-toggle/ },
        { name: 'Navigation Menu', pattern: /nav-menu/ },
        { name: 'Hero Title', pattern: /Weihnachts-Rätsel-Rallye 2025/ },
    ];
    
    for (const check of checks) {
        if (check.pattern.test(htmlContent)) {
            console.log(`✅ ${check.name}`);
        } else {
            console.log(`❌ ${check.name} - FEHLT`);
            allTestsPassed = false;
        }
    }
} catch (error) {
    console.log(`❌ HTML lesen fehlgeschlagen: ${error.message}`);
    allTestsPassed = false;
}

// 3. CSS-Struktur-Test
console.log('\n🎨 Überprüfe CSS-Struktur...');
try {
    const cssContent = fs.readFileSync('styles/styles.css', 'utf8');
    
    const cssChecks = [
        { name: 'Top-Bar Styles', pattern: /\.top-bar/ },
        { name: 'Mobile Navigation', pattern: /\.nav-menu/ },
        { name: 'Mobile Media Query', pattern: /@media[^{]*768px/ },
        { name: 'Grid Layout', pattern: /display:\s*grid/ },
        { name: 'Flexbox', pattern: /display:\s*flex/ },
        { name: 'CSS Custom Properties', pattern: /--[a-zA-Z-]+:/ },
    ];
    
    for (const check of cssChecks) {
        if (check.pattern.test(cssContent)) {
            console.log(`✅ ${check.name}`);
        } else {
            console.log(`❌ ${check.name} - FEHLT`);
            allTestsPassed = false;
        }
    }
} catch (error) {
    console.log(`❌ CSS lesen fehlgeschlagen: ${error.message}`);
    allTestsPassed = false;
}

// 4. JavaScript-Module-Test
console.log('\n🔧 Überprüfe JavaScript-Module...');
try {
    const mainJs = fs.readFileSync('scripts/main.js', 'utf8');
    const musicJs = fs.readFileSync('scripts/music.js', 'utf8');
    
    const jsChecks = [
        { name: 'WinterRallyeApp Class', content: mainJs, pattern: /class WinterRallyeApp/ },
        { name: 'Extended Music Player', content: mainJs, pattern: /extendedChristmasMusic/ },
        { name: 'Mobile Navigation', content: mainJs, pattern: /nav-menu--open/ },
        { name: 'Music Toggle Handler', content: mainJs, pattern: /music-toggle/ },
        { name: 'ExtendedChristmasMusicPlayer Class', content: musicJs, pattern: /class ExtendedChristmasMusicPlayer/ },
        { name: 'Playlist Array', content: musicJs, pattern: /PLAYLIST\s*=/ },
        { name: 'Prev/Next Controls', content: musicJs, pattern: /createPlaylistControls/ },
    ];
    
    for (const check of jsChecks) {
        if (check.pattern.test(check.content)) {
            console.log(`✅ ${check.name}`);
        } else {
            console.log(`❌ ${check.name} - FEHLT`);
            allTestsPassed = false;
        }
    }
} catch (error) {
    console.log(`❌ JavaScript lesen fehlgeschlagen: ${error.message}`);
    allTestsPassed = false;
}

// 5. Music-Dateien-Test
console.log('\n🎵 Überprüfe Musik-Dateien...');
const musicFiles = [
    'music/jingle_bells_simple.mp3',
    'music/winter_wonderland_simple.mp3', 
    'music/deck_the_halls_simple.mp3'
];

for (const musicFile of musicFiles) {
    if (fs.existsSync(musicFile)) {
        const stats = fs.statSync(musicFile);
        console.log(`✅ ${musicFile} (${(stats.size / (1024*1024)).toFixed(1)}MB)`);
    } else {
        console.log(`⚠️ ${musicFile} - NICHT GEFUNDEN (optional)`);
    }
}

// Zusammenfassung
console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
    console.log('🎉 ALLE TESTS BESTANDEN! Die Anwendung ist bereit.');
    console.log('🚀 Starte Server mit: python3 -m http.server 8080');
    console.log('🌐 Öffne dann: http://localhost:8080');
} else {
    console.log('❌ EINIGE TESTS FEHLGESCHLAGEN! Bitte Fehler beheben.');
    process.exit(1);
}