function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

async function loadImageBitmap(file: File) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }

  const image = new Image();
  image.decoding = 'async';
  image.src = await readFileAsDataUrl(file);
  await image.decode();
  return image;
}

export async function prepareCapturedImage(file: File) {
  if (typeof document === 'undefined') {
    return {
      dataUrl: await readFileAsDataUrl(file),
      width: undefined,
      height: undefined,
      mimeType: file.type || 'image/jpeg'
    };
  }

  try {
    const bitmap = await loadImageBitmap(file);
    const width = 'width' in bitmap ? bitmap.width : 0;
    const height = 'height' in bitmap ? bitmap.height : 0;
    const maxDimension = 1280;
    const ratio = width > 0 && height > 0 ? Math.min(1, maxDimension / Math.max(width, height)) : 1;
    const targetWidth = Math.max(1, Math.round(width * ratio));
    const targetHeight = Math.max(1, Math.round(height * ratio));
    const canvas = document.createElement('canvas');

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas konnte nicht erstellt werden.');
    }

    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    if ('close' in bitmap && typeof bitmap.close === 'function') {
      bitmap.close();
    }

    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return {
      dataUrl: canvas.toDataURL(mimeType, mimeType === 'image/png' ? undefined : 0.82),
      width: targetWidth,
      height: targetHeight,
      mimeType
    };
  } catch {
    return {
      dataUrl: await readFileAsDataUrl(file),
      width: undefined,
      height: undefined,
      mimeType: file.type || 'image/jpeg'
    };
  }
}
