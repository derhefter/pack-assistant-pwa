import { ParsedOrderDraft, ParsedOrderItem } from '../../lib/import-types';
import { normalizeText, stableId } from '../../lib/text-normalization';

const BULLET_PREFIX = /^[-*\u2022]\s*/;
const PRODUCT_CUE_PATTERN =
  /\b(halloren|chocolate|schoko|kugeln|riegel|pralinen|tafelschokolade|mints|o'?s|frukis|mint|brownie|vanille|erdbeer|karamell|pistazie|himbeere|apfel|royal)\b/i;
const ADMIN_NOISE_PATTERN =
  /\b(paypal|zahlungsart|versandart|standardversand|deutschland|eigentu[mn]|leistungsdatum|rechnungsdatum|geschaeftsfuehrer|bankverbindung|ust-id|seite|waren bleiben)\b/i;
const DETAIL_NOISE_PATTERN = /\b(kilogramm|kg|gramm|g\/|eur|1 kilogramm)\b/i;
const STANDALONE_UNIT_PATTERN = /^(pack|beutel|box|stueck|stuck)$/i;
const UNIT_WITH_QUANTITY_PATTERN = /^(?<unit>pack|beutel|box|stueck|stuck)\s+(?<quantity>\d{1,3})$/i;
const QUANTITY_ONLY_PATTERN = /^(?<quantity>\d{1,3})$/;
const TABLE_ROW_PREFIX_PATTERN = /^(?<position>\d{1,3})\s+(?<sku>[a-z0-9]{4,8})\s+(?<name>.+)$/i;
const TABLE_ROW_COMPLETE_PATTERN =
  /^(?:(?<position>\d{1,3})\s+)?(?<sku>[a-z0-9]{4,8})\s+(?<name>.+?)\s+(?<unit>pack|beutel|box|stueck|stuck)\s+(?<quantity>\d{1,3})$/i;
const EXCLUDED_HEADINGS = new Set([
  'packliste',
  'einkaufsliste',
  'auftrag',
  'artikel',
  'positionen',
  'produktliste'
]);
const QUANTITY_PATTERNS = [
  TABLE_ROW_COMPLETE_PATTERN,
  /^(?<position>\d{3})\s+(?<name>.+?)\s+(?<quantity>\d{1,3})\s+(?<unit>\S+)$/i,
  /^(?<quantity>\d+)\s*x\s+(?<name>.+)$/i,
  /^(?<quantity>\d+)\s+mal\s+(?<name>.+)$/i,
  /^(?<quantity>\d+)\s+(?<name>.+)$/i
];

function repairCommonImportText(value: string) {
  return value
    .replace(/â€™|’/g, "'")
    .replace(/Ã¼|ü/g, 'ue')
    .replace(/Ã¤|ä/g, 'ae')
    .replace(/Ã¶|ö/g, 'oe')
    .replace(/ÃŸ|ß/g, 'ss')
    .replace(/â‚¬|€/g, 'eur')
    .replace(/[–—]/g, '-');
}

function cleanLine(line: string): string {
  return repairCommonImportText(line).replace(BULLET_PREFIX, '').replace(/\s+/g, ' ').trim();
}

function sanitizeProductName(name: string) {
  return name
    .replace(/\s+(pack|beutel|box|stueck|stuck)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseQuantity(line: string): {
  quantity: number;
  name: string;
  quantityText: string;
  sku?: string;
  unit?: string;
} {
  if (TABLE_ROW_PREFIX_PATTERN.test(line) && !TABLE_ROW_COMPLETE_PATTERN.test(line)) {
    const tableMatch = line.match(TABLE_ROW_PREFIX_PATTERN);
    return {
      quantity: 1,
      name: sanitizeProductName(tableMatch?.groups?.name ?? line),
      quantityText: '1x',
      sku: tableMatch?.groups?.sku?.toUpperCase()
    };
  }

  for (const pattern of QUANTITY_PATTERNS) {
    const match = pattern.exec(line);
    const quantity = match?.groups?.quantity ? Number(match.groups.quantity) : Number.NaN;
    const name = match?.groups?.name?.trim();
    if (Number.isFinite(quantity) && quantity > 0 && name) {
      return {
        quantity,
        name: sanitizeProductName(name),
        quantityText: `${quantity}x`,
        sku: match?.groups?.sku?.toUpperCase(),
        unit: match?.groups?.unit
      };
    }
  }

  return {
    quantity: 1,
    name: line,
    quantityText: '1x'
  };
}

function isMergeableHallorenRow(line: string) {
  return TABLE_ROW_PREFIX_PATTERN.test(line) && !TABLE_ROW_COMPLETE_PATTERN.test(line);
}

function collapseImportLines(lines: string[]) {
  const collapsed: string[] = [];
  let pendingRow: string | null = null;

  for (const line of lines) {
    const normalized = normalizeText(line);

    if (pendingRow) {
      if (QUANTITY_ONLY_PATTERN.test(line) || UNIT_WITH_QUANTITY_PATTERN.test(line)) {
        collapsed.push(`${pendingRow} ${line}`.trim());
        pendingRow = null;
        continue;
      }

      if (STANDALONE_UNIT_PATTERN.test(line)) {
        pendingRow = `${pendingRow} ${line}`.trim();
        continue;
      }

      if (DETAIL_NOISE_PATTERN.test(normalized) && !PRODUCT_CUE_PATTERN.test(normalized)) {
        continue;
      }

      collapsed.push(pendingRow);
      pendingRow = null;
    }

    if (isMergeableHallorenRow(line)) {
      pendingRow = line;
      continue;
    }

    collapsed.push(line);
  }

  if (pendingRow) {
    collapsed.push(pendingRow);
  }

  return collapsed;
}

function isLikelyItemLine(line: string): boolean {
  if (!line) {
    return false;
  }

  const normalized = normalizeText(line);
  if (normalized.length < 2) {
    return false;
  }

  if (ADMIN_NOISE_PATTERN.test(normalized)) {
    return false;
  }

  if (STANDALONE_UNIT_PATTERN.test(line)) {
    return false;
  }

  const headline = normalized.split(' ')[0] ?? '';
  if (EXCLUDED_HEADINGS.has(headline)) {
    return false;
  }

  if (/^(pos|menge|einheit)\b/i.test(normalized)) {
    return false;
  }

  if (!/[a-z0-9]/i.test(normalized) || /^seite \d+/.test(normalized)) {
    return false;
  }

  if ((DETAIL_NOISE_PATTERN.test(normalized) || STANDALONE_UNIT_PATTERN.test(line)) && !PRODUCT_CUE_PATTERN.test(normalized)) {
    return false;
  }

  if (/^\d{1,3}\s+[a-z0-9]{4,8}\s+/i.test(line)) {
    return true;
  }

  if (/^\d{3}\s+/.test(line) && PRODUCT_CUE_PATTERN.test(normalized)) {
    return true;
  }

  if (PRODUCT_CUE_PATTERN.test(normalized) && /\d{1,3}\s*(x|mal)\b/i.test(normalized)) {
    return true;
  }

  return PRODUCT_CUE_PATTERN.test(normalized) && !DETAIL_NOISE_PATTERN.test(normalized);
}

function buildItem(rawText: string): ParsedOrderItem {
  const clean = cleanLine(rawText);
  const parsed = parseQuantity(clean);

  return {
    id: stableId('item', rawText),
    rawText,
    name: parsed.name,
    quantity: parsed.quantity,
    quantityText: parsed.quantityText,
    sku: parsed.sku,
    unit: parsed.unit,
    confidence: parsed.quantity === 1 && clean === parsed.name ? 0.72 : 0.93
  };
}

export function parseOrderText(text: string, title = 'Neuer Auftrag'): ParsedOrderDraft {
  const lines = collapseImportLines(
    text
      .split(/\r?\n/)
      .map(cleanLine)
      .filter(Boolean)
  );

  const items = lines.filter(isLikelyItemLine).map(buildItem);
  const warnings: string[] = [];

  if (!text.trim()) {
    warnings.push('Kein verwertbarer Text erkannt.');
  }

  if (!items.length) {
    warnings.push('Keine klaren Positionen gefunden.');
  }

  return {
    title,
    source: {
      fileName: '',
      mimeType: 'application/octet-stream',
      size: 0,
      kind: 'unknown'
    },
    rawText: text,
    items,
    warnings
  };
}
