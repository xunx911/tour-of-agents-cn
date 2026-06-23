import { NextResponse } from "next/server";
import { getFreshStore } from "@/lib/fresh/seed";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const product = getFreshStore().getProductDetail(productId);

  if (!product) {
    return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(product);
}
