import { describe, expect, it } from 'vitest';
import { seedBundle } from '../../src/db/seed';

describe('seed bundle', () => {
  it('normalizes legacy product seeds', () => {
    expect(seedBundle.products).toHaveLength(3);
    expect(seedBundle.products[0]).toMatchObject({
      id: 'prd-halloren-kugeln',
      sku: 'HK-200',
      name: 'Halloren Kugeln',
      aliases: ['Halloren Kugeln 200g', 'Halloren Kugeln Schoko']
    });
  });

  it('normalizes legacy image seeds', () => {
    expect(seedBundle.productImages).toHaveLength(4);
    expect(seedBundle.productImages[0]).toMatchObject({
      productId: 'prd-halloren-kugeln',
      source: 'manual',
      isPrimary: true
    });
  });
});
