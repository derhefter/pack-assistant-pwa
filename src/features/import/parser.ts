import { ParsedOrderDraft, ParsedOrderItem } from '../../lib/import-types';
import { normalizeText, stableId } from '../../lib/text-normalization';

const BULLET_PREFIX = /^[-*\u2022]\s*/;
const EXCLUDED_HEADINGS = new Set([
  'packliste',
  'einkaufsliste',
  'auftrag',
  'artikel',
  'positionen',
  'produktliste'
]);
const QUANTITY_PATTERNS = [
  /^(?<position>\d{3})\s+(?<name>.+?)\s+(?<quantity>\d+)\s+(?<unit>\S+)$/i,
  /^(?<quantity>\d+)\s*x\s+(?<name>.+)$/i,
  /^(?<quantity>\d+)\s+mal\s+(?<name>.+)$/i,
  /^(?<quantity>\d+)\s+(?<name>.+)$/i
];

function cleanLine(line: string): string {
  return line.replace(BULLET_PREFIX, '').replace(/\s+/g, ' ').trim();
}

function parseQuantity(line: string): { quantity: number; name: string; quantityText: string } {
  for (const pattern of QUANTITY_PATTERNS) {
    const match = pattern.exec(line);
    const quantity = match?.groups?.quantity ? Number(match.groups.quantity) : Number.NaN;
    const name = match?.groups?.name?.trim();
    if (Number.isFinite(quantity) && quantity > 0 && name) {
      return {
        quantity,
        name,
        quantityText: `${quantity}x`
      };
    }
  }

  return {
    quantity: 1,
    name: line,
    quantityText: '1x'
  };
}

function isLikelyItemLine(line: string): boolean {
  if (!line) {
    return false;
  }

  const normalized = normalizeText(line);
  if (normalized.length < 2) {
    return false;
  }

  const headline = normalized.split(' ')[0] ?? '';
  if (EXCLUDED_HEADINGS.has(headline)) {
    return false;
  }

  if (/^(pos|menge|einheit)\b/i.test(normalized)) {
    return false;
  }

  return /[a-z0-9]/i.test(normalized) && !/^seite \d+/.test(normalized);
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
    confidence: parsed.quantity === 1 && clean === parsed.name ? 0.72 : 0.93
  };
}

export function parseOrderText(text: string, title = 'Neuer Auftrag'): ParsedOrderDraft {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

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
