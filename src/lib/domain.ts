export type ID = string;

export type EntityWithTimestamps = {
  id: ID;
  createdAt: string;
  updatedAt: string;
};

export type Product = EntityWithTimestamps & {
  id: ID;
  sku: string;
  normalizedSku?: string;
  name: string;
  normalizedName?: string;
  brand?: string;
  category?: string;
  description?: string;
  packSize?: string;
  defaultImageId?: ID;
  aliases: string[];
  active: boolean;
};

export type ProductAlias = EntityWithTimestamps & {
  productId: ID;
  alias: string;
  normalizedAlias: string;
  source?: string;
};

export type ProductImageSource = 'manual' | 'local-seed' | 'researched' | 'placeholder';

export type ProductImage = EntityWithTimestamps & {
  productId: ID;
  source: ProductImageSource;
  url: string;
  fileName?: string;
  thumbUrl?: string;
  alt?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  isPrimary: boolean;
  hash?: string;
  note?: string;
  confidence?: number;
  captureSource?: string;
  camera?: {
    capturedAt?: string;
    deviceLabel?: string;
    orientation?: string;
    notes?: string;
  };
};

export type OrderStatus = 'draft' | 'active' | 'completed' | 'archived';

export type OrderSource = 'pdf' | 'photo' | 'manual';

export type Order = EntityWithTimestamps & {
  title: string;
  source: OrderSource;
  status: OrderStatus;
  sourceFileName?: string;
  sourceMimeType?: string;
  importedAt?: string;
  completedAt?: string;
  archivedAt?: string;
  notes?: string;
};

export type OrderItem = EntityWithTimestamps & {
  orderId: ID;
  lineNumber: number;
  rawText: string;
  productId?: ID;
  productName: string;
  sku?: string;
  quantity: number;
  unit?: string;
  checked: boolean;
  speechText?: string;
  confidence?: number;
};

export type ArchiveRecord = EntityWithTimestamps & {
  orderId: ID;
  archivedAt: string;
  reason?: string;
};

export type NormalizedProductMatch = {
  productId: ID;
  score: number;
  reason: 'sku-exact' | 'sku-normalized' | 'name' | 'alias' | 'fuzzy';
};

export type ProductSeed = Pick<Product, 'sku' | 'name' | 'brand' | 'category' | 'description' | 'aliases' | 'active'> & {
  id?: ID;
  normalizedSku?: string;
  normalizedName?: string;
  packSize?: string;
  defaultImageId?: ID;
};

export type ProductImageSeed = Pick<ProductImage, 'source' | 'url' | 'fileName' | 'thumbUrl' | 'alt' | 'mimeType' | 'width' | 'height' | 'isPrimary' | 'hash' | 'note' | 'confidence' | 'captureSource' | 'camera'> & {
  productId?: string;
  productSku?: string;
};

export type SeedBundle = {
  products: ProductSeed[];
  productImages: ProductImageSeed[];
};

export function nowIso() {
  return new Date().toISOString();
}

export function createEntityId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}_${random}`;
}

export function normalizeSku(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugLike(value: string) {
  return normalizeText(value).replace(/\s/g, '-');
}
