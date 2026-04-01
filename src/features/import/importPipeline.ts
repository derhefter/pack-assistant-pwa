import {
  CreateOrderDraftInput,
  ImportError,
  ImportKind,
  ParsedOrderDraft,
  TextExtractor
} from '../../lib/import-types';
import { buildImportSource } from './fileType';
import { extractTextFromPdf } from './pdf';
import { extractTextFromImage } from './ocr';
import { parseOrderText } from './parser';

async function extractFromPdf(file: File, pdfExtractor?: TextExtractor) {
  const pdf = pdfExtractor ?? extractTextFromPdf;
  return await pdf(file);
}

async function extractFromImage(file: File, ocrExtractor?: TextExtractor) {
  const ocr = ocrExtractor ?? extractTextFromImage;
  return await ocr(file);
}

async function extractWithFallback(
  file: File,
  sourceKind: ImportKind,
  pdfExtractor?: TextExtractor,
  ocrExtractor?: TextExtractor
) {
  if (sourceKind === 'image') {
    return await extractFromImage(file, ocrExtractor);
  }

  if (sourceKind === 'pdf') {
    return await extractFromPdf(file, pdfExtractor);
  }

  try {
    const pdfResult = await extractFromPdf(file, pdfExtractor);
    if (pdfResult.text.trim()) {
      return pdfResult;
    }
    return await extractFromImage(file, ocrExtractor);
  } catch (pdfError) {
    try {
      return await extractFromImage(file, ocrExtractor);
    } catch {
      throw pdfError;
    }
  }
}

export async function createOrderDraftFromImport(input: CreateOrderDraftInput): Promise<ParsedOrderDraft> {
  const { file } = input;
  const source = await buildImportSource(file);
  const extraction = input.text
    ? { text: input.text }
    : await extractWithFallback(file, source.kind, input.pdfExtractor, input.ocrExtractor);

  const rawText = extraction.text.trim();
  if (!rawText) {
    throw new ImportError('EMPTY_INPUT', 'Aus der Datei konnte kein Text gelesen werden.');
  }

  const parsed = parseOrderText(rawText, file.name.replace(/\.[^.]+$/, '') || 'Neuer Auftrag');
  return {
    ...parsed,
    source,
    rawText,
    warnings: [...parsed.warnings, ...(extraction.warnings ?? [])]
  };
}
