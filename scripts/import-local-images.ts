import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

type ProductSeed = {
  id: string;
  sku: string;
  name: string;
  aliases?: string[];
};

type ProductImageSeed = {
  id: string;
  productId: string | null;
  sku: string | null;
  fileName: string;
  relativePath: string;
  source: 'local';
  matchStrategy: MatchStrategy | null;
  matchedTerm: string | null;
  hash: string;
  mimeType: string;
  priority: 1 | 2 | 3 | 4;
};

type MatchStrategy = 'sku-exact' | 'sku-normalized' | 'name' | 'alias' | 'fuzzy' | 'unmatched';

type DuplicateReportEntry = {
  hash: string;
  fileNames: string[];
  relativePaths: string[];
};

type UnmatchedReportEntry = {
  fileName: string;
  relativePath: string;
  reason: string;
  normalizedName: string;
};

type LocalImageEntry = {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  normalizedName: string;
  extractedSku: string | null;
  mimeType: string;
  hash: string;
};

const DEFAULT_IMAGES_DIR = 'Z:\\code-output\\halloren-git\\images';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif']);
const OUTPUT_DIR = path.resolve(process.cwd(), 'data');

function main() {
  const args = parseArgs(process.argv.slice(2));
  const imagesDir = resolveImagesDir(args['images-dir'] ?? DEFAULT_IMAGES_DIR);
  const dryRun = args['dry-run'] === 'true' || args['dry-run'] === '';

  if (!imagesDir) {
    throw new Error(
      `Kein Bilderverzeichnis gefunden. Nutze --images-dir <pfad> oder stelle ${DEFAULT_IMAGES_DIR} bereit.`
    );
  }

  const products = loadProducts();
  const images = collectImages(imagesDir);
  const matchedImages: ProductImageSeed[] = [];
  const unmatched: UnmatchedReportEntry[] = [];
  const duplicates = findDuplicates(images);
  const duplicateHashes = new Set(duplicates.map((entry) => entry.hash));

  for (const image of images) {
    const match = matchImageToProduct(image, products);
    if (!match) {
      unmatched.push({
        fileName: image.fileName,
        relativePath: image.relativePath,
        reason: duplicateHashes.has(image.hash) ? 'duplicate-skip' : 'no-match',
        normalizedName: image.normalizedName
      });
      continue;
    }

    matchedImages.push({
      id: `img_${stableId(image.relativePath)}`,
      productId: match.product.id,
      sku: match.product.sku,
      fileName: image.fileName,
      relativePath: image.relativePath,
      source: 'local',
      matchStrategy: match.strategy,
      matchedTerm: match.term,
      hash: image.hash,
      mimeType: image.mimeType,
      priority: 2
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    imagesDir,
    counts: {
      scanned: images.length,
      matched: matchedImages.length,
      unmatched: unmatched.length,
      duplicates: duplicates.length,
      products: products.length
    },
    dryRun
  };

  if (!dryRun) {
    writeJson(path.join(OUTPUT_DIR, 'product-images.seed.json'), matchedImages);
    writeJson(path.join(OUTPUT_DIR, 'unmatched-images.report.json'), {
      ...output,
      items: unmatched
    });
    writeJson(path.join(OUTPUT_DIR, 'duplicate-images.report.json'), {
      ...output,
      items: duplicates
    });
  }

  console.log(JSON.stringify({ ...output, preview: { matchedImages, unmatched, duplicates } }, null, 2));
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const equalsIndex = token.indexOf('=');
    if (equalsIndex > 2) {
      args[token.slice(2, equalsIndex)] = token.slice(equalsIndex + 1);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = '';
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function resolveImagesDir(candidate: string | undefined) {
  const resolved = candidate ? path.resolve(candidate) : '';
  if (resolved && fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return resolved;
  }
  return '';
}

function loadProducts(): ProductSeed[] {
  const filePath = path.resolve(OUTPUT_DIR, 'products.seed.json');
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw) as ProductSeed[];
  return Array.isArray(parsed) ? parsed : [];
}

function collectImages(rootDir: string): LocalImageEntry[] {
  const files: LocalImageEntry[] = [];
  walk(rootDir).forEach((absolutePath) => {
    const ext = path.extname(absolutePath).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) return;
    const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join('/');
    const fileName = path.basename(absolutePath);
    const normalizedName = normalizeText(fileName);
    const extractedSku = extractSku(fileName);
    const hash = hashFile(absolutePath);
    files.push({
      absolutePath,
      relativePath,
      fileName,
      normalizedName,
      extractedSku,
      mimeType: mimeFromExtension(ext),
      hash
    });
  });
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function walk(rootDir: string): string[] {
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(absolutePath));
      continue;
    }
    if (entry.isFile()) result.push(absolutePath);
  }
  return result;
}

