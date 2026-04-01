export type OrderItemPackingState = 'open' | 'packed';

export interface OrderItemSpeechTarget {
  productName: string;
  quantity: number;
  packed?: boolean;
  isPacked?: boolean;
  status?: OrderItemPackingState | string;
}
