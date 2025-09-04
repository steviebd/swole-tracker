import { type NextApiRequest, type NextApiResponse } from "next";
import { checkDatabaseHealth, dbMonitor } from "~/server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { db } = await import("~/server/db");
    const healthCheck = await checkDatabaseHealth(db);
    
    const response = {
      status: healthCheck.healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: {
        healthy: healthCheck.healthy,
        latency: `${healthCheck.latency}ms`,
        error: healthCheck.error,
      },
      metrics: {
        totalQueries: healthCheck.metrics.totalQueries,
        averageQueryTime: `${Math.round(healthCheck.metrics.averageQueryTime)}ms`,
        slowQueries: healthCheck.metrics.slowQueries,
        errors: healthCheck.metrics.errors,
        uptime: `${Math.round(healthCheck.metrics.uptime / 1000 / 60)}m`,
        connectionPool: {
          active: healthCheck.metrics.activeConnections,
          total: healthCheck.metrics.totalConnections,
          utilization: healthCheck.metrics.totalConnections > 0 
            ? `${Math.round((healthCheck.metrics.activeConnections / healthCheck.metrics.totalConnections) * 100)}%`
            : "0%",
        },
      },
      performance: {
        slowQueryThreshold: "1000ms",
        slowQueryRate: healthCheck.metrics.totalQueries > 0 
          ? `${Math.round((healthCheck.metrics.slowQueries / healthCheck.metrics.totalQueries) * 100)}%`
          : "0%",
        errorRate: healthCheck.metrics.totalQueries > 0 
          ? `${Math.round((healthCheck.metrics.errors / healthCheck.metrics.totalQueries) * 100)}%`
          : "0%",
      },
    };

    const statusCode = healthCheck.healthy ? 200 : 503;
    return res.status(statusCode).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}