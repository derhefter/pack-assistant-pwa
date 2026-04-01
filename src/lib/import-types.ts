export type ImportKind = 'pdf' | 'image' | 'unknown';

export type ImportSource = {
  fileName: string;
  mimeType: string;
  size: number;
  kind: ImportKind;
};

export type ParsedOrderItem = {
  id: string;
  rawText: string;
  name: string;
  quantity: number;
  quantityText: string;
  confidence: number;
};

export type ParsedOrderDraft = {
  title: string;
  source: ImportSource;
  rawText: string;
  items: ParsedOrderItem[];
  warnings: string[];
};

export type ImportErrorCode =
  | 'UNSUPPORTED_FILE'
  | 'PDF_EXTRACTION_FAILED'
  | 'OCR_EXTRACTION_FAILED'
  | 'EMPTY_INPUT'
  | 'PARSE_FAILED';

export class ImportError extends Error {
  code: ImportErrorCode;

  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = 'ImportError';
    this.code = code;
  }
}

export type TextExtractionResult = {
  text: string;
  warnings?: string[];
};

export type TextExtractor = (file: File) => Promise<TextExtractionResult>;

export type CreateOrderDraftInput = {
  file: File;
  text?: string;
  pdfExtractor?: TextExtractor;
  ocrExtractor?: TextExtractor;
};
