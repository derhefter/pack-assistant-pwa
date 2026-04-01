import Dexie, { type Table } from 'dexie';
import type { ArchiveRecord, Order, OrderItem, Product, ProductImage, ProductAlias } from '../lib/domain';

export class PackAssistantDatabase extends Dexie {
  products!: Table<Product, string>;
  productAliases!: Table<ProductAlias, string>;
  productImages!: Table<ProductImage, string>;
  orders!: Table<Order, string>;
  orderItems!: Table<OrderItem, string>;
  archive!: Table<ArchiveRecord, string>;

  constructor() {
    super('pack-assistant-db');
    this.version(1).stores({
      products: 'id, sku, name, active, updatedAt',
      productAliases: 'id, productId, normalizedAlias, alias, updatedAt',
      productImages: 'id, productId, source, isPrimary, updatedAt',
      orders: 'id, status, source, importedAt, updatedAt',
      orderItems: 'id, orderId, lineNumber, productId, checked, updatedAt',
      archive: 'id, orderId, archivedAt, updatedAt'
    });
  }
}

export const db = new PackAssistantDatabase();
