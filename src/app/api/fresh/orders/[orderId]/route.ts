import { NextResponse } from "next/server";
import { getFreshStore } from "@/lib/fresh/seed";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const order = getFreshStore().getOrder(orderId);

  if (!order) {
    return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(order);
}
