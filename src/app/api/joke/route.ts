import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // This route is deprecated - using tRPC jokes.getCurrent instead
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Use the tRPC jokes.getCurrent endpoint instead.",
    },
    { status: 410 },
  );
}
