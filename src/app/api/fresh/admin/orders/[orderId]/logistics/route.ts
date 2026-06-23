import { NextResponse } from "next/server";
import { getFreshStore } from "@/lib/fresh/seed";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params;
    const order = getFreshStore().updateOrderLogistics(orderId, await request.json());
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: "UPDATE_LOGISTICS_FAILED", message: String(error) },
      { status: 400 },
    );
  }
}
