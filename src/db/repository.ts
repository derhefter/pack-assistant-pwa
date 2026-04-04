import { db } from './packAssistantDb';
import {
  type ArchiveRecord,
  type Order,
  type OrderItem,
  type OrderSource,
  type OrderStatus,
  type Product,
  type ProductAlias,
  type ProductImage,
  type ProductSeed,
  type ProductImageSeed,
  createEntityId,
  nowIso,
  normalizeSku,
  normalizeText
} from '../lib/domain';

export function createProductFromSeed(seed: ProductSeed): Product {
  const now = nowIso();
  return {
    id: seed.id ?? createEntityId('product'),
    sku: seed.sku,
    normalizedSku: seed.normalizedSku,
    name: seed.name,
    normalizedName: seed.normalizedName,
    brand: seed.brand,
    category: seed.category,
    description: seed.description,
    packSize: seed.packSize,
    defaultImageId: seed.defaultImageId,
    aliases: seed.aliases ?? [],
    active: seed.active ?? true,
    createdAt: now,
    updatedAt: now
  };
}

export function createProductAlias(productId: string, alias: string): ProductAlias {
  const now = nowIso();
  return {
    id: createEntityId('alias'),
    productId,
    alias,
    normalizedAlias: normalizeText(alias),
    source: 'seed',
    createdAt: now,
    updatedAt: now
  };
}

export function createProductImageFromSeed(seed: ProductImageSeed): ProductImage {
  const now = nowIso();
  return {
    id: createEntityId('image'),
    productId: seed.productId ?? '',
    source: seed.source,
    url: seed.url,
    fileName: seed.fileName,
    thumbUrl: seed.thumbUrl,
    alt: seed.alt,
    mimeType: seed.mimeType,
    width: seed.width,
    height: seed.height,
    isPrimary: seed.isPrimary,
    hash: seed.hash,
    note: seed.note,
    confidence: seed.confidence,
    captureSource: seed.captureSource,
    camera: seed.camera,
    createdAt: now,
    updatedAt: now
  };
}

export async function upsertProductsFromSeed(seeds: ProductSeed[]) {
  for (const seed of seeds) {
    const existing = await db.products.where('sku').equalsIgnoreCase(seed.sku).first();
    const product = existing
      ? { ...existing, ...seed, id: existing.id, updatedAt: nowIso(), aliases: seed.aliases ?? existing.aliases }
      : createProductFromSeed(seed);

    if (existing) {
      await db.products.put(product);
    } else {
      await db.products.add(product);
    }

    const aliases = seed.aliases ?? [];
    if (aliases.length > 0) {
      const productId = product.id;
      const aliasRows = aliases.map((alias) => createProductAlias(productId, alias));
      await db.productAliases.bulkPut(aliasRows);
    }
  }
}

export async function upsertProductImage(image: ProductImage) {
  await db.transaction('rw', db.productImages, db.products, async () => {
    if (image.isPrimary) {
      const siblingImages = await db.productImages.where('productId').equals(image.productId).toArray();
      await Promise.all(
        siblingImages
          .filter((entry) => entry.id !== image.id && entry.isPrimary)
          .map((entry) =>
            db.productImages.put({
              ...entry,
              isPrimary: false,
              updatedAt: nowIso()
            })
          )
      );
    }

    await db.productImages.put(image);
    if (image.isPrimary) {
      await db.products.update(image.productId, {
        defaultImageId: image.id,
        updatedAt: nowIso()
      });
    }
  });
}

export async function linkImageToProduct(productId: string, input: Omit<ProductImage, 'id' | 'productId' | 'createdAt' | 'updatedAt'>) {
  const existing = input.hash
    ? (await db.productImages.where('productId').equals(productId).toArray()).find(
        (entry) => entry.hash === input.hash
      )
    : undefined;

  if (existing) {
    const nextImage: ProductImage = {
      ...existing,
      ...input,
      productId,
      updatedAt: nowIso()
    };
    await upsertProductImage(nextImage);
    return nextImage;
  }

  const image: ProductImage = {
    id: createEntityId('image'),
    productId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...input
  };
  await upsertProductImage(image);
  return image;
}

export async function createOrder(input: {
  title: string;
  source: OrderSource;
  sourceFileName?: string;
  sourceMimeType?: string;
  notes?: string;
}) {
  const now = nowIso();
  const order: Order = {
    id: createEntityId('order'),
    title: input.title,
    source: input.source,
    status: 'active',
    sourceFileName: input.sourceFileName,
    sourceMimeType: input.sourceMimeType,
    importedAt: now,
    notes: input.notes,
    createdAt: now,
    updatedAt: now
  };
  await db.orders.add(order);
  return order;
}

export type NewOrderItemInput = {
  rawText: string;
  productName: string;
  quantity: number;
  lineNumber?: number;
  productId?: string;
  sku?: string;
  unit?: string;
  checked?: boolean;
  speechText?: string;
  confidence?: number;
};