function findDuplicates(images: LocalImageEntry[]): DuplicateReportEntry[] {
  const byHash = new Map<string, LocalImageEntry[]>();
  for (const image of images) {
    const list = byHash.get(image.hash) ?? [];
    list.push(image);
    byHash.set(image.hash, list);
  }
  const result: DuplicateReportEntry[] = [];
  byHash.forEach((entries, hash) => {
    if (entries.length > 1) {
      result.push({
        hash,
        fileNames: entries.map((entry) => entry.fileName),
        relativePaths: entries.map((entry) => entry.relativePath)
      });
    }
  });
  return result;
}

function matchImageToProduct(
  image: LocalImageEntry,
  products: ProductSeed[]
): { product: ProductSeed; strategy: MatchStrategy; term: string | null } | null {
  const skuCandidates = [image.extractedSku, ...extractSkuCandidates(image.fileName)];
  for (const sku of skuCandidates.filter(Boolean) as string[]) {
    const exact = products.find((product) => product.sku === sku);
    if (exact) return { product: exact, strategy: 'sku-exact', term: sku };
  }

  const normalizedSkuCandidates = skuCandidates.map(normalizeSku).filter(Boolean) as string[];
  for (const sku of normalizedSkuCandidates) {
    const normalized = products.find((product) => normalizeSku(product.sku) === sku);
    if (normalized) return { product: normalized, strategy: 'sku-normalized', term: sku };
  }

  const normalizedName = image.normalizedName;
  for (const product of products) {
    if (normalizedName.includes(normalizeText(product.name))) {
      return { product, strategy: 'name', term: product.name };
    }
    for (const alias of product.aliases ?? []) {
      if (normalizedName.includes(normalizeText(alias))) {
        return { product, strategy: 'alias', term: alias };
      }
    }
  }

  const fuzzy = products
    .map((product) => ({ product, score: scoreText(normalizedName, normalizeText(product.name)) }))
    .sort((a, b) => b.score - a.score)[0];
  if (fuzzy && fuzzy.score >= 0.72) {
    return { product: fuzzy.product, strategy: 'fuzzy', term: fuzzy.product.name };
  }

  return null;
}

function extractSku(fileName: string): string | null {
  const candidates = extractSkuCandidates(fileName);
  return candidates[0] ?? null;
}

function extractSkuCandidates(fileName: string): string[] {
  const baseName = path.basename(fileName, path.extname(fileName));
  const tokens = baseName.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const candidates = new Set<string>();

  for (const token of tokens) {
    const normalizedToken = token.replace(/[^a-z0-9]/gi, '').toUpperCase();
    if (/\d/.test(normalizedToken)) {
      candidates.add(normalizedToken);
    }
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const left = tokens[index].replace(/[^a-z0-9]/gi, '').toUpperCase();
    const right = tokens[index + 1].replace(/[^a-z0-9]/gi, '').toUpperCase();
    if (!left || !right) continue;
    if ((/[A-Z]/.test(left) && /\d/.test(right)) || (/\d/.test(left) && /[A-Z]/.test(right))) {
      candidates.add(`${left}${right}`);
      candidates.add(`${left}-${right}`);
    }
  }

  return [...candidates];
}

function normalizeSku(value: string | null | undefined) {
  return (value ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function normalizeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreText(left: string, right: string) {
  if (!left || !right) return 0;
  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) overlap += 1;
  });
  return overlap / Math.max(leftTokens.size, rightTokens.size, 1);
}

function hashFile(filePath: string) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function mimeFromExtension(ext: string) {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.avif':
      return 'image/avif';
    default:
      return 'application/octet-stream';
  }
}

function stableId(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 12);
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

main();
