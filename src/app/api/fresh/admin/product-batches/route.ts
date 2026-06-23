import { NextResponse } from "next/server";
import { getFreshStore } from "@/lib/fresh/seed";

export async function GET() {
  return NextResponse.json({ items: getFreshStore().listBatches() });
}

export async function POST(request: Request) {
  try {
    const batch = getFreshStore().createProductBatch(await request.json());
    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "CREATE_BATCH_FAILED", message: String(error) },
      { status: 400 },
    );
  }
}
