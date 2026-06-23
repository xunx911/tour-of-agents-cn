"use client";

import { useMemo, useState } from "react";
import {
  Anchor,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Fish,
  Gauge,
  MapPin,
  PackageCheck,
  RefreshCw,
  Ship,
  ShoppingBag,
  Snowflake,
  TrendingUp,
  Truck,
  Waves,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  LogisticsStatus,
  Order,
  ProductBatch,
  ProductListItem,
} from "@/lib/fresh/types";

type BatchRow = ProductBatch & { productName: string };

type Dashboard = {
  todayOrders: number;
  lowStockBatches: number;
  averageLossRate: number;
  revenue: number;
};

type FreshCommerceClientProps = {
  initialProducts: ProductListItem[];
  initialBatches: BatchRow[];
  initialOrders: Order[];
  initialDashboard: Dashboard;
};

const statusLabel: Record<LogisticsStatus, string> = {
  PENDING_SHIPMENT: "待发货",
  SHIPPED: "已发货",
  IN_TRANSIT: "冷链运输中",
  DELIVERED: "已送达",
};

const statusProgress: Record<LogisticsStatus, number> = {
  PENDING_SHIPMENT: 18,
  SHIPPED: 42,
  IN_TRANSIT: 72,
  DELIVERED: 100,
};

const formatCurrency = (value: number) => `¥${value.toFixed(1)}`;
const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message ?? payload.error ?? "请求失败");
  }

  return response.json() as Promise<T>;
}

