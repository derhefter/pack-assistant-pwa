import { normalizeText } from '../../lib/text';
import type { Product, ProductImage } from './types';

function initialsFromName(name: string): string {
  const parts = normalizeText(name).split(' ').filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return initials.join('') || '??';
}

export function createPlaceholderProductImage(product: Product): ProductImage {
  const label = product.name || product.sku || 'Produkt';
  const initials = initialsFromName(label);
  const timestamp = new Date().toISOString();
  const bgHue = product.normalizedSku
    .split('')
    .reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0) % 360;
  const background = `hsl(${bgHue} 45% 88%)`;
  const foreground = `hsl(${bgHue} 45% 22%)`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="960" viewBox="0 0 960 960">
      <rect width="960" height="960" rx="84" fill="${background}" />
      <circle cx="192" cy="192" r="148" fill="rgba(255,255,255,0.3)" />
      <circle cx="748" cy="740" r="192" fill="rgba(255,255,255,0.18)" />
      <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="${foreground}"
        font-family="Arial, sans-serif" font-size="184" font-weight="700">${initials}</text>
      <text x="50%" y="63%" dominant-baseline="middle" text-anchor="middle" fill="${foreground}"
        font-family="Arial, sans-serif" font-size="52" font-weight="600">${label}</text>
    </svg>
  `.trim();

  return {
    id: `${product.id}-placeholder`,
    productId: product.id,
    sourceKind: 'placeholder',
    uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    alt: `${label} Platzhalterbild`,
    confidence: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
