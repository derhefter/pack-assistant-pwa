import { db } from './packAssistantDb';
import { hasSeedData, seedBundle } from './seed';
import {
  archiveOrder,
  createOrder,
  getBestProductImage,
  listActiveOrders,
  listArchivedOrders,
  listOrderItems,
  listProductAliases,
  listOrders,
  listProductImages,
  listProducts,
  seedDatabaseIfNeeded,
  toggleOrderItemChecked
} from './repository';

export async function initializeLocalFirstStore() {
  if (!db.isOpen()) {
    await db.open();
  }
  if (hasSeedData()) {
    await seedDatabaseIfNeeded(seedBundle.products, seedBundle.productImages);
  }
  return db;
}

export async function getCatalogSnapshot() {
  const products = await listProducts();
  const productCards = await Promise.all(
    products.map(async (product) => ({
      product,
      image: await getBestProductImage(product.id)
    }))
  );
  return { products, productCards };
}

export async function getOrderWorkspace(orderId: string) {
  const [orderItems, productImages] = await Promise.all([listOrderItems(orderId), listProductImages()]);
  return {
    orderItems,
    productImages
  };
}

export {
  archiveOrder,
  createOrder,
  listActiveOrders,
  listArchivedOrders,
  listOrders,
  listProductAliases,
  listProducts,
  toggleOrderItemChecked
};
