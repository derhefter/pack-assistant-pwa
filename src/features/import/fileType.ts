import { ImportKind, ImportSource } from '../../lib/import-types';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff'
]);

function extensionOf(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName);
  return match?.[1]?.toLowerCase() ?? '';
}

async function readMagicBytes(file: File): Promise<Uint8Array | null> {
  try {
    const chunk = file.slice(0, 16);
    const buffer = await chunk.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

function detectFromBytes(bytes: Uint8Array | null): ImportKind {
  if (!bytes) {
    return 'unknown';
  }

  const header = Array.from(bytes.slice(0, 8))
    .map((entry) => String.fromCharCode(entry))
    .join('');

  if (header.startsWith('%PDF')) {
    return 'pdf';
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image';
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image';
  }

  if (header.startsWith('GIF87a') || header.startsWith('GIF89a')) {
    return 'image';
  }

  if (header.startsWith('RIFF') && header.includes('WEBP')) {
    return 'image';
  }

  return 'unknown';
}

export async function detectImportKind(file: File): Promise<ImportKind> {
  if (file.type === 'application/pdf') {
    return 'pdf';
  }

  if (IMAGE_TYPES.has(file.type)) {
    return 'image';
  }

  const extension = extensionOf(file.name);
  if (extension === 'pdf') {
    return 'pdf';
  }
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff'].includes(extension)) {
    return 'image';
  }

  return detectFromBytes(await readMagicBytes(file));
}

export async function buildImportSource(file: File): Promise<ImportSource> {
  return {
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    kind: await detectImportKind(file)
  };
}
