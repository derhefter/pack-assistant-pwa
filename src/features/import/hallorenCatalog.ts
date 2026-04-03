import rawProductsSeed from '../../../data/products.seed.json';
import type { ParsedOrderItem } from '../../lib/import-types';
import { normalizeSku, normalizeText, stableId } from '../../lib/text-normalization';

type SeedAlias = {
  value?: string;
};

type SeedProduct = {
  sku: string;
  name: string;
  aliases?: SeedAlias[];
};

type CatalogEntry = {
  sku: string;
  normalizedSku: string;
  name: string;
  normalizedName: string;
  aliases: string[];
  tokens: string[];
};

type CatalogMatch = {
  sku: string;
  name: string;
  score: number;
};

const GENERIC_TOKENS = new Set([
  'halloren',
  'chocolate',
  'thins',
  'pack',
  'beutel',
  'box',
  'stueck',
  'stuck',
  'und',
  'mit',
  'der',
  'die',
  'das',
  'von',
  'fur',
  'fuer',
  'o',
  's'
]);

function repairCommonImportText(value: string) {
  return value
    .replace(/Ã¢â‚¬â„¢|â€™|’/g, "'")
    .replace(/ÃƒÂ¼|Ã¼|ü/g, 'ue')
    .replace(/ÃƒÂ¤|Ã¤|ä/g, 'ae')
    .replace(/ÃƒÂ¶|Ã¶|ö/g, 'oe')
    .replace(/ÃƒÅ¸|ÃŸ|ß/g, 'ss')
    .replace(/Ã¢â€šÂ¬|â‚¬|€/g, 'eur')
    .replace(/[â€“â€”–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeaningfulTokens(value: string) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3)
    .filter((token) => !GENERIC_TOKENS.has(token))
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !/^\d+g$/.test(token));
}

const catalog: CatalogEntry[] = (rawProductsSeed as SeedProduct[]).map((product) => {
  const aliases = (product.aliases ?? []).map((alias) => alias.value ?? '').filter(Boolean);
  const tokenSet = new Set([
    ...extractMeaningfulTokens(product.name),
    ...aliases.flatMap((alias) => extractMeaningfulTokens(alias))
  ]);

  return {
    sku: product.sku,
    normalizedSku: normalizeSku(product.sku),
    name: product.name,
    normalizedName: normalizeText(product.name),
    aliases,
    tokens: [...tokenSet]
  };
});

function countSharedTokens(inputTokens: string[], candidateTokens: string[]) {
  let count = 0;

  for (const token of candidateTokens) {
    if (inputTokens.some((inputToken) => inputToken === token || inputToken.includes(token) || token.includes(inputToken))) {
      count += 1;
    }
  }

  return count;
}

function extractQuantityFromLines(lines: string[], startIndex: number, sku: string) {
  const currentLine = repairCommonImportText(lines[startIndex] ?? '');
  const skuIndex = currentLine.indexOf(sku);
  const afterSku = skuIndex >= 0 ? currentLine.slice(skuIndex + sku.length).trim() : currentLine;
  const sameLineMatch = afterSku.match(/(?:^|\s)(?<quantity>\d{1,2})$/);
  const sameLineQuantity = sameLineMatch?.groups?.quantity ? Number(sameLineMatch.groups.quantity) : Number.NaN;
  if (Number.isFinite(sameLineQuantity) && sameLineQuantity > 0) {
    return sameLineQuantity;
  }

  for (let offset = 1; offset <= 2; offset += 1) {
    const candidate = repairCommonImportText(lines[startIndex + offset] ?? '');
    const match = candidate.match(/^(?<quantity>\d{1,2})$/);
    const quantity = match?.groups?.quantity ? Number(match.groups.quantity) : Number.NaN;
    if (Number.isFinite(quantity) && quantity > 0) {
      return quantity;
    }
  }

  return 1;
}

