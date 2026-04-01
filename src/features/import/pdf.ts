import { ImportError, TextExtractionResult } from '../../lib/import-types';

type PdfTextContentItem = {
  str?: string;
  transform?: number[];
};

function buildLines(items: PdfTextContentItem[]) {
  const positionedItems = items
    .map((item) => ({
      text: item.str?.trim() ?? '',
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0
    }))
    .filter((item) => item.text);

  const rows: Array<{ y: number; items: Array<{ text: string; x: number }> }> = [];
  const rowThreshold = 2;

  for (const item of positionedItems) {
    const row = rows.find((entry) => Math.abs(entry.y - item.y) <= rowThreshold);
    if (row) {
      row.items.push({ text: item.text, x: item.x });
      continue;
    }

    rows.push({
      y: item.y,
      items: [{ text: item.text, x: item.x }]
    });
  }

  return rows
    .sort((left, right) => right.y - left.y)
    .map((row) =>
      row.items
        .sort((left, right) => left.x - right.x)
        .map((item) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);
}

export async function extractTextFromPdf(file: File): Promise<TextExtractionResult> {
  try {
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const data = await file.arrayBuffer();
    const document = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const items = textContent.items as PdfTextContentItem[];
      const text = buildLines(items).join('\n').trim();

      if (text) {
        pages.push(text);
      }
    }

    const text = pages.join('\n');
    if (!text) {
      return {
        text: '',
        warnings: ['PDF enthielt keinen extrahierbaren Text.']
      };
    }

    return { text };
  } catch (error) {
    throw new ImportError(
      'PDF_EXTRACTION_FAILED',
      error instanceof Error ? error.message : 'PDF-Text konnte nicht extrahiert werden.'
    );
  }
}
