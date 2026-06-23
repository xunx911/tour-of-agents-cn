import { NextResponse } from "next/server";
import { getFreshStore } from "@/lib/fresh/seed";

export async function POST(request: Request) {
  try {
    const product = getFreshStore().createProduct(await request.json());
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "CREATE_PRODUCT_FAILED", message: String(error) },
      { status: 400 },
    );
  }
}
