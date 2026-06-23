import type { Metadata } from "next";
import { FreshCommerceClient } from "@/components/fresh/fresh-commerce-client";
import { getFreshStore } from "@/lib/fresh/seed";

export const metadata: Metadata = {
  title: "鲜链 OceanFresh | 生鲜电商微服务实战 Demo",
  description: "用于学习 vibe coding 的生鲜电商微服务完整闭环 Demo。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function FreshCommercePage() {
  const store = getFreshStore();

  return (
    <FreshCommerceClient
      initialProducts={store.listProducts()}
      initialBatches={store.listBatches()}
      initialOrders={store.listOrders()}
      initialDashboard={store.dashboard()}
    />
  );
}