export async function addOrderItems(orderId: string, items: NewOrderItemInput[]) {
  const now = nowIso();
  const rows: OrderItem[] = items.map((item, index) => ({
    id: createEntityId('item'),
    orderId,
    lineNumber: item.lineNumber ?? index + 1,
    rawText: item.rawText,
    productId: item.productId,
    productName: item.productName,
    sku: item.sku,
    quantity: item.quantity,
    unit: item.unit,
    checked: item.checked ?? false,
    speechText: item.speechText,
    confidence: item.confidence,
    createdAt: now,
    updatedAt: now
  }));
  await db.orderItems.bulkAdd(rows);
  return rows;
}

export async function createOrderWithItems(input: {
  title: string;
  source: OrderSource;
  sourceFileName?: string;
  sourceMimeType?: string;
  notes?: string;
  items: NewOrderItemInput[];
}) {
  return db.transaction('rw', db.orders, db.orderItems, async () => {
    const order = await createOrder({
      title: input.title,
      source: input.source,
      sourceFileName: input.sourceFileName,
      sourceMimeType: input.sourceMimeType,
      notes: input.notes
    });
    const items = await addOrderItems(order.id, input.items);
    return { order, items };
  });
}

export async function toggleOrderItemChecked(orderItemId: string, checked?: boolean) {
  const item = await db.orderItems.get(orderItemId);
  if (!item) {
    return undefined;
  }
  const next = {
    ...item,
    checked: checked ?? !item.checked,
    updatedAt: nowIso()
  };
  await db.orderItems.put(next);
  return next;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const patch: Partial<Order> = {
    status,
    updatedAt: nowIso()
  };
  if (status === 'completed') {
    patch.completedAt = nowIso();
  }
  if (status === 'archived') {
    patch.archivedAt = nowIso();
  }
  await db.orders.update(orderId, patch);
  return db.orders.get(orderId);
}

export async function updateOrderTitle(orderId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    return db.orders.get(orderId);
  }

  await db.orders.update(orderId, {
    title: trimmed,
    updatedAt: nowIso()
  });
  return db.orders.get(orderId);
}

export async function archiveOrder(orderId: string, reason?: string) {
  const archivedAt = nowIso();
  const order = await db.orders.get(orderId);
  if (!order) {
    return undefined;
  }

  const archiveRecord: ArchiveRecord = {
    id: createEntityId('archive'),
    orderId,
    archivedAt,
    reason,
    createdAt: archivedAt,
    updatedAt: archivedAt
  };

  await db.archive.put(archiveRecord);
  await db.orders.update(orderId, {
    status: 'archived',
    archivedAt,
    updatedAt: archivedAt
  });
  return archiveRecord;
}

export async function deleteArchivedOrder(orderId: string) {
  const order = await db.orders.get(orderId);
  if (!order || order.status !== 'archived') {
    return false;
  }

  await db.transaction('rw', db.orders, db.orderItems, db.archive, async () => {
    await db.orderItems.where('orderId').equals(orderId).delete();

    const archiveEntries = await db.archive.where('orderId').equals(orderId).toArray();
    await Promise.all(archiveEntries.map((entry) => db.archive.delete(entry.id)));

    await db.orders.delete(orderId);
  });

  return true;
}

export async function listOrders() {
  return db.orders.orderBy('updatedAt').reverse().toArray();
}

export async function listActiveOrders() {
  const orders = await db.orders.where('status').anyOf('draft', 'active').sortBy('updatedAt');
  return orders.reverse();
}

export async function listArchivedOrders() {
  const orders = await db.orders.where('status').equals('archived').sortBy('updatedAt');
  return orders.reverse();
}

export async function listOrderItems(orderId: string) {
  return db.orderItems.where('orderId').equals(orderId).sortBy('lineNumber');
}

export async function listProducts() {
  return db.products.orderBy('name').toArray();
}

export async function listProductAliases() {
  return db.productAliases.toArray();
}

export async function listProductImages(productId?: string) {
  if (productId) {
    return db.productImages.where('productId').equals(productId).sortBy('updatedAt');
  }
  return db.productImages.orderBy('updatedAt').reverse().toArray();
}

