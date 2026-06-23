import { NextResponse } from "next/server";
import { getFreshStore } from "@/lib/fresh/seed";

export async function POST(request: Request) {
  try {
    const order = getFreshStore().createOrder(await request.json());
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "INSUFFICIENT_STOCK" ? 409 : 400;
    return NextResponse.json({ error: message, message: "库存不足，请减少购买数量" }, { status });
  }
}
