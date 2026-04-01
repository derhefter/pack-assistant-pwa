import { describe, expect, it } from 'vitest';
import { parseOrderText } from '../../src/features/import/parser';

describe('parseOrderText', () => {
  it('parses quantities and names from simple lines', () => {
    const result = parseOrderText('3 mal Halloren Kugeln\nSchoko Brezeln');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      quantity: 3,
      name: 'Halloren Kugeln'
    });
    expect(result.items[1]).toMatchObject({
      quantity: 1,
      name: 'Schoko Brezeln'
    });
  });
});