export async function getBestProductImage(productId: string) {
  const images = await listProductImages(productId);
  if (images.length === 0) {
    return undefined;
  }
  return [...images].sort((a, b) => {
    const priority = sourceRank(a.source) - sourceRank(b.source);
    if (priority !== 0) {
      return priority;
    }
    if (a.isPrimary !== b.isPrimary) {
      return a.isPrimary ? -1 : 1;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  })[0];
}

export async function seedDatabaseIfNeeded(seedProducts: ProductSeed[], seedImages: ProductImageSeed[]) {
  const existingProducts = await db.products.count();
  if (existingProducts > 0) {
    return false;
  }

  await upsertProductsFromSeed(seedProducts);
  for (const seedImage of seedImages) {
    const productId = await resolveSeedImageProductId(seedImage);
    if (!productId) {
      continue;
    }
    await upsertProductImage(
      createProductImageFromSeed({
        ...seedImage,
        productId
      })
    );
  }
  return true;
}

export async function syncSeedCatalog(seedProducts: ProductSeed[], seedImages: ProductImageSeed[]) {
  await upsertProductsFromSeed(seedProducts);

  for (const seedImage of seedImages) {
    const productId = await resolveSeedImageProductId(seedImage);
    if (!productId) {
      continue;
    }

    const image = createProductImageFromSeed({
      ...seedImage,
      productId
    });

    const existing = image.hash
      ? (await db.productImages.where('productId').equals(productId).toArray()).find(
          (entry) => entry.hash === image.hash || entry.url === image.url
        )
      : (await db.productImages.where('productId').equals(productId).toArray()).find(
          (entry) => entry.url === image.url
        );

    if (existing) {
      await upsertProductImage({
        ...existing,
        ...image,
        id: existing.id,
        productId,
        createdAt: existing.createdAt,
        updatedAt: nowIso()
      });
      continue;
    }

    await upsertProductImage(image);
  }
}

export async function clearDatabase() {
  await db.products.clear();
  await db.productAliases.clear();
  await db.productImages.clear();
  await db.orders.clear();
  await db.orderItems.clear();
  await db.archive.clear();
}

export function matchProductCandidate(input: string, products: Product[], aliases: ProductAlias[] = []) {
  const trimmed = input.trim();
  const normalized = normalizeText(trimmed);
  const normalizedSku = normalizeSku(trimmed);
  const aliasMap = new Map<string, string[]>();

  for (const alias of aliases) {
    const list = aliasMap.get(alias.productId) ?? [];
    list.push(alias.normalizedAlias);
    aliasMap.set(alias.productId, list);
  }

  const exactSku = products.find((product) => normalizeSku(product.sku) === normalizedSku);
  if (exactSku) {
    return { productId: exactSku.id, score: 1, reason: 'sku-exact' } as const;
  }

  const byNormalizedSku = products.find((product) => normalizeSku(product.sku).includes(normalizedSku) || normalizedSku.includes(normalizeSku(product.sku)));
  if (byNormalizedSku) {
    return { productId: byNormalizedSku.id, score: 0.94, reason: 'sku-normalized' } as const;
  }

  const byName = products.find((product) => normalizeText(product.name) === normalized || normalizeText(product.name).includes(normalized) || normalized.includes(normalizeText(product.name)));
  if (byName) {
    return { productId: byName.id, score: 0.88, reason: 'name' } as const;
  }

  const byAlias = aliases.find((alias) => alias.normalizedAlias === normalized || alias.normalizedAlias.includes(normalized) || normalized.includes(alias.normalizedAlias));
  if (byAlias) {
    return { productId: byAlias.productId, score: 0.83, reason: 'alias' } as const;
  }

  const fuzzy = products
    .map((product) => ({
      productId: product.id,
      score: Math.max(
        fuzzyScore(normalizeText(product.name), normalized),
        ...product.aliases.map((alias) => fuzzyScore(normalizeText(alias), normalized)),
        ...(aliasMap.get(product.id) ?? []).map((alias) => fuzzyScore(alias, normalized))
      )
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (fuzzy && fuzzy.score >= 0.45) {
    return { productId: fuzzy.productId, score: fuzzy.score, reason: 'fuzzy' } as const;
  }

  return undefined;
}

function sourceRank(source: ProductImage['source']) {
  switch (source) {
    case 'manual':
      return 0;
    case 'local-seed':
      return 1;
    case 'researched':
      return 2;
    default:
      return 3;
  }
}

function fuzzyScore(a: string, b: string) {
  if (!a || !b) {
    return 0;
  }
  if (a === b) {
    return 1;
  }
  const aWords = new Set(a.split(' '));
  const bWords = new Set(b.split(' '));
  const intersection = [...aWords].filter((word) => bWords.has(word)).length;
  const union = new Set([...aWords, ...bWords]).size;
  const jaccard = union === 0 ? 0 : intersection / union;
  const overlap = Math.min(aWords.size, bWords.size) === 0 ? 0 : intersection / Math.min(aWords.size, bWords.size);
  return Math.max(jaccard, overlap);
}

async function resolveSeedImageProductId(seedImage: ProductImageSeed) {
  if (seedImage.productId) {
    return seedImage.productId;
  }
  if (!seedImage.productSku) {
    return undefined;
  }
  const product = await db.products.where('sku').equalsIgnoreCase(seedImage.productSku).first();
  return product?.id;
}
