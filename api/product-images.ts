import { list, put } from '@vercel/blob';

function normalizeSku(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function sanitizeFragment(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function guessExtension(contentType?: string, fileName?: string) {
  const lowerName = String(fileName ?? '').toLowerCase();
  if (lowerName.endsWith('.png') || contentType === 'image/png') {
    return 'png';
  }
  if (lowerName.endsWith('.webp') || contentType === 'image/webp') {
    return 'webp';
  }
  return 'jpg';
}

function extractTimestampFromPath(pathname: string) {
  const segments = pathname.split('/');
  const fileName = segments[segments.length - 1] ?? '';
  const match = fileName.match(/^(?<stamp>\d{14})-/);
  if (!match?.groups?.stamp) {
    return new Date(0).toISOString();
  }

  const stamp = match.groups.stamp;
  const year = Number(stamp.slice(0, 4));
  const month = Number(stamp.slice(4, 6)) - 1;
  const day = Number(stamp.slice(6, 8));
  const hour = Number(stamp.slice(8, 10));
  const minute = Number(stamp.slice(10, 12));
  const second = Number(stamp.slice(12, 14));
  return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
}

function mapBlobRecord(blob: { url: string; pathname: string; contentType?: string }) {
  const [, sku = '', fileName = ''] = blob.pathname.split('/');
  return {
    sku,
    url: blob.url,
    pathname: blob.pathname,
    fileName,
    contentType: blob.contentType,
    uploadedAt: extractTimestampFromPath(blob.pathname)
  };
}

async function listLatestImagesForSkus(skus: string[]) {
  const images = await Promise.all(
    skus.map(async (sku) => {
      const prefix = `product-images/${sku}/`;
      const response = await list({ prefix, limit: 1000 });
      const latest = [...response.blobs].sort((left, right) => right.pathname.localeCompare(left.pathname))[0];
      return latest ? mapBlobRecord(latest) : null;
    })
  );

  return images.filter(Boolean);
}

export default async function handler(request: Request) {
  try {
    const readWriteToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (request.method === 'GET') {
      if (!readWriteToken) {
        return Response.json({ images: [], configured: false });
      }

      const { searchParams } = new URL(request.url);
      const skus = (searchParams.get('skus') ?? '')
        .split(',')
        .map((value) => normalizeSku(value))
        .filter(Boolean);

      if (!skus.length) {
        return Response.json({ images: [] });
      }

      return Response.json({ images: await listLatestImagesForSkus(skus), configured: true });
    }

    if (request.method === 'POST') {
      if (!readWriteToken) {
        return Response.json({ error: 'Blob-Store ist noch nicht mit dem Projekt verknuepft.' }, { status: 503 });
      }

      const formData = await request.formData();
      const file = formData.get('file');
      const sku = normalizeSku(formData.get('sku'));
      const providedHash = sanitizeFragment(formData.get('hash'));
      const productName = sanitizeFragment(formData.get('productName'));

      if (!(file instanceof Blob) || !sku) {
        return Response.json({ error: 'sku und file sind Pflicht.' }, { status: 400 });
      }

      const now = new Date();
      const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
        now.getUTCDate()
      ).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(
        now.getUTCSeconds()
      ).padStart(2, '0')}`;
      const extension = guessExtension(file.type, 'name' in file ? String(file.name) : undefined);
      const hash = providedHash || crypto.randomUUID().slice(0, 12);
      const label = productName ? `-${productName}` : '';
      const pathname = `product-images/${sku}/${stamp}-${hash}${label}.${extension}`;

      const blob = await put(pathname, file, {
        access: 'public',
        addRandomSuffix: false,
        contentType: file.type || undefined
      });

      return Response.json({
        image: {
          sku,
          url: blob.url,
          pathname: blob.pathname,
          fileName: blob.pathname.split('/').slice(-1)[0],
          contentType: file.type || undefined,
          uploadedAt: now.toISOString()
        }
      });
    }

    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'GET, POST'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Zentraler Bildsync fehlgeschlagen.';
    return Response.json({ error: message }, { status: 500 });
  }
}
