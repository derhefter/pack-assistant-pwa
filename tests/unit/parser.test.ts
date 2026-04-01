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

  it('keeps Halloren table rows and ignores detail lines', () => {
    const result = parseOrderText(`1 48286 Halloren Chocolate Thins Pistazie - 150g
Beutel
0.15 Kilogramm (28,60 eur / 1 Kilogramm)
1
2 46862 Halloren Chocolate Thins Karamell - 150g Beutel 2
Gewaehlte Zahlungsart: PayPal`);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      sku: '48286',
      name: 'Halloren Chocolate Thins Pistazie - 150g',
      quantity: 1,
      unit: 'Beutel'
    });
    expect(result.items[1]).toMatchObject({
      sku: '46862',
      name: 'Halloren Chocolate Thins Karamell - 150g',
      quantity: 2,
      unit: 'Beutel'
    });
  });
});
