import path from "node:path";
import { createFreshStore } from "./store";
import { demoBatches, demoProducts } from "./seed-data";

const defaultSqlitePath = () =>
  process.env.VERCEL
    ? "/tmp/fresh-commerce.sqlite"
    : path.join(process.cwd(), ".data", "fresh-commerce.sqlite");

const globalStore = globalThis as typeof globalThis & {
  __freshStore?: ReturnType<typeof createFreshStore>;
};

export function getFreshStore() {
  if (!globalStore.__freshStore) {
    globalStore.__freshStore = createFreshStore(
    { products: demoProducts, batches: demoBatches },
    {
      dbPath: process.env.FRESH_SQLITE_PATH ?? defaultSqlitePath(),
    },
  );

    if (globalStore.__freshStore.listOrders().length === 0) {
      const order = globalStore.__freshStore.createOrder({
        items: [{ productId: "prod_1001", quantity: 2 }],
        receiverName: "张三",
        receiverPhone: "13800000000",
        receiverAddress: "上海市浦东新区示例路 100 号",
      });

      globalStore.__freshStore.updateOrderLogistics(order.id, {
        status: "SHIPPED",
        trackedAt: "2026-06-23T13:00:00+08:00",
        location: "门店仓",
        note: "订单已发货",
      });

      globalStore.__freshStore.updateOrderLogistics(order.id, {
        status: "IN_TRANSIT",
        trackedAt: "2026-06-23T15:00:00+08:00",
        location: "上海冷链分拨中心",
        note: "订单已进入冷链运输",
      });
    }
  }

  return globalStore.__freshStore;
}
