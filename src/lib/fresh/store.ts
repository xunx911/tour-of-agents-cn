import type {
  LogisticsStatus,
  LogisticsTrack,
  Order,
  OrderInput,
  Product,
  ProductBatch,
  ProductBatchInput,
  ProductDetail,
  ProductInput,
  ProductListItem,
} from "./types";

const now = () => new Date().toISOString();

const nextId = (prefix: string, count: number) =>
  `${prefix}_${String(count + 1).padStart(4, "0")}`;

const isSellableBatch = (batch: ProductBatch) =>
  batch.stockQuantity > 0 && batch.qualityCheckStatus === "PASSED";

export function createFreshStore(seed?: {
  products?: Product[];
  batches?: ProductBatch[];
  orders?: Order[];
}) {
  const products = [...(seed?.products ?? [])];
  const batches = [...(seed?.batches ?? [])];
  const orders = [...(seed?.orders ?? [])];

  const findRecommendedBatch = (productId: string) =>
    batches
      .filter((batch) => batch.productId === productId && isSellableBatch(batch))
      .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime))[0] ?? null;

  return {
    createProduct(input: ProductInput) {
      const product: Product = {
        ...input,
        id: nextId("prod", products.length),
        createdAt: now(),
      };
      products.push(product);
      return product;
    },

    createProductBatch(input: ProductBatchInput) {
      if (!products.some((product) => product.id === input.productId)) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const batch: ProductBatch = {
        ...input,
        id: nextId("batch", batches.length),
        createdAt: now(),
      };
      batches.push(batch);
      return batch;
    },

    listProducts(): ProductListItem[] {
      return products
        .filter((product) => product.isActive)
        .map((product) => {
          const batch = findRecommendedBatch(product.id);
          const fallbackBatch = batches.find((item) => item.productId === product.id);

          return {
            ...product,
            origin: batch?.origin ?? fallbackBatch?.origin ?? null,
            stockStatus: batch ? "IN_STOCK" : "OUT_OF_STOCK",
          };
        });
    },

    getProductDetail(productId: string): ProductDetail | null {
      const product = products.find((item) => item.id === productId);
      if (!product) return null;

      const recommendedBatch = findRecommendedBatch(productId);
      return {
        ...product,
        stockStatus: recommendedBatch ? "IN_STOCK" : "OUT_OF_STOCK",
        recommendedBatch,
      };
    },

    getProductBatch(batchId: string) {
      return batches.find((batch) => batch.id === batchId) ?? null;
    },

    listBatches() {
      return batches.map((batch) => ({
        ...batch,
        productName:
          products.find((product) => product.id === batch.productId)?.name ?? "未知商品",
      }));
    },

    createOrder(input: OrderInput) {
      const orderItems = input.items.map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");

        const batch = findRecommendedBatch(product.id);
        if (!batch || batch.stockQuantity < item.quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        return { product, batch, quantity: item.quantity };
      });

      orderItems.forEach(({ batch, quantity }) => {
        batch.stockQuantity -= quantity;
      });

      const order: Order = {
        id: nextId("order", orders.length),
        orderStatus: "PENDING_SHIPMENT",
        logisticsStatus: "PENDING_SHIPMENT",
        totalAmount: orderItems.reduce(
          (total, item) => total + item.product.salePrice * item.quantity,
          0,
        ),
        items: orderItems.map(({ product, batch, quantity }) => ({
          productId: product.id,
          productName: product.name,
          quantity,
          salePrice: product.salePrice,
          batchId: batch.id,
          batchNo: batch.batchNo,
        })),
        receiverName: input.receiverName,
        receiverPhone: input.receiverPhone,
        receiverAddress: input.receiverAddress,
        logisticsTracks: [],
        createdAt: now(),
      };

      orders.push(order);
      return order;
    },

    listOrders() {
      return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    getOrder(orderId: string) {
      return orders.find((order) => order.id === orderId) ?? null;
    },

    updateOrderLogistics(
      orderId: string,
      input: LogisticsTrack | (Omit<LogisticsTrack, "status"> & { logisticsStatus: LogisticsStatus }),
    ) {
      const order = orders.find((item) => item.id === orderId);
      if (!order) throw new Error("ORDER_NOT_FOUND");

      const track: LogisticsTrack =
        "logisticsStatus" in input
          ? {
              status: input.logisticsStatus,
              trackedAt: input.trackedAt,
              location: input.location,
              note: input.note,
            }
          : input;

      order.logisticsStatus = track.status;
      if (track.status === "DELIVERED") order.orderStatus = "COMPLETED";
      order.logisticsTracks.push(track);
      return order;
    },

    updateBatchLossRate(batchId: string, input: { lossRate: number; note?: string }) {
      const batch = batches.find((item) => item.id === batchId);
      if (!batch) throw new Error("BATCH_NOT_FOUND");

      batch.lossRate = input.lossRate;
      batch.lossNote = input.note;
      batch.updatedAt = now();
      return batch;
    },

    dashboard() {
      const lowStockBatches = batches.filter((batch) => batch.stockQuantity <= 12);
      const averageLossRate =
        batches.reduce((total, batch) => total + batch.lossRate, 0) /
        Math.max(batches.length, 1);

      return {
        todayOrders: orders.length,
        lowStockBatches: lowStockBatches.length,
        averageLossRate,
        revenue: orders.reduce((total, order) => total + order.totalAmount, 0),
      };
    },
  };
}

export type FreshStore = ReturnType<typeof createFreshStore>;
