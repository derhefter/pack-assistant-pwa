# Tech Decisions

## 1. IndexedDB statt LocalStorage

- Empfehlung: Hauptdaten in Dexie/IndexedDB
- Grund: strukturierte Stores, mehr Daten, lokale Bilder, bessere Queries
- Trade-off: etwas mehr Komplexitaet

## 2. PDF.js und Tesseract.js getrennt

- Empfehlung: erst PDF-Text, dann OCR-Fallback
- Grund: schnell und praezise fuer PDFs, robust fuer Fotos
- Risiko: OCR ist CPU-lastig

## 3. Harte Bildpriorisierung

- Reihenfolge: `manual` -> `local-seed` -> `researched` -> `placeholder`
- Grund: Nutzerin sieht immer das beste verfuegbare Bild

## 4. Audio als Kern-UI

- Empfehlung: Audio direkt pro Karte
- Grund: reduziert Leselast, sorgt fuer konsistente Rueckmeldung

## 5. Manueller Textimport als Fallback

- Empfehlung: bewusst im MVP behalten
- Grund: robust, testbar, verhindert Sackgassen bei schlechtem OCR

## 6. Erfasste Kamerabilder vor dem Speichern verkleinern

- Empfehlung: Bilder clientseitig auf max. 1280 px verkleinern
- Grund: weniger IndexedDB-Druck, bessere Performance auf einfachen Geraeten
- Trade-off: keine Originaldatei im Vollformat

## 7. Seed-Bilder muessen offline lokal verfuegbar sein

- Empfehlung: keine externen HTTP-Bildquellen im MVP
- Grund: Remote-Bilder brechen das Offline-Versprechen
- Umsetzung: Seed-Bilder als lokale SVG-Assets unter `public/seed`
