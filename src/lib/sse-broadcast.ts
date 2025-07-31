// Store active connections for each user
const connections = new Map<string, Set<WritableStreamDefaultWriter<Uint8Array>>>();

export function addConnection(userId: string, writer: WritableStreamDefaultWriter<Uint8Array>) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(writer);
}

export function removeConnection(userId: string, writer: WritableStreamDefaultWriter<Uint8Array>) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    userConnections.delete(writer);
    if (userConnections.size === 0) {
      connections.delete(userId);
    }
  }
}

// Function to broadcast workout updates to a specific user
export async function broadcastWorkoutUpdate(userId: string, workoutData: any) {
  const userConnections = connections.get(userId);
  if (!userConnections || userConnections.size === 0) {
    return; // No active connections for this user
  }

  const encoder = new TextEncoder();
  const message = encoder.encode(`data: ${JSON.stringify({
    type: "workout-updated",
    timestamp: Date.now(),
    workout: workoutData
  })}\n\n`);

  // Send to all connections for this user
  const deadConnections: WritableStreamDefaultWriter<Uint8Array>[] = [];
  
  for (const writer of userConnections) {
    try {
      await writer.write(message);
    } catch (error) {
      // Connection is dead, mark for removal
      deadConnections.push(writer);
    }
  }

  // Clean up dead connections
  deadConnections.forEach(writer => {
    userConnections.delete(writer);
    try {
      writer.close();
    } catch {
      // Ignore errors when closing
    }
  });

  if (userConnections.size === 0) {
    connections.delete(userId);
  }
}
