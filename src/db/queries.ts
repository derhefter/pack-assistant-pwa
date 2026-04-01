import { db } from './packAssistantDb';
import { getBestProductImage, listOrderItems, listProducts } from './repository';

export async function getProductCatalog() {
  const products = await listProducts();
  return Promise.all(
    products.map(async (product) => ({
      product,
      image: await getBestProductImage(product.id)
    }))
  );
}

export async function getOrderDetails(orderId: string) {
  const [order, items] = await Promise.all([db.orders.get(orderId), listOrderItems(orderId)]);
  return { order, items };
}
