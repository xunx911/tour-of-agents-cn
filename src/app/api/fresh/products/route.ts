import { NextResponse } from "next/server";
import { getFreshStore } from "@/lib/fresh/seed";

export async function GET() {
  return NextResponse.json({ items: getFreshStore().listProducts() });
}
