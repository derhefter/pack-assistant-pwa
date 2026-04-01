export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeSku(value: string): string {
  return value
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[^A-Z0-9]/g, '');
}

export function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  return normalized.split(' ');
}

export function levenshteinDistance(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  if (!left.length) {
    return right.length;
  }
  if (!right.length) {
    return left.length;
  }

  const previous = new Array<number>(right.length + 1);
  const current = new Array<number>(right.length + 1);

  for (let j = 0; j <= right.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
    }

    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[right.length];
}

export function similarityScore(left: string, right: string): number {
  const leftNormalized = normalizeText(left);
  const rightNormalized = normalizeText(right);
  if (!leftNormalized || !rightNormalized) {
    return 0;
  }

  if (leftNormalized === rightNormalized) {
    return 1;
  }

  const distance = levenshteinDistance(leftNormalized, rightNormalized);
  const maxLength = Math.max(leftNormalized.length, rightNormalized.length);
  const editScore = 1 - distance / maxLength;

  const leftTokens = new Set(tokenize(leftNormalized));
  const rightTokens = new Set(tokenize(rightNormalized));
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const tokenScore = overlap / Math.max(leftTokens.size, rightTokens.size, 1);

  return Math.max(0, Math.min(1, editScore * 0.7 + tokenScore * 0.3));
}
