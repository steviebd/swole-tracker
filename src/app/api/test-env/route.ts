import { env } from "~/env";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    WORKOS_CLIENT_ID: env.WORKOS_CLIENT_ID ? "SET" : "NOT SET",
    WORKOS_REDIRECT_URI: env.WORKOS_REDIRECT_URI ? "SET" : "NOT SET",
    WORKOS_API_KEY: env.WORKOS_API_KEY ? "SET" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  });
}
