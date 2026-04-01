export type ImageSourceKind = 'manual' | 'local' | 'research' | 'placeholder';
export type CameraOrientation = 'portrait' | 'landscape' | 'square' | 'unknown';

export interface ProductAlias {
  id: string;
  productId: string;
  value: string;
  normalizedValue: string;
  source?: 'manual' | 'import' | 'seed';
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  normalizedSku: string;
  name: string;
  normalizedName: string;
  aliases: ProductAlias[];
  category?: string;
  brand?: string;
  packSize?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CameraMetadata {
  capturedAt: string;
  deviceLabel?: string;
  orientation?: CameraOrientation;
  latitude?: number;
  longitude?: number;
  exposureMs?: number;
  iso?: number;
  notes?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  sku?: string;
  normalizedSku?: string;
  sourceKind: ImageSourceKind;
  uri: string;
  thumbUri?: string;
  alt: string;
  width?: number;
  height?: number;
  camera?: CameraMetadata;
  captureSource?: 'camera' | 'import' | 'seed';
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MatchCandidate {
  product: Product;
  score: number;
  reason: 'sku-exact' | 'sku-normalized' | 'name' | 'alias' | 'fuzzy';
}

export interface ProductMatchResult {
  product: Product | null;
  candidate?: MatchCandidate;
  reason: 'sku-exact' | 'sku-normalized' | 'name' | 'alias' | 'fuzzy' | 'none';
  score: number;
}
