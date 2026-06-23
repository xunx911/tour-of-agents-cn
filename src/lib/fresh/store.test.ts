import { describe, expect, it } from "vitest";
import { createFreshStore } from "./store";

describe("fresh ecommerce demo store", () => {
  it("runs the first-stage seafood commerce workflow", () => {
    const store = createFreshStore();

    const product = store.createProduct({
      name: "舟山带鱼",
      category: "海鲜",
      imageUrl: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62",
      description: "来自浙江舟山的冷链带鱼",
      salePrice: 39.9,
      isActive: true,
    });

    const batch = store.createProductBatch({
      productId: product.id,
      batchNo: "BATCH-20260623-001",
      origin: "浙江舟山",
      catchTime: "2026-06-22T04:00:00+08:00",
      arrivalTime: "2026-06-23T09:00:00+08:00",
      stockQuantity: 10,
      dailyMarketPrice: 28.5,
      lossRate: 0.03,
      qualityCheckStatus: "PASSED",
    });

    const detail = store.getProductDetail(product.id);
    expect(detail?.recommendedBatch?.batchNo).toBe(batch.batchNo);

    const order = store.createOrder({
      items: [{ productId: product.id, quantity: 2 }],
      receiverName: "张三",
      receiverPhone: "13800000000",
      receiverAddress: "上海市浦东新区示例路 100 号",
    });

    expect(order.orderStatus).toBe("PENDING_SHIPMENT");
    expect(store.getProductBatch(batch.id)?.stockQuantity).toBe(8);

    store.updateOrderLogistics(order.id, {
      logisticsStatus: "IN_TRANSIT",
      trackedAt: "2026-06-23T15:00:00+08:00",
      location: "上海冷链分拨中心",
      note: "订单已进入冷链运输",
    });

    store.updateBatchLossRate(batch.id, {
      lossRate: 0.035,
      note: "运输过程中部分包装破损，实际损耗率为 3.5%",
    });

    const updatedOrder = store.getOrder(order.id);
    expect(updatedOrder?.logisticsStatus).toBe("IN_TRANSIT");
    expect(updatedOrder?.logisticsTracks).toHaveLength(1);
    expect(store.getProductBatch(batch.id)?.lossRate).toBe(0.035);
  });

  it("rejects orders when stock is insufficient", () => {
    const store = createFreshStore();
    const product = store.createProduct({
      name: "梭子蟹",
      category: "海鲜",
      imageUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b",
      description: "东海冷链梭子蟹",
      salePrice: 59.9,
      isActive: true,
    });

    store.createProductBatch({
      productId: product.id,
      batchNo: "BATCH-20260623-002",
      origin: "浙江舟山",
      catchTime: "2026-06-22T03:30:00+08:00",
      arrivalTime: "2026-06-23T08:00:00+08:00",
      stockQuantity: 1,
      dailyMarketPrice: 42,
      lossRate: 0.02,
      qualityCheckStatus: "PASSED",
    });

    expect(() =>
      store.createOrder({
        items: [{ productId: product.id, quantity: 2 }],
        receiverName: "李四",
        receiverPhone: "13900000000",
        receiverAddress: "上海市黄浦区示例路 200 号",
      }),
    ).toThrow("INSUFFICIENT_STOCK");
  });
});
