import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createFreshStore } from "./store";
import { demoBatches, demoProducts } from "./seed-data";

describe("fresh ecommerce sqlite store", () => {
  it("persists orders and stock updates across store instances", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "fresh-store-"));
    const dbPath = path.join(directory, "fresh.sqlite");

    try {
      const firstStore = createFreshStore(
        { products: demoProducts, batches: demoBatches },
        { dbPath },
      );
      const product = firstStore.listProducts()[0];
      const beforeBatch = firstStore
        .listBatches()
        .find((batch) => batch.productId === product.id);

      expect(beforeBatch).toBeTruthy();

      const order = firstStore.createOrder({
        items: [{ productId: product.id, quantity: 1 }],
        receiverName: "王五",
        receiverPhone: "13700000000",
        receiverAddress: "上海市徐汇区示例路 300 号",
      });
      const secondStore = createFreshStore(undefined, { dbPath });
      const persistedOrder = secondStore.getOrder(order.id);
      const afterBatch = secondStore.getProductBatch(beforeBatch!.id);

      expect(persistedOrder?.receiverName).toBe("王五");
      expect(afterBatch?.stockQuantity).toBe(beforeBatch!.stockQuantity - 1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
