import { describe, expect, it } from 'vitest';
import { detectImportKind } from '../../src/features/import/fileType';

function buildFile(name: string, type: string, bytes: number[]) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('detectImportKind', () => {
  it('detects pdf by mime type', async () => {
    const file = buildFile('list.txt', 'application/pdf', [37, 80, 68, 70]);
    await expect(detectImportKind(file)).resolves.toBe('pdf');
  });

  it('detects image by magic bytes', async () => {
    const file = buildFile('scan.bin', '', [0xff, 0xd8, 0xff, 0x00]);
    await expect(detectImportKind(file)).resolves.toBe('image');
  });
});
