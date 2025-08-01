import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { addConnection, removeConnection } from "~/lib/sse-broadcast";

export async function GET(request: NextRequest) {
  const user = await currentUser();
  
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = user.id;

  // Create a readable stream for SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Store this connection for the user
  addConnection(userId, writer);

  // Send initial connection message
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`));

  // Clean up when connection closes
  request.signal.addEventListener("abort", () => {
    removeConnection(userId, writer);
    writer.close();
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}


