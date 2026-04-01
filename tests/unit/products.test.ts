import { describe, expect, it } from 'vitest';
import type { Product, ProductImage } from '../../src/features/products';
import products from '../../data/products.seed.json';
import images from '../../data/product-images.seed.json';
import { createPlaceholderProductImage, matchProductByQuery, resolveBestProductImage } from '../../src/features/products';

describe('product matching', () => {
  it('prefers exact sku over everything else', () => {
    const result = matchProductByQuery(products as Product[], 'HK-200');
    expect(result.reason).toBe('sku-exact');
    expect(result.product?.id).toBe('prd-halloren-kugeln');
  });

  it('finds alias matches', () => {
    const result = matchProductByQuery(products as Product[], 'Zwieback Vanille');
    expect(result.reason).toBe('alias');
    expect(result.product?.id).toBe('prd-vanille-zwieback');
  });

  it('falls back to fuzzy matching', () => {
    const result = matchProductByQuery(products as Product[], 'schoko brezel');
    expect(result.product?.id).toBe('prd-schoko-brezeln');
    expect(result.score).toBeGreaterThan(0.45);
  });
});

describe('image selection', () => {
  it('prefers manual before local, research and placeholder', () => {
    const productImages = (images as ProductImage[]).filter((image) => image.productId === 'prd-halloren-kugeln');
    const best = resolveBestProductImage(productImages);
    expect(best?.sourceKind).toBe('manual');
  });

  it('creates a placeholder image when no image exists', () => {
    const placeholder = createPlaceholderProductImage(products[2] as Product);
    expect(placeholder.sourceKind).toBe('placeholder');
    expect(placeholder.uri).toContain('data:image/svg+xml');
  });
});
