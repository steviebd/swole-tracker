import type { NextRequest } from "next/server";
import { SessionCookie } from "~/lib/session-cookie";
import { addConnection, removeConnection } from "~/lib/sse-broadcast";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await SessionCookie.get(request);

  if (!session || SessionCookie.isExpired(session)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.userId;

  // Create a readable stream for SSE
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer: WritableStreamDefaultWriter<Uint8Array> = writable.getWriter();

  // Store this connection for the user
  addConnection(userId, writer);

  // Send initial connection message
  const encoder = new TextEncoder();
  await writer.write(
    encoder.encode(
      `data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`,
    ),
  );

  // Clean up when connection closes
  request.signal.addEventListener("abort", () => {
    removeConnection(userId, writer);
    void writer.close();
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
