export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeSku(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

export function stableId(prefix: string, value: string): string {
  const normalized = normalizeText(value);
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return `${prefix}_${hash.toString(36)}`;
}
