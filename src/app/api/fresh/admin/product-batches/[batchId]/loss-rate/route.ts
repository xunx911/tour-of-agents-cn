import { NextResponse } from "next/server";
import { getFreshStore } from "@/lib/fresh/seed";

type RouteContext = {
  params: Promise<{ batchId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { batchId } = await context.params;
    const batch = getFreshStore().updateBatchLossRate(batchId, await request.json());
    return NextResponse.json(batch);
  } catch (error) {
    return NextResponse.json(
      { error: "UPDATE_LOSS_RATE_FAILED", message: String(error) },
      { status: 400 },
    );
  }
}
