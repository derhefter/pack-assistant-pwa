# Review Checklist

## Funktion

- Importiert PDF?
- Importiert Foto?
- Greift manueller Text-Fallback?
- Werden Positionen korrekt geparst?
- Funktioniert Matching gegen SKU, Name, Alias?
- Wird Audio korrekt formatiert?
- Laesst sich ein Artikel per Tap abhaken?
- Laesst sich ein Auftrag archivieren und wieder oeffnen?
- Bleibt ein Auftrag nach Reload erhalten?

## Daten

- Werden Seeds beim ersten Start geladen?
- Speichert IndexedDB Produkte, Bilder, Orders und Archive?
- Wird ein manuell aufgenommenes Bild dauerhaft gespeichert?
- Wird das manuell aufgenommene Bild nach Reload wiedergefunden?
- Gibt es pro Produkt genau ein Primaerbild?

## UX

- Sind Touch-Ziele gross genug?
- Ist die Hauptaktion sofort sichtbar?
- Ist der Fehlerzustand verstaendlich?
- Ist die App auch mit geringer Lesekompetenz bedienbar?
- Sind Audio-Saetze kurz und immer gleich aufgebaut?

## Technik

- `npm run build` gruen
- `npm run lint` gruen
- `npm run test` lokal pruefen
- `npm run test:e2e` lokal pruefen
- Offline testen: Flugmodus, Reload, Bilder sichtbar?
