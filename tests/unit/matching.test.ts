import { describe, expect, it } from 'vitest';
import { matchProductCandidate } from '../../src/db/repository';
import type { Product, ProductAlias } from '../../src/lib/domain';

const products: Product[] = [
  {
    id: 'prd-halloren-kugeln',
    sku: 'HK-200',
    name: 'Halloren Kugeln',
    aliases: ['Halloren Kugeln 200g'],
    active: true,
    createdAt: '2026-03-29T00:00:00.000Z',
    updatedAt: '2026-03-29T00:00:00.000Z'
  }
];

const aliases: ProductAlias[] = [
  {
    id: 'alias-1',
    productId: 'prd-halloren-kugeln',
    alias: 'Halloren Kugeln 200g',
    normalizedAlias: 'halloren kugeln 200g',
    createdAt: '2026-03-29T00:00:00.000Z',
    updatedAt: '2026-03-29T00:00:00.000Z'
  }
];

describe('matchProductCandidate', () => {
  it('matches exact sku first', () => {
    expect(matchProductCandidate('HK-200', products, aliases)).toMatchObject({
      productId: 'prd-halloren-kugeln',
      reason: 'sku-exact'
    });
  });

  it('matches alias fallback', () => {
    expect(matchProductCandidate('Halloren Kugeln 200g', products, aliases)).toMatchObject({
      productId: 'prd-halloren-kugeln',
      reason: 'alias'
    });
  });
});
