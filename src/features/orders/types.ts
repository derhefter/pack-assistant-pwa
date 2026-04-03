export type ImportMode = 'pdf' | 'photo';

export type OrderItemCard = {
  id: string;
  orderItemId: string;
  productId?: string;
  sku?: string;
  unit?: string;
  name: string;
  quantity: number;
  packed: boolean;
  imageUrl: string;
  imageAlt: string;
  imageSource: 'manual' | 'local-seed' | 'researched' | 'placeholder';
  confidence?: number;
  speechText: string;
};

export type OrderRecord = {
  id: string;
  title: string;
  sourceLabel: string;
  createdAt: string;
  archivedAt?: string;
  status?: 'active' | 'archived';
  items: OrderItemCard[];
};
