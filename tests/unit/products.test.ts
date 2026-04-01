import { describe, expect, it } from 'vitest';
import type { Product, ProductImage } from '../../src/features/products';
import products from '../../data/products.seed.json';
import images from '../../data/product-images.seed.json';
import { createPlaceholderProductImage, matchProductByQuery, resolveBestProductImage } from '../../src/features/products';

describe('product matching', () => {
  it('prefers exact sku over everything else', () => {
    const result = matchProductByQuery(products as Product[], '48286');
    expect(result.reason).toBe('sku-exact');
    expect(result.product?.id).toBe('prd-48286');
  });

  it('finds extended product names reliably', () => {
    const result = matchProductByQuery(products as Product[], 'Halloren Royal Mints');
    expect(['name', 'alias']).toContain(result.reason);
    expect(result.product?.id).toBe('prd-40635');
  });

  it('falls back to fuzzy matching', () => {
    const result = matchProductByQuery(products as Product[], 'Royal Mint');
    expect(result.product?.id).toBe('prd-40635');
    expect(result.score).toBeGreaterThan(0.45);
  });
});

describe('image selection', () => {
  it('prefers local Halloren seed images before placeholder', () => {
    const productImages = (images as ProductImage[]).filter((image) => image.productId === 'prd-48286');
    const best = resolveBestProductImage(productImages);
    expect(best?.sourceKind).toBe('local');
  });

  it('creates a placeholder image when no image exists', () => {
    const placeholder = createPlaceholderProductImage(products[0] as Product);
    expect(placeholder.sourceKind).toBe('placeholder');
    expect(placeholder.uri).toContain('data:image/svg+xml');
  });
});
