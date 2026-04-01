import type { ProductImageSeed, ProductSeed, SeedBundle } from '../lib/domain';
import rawProductsSeed from '../../data/products.seed.json';
import rawProductImagesSeed from '../../data/product-images.seed.json';

type LegacyAlias = {
  id?: string;
  productId?: string;
  value?: string;
  normalizedValue?: string;
  source?: string;
};

type LegacyProductSeed = {
  id?: string;
  sku: string;
  normalizedSku?: string;
  name: string;
  normalizedName?: string;
  aliases?: LegacyAlias[];
  category?: string;
  brand?: string;
  packSize?: string;
  createdAt?: string;
  updatedAt?: string;
};

type LegacyImageSeed = {
  id?: string;
  productId?: string;
  sku?: string;
  normalizedSku?: string;
  sourceKind?: 'manual' | 'local' | 'research' | 'placeholder';
  uri?: string;
  thumbUri?: string;
  alt?: string;
  width?: number;
  height?: number;
  captureSource?: string;
  confidence?: number;
  camera?: {
    capturedAt?: string;
    deviceLabel?: string;
    orientation?: string;
    notes?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

function mapSourceKind(sourceKind?: LegacyImageSeed['sourceKind']): ProductImageSeed['source'] {
  switch (sourceKind) {
    case 'manual':
      return 'manual';
    case 'local':
      return 'local-seed';
    case 'research':
      return 'researched';
    default:
      return 'placeholder';
  }
}

function deriveFileName(pathOrUrl?: string) {
  if (!pathOrUrl) {
    return undefined;
  }
  const normalized = pathOrUrl.split('?')[0];
  return normalized.split('/').filter(Boolean).at(-1);
}

function mapProductSeed(entry: LegacyProductSeed): ProductSeed {
  const aliases = (entry.aliases ?? []).map((alias) => alias.value ?? alias.normalizedValue ?? '').filter(Boolean);
  return {
    id: entry.id,
    sku: entry.sku,
    normalizedSku: entry.normalizedSku,
    name: entry.name,
    normalizedName: entry.normalizedName,
    brand: entry.brand,
    category: entry.category,
    description: entry.packSize ? `Packgroesse: ${entry.packSize}` : undefined,
    packSize: entry.packSize,
    aliases,
    active: true
  };
}

function mapProductImageSeed(entry: LegacyImageSeed): ProductImageSeed {
  return {
    productId: entry.productId,
    source: mapSourceKind(entry.sourceKind),
    url: entry.uri ?? '',
    fileName: entry.thumbUri ? deriveFileName(entry.thumbUri) ?? deriveFileName(entry.uri) : deriveFileName(entry.uri),
    thumbUrl: entry.thumbUri,
    alt: entry.alt,
    mimeType: entry.uri?.endsWith('.svg') ? 'image/svg+xml' : entry.uri?.endsWith('.png') ? 'image/png' : 'image/jpeg',
    width: entry.width,
    height: entry.height,
    isPrimary: entry.sourceKind === 'manual' || entry.sourceKind === 'local',
    hash: entry.id,
    note: entry.alt,
    confidence: entry.confidence,
    captureSource: entry.captureSource,
    camera: entry.camera
  };
}

const products = (rawProductsSeed as LegacyProductSeed[]).map(mapProductSeed);
const productImages = (rawProductImagesSeed as LegacyImageSeed[]).map(mapProductImageSeed);

export const seedBundle: SeedBundle = {
  products,
  productImages
};

export function hasSeedData() {
  return seedBundle.products.length > 0 || seedBundle.productImages.length > 0;
}
