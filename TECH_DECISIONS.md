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

## 8. Halloren-Import ist SKU-first, nicht Name-first

- Empfehlung: bei Packlisten zuerst ueber Artikelnummer matchen
- Grund: SKU ist stabiler als OCR-Name und sichert Bild- und Produktzuordnung
- Umsetzung: Parser extrahiert `sku` getrennt, Auftragserstellung matched erst SKU, dann Name/Alias

## 9. Mobile Karten bleiben einzeilig lesbar

- Empfehlung: auf kleinen Displays horizontale Karten statt hoher Bildkacheln
- Grund: mehr Produkte gleichzeitig sichtbar, weniger Scrollen, weniger Ueberforderung
- Umsetzung: unter `640px` Bild links, Text rechts, Buttons in einer klaren Aktionszeile

## 10. Zentraler Bildsync laeuft im selben Vercel-Projekt

- Empfehlung: `Vercel Blob` im bestehenden Projekt statt GitHub als operative Bilddatenbank
- Grund:
  - GitHub ist stark fuer versionierte Seeds, aber unpassend fuer Laufzeit-Uploads von Handybildern
  - Blob passt direkt zu Vercel Functions und laesst sich ohne zweite Plattform anbinden
  - Die App bleibt local-first, weil IndexedDB lokal weiter die erste Instanz bleibt
- Umsetzung:
  - lokale Speicherung sofort
  - optionaler Upload nach `/api/product-images`
  - zentrale Bilder werden spaeter beim Start wieder in IndexedDB synchronisiert
- Trade-off:
  - nicht mehr rein offline fuer den Mehrgeraete-Sync
  - dafuer deutlich einfacher als ein eigenes Backend plus relationale Bilddatenbank
