import { ImportError, TextExtractionResult } from '../../lib/import-types';

export async function extractTextFromImage(file: File): Promise<TextExtractionResult> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('deu+eng', 1, {
      logger: () => undefined
    });
    const result = await worker.recognize(file);
    await worker.terminate();
    return {
      text: result.data.text ?? '',
      warnings: result.data.text ? undefined : ['OCR lieferte keinen Text.']
    };
  } catch (error) {
    throw new ImportError(
      'OCR_EXTRACTION_FAILED',
      error instanceof Error ? error.message : 'OCR konnte nicht ausgeführt werden.'
    );
  }
}
