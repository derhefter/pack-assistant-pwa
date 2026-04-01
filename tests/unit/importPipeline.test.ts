import { describe, expect, it, vi } from 'vitest';
import { createOrderDraftFromImport } from '../../src/features/import/importPipeline';

describe('createOrderDraftFromImport', () => {
  it('uses injected text when provided', async () => {
    const file = new File(['ignored'], 'auftrag.pdf', { type: 'application/pdf' });
    const draft = await createOrderDraftFromImport({
      file,
      text: '2 x Milch\nButter'
    });

    expect(draft.items).toHaveLength(2);
    expect(draft.source.kind).toBe('pdf');
  });

  it('falls back from pdf to ocr when the type is unknown', async () => {
    const file = new File(['ignored'], 'scan.bin', { type: '' });
    const pdfExtractor = vi.fn().mockRejectedValue(new Error('pdf failed'));
    const ocrExtractor = vi.fn().mockResolvedValue({ text: '1 x Wasser' });

    const draft = await createOrderDraftFromImport({ file, pdfExtractor, ocrExtractor });
    expect(pdfExtractor).toHaveBeenCalledOnce();
    expect(ocrExtractor).toHaveBeenCalledOnce();
    expect(draft.items[0]).toMatchObject({ name: 'Wasser', quantity: 1 });
  });

  it('hardens Halloren OCR image items against garbled lines', async () => {
    const file = new File(['ignored'], 'halloren.jpeg', { type: 'image/jpeg' });
    const ocrExtractor = vi.fn().mockResolvedValue({
      text: `GE. RE Thins Pistazie - 150g Be ge il ; 1
Halloren Chocolate Thins Karamell - 150g
Beutel
2
eu 3 = N os ath ni H en AA`
    });

    const draft = await createOrderDraftFromImport({ file, ocrExtractor });

    expect(draft.items).toHaveLength(2);
    expect(draft.items[0]).toMatchObject({
      name: 'Halloren Chocolate Thins Pistazie',
      sku: '48286'
    });
    expect(draft.items[1]).toMatchObject({
      name: 'Halloren Chocolate Thins Karamell',
      sku: '46862',
      quantity: 2
    });
  });
});
