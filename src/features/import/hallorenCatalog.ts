import rawProductsSeed from '../../../data/products.seed.json';
import type { ParsedOrderItem } from '../../lib/import-types';
import { normalizeSku, normalizeText } from '../../lib/text-normalization';

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
  name: string;
  normalizedName: string;
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
    name: product.name,
    normalizedName: normalizeText(product.name),
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

export function findBestHallorenCatalogMatch(input: string, sku?: string): CatalogMatch | undefined {
  const normalizedSku = sku ? normalizeSku(sku) : '';
  if (normalizedSku) {
    const exactSku = catalog.find((entry) => normalizeSku(entry.sku) === normalizedSku);
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
  const hardened: ParsedOrderItem[] = items.flatMap((item) => {
    const match = findBestHallorenCatalogMatch(item.name, item.sku);
    if (!match) {
      return [];
    }

    return [
      {
        ...item,
        name: match.name,
        sku: match.sku,
        confidence: Math.max(item.confidence, Math.min(0.98, match.score))
      }
    ];
  });

  const deduped = new Map<string, ParsedOrderItem>();

  for (const item of hardened) {
    const key = `${item.sku ?? 'unknown'}:${item.name}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, item);
      continue;
    }

    const quantity = Math.max(existing.quantity, item.quantity);
    deduped.set(key, {
      ...existing,
      quantity,
      quantityText: `${quantity}x`,
      confidence: Math.max(existing.confidence, item.confidence)
    });
  }

  return [...deduped.values()];
}
