export type QualityCheckStatus = "PENDING" | "PASSED" | "FAILED";
export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK";
export type OrderStatus = "PENDING_SHIPMENT" | "COMPLETED";
export type LogisticsStatus =
  | "PENDING_SHIPMENT"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "DELIVERED";

export type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  description: string;
  salePrice: number;
  isActive: boolean;
  createdAt: string;
};

export type ProductBatch = {
  id: string;
  productId: string;
  batchNo: string;
  origin: string;
  catchTime: string;
  arrivalTime: string;
  stockQuantity: number;
  dailyMarketPrice: number;
  lossRate: number;
  qualityCheckStatus: QualityCheckStatus;
  lossNote?: string;
  createdAt: string;
  updatedAt?: string;
};

export type LogisticsTrack = {
  status: LogisticsStatus;
  trackedAt: string;
  location: string;
  note: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
  batchId: string;
  batchNo: string;
};

export type Order = {
  id: string;
  orderStatus: OrderStatus;
  logisticsStatus: LogisticsStatus;
  totalAmount: number;
  items: OrderItem[];
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  logisticsTracks: LogisticsTrack[];
  createdAt: string;
};

export type ProductInput = Omit<Product, "id" | "createdAt">;
export type ProductBatchInput = Omit<ProductBatch, "id" | "createdAt" | "updatedAt" | "lossNote">;

export type OrderInput = {
  items: Array<{ productId: string; quantity: number }>;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
};

export type ProductListItem = Product & {
  origin: string | null;
  stockStatus: StockStatus;
};

export type ProductDetail = Product & {
  stockStatus: StockStatus;
  recommendedBatch: ProductBatch | null;
};
