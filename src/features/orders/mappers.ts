import type { Order, OrderItem, Product, ProductImage } from '../../lib/domain';
import { formatSpeechText } from '../audio';
import { createPlaceholderProductImage } from '../products';
import type { OrderItemCard, OrderRecord } from './types';

function isUsableImageUrl(value?: string) {
  if (!value) {
    return false;
  }

  return (
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('/') ||
    value.startsWith('./')
  );
}

function buildPlaceholderUrl(name: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="960" viewBox="0 0 960 960">
      <rect width="960" height="960" rx="84" fill="#f3d8a8" />
      <circle cx="190" cy="170" r="120" fill="rgba(255,255,255,0.38)" />
      <circle cx="760" cy="760" r="180" fill="rgba(15,91,79,0.12)" />
      <text x="50%" y="48%" text-anchor="middle" dominant-baseline="middle"
        font-family="Trebuchet MS, sans-serif" font-size="120" font-weight="700" fill="#0f5b4f">
        Kein Bild
      </text>
      <text x="50%" y="62%" text-anchor="middle" dominant-baseline="middle"
        font-family="Trebuchet MS, sans-serif" font-size="44" fill="#28584e">
        ${name}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function resolveImage(product: Product | undefined, image: ProductImage | undefined) {
  if (image && isUsableImageUrl(image.url)) {
    return {
      imageUrl: image.url,
      imageAlt: image.alt ?? product?.name ?? 'Produktbild',
      imageSource: image.source
    } as const;
  }

  if (product) {
    const placeholder = createPlaceholderProductImage({
      id: product.id,
      sku: product.sku,
      normalizedSku: product.normalizedSku ?? '',
      name: product.name,
      normalizedName: product.normalizedName ?? '',
      aliases: [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    });

    return {
      imageUrl: placeholder.uri,
      imageAlt: placeholder.alt,
      imageSource: 'placeholder'
    } as const;
  }

  return {
    imageUrl: buildPlaceholderUrl('Unbekannt'),
    imageAlt: 'Kein Bild vorhanden',
    imageSource: 'placeholder'
  } as const;
}

export function mapOrderRecord(
  order: Order,
  items: OrderItem[],
  products: Product[],
  images: ProductImage[]
): OrderRecord {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const imageMap = new Map<string, ProductImage[]>();

  for (const image of images) {
    const list = imageMap.get(image.productId) ?? [];
    list.push(image);
    imageMap.set(image.productId, list);
  }

  const cards: OrderItemCard[] = items.map((item) => {
    const product = item.productId ? productMap.get(item.productId) : undefined;
    const productImages = item.productId ? imageMap.get(item.productId) ?? [] : [];
    const bestImage = [...productImages].sort((left, right) => {
      const rank: Record<ProductImage['source'], number> = {
        manual: 0,
        'local-seed': 1,
        researched: 2,
        placeholder: 3
      };
      return rank[left.source] - rank[right.source];
    })[0];
    const resolvedImage = resolveImage(product, bestImage);

    return {
      id: `${order.id}:${item.id}`,
      orderItemId: item.id,
      productId: item.productId,
      sku: item.sku,
      unit: item.unit,
      name: item.productName,
      quantity: item.quantity,
      packed: item.checked,
      imageUrl: resolvedImage.imageUrl,
      imageAlt: resolvedImage.imageAlt,
      imageSource: resolvedImage.imageSource,
      confidence: item.confidence,
      speechText:
        item.speechText ??
        formatSpeechText({
          productName: item.productName,
          quantity: item.quantity,
          packed: item.checked
        })
    };
  });

  return {
    id: order.id,
    title: order.title,
    sourceLabel:
      order.source === 'pdf'
        ? 'PDF-Import'
        : order.source === 'photo'
          ? 'Foto-Import'
          : 'Text-Import',
    createdAt: order.createdAt,
    archivedAt: order.archivedAt,
    status: order.status === 'archived' ? 'archived' : 'active',
    items: cards
  };
}