export function FreshCommerceClient({
  initialProducts,
  initialBatches,
  initialOrders,
  initialDashboard,
}: FreshCommerceClientProps) {
  const [products, setProducts] = useState(initialProducts);
  const [batches, setBatches] = useState(initialBatches);
  const [orders, setOrders] = useState(initialOrders);
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [selectedProductId, setSelectedProductId] = useState(initialProducts[0]?.id ?? "");
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrders[0]?.id ?? "");
  const [quantity, setQuantity] = useState(2);
  const [portal, setPortal] = useState<"buyer" | "seller">("buyer");
  const [notice, setNotice] = useState("欢迎来到 OceanFresh，买家端和卖家端共用同一套订单与批次数据。");
  const [busy, setBusy] = useState(false);

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0];
  const selectedBatch = selectedProduct
    ? batches
        .filter((batch) => batch.productId === selectedProduct.id && batch.stockQuantity > 0)
        .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime))[0]
    : null;
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];

  const topBatch = useMemo(
    () => [...batches].sort((a, b) => b.lossRate - a.lossRate)[0],
    [batches],
  );

  async function refreshAll() {
    const [productPayload, batchPayload, orderPayload] = await Promise.all([
      fetchJson<{ items: ProductListItem[] }>("/api/fresh/products"),
      fetchJson<{ items: BatchRow[] }>("/api/fresh/admin/product-batches"),
      fetchJson<{ items: Order[]; dashboard: Dashboard }>("/api/fresh/admin/orders"),
    ]);

    setProducts(productPayload.items);
    setBatches(batchPayload.items);
    setOrders(orderPayload.items);
    setDashboard(orderPayload.dashboard);
    setSelectedOrderId((current) => current || orderPayload.items[0]?.id || "");
  }

  async function createDemoOrder() {
    if (!selectedProduct) return;
    setBusy(true);
    try {
      const order = await fetchJson<Order>("/api/fresh/orders", {
        method: "POST",
        body: JSON.stringify({
          items: [{ productId: selectedProduct.id, quantity }],
          receiverName: "张三",
          receiverPhone: "13800000000",
          receiverAddress: "上海市浦东新区示例路 100 号",
        }),
      });
      setNotice(`订单 ${order.id} 已创建，后端已自动扣减批次库存。`);
      setSelectedOrderId(order.id);
      await refreshAll();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "下单失败");
    } finally {
      setBusy(false);
    }
  }

  async function advanceLogistics() {
    if (!selectedOrder) return;
    const nextStatus: LogisticsStatus =
      selectedOrder.logisticsStatus === "PENDING_SHIPMENT"
        ? "SHIPPED"
        : selectedOrder.logisticsStatus === "SHIPPED"
          ? "IN_TRANSIT"
          : "DELIVERED";

    setBusy(true);
    try {
      const order = await fetchJson<Order>(
        `/api/fresh/admin/orders/${selectedOrder.id}/logistics`,
        {
          method: "PATCH",
          body: JSON.stringify({
            logisticsStatus: nextStatus,
            trackedAt: new Date().toISOString(),
            location:
              nextStatus === "SHIPPED"
                ? "门店仓"
                : nextStatus === "IN_TRANSIT"
                  ? "上海冷链分拨中心"
                  : "用户收货地址",
            note:
              nextStatus === "SHIPPED"
                ? "后台已安排发货"
                : nextStatus === "IN_TRANSIT"
                  ? "订单已进入冷链运输"
                  : "订单已送达，等待后台记录实际损耗",
          }),
        },
      );
      setNotice(`订单 ${order.id} 物流已更新为：${statusLabel[order.logisticsStatus]}。`);
      await refreshAll();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "物流更新失败");
    } finally {
      setBusy(false);
    }
  }

  async function recordLossRate() {
    if (!topBatch) return;
    setBusy(true);
    try {
      const nextLoss = Math.min(topBatch.lossRate + 0.005, 0.12);
      await fetchJson(`/api/fresh/admin/product-batches/${topBatch.id}/loss-rate`, {
        method: "PATCH",
        body: JSON.stringify({
          lossRate: nextLoss,
          note: "送达后根据实际称重更新运输损耗率",
        }),
      });
      setNotice(`${topBatch.batchNo} 实际运输损耗率已更新为 ${formatPercent(nextLoss)}。`);
      await refreshAll();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "损耗率更新失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbfb_0%,#ffffff_42%,#eef7f5_100%)] text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 md:px-8 lg:px-10">
        <header className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <Fish />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">OceanFresh 鲜链到家</p>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                当日海鲜冷链商城
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <Button
                size="sm"
                variant={portal === "buyer" ? "default" : "ghost"}
                onClick={() => setPortal("buyer")}
              >
                <ShoppingBag data-icon="inline-start" />
                买家端
              </Button>
              <Button
                size="sm"
                variant={portal === "seller" ? "default" : "ghost"}
                onClick={() => setPortal("seller")}
              >
                <PackageCheck data-icon="inline-start" />
                卖家端
              </Button>
            </div>
            <Button onClick={refreshAll} variant="outline" disabled={busy}>
              <RefreshCw data-icon="inline-start" />
              刷新数据
            </Button>
          </div>
        </header>

        {portal === "buyer" ? (
        <section className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          <Card className="overflow-hidden border-slate-200 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <CardContent className="grid gap-5 p-4 md:grid-cols-[1fr_0.95fr] md:p-5">
              <div className="relative min-h-[390px] overflow-hidden rounded-lg">
                <img
                  src={selectedProduct?.imageUrl}
                  alt={selectedProduct?.name}
                  className="absolute inset-0 size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 text-white">
                  <div>
                    <h2 className="text-4xl font-semibold tracking-tight">
                      {selectedProduct?.name}
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/80">
                      {selectedProduct?.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <FreshMetric icon={MapPin} label="产地" value={selectedBatch?.origin ?? "待补货"} />
                    <FreshMetric
                      icon={Anchor}
                      label="捕捞"
                      value={selectedBatch ? formatDateTime(selectedBatch.catchTime) : "--"}
                    />
                    <FreshMetric
                      icon={Truck}
                      label="到店"
                      value={selectedBatch ? formatDateTime(selectedBatch.arrivalTime) : "--"}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">今日鲜货</p>
                    <p className="mt-1 text-3xl font-semibold">
                      {formatCurrency(selectedProduct?.salePrice ?? 0)}
                    </p>
                  </div>
                  <Badge
                    variant={selectedProduct?.stockStatus === "IN_STOCK" ? "default" : "secondary"}
                    className="rounded-md"
                  >
                    {selectedProduct?.stockStatus === "IN_STOCK" ? "现货可售" : "暂时无货"}
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      className={`rounded-lg border p-3 text-left transition ${
                        product.id === selectedProduct?.id
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white hover:border-slate-400"
                      }`}
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p
                            className={`mt-1 text-xs ${
                              product.id === selectedProduct?.id
                                ? "text-white/70"
                                : "text-slate-500"
                            }`}
                          >
                            {product.origin ?? "无可售批次"} · {formatCurrency(product.salePrice)}
                          </p>
                        </div>
                        <ArrowRight />
                      </div>
                    </button>
                  ))}
                </div>

                <Separator />

                <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">创建买家订单</p>
                      <p className="text-xs text-slate-500">
                        选择数量后下单，系统自动匹配可售批次。
                      </p>
                    </div>
                    <Input
                      className="w-20 bg-white"
                      min={1}
                      type="number"
                      value={quantity}
                      onChange={(event) => setQuantity(Number(event.target.value))}
                    />
                  </div>
                  <Button
                    onClick={createDemoOrder}
                    disabled={busy || selectedProduct?.stockStatus !== "IN_STOCK"}
                  >
                    <ShoppingBag data-icon="inline-start" />
                    提交订单
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <CardHeader>
              <CardTitle>我的订单</CardTitle>
              <CardDescription>查看配送进度和完整冷链轨迹。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-3">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`rounded-lg border p-4 text-left transition ${
                      order.id === selectedOrder?.id
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{order.id}</p>
                        <p className="mt-1 text-xs opacity-70">
                          {order.items.map((item) => item.productName).join("、")}
                        </p>
                      </div>
                      <Badge variant="secondary" className="rounded-md">
                        {statusLabel[order.logisticsStatus]}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-3">
                <SummaryTile label="订单金额" value={formatCurrency(selectedOrder?.totalAmount ?? 0)} />
                <SummaryTile
                  label="物流状态"
                  value={selectedOrder ? statusLabel[selectedOrder.logisticsStatus] : "--"}
                />
                <SummaryTile label="商品数量" value={String(selectedOrder?.items.length ?? 0)} />
              </div>

              <div className="flex flex-col gap-3">
                {(selectedOrder?.logisticsTracks ?? []).map((track, index) => (
                  <div key={`${track.trackedAt}-${index}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex size-8 items-center justify-center rounded-full bg-slate-950 text-white">
                        <Clock3 />
                      </div>
                      {index < (selectedOrder?.logisticsTracks.length ?? 0) - 1 ? (
                        <div className="h-full min-h-8 w-px bg-slate-200" />
                      ) : null}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium">{statusLabel[track.status]}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDateTime(track.trackedAt)} · {track.location}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{track.note}</p>
                    </div>
                  </div>
                ))}
                {selectedOrder?.logisticsTracks.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-sm text-slate-500">
                    商家发货后，这里会显示完整配送轨迹。
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>
        ) : (
        <section className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <Card className="border-slate-200 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
            <CardHeader>
              <CardTitle className="text-xl">卖家运营中心</CardTitle>
              <CardDescription className="text-slate-300">
                管理商品批次、冷链物流、库存和运输损耗。
              </CardDescription>
              <CardAction>
                <Badge className="rounded-md bg-cyan-300 text-slate-950 hover:bg-cyan-300">
                  Live API
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                <AdminMetric icon={TrendingUp} label="订单数" value={String(dashboard.todayOrders)} />
                <AdminMetric icon={Gauge} label="平均损耗" value={formatPercent(dashboard.averageLossRate)} />
                <AdminMetric icon={PackageCheck} label="低库存批次" value={String(dashboard.lowStockBatches)} />
                <AdminMetric icon={Waves} label="销售额" value={formatCurrency(dashboard.revenue)} />
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">当前订单履约</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedOrder ? `订单 ${selectedOrder.id}` : "暂无订单"}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={advanceLogistics}
                    disabled={busy || !selectedOrder || selectedOrder.logisticsStatus === "DELIVERED"}
                  >
                    <Ship data-icon="inline-start" />
                    推进物流
                  </Button>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  <Progress value={selectedOrder ? statusProgress[selectedOrder.logisticsStatus] : 0} />
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-300">
                      {selectedOrder ? statusLabel[selectedOrder.logisticsStatus] : "--"}
                    </span>
                    <span className="text-slate-400">
                      {selectedOrder?.logisticsTracks.length ?? 0} 条轨迹
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">批次损耗记录</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {topBatch?.batchNo} · {topBatch?.productName}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={recordLossRate} disabled={busy || !topBatch}>
                    <CheckCircle2 data-icon="inline-start" />
                    记录损耗
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-slate-400">库存</p>
                    <p className="mt-1 font-medium">{topBatch?.stockQuantity ?? 0} 份</p>
                  </div>
                  <div>
                    <p className="text-slate-400">进货参考</p>
                    <p className="mt-1 font-medium">
                      {formatCurrency(topBatch?.dailyMarketPrice ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">损耗率</p>
                    <p className="mt-1 font-medium">{formatPercent(topBatch?.lossRate ?? 0)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle>订单处理</CardTitle>
                  <CardDescription>商家查看订单、推进物流，买家端同步看到配送轨迹。</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`rounded-lg border p-4 text-left transition ${
                        order.id === selectedOrder?.id
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white hover:border-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{order.id}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {order.items.map((item) => item.productName).join("、")}
                          </p>
                        </div>
                        <Badge variant="secondary" className="rounded-md">
                          {statusLabel[order.logisticsStatus]}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle>批次管理</CardTitle>
                  <CardDescription>海鲜业务的核心数据：产地、捕捞、到店、库存、进价、损耗。</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {batches.map((batch) => (
                    <div key={batch.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{batch.productName}</p>
                          <p className="mt-1 text-xs text-slate-500">{batch.batchNo}</p>
                        </div>
                        <Badge variant="outline" className="rounded-md">
                          {batch.qualityCheckStatus}
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                        <SummaryTile label="产地" value={batch.origin} compact />
                        <SummaryTile label="库存" value={`${batch.stockQuantity} 份`} compact />
                        <SummaryTile label="参考进价" value={formatCurrency(batch.dailyMarketPrice)} compact />
                        <SummaryTile label="损耗率" value={formatPercent(batch.lossRate)} compact />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
        </section>
        )}

        <footer className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {notice}
        </footer>
      </section>
    </main>
  );
}

function FreshMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/20 bg-slate-950/35 p-3 shadow-sm backdrop-blur">
      <Icon />
      <p className="mt-3 text-xs text-white/70">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function AdminMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <Icon />
      <p className="mt-4 text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "rounded-lg border border-slate-200 bg-slate-50 p-4"}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={compact ? "mt-1 text-sm font-medium" : "mt-1 text-lg font-semibold"}>{value}</p>
    </div>
  );
}
