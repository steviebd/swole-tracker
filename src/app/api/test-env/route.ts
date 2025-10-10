import { env } from "~/env";
import { NextResponse } from "next/server";

export async function GET() {
  // Only allow in development environment
  if (env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "not available in production" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    WORKOS_CLIENT_ID: env.WORKOS_CLIENT_ID ? "SET" : "NOT SET",
    WORKOS_API_KEY: env.WORKOS_API_KEY ? "SET" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  });
}
