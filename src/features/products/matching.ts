import { normalizeSku, normalizeText, similarityScore } from '../../lib/text';
import type { MatchCandidate, Product, ProductImage, ProductMatchResult } from './types';

function scoreNameMatch(query: string, candidate: string): number {
  const queryNormalized = normalizeText(query);
  const candidateNormalized = normalizeText(candidate);

  if (!queryNormalized || !candidateNormalized) {
    return 0;
  }

  if (candidateNormalized.includes(queryNormalized) || queryNormalized.includes(candidateNormalized)) {
    return 0.95;
  }

  return similarityScore(queryNormalized, candidateNormalized);
}

function compareCandidates(a: MatchCandidate, b: MatchCandidate): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  const order: Record<MatchCandidate['reason'], number> = {
    'sku-exact': 0,
    'sku-normalized': 1,
    name: 2,
    alias: 3,
    fuzzy: 4
  };

  return order[a.reason] - order[b.reason];
}

export function matchProductByQuery(products: Product[], query: string): ProductMatchResult {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { product: null, reason: 'none', score: 0 };
  }

  const exactSkuMatches = products.filter((product) => product.sku === trimmedQuery);
  if (exactSkuMatches.length > 0) {
    return {
      product: exactSkuMatches[0],
      reason: 'sku-exact',
      score: 1
    };
  }

  const normalizedQuerySku = normalizeSku(trimmedQuery);
  const normalizedSkuMatches = products.filter((product) => product.normalizedSku === normalizedQuerySku);
  if (normalizedSkuMatches.length > 0) {
    return {
      product: normalizedSkuMatches[0],
      reason: 'sku-normalized',
      score: 0.98
    };
  }

  const candidates: MatchCandidate[] = [];
  for (const product of products) {
    const nameScore = scoreNameMatch(trimmedQuery, product.name);
    if (nameScore >= 0.7) {
      candidates.push({ product, score: nameScore, reason: 'name' });
    }

    for (const alias of product.aliases) {
      const aliasScore = scoreNameMatch(trimmedQuery, alias.value);
      if (aliasScore >= 0.7) {
        candidates.push({ product, score: aliasScore, reason: 'alias' });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort(compareCandidates);
    const [best] = candidates;
    return {
      product: best.product,
      candidate: best,
      reason: best.reason,
      score: best.score
    };
  }

  const fuzzyCandidates: MatchCandidate[] = products.map((product) => ({
    product,
    score: Math.max(
      similarityScore(trimmedQuery, product.name),
      ...product.aliases.map((alias) => similarityScore(trimmedQuery, alias.value))
    ),
    reason: 'fuzzy'
  }));

  fuzzyCandidates.sort(compareCandidates);
  const bestFuzzy = fuzzyCandidates[0];

  if (!bestFuzzy || bestFuzzy.score < 0.45) {
    return { product: null, reason: 'none', score: 0 };
  }

  return {
    product: bestFuzzy.product,
    candidate: bestFuzzy,
    reason: 'fuzzy',
    score: bestFuzzy.score
  };
}

export function resolveBestProductImage(images: ProductImage[]): ProductImage | null {
  if (images.length === 0) {
    return null;
  }

  const priority: Record<ProductImage['sourceKind'], number> = {
    manual: 0,
    local: 1,
    research: 2,
    placeholder: 3
  };

  return [...images].sort((left, right) => {
    const priorityDelta = priority[left.sourceKind] - priority[right.sourceKind];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const confidenceDelta = (right.confidence ?? 0) - (left.confidence ?? 0);
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    const dateDelta = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (dateDelta !== 0) {
      return dateDelta;
    }

    return left.id.localeCompare(right.id);
  })[0];
}
