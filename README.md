# Pack-Assistent PWA

Local-first Progressive Web App fuer einfache Packprozesse mit Bild, Audio und Offline-Fokus.

## Kernfunktionen

- PDF oder Foto importieren
- OCR/PDF-Text in Packpositionen umwandeln
- Produkte gegen lokale Stammdaten matchen
- Bilddominante Karten per Tap abhaken
- Artikel vorlesen lassen
- Fehlende Produktbilder per Kamera erfassen und speichern
- Fertige Auftraege archivieren und wieder oeffnen

## Tech Stack

- React + TypeScript + Vite
- IndexedDB mit Dexie
- PDF.js
- Tesseract.js
- Web Speech API
- Vite PWA
- Vitest + Playwright

## Projektstruktur

- `src/app`: App-Shell und Screen-Orchestrierung
- `src/features/import`: PDF/OCR/Parser
- `src/features/orders`: View-Modelle und Auftrags-UI
- `src/features/products`: Matching, Placeholder, Bildlogik
- `src/features/audio`: Sprachlogik
- `src/db`: Dexie, Repositories, Seed-Bootstrap
- `scripts`: Seed- und Import-Skripte
- `data`: Produkt- und Bild-Seeds, Reports
- `tests`: Unit- und E2E-Tests

## Schnellstart

```bash
npm install
npm run dev
```

## Zentraler Bildsync mit Vercel Blob

- Lokale Fotos bleiben weiter zuerst in IndexedDB gespeichert.
- Optional koennen manuell aufgenommene Produktbilder zusaetzlich zentral ueber Vercel Blob gesichert werden.
- Dafuer im gleichen Vercel-Projekt einen `Blob` Store anlegen und dem Projekt die automatisch gesetzten Umgebungsvariablen geben.
- Danach laufen Upload und spaeterer Sync fuer andere Geraete ueber den Endpunkt `/api/product-images`.
- Ohne Blob-Konfiguration bleibt die App weiter lokal nutzbar. Der zentrale Sync faellt dann nur still weg.

Dann im Browser:

1. `PDF waehlen` oder `Foto waehlen`
2. alternativ `Text einfuegen als robuster Fallback`
3. Artikel per Tap abhaken
4. `Vorlesen` nutzen
5. bei Platzhalterbild `Bild aufnehmen`
6. Auftrag archivieren

## Skripte

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:e2e
npm run import:local-images -- --images-dir "C:\\pfad\\zu\\bildern"
```

## Lokale Bildimporte

Standardpfad:

`Z:\code-output\halloren-git\images`

Falls das Laufwerk nicht verfuegbar ist, `--images-dir` setzen.

Outputs:

- `data/product-images.seed.json`
- `data/unmatched-images.report.json`
- `data/duplicate-images.report.json`

## MVP-Grenzen

- Die App bleibt local-first; zentrale Bildsynchronisation braucht einen konfigurierten Vercel Blob Store
- Kamera speichert Bilder lokal in IndexedDB als Data URL und versucht online zusaetzlich den zentralen Upload
- OCR-Qualitaet haengt von Bildqualitaet und Browserleistung ab
- Playwright braucht lokal installierte Browser

## Review-Stand

- `npm run build`: gruen
- `npm run lint`: gruen
- `npm run test`: in dieser Windows-Host-Umgebung weiter durch `spawn EPERM` blockiert
- `npm run test:e2e`: in dieser Windows-Host-Umgebung weiter durch `spawn EPERM` blockiert

Direkt nachgebessert im Review:

- transaktionales Speichern von Auftrag plus Positionen
- eindeutige Primaerbild-Regel bei mehrfachen manuellen Bildern
- Bildkomprimierung fuer einfachere Geraete
- echte offlinefaehige Seed-Bilder statt toter Remote-/Platzhalterpfade
- Halloren-Seeds mit echten SKU-Bildern aus `public/catalog`
- Import-Regel fuer Halloren-Listen: `Position | Artikelnummer | Produkt | Menge`
- Detailzeilen wie `Beutel`, Gewichte und Zahlungsinfos werden beim Parsing verworfen
- Mobilansicht der Produktkarten: Bild links, Text rechts, Aktionen darunter
