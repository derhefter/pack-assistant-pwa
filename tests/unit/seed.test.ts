import { describe, expect, it } from 'vitest';
import { seedBundle } from '../../src/db/seed';

describe('seed bundle', () => {
  it('normalizes legacy product seeds', () => {
    expect(seedBundle.products.length).toBeGreaterThanOrEqual(11);
    expect(seedBundle.products[0]).toMatchObject({
      id: 'prd-48286',
      sku: '48286',
      name: 'Halloren Chocolate Thins Pistazie'
    });
  });

  it('normalizes legacy image seeds', () => {
    expect(seedBundle.productImages.length).toBeGreaterThanOrEqual(10);
    expect(seedBundle.productImages[0]).toMatchObject({
      productId: 'prd-48286',
      source: 'local-seed',
      isPrimary: true
    });
  });
});
