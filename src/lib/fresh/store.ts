import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
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
  QualityCheckStatus,
} from "./types";

const now = () => new Date().toISOString();

const nextId = (prefix: string, count: number) =>
  `${prefix}_${String(count + 1).padStart(4, "0")}`;

const isSellableBatch = (batch: ProductBatch) =>
  batch.stockQuantity > 0 && batch.qualityCheckStatus === "PASSED";

type StoreSeed = {
  products?: Product[];
  batches?: ProductBatch[];
  orders?: Order[];
};

type StoreOptions = {
  dbPath?: string;
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  image_url: string;
  description: string;
  sale_price: number;
  is_active: number;
  created_at: string;
};

type ProductBatchRow = {
  id: string;
  product_id: string;
  batch_no: string;
  origin: string;
  catch_time: string;
  arrival_time: string;
  stock_quantity: number;
  daily_market_price: number;
  loss_rate: number;
  quality_check_status: QualityCheckStatus;
  loss_note: string | null;
  created_at: string;
  updated_at: string | null;
};

type OrderRow = {
  id: string;
  order_status: Order["orderStatus"];
  logistics_status: LogisticsStatus;
  total_amount: number;
  items_json: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  logistics_tracks_json: string;
  created_at: string;
};

function openDatabase(dbPath?: string) {
  if (dbPath && dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath ?? ":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT NOT NULL,
      sale_price REAL NOT NULL,
      is_active INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_batches (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      batch_no TEXT NOT NULL,
      origin TEXT NOT NULL,
      catch_time TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      stock_quantity INTEGER NOT NULL,
      daily_market_price REAL NOT NULL,
      loss_rate REAL NOT NULL,
      quality_check_status TEXT NOT NULL,
      loss_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_status TEXT NOT NULL,
      logistics_status TEXT NOT NULL,
      total_amount REAL NOT NULL,
      items_json TEXT NOT NULL,
      receiver_name TEXT NOT NULL,
      receiver_phone TEXT NOT NULL,
      receiver_address TEXT NOT NULL,
      logistics_tracks_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

function productFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    imageUrl: row.image_url,
    description: row.description,
    salePrice: row.sale_price,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

function batchFromRow(row: ProductBatchRow): ProductBatch {
  return {
    id: row.id,
    productId: row.product_id,
    batchNo: row.batch_no,
    origin: row.origin,
    catchTime: row.catch_time,
    arrivalTime: row.arrival_time,
    stockQuantity: row.stock_quantity,
    dailyMarketPrice: row.daily_market_price,
    lossRate: row.loss_rate,
    qualityCheckStatus: row.quality_check_status,
    lossNote: row.loss_note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

function orderFromRow(row: OrderRow): Order {
  return {
    id: row.id,
    orderStatus: row.order_status,
    logisticsStatus: row.logistics_status,
    totalAmount: row.total_amount,
    items: JSON.parse(row.items_json),
    receiverName: row.receiver_name,
    receiverPhone: row.receiver_phone,
    receiverAddress: row.receiver_address,
    logisticsTracks: JSON.parse(row.logistics_tracks_json),
    createdAt: row.created_at,
  };
}

export function createFreshStore(seed?: StoreSeed, options: StoreOptions = {}) {
  const db = openDatabase(options.dbPath);

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (
      id, name, category, image_url, description, sale_price, is_active, created_at
    ) VALUES (
      @id, @name, @category, @imageUrl, @description, @salePrice, @isActive, @createdAt
    )
  `);
  const insertBatch = db.prepare(`
    INSERT OR IGNORE INTO product_batches (
      id, product_id, batch_no, origin, catch_time, arrival_time, stock_quantity,
      daily_market_price, loss_rate, quality_check_status, loss_note, created_at, updated_at
    ) VALUES (
      @id, @productId, @batchNo, @origin, @catchTime, @arrivalTime, @stockQuantity,
      @dailyMarketPrice, @lossRate, @qualityCheckStatus, @lossNote, @createdAt, @updatedAt
    )
  `);
  const insertOrder = db.prepare(`
    INSERT OR IGNORE INTO orders (
      id, order_status, logistics_status, total_amount, items_json,
      receiver_name, receiver_phone, receiver_address, logistics_tracks_json, created_at
    ) VALUES (
      @id, @orderStatus, @logisticsStatus, @totalAmount, @itemsJson,
      @receiverName, @receiverPhone, @receiverAddress, @logisticsTracksJson, @createdAt
    )
  `);

  const getProductRow = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .pluck(false) as Database.Statement<[string], ProductRow>;
  const getBatchRow = db
    .prepare("SELECT * FROM product_batches WHERE id = ?")
    .pluck(false) as Database.Statement<[string], ProductBatchRow>;
  const listProductRows = db
    .prepare("SELECT * FROM products ORDER BY created_at ASC")
    .pluck(false) as Database.Statement<[], ProductRow>;
  const listBatchRows = db
    .prepare("SELECT * FROM product_batches ORDER BY created_at ASC")
    .pluck(false) as Database.Statement<[], ProductBatchRow>;

  const productCount = () =>
    (db.prepare("SELECT COUNT(*) AS count FROM products").get() as { count: number }).count;
  const batchCount = () =>
    (db.prepare("SELECT COUNT(*) AS count FROM product_batches").get() as { count: number }).count;
  const orderCount = () =>
    (db.prepare("SELECT COUNT(*) AS count FROM orders").get() as { count: number }).count;

  const seedDatabase = db.transaction((input: StoreSeed) => {
    input.products?.forEach((product) =>
      insertProduct.run({ ...product, isActive: product.isActive ? 1 : 0 }),
    );
    input.batches?.forEach((batch) =>
      insertBatch.run({
        ...batch,
        lossNote: batch.lossNote ?? null,
        updatedAt: batch.updatedAt ?? null,
      }),
    );
    input.orders?.forEach((order) =>
      insertOrder.run({
        ...order,
        itemsJson: JSON.stringify(order.items),
        logisticsTracksJson: JSON.stringify(order.logisticsTracks),
      }),
    );
  });

  if (seed && productCount() === 0 && batchCount() === 0 && orderCount() === 0) {
    seedDatabase(seed);
  }

  const allProducts = () => listProductRows.all().map(productFromRow);
  const allBatches = () => listBatchRows.all().map(batchFromRow);

  const findRecommendedBatch = (productId: string) =>
    allBatches()
      .filter((batch) => batch.productId === productId && isSellableBatch(batch))
      .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime))[0] ?? null;

  return {
    createProduct(input: ProductInput) {
      const product: Product = {
        ...input,
        id: nextId("prod", productCount()),
        createdAt: now(),
      };
      insertProduct.run({ ...product, isActive: product.isActive ? 1 : 0 });
      return product;
    },

    createProductBatch(input: ProductBatchInput) {
      if (!getProductRow.get(input.productId)) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const batch: ProductBatch = {
        ...input,
        id: nextId("batch", batchCount()),
        createdAt: now(),
      };
      insertBatch.run({
        ...batch,
        lossNote: null,
        updatedAt: null,
      });
      return batch;
    },

    listProducts(): ProductListItem[] {
      return allProducts()
        .filter((product) => product.isActive)
        .map((product) => {
          const batch = findRecommendedBatch(product.id);
          const fallbackBatch = allBatches().find((item) => item.productId === product.id);

          return {
            ...product,
            origin: batch?.origin ?? fallbackBatch?.origin ?? null,
            stockStatus: batch ? "IN_STOCK" : "OUT_OF_STOCK",
          };
        });
    },

    getProductDetail(productId: string): ProductDetail | null {
      const row = getProductRow.get(productId);
      if (!row) return null;

      const product = productFromRow(row);
      const recommendedBatch = findRecommendedBatch(productId);
      return {
        ...product,
        stockStatus: recommendedBatch ? "IN_STOCK" : "OUT_OF_STOCK",
        recommendedBatch,
      };
    },

    getProductBatch(batchId: string) {
      const row = getBatchRow.get(batchId);
      return row ? batchFromRow(row) : null;
    },

    listBatches() {
      const products = allProducts();
      return allBatches().map((batch) => ({
        ...batch,
        productName:
          products.find((product) => product.id === batch.productId)?.name ?? "未知商品",
      }));
    },

    createOrder(input: OrderInput) {
      return db.transaction(() => {
        const orderItems = input.items.map((item) => {
          const productRow = getProductRow.get(item.productId);
          const product = productRow ? productFromRow(productRow) : null;
          if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");

          const batch = findRecommendedBatch(product.id);
          if (!batch || batch.stockQuantity < item.quantity) {
            throw new Error("INSUFFICIENT_STOCK");
          }

          return { product, batch, quantity: item.quantity };
        });

        const updateStock = db.prepare(
          "UPDATE product_batches SET stock_quantity = stock_quantity - ? WHERE id = ?",
        );
        orderItems.forEach(({ batch, quantity }) => {
          updateStock.run(quantity, batch.id);
        });

        const order: Order = {
          id: nextId("order", orderCount()),
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

        insertOrder.run({
          ...order,
          itemsJson: JSON.stringify(order.items),
          logisticsTracksJson: JSON.stringify(order.logisticsTracks),
        });
        return order;
      })();
    },

    listOrders() {
      return (
        db
          .prepare("SELECT * FROM orders ORDER BY created_at DESC")
          .all() as OrderRow[]
      ).map(orderFromRow);
    },

    getOrder(orderId: string) {
      const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as
        | OrderRow
        | undefined;
      return row ? orderFromRow(row) : null;
    },

    updateOrderLogistics(
      orderId: string,
      input: LogisticsTrack | (Omit<LogisticsTrack, "status"> & { logisticsStatus: LogisticsStatus }),
    ) {
      const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as
        | OrderRow
        | undefined;
      if (!row) throw new Error("ORDER_NOT_FOUND");

      const order = orderFromRow(row);
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

      db.prepare(`
        UPDATE orders
        SET order_status = ?, logistics_status = ?, logistics_tracks_json = ?
        WHERE id = ?
      `).run(
        order.orderStatus,
        order.logisticsStatus,
        JSON.stringify(order.logisticsTracks),
        order.id,
      );
      return order;
    },

    updateBatchLossRate(batchId: string, input: { lossRate: number; note?: string }) {
      const row = getBatchRow.get(batchId);
      if (!row) throw new Error("BATCH_NOT_FOUND");

      const updatedAt = now();
      db.prepare(`
        UPDATE product_batches
        SET loss_rate = ?, loss_note = ?, updated_at = ?
        WHERE id = ?
      `).run(input.lossRate, input.note ?? null, updatedAt, batchId);

      return {
        ...batchFromRow(row),
        lossRate: input.lossRate,
        lossNote: input.note,
        updatedAt,
      };
    },

    dashboard() {
      const batches = allBatches();
      const orders = this.listOrders();
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
