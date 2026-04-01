import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDatabase,
  createOrderWithItems,
  getBestProductImage,
  linkImageToProduct,
  listOrderItems,
  listOrders,
  listProducts,
  seedDatabaseIfNeeded
} from '../../src/db';
import { seedBundle } from '../../src/db/seed';

describe('pack assistant db', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('seeds products and images locally', async () => {
    const seeded = await seedDatabaseIfNeeded(seedBundle.products, seedBundle.productImages);
    expect(seeded).toBe(true);

    const products = await listProducts();
    expect(products.length).toBeGreaterThanOrEqual(10);
    expect(products.some((product) => product.id === 'prd-48286')).toBe(true);
  });

  it('prefers manual images over other sources', async () => {
    await seedDatabaseIfNeeded(seedBundle.products, seedBundle.productImages);

    const image = await getBestProductImage('prd-48286');
    expect(image?.source).toBe('local-seed');
  });

  it('keeps the newest primary manual image', async () => {
    await seedDatabaseIfNeeded(seedBundle.products, seedBundle.productImages);

    await linkImageToProduct('prd-48286', {
      source: 'manual',
      url: 'data:image/png;base64,one',
      alt: 'erstes Bild',
      mimeType: 'image/png',
      isPrimary: true,
      hash: 'one'
    });

    const second = await linkImageToProduct('prd-48286', {
      source: 'manual',
      url: 'data:image/png;base64,two',
      alt: 'zweites Bild',
      mimeType: 'image/png',
      isPrimary: true,
      hash: 'two'
    });

    const image = await getBestProductImage('prd-48286');
    expect(image?.id).toBe(second.id);
    expect(image?.url).toContain('two');
  });

  it('creates order and items transactionally', async () => {
    const { order } = await createOrderWithItems({
      title: 'Testauftrag',
      source: 'manual',
      items: [
        {
          rawText: '3 mal Halloren Kugeln',
          productName: 'Halloren Kugeln',
          quantity: 3
        }
      ]
    });

    const orders = await listOrders();
    const items = await listOrderItems(order.id);
    expect(orders).toHaveLength(1);
    expect(items).toHaveLength(1);
  });
});
