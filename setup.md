{
  "project": "raetzel_winter_2025",
  "goal": "Winter-Stadtrallye-Webseite mit QR-Signaturen, Answer-Hashing und Admin-Tools",
  "structure": {
    "index.html": "Landingpage, Hero, Buttons, Kalender, Teilnahme",
    "styles": {
      "styles.css": "Layout, Hero, Buttons, Kalender",
      "tokens.css": "Farben (Gold, Schneeweiß, Nachtblau), Typo",
      "utilities.css": "Spacing, Flex, Grid"
    },
    "scripts": {
      "main.js": "Init, EventHooks",
      "calendar.logic.js": "24 Tage, Öffnungszeiten, Stage1+2 Logik",
      "security.static.js": "CSP-Clientschutz, Hash-Prüfung, Rate-Limit, QR-Verify",
      "qr.verify.js": "ECDSA-Signaturprüfung im Browser",
      "answer.util.js": "Normalize, SHA256, Validate",
      "time.berlin.js": "Zeitzonenlogik, Türchenöffnungszeiten",
      "modal.confirm.js": "Modale Fenster",
      "tracking.adapter.js": "Statistiken, Local Storage"
    },
    "public": {
      "puzzles": {
        "raetsel": {
          "day-01.json": "Augenoptik Schätzing",
          "day-02.json": "Küchenklaus"
        }
      }
    },
    "admin": {
      "qr-linkgen.html": "Admin-Tool zum Signieren",
      "qr-linkgen.js": "ECDSA-Signing per Private Key"
    },
    "tests": {
      "selftest.html": "UI zum Testen",
      "selftest.js": "QR, Hashes, Rate-Limit, Zeitprüfung"
    }
  }
}