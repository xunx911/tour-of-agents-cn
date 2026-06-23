import { createFreshStore } from "./store";

export const demoProducts = [
  {
    id: "prod_1001",
    name: "舟山带鱼",
    category: "海鲜",
    imageUrl:
      "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=1200&q=80",
    description: "浙江舟山近海捕捞，冷链入仓，肉质细嫩，适合清蒸和香煎。",
    salePrice: 39.9,
    isActive: true,
    createdAt: "2026-06-23T10:00:00+08:00",
  },
  {
    id: "prod_1002",
    name: "东海梭子蟹",
    category: "海鲜",
    imageUrl:
      "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1200&q=80",
    description: "东海冷链梭子蟹，适合清蒸，后台按批次追踪损耗和质检。",
    salePrice: 59.9,
    isActive: true,
    createdAt: "2026-06-23T10:05:00+08:00",
  },
  {
    id: "prod_1003",
    name: "青岛蛤蜊",
    category: "海鲜",
    imageUrl:
      "https://images.unsplash.com/photo-1606851091851-e8c8c0fca5ba?auto=format&fit=crop&w=1200&q=80",
    description: "青岛近岸捕捞，适合爆炒和煮汤，目前批次待补货。",
    salePrice: 19.9,
    isActive: true,
    createdAt: "2026-06-23T10:10:00+08:00",
  },
];

export const demoBatches = [
  {
    id: "batch_2001",
    productId: "prod_1001",
    batchNo: "BATCH-20260623-001",
    origin: "浙江舟山",
    catchTime: "2026-06-22T04:00:00+08:00",
    arrivalTime: "2026-06-23T09:00:00+08:00",
    stockQuantity: 36,
    dailyMarketPrice: 28.5,
    lossRate: 0.03,
    qualityCheckStatus: "PASSED" as const,
    createdAt: "2026-06-23T10:30:00+08:00",
  },
  {
    id: "batch_2002",
    productId: "prod_1002",
    batchNo: "BATCH-20260623-002",
    origin: "浙江舟山",
    catchTime: "2026-06-22T03:30:00+08:00",
    arrivalTime: "2026-06-23T08:00:00+08:00",
    stockQuantity: 8,
    dailyMarketPrice: 42,
    lossRate: 0.02,
    qualityCheckStatus: "PASSED" as const,
    createdAt: "2026-06-23T10:35:00+08:00",
  },
  {
    id: "batch_2003",
    productId: "prod_1003",
    batchNo: "BATCH-20260622-003",
    origin: "山东青岛",
    catchTime: "2026-06-21T05:20:00+08:00",
    arrivalTime: "2026-06-22T07:30:00+08:00",
    stockQuantity: 0,
    dailyMarketPrice: 12.8,
    lossRate: 0.06,
    qualityCheckStatus: "PASSED" as const,
    createdAt: "2026-06-22T11:30:00+08:00",
  },
];

export function createSeededFreshStore() {
  const store = createFreshStore({
    products: demoProducts,
    batches: demoBatches,
  });

  const order = store.createOrder({
    items: [{ productId: "prod_1001", quantity: 2 }],
    receiverName: "张三",
    receiverPhone: "13800000000",
    receiverAddress: "上海市浦东新区示例路 100 号",
  });

  store.updateOrderLogistics(order.id, {
    status: "SHIPPED",
    trackedAt: "2026-06-23T13:00:00+08:00",
    location: "门店仓",
    note: "订单已发货",
  });

  store.updateOrderLogistics(order.id, {
    status: "IN_TRANSIT",
    trackedAt: "2026-06-23T15:00:00+08:00",
    location: "上海冷链分拨中心",
    note: "订单已进入冷链运输",
  });

  return store;
}

const globalStore = globalThis as typeof globalThis & {
  __freshStore?: ReturnType<typeof createSeededFreshStore>;
};

export function getFreshStore() {
  globalStore.__freshStore ??= createSeededFreshStore();
  return globalStore.__freshStore;
}