function extractUnitFromLines(lines: string[], startIndex: number) {
  for (let offset = 0; offset <= 2; offset += 1) {
    const candidate = repairCommonImportText(lines[startIndex + offset] ?? '');
    const unitMatch = candidate.match(/\b(pack|beutel|box|stueck|stuck)\b/i);
    if (unitMatch?.[1]) {
      const unit = unitMatch[1].toLowerCase();
      return unit === 'stuck' ? 'Stueck' : `${unit.charAt(0).toUpperCase()}${unit.slice(1)}`;
    }
  }

  return undefined;
}

function looksSuspiciousUnmatchedItem(item: ParsedOrderItem) {
  const tokens = normalizeText(item.name)
    .split(' ')
    .filter(Boolean)
    .filter((token) => token.length >= 3);

  return !item.sku && item.confidence < 0.9 && tokens.length < 2;
}

export function extractHallorenItemsFromRawText(text: string): ParsedOrderItem[] {
  const lines = text
    .split(/\r?\n/)
    .map(repairCommonImportText)
    .filter(Boolean);

  const found = new Map<string, ParsedOrderItem>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const skuMatch = line.match(/\b\d{5}\b/);
    if (!skuMatch) {
      continue;
    }

    const normalizedSku = normalizeSku(skuMatch[0]);
    const product = catalog.find((entry) => entry.normalizedSku === normalizedSku);
    if (!product) {
      continue;
    }

    const quantity = extractQuantityFromLines(lines, index, product.sku);
    const unit = extractUnitFromLines(lines, index);
    const existing = found.get(product.sku);

    if (existing) {
      const nextQuantity = Math.max(existing.quantity, quantity);
      found.set(product.sku, {
        ...existing,
        quantity: nextQuantity,
        quantityText: `${nextQuantity}x`,
        unit: existing.unit ?? unit,
        confidence: Math.max(existing.confidence, 0.99)
      });
      continue;
    }

    found.set(product.sku, {
      id: stableId('item', `${product.sku}:${index}`),
      rawText: line,
      name: product.name,
      quantity,
      quantityText: `${quantity}x`,
      sku: product.sku,
      unit,
      confidence: 0.99
    });
  }

  return [...found.values()];
}

export function findBestHallorenCatalogMatch(input: string, sku?: string): CatalogMatch | undefined {
  const normalizedSku = sku ? normalizeSku(sku) : '';
  if (normalizedSku) {
    const exactSku = catalog.find((entry) => entry.normalizedSku === normalizedSku);
    if (exactSku) {
      return {
        sku: exactSku.sku,
        name: exactSku.name,
        score: 1
      };
    }
  }

  const normalizedInput = normalizeText(input);
  const inputTokens = extractMeaningfulTokens(input);
  if (!normalizedInput || inputTokens.length === 0) {
    return undefined;
  }

  const matches = catalog
    .map((entry) => {
      const sharedTokens = countSharedTokens(inputTokens, entry.tokens);
      if (sharedTokens === 0) {
        return undefined;
      }

      const baseScore = sharedTokens / Math.max(1, entry.tokens.length);
      const substringBoost =
        normalizedInput.includes(entry.normalizedName) || entry.normalizedName.includes(normalizedInput) ? 0.2 : 0;

      return {
        sku: entry.sku,
        name: entry.name,
        score: Math.min(1, baseScore + substringBoost)
      } satisfies CatalogMatch;
    })
    .filter((entry): entry is CatalogMatch => Boolean(entry))
    .sort((left, right) => right.score - left.score);

  const best = matches[0];
  if (!best || best.score < 0.55) {
    return undefined;
  }

  return best;
}

export function hardenHallorenImageItems(items: ParsedOrderItem[]) {
  const hardened = items.map((item) => {
    const match = findBestHallorenCatalogMatch(item.name, item.sku);
    if (!match) {
      return item;
    }

    return {
      ...item,
      name: match.name,
      sku: match.sku,
      confidence: Math.max(item.confidence, Math.min(0.98, match.score))
    };
  });

  const matchedCount = hardened.filter((item) => {
    const original = items.find((candidate) => candidate.id === item.id);
    return Boolean(original && (original.sku !== item.sku || original.name !== item.name));
  }).length;

  if (matchedCount >= 2) {
    return hardened.filter((item) => !looksSuspiciousUnmatchedItem(item));
  }

  return hardened;
}
