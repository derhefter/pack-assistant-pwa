import { linkImageToProduct, listProductImages } from '../../db';
import type { Product } from '../../lib/domain';
import { normalizeSku, normalizeText } from '../../lib/domain';

type CentralProductImage = {
  sku: string;
  url: string;
  pathname: string;
  fileName?: string;
  contentType?: string;
  uploadedAt: string;
};

function isOnlineBrowser() {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine;
}

function dataUrlToBlob(dataUrl: string, mimeType: string) {
  const [, encoded = ''] = dataUrl.split(',');
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

async function requestCentralImages(products: Product[]) {
  const skus = products.map((product) => normalizeSku(product.sku)).filter(Boolean);
  if (!skus.length) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 3000);

  let response: Response;
  try {
    response = await fetch(`/api/product-images?skus=${encodeURIComponent(skus.join(','))}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error('Zentrale Bildliste konnte nicht geladen werden.');
  }

  const payload = (await response.json()) as { images?: CentralProductImage[] };
  return payload.images ?? [];
}

export async function syncCentralProductImages(products: Product[]) {
  if (!isOnlineBrowser() || !products.length) {
    return 0;
  }

  const [centralImages, existingImages] = await Promise.all([requestCentralImages(products), listProductImages()]);
  if (!centralImages.length) {
    return 0;
  }

  const productBySku = new Map(products.map((product) => [normalizeSku(product.sku), product]));
  const existingKeys = new Set(
    existingImages.map((image) => `${image.productId}:${image.url}:${image.hash ?? ''}`)
  );

  let importedCount = 0;

  for (const image of centralImages) {
    const product = productBySku.get(normalizeSku(image.sku));
    if (!product) {
      continue;
    }

    const hash = `central:${image.pathname}`;
    const key = `${product.id}:${image.url}:${hash}`;
    if (existingKeys.has(key)) {
      continue;
    }

    await linkImageToProduct(product.id, {
      source: 'manual',
      url: image.url,
      thumbUrl: image.url,
      fileName: image.fileName,
      alt: `${product.name} zentral synchronisiert`,
      mimeType: image.contentType ?? 'image/jpeg',
      isPrimary: false,
      hash,
      captureSource: 'sync',
      confidence: 0.94,
      note: 'Von Vercel Blob synchronisiert.'
    });

    existingKeys.add(key);
    importedCount += 1;
  }

  return importedCount;
}

export async function uploadCentralProductImage(input: {
  sku: string;
  productName: string;
  dataUrl: string;
  mimeType: string;
  hash: string;
}) {
  if (!isOnlineBrowser()) {
    return null;
  }

  const normalizedSku = normalizeSku(input.sku);
  if (!normalizedSku) {
    return null;
  }

  const formData = new FormData();
  const blob = dataUrlToBlob(input.dataUrl, input.mimeType);
  const extension = input.mimeType === 'image/png' ? 'png' : input.mimeType === 'image/webp' ? 'webp' : 'jpg';

  formData.set('sku', normalizedSku);
  formData.set('productName', normalizeText(input.productName).replace(/\s+/g, '-'));
  formData.set('hash', normalizeText(input.hash).replace(/\s+/g, '-'));
  formData.set('file', blob, `${normalizedSku}.${extension}`);

  const response = await fetch('/api/product-images', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Zentraler Bildupload fehlgeschlagen.');
  }

  const payload = (await response.json()) as { image?: CentralProductImage };
  return payload.image ?? null;
}
