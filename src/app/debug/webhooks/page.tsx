import { db } from "~/server/db";
import { webhookEvents } from "~/server/db/schema";
import { desc } from "drizzle-orm";
import { type Metadata } from "next";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Webhook Debug - Swole Tracker",
  description: "Debug webhook events",
};

interface WebhookEvent {
  id: number;
  provider: string;
  eventType: string;
  userId: string | null;
  externalUserId: string | null;
  externalEntityId: string | null;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  status: string;
  error: string | null;
  processingTime: number | null;
  createdAt: Date;
  processedAt: Date | null;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(date);
}

function getStatusBadge(status: string) {
  const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
  switch (status) {
    case "processed":
      return `${baseClasses} text-white` + " " + "bg-[color:var(--color-success)]";
    case "failed":
      return `${baseClasses} text-white` + " " + "bg-[color:var(--color-danger)]";
    case "ignored":
      return `${baseClasses} text-white` + " " + "bg-[color:var(--color-warning)]";
    case "received":
      return `${baseClasses} text-white` + " " + "bg-[color:var(--color-info)]";
    default:
      return `${baseClasses}` + " " + "bg-[color:var(--color-text-muted)] text-white";
  }
}

export default async function WebhookDebugPage() {
  const events = (await db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.createdAt))
    .limit(50)) as WebhookEvent[];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">Webhook Debug Dashboard</h1>
        <p className="text-muted">
          Last 50 webhook events received from external providers
        </p>
      </div>

      {events.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold">
            No webhook events found
          </h2>
          <p className="mb-4 text-muted">
            No webhook events have been received yet. Make sure your webhook URL
            is configured correctly in the Whoop Developer Dashboard.
          </p>
          <div className="text-sm text-muted">
            <p>
              <strong>Webhook URL:</strong>{" "}
              https://your-domain.com/api/webhooks/whoop
            </p>
            <p>
              <strong>Expected Events:</strong> workout.updated
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="card p-6"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-semibold" style={{color: "var(--color-primary)"}}>
                    {event.provider}.{event.eventType}
                  </span>
                  <span className={getStatusBadge(event.status)}>
                    {event.status}
                  </span>
                </div>
                <div className="text-right text-sm text-muted">
                  <div>ID: {event.id}</div>
                  <div>{formatDate(event.createdAt)}</div>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <h4 className="mb-1 text-sm font-medium text-secondary">
                    External User ID
                  </h4>
                  <p className="text-sm">
                    {event.externalUserId ?? "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-medium text-secondary">
                    Entity ID
                  </h4>
                  <p className="text-sm">
                    {event.externalEntityId ?? "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-medium text-secondary">
                    Processing Time
                  </h4>
                  <p className="text-sm">
                    {event.processingTime ? `${event.processingTime}ms` : "N/A"}
                  </p>
                </div>
              </div>

              {event.error && (
                <div className="mb-4">
                  <h4 className="mb-1 text-sm font-medium" style={{color: "var(--color-danger)"}}>
                    Error
                  </h4>
                  <p className="rounded p-2 text-sm text-white" style={{backgroundColor: "color-mix(in oklab, var(--color-danger) 20%, transparent)"}}>
                    {event.error}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-300">
                    Payload
                  </h4>
                  <pre className="max-h-40 overflow-auto rounded p-3 text-xs" style={{backgroundColor: "var(--color-bg-surface)"}}>
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-300">
                    Headers
                  </h4>
                  <pre className="max-h-40 overflow-auto rounded p-3 text-xs" style={{backgroundColor: "var(--color-bg-surface)"}}>
                    {JSON.stringify(event.headers, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 card p-6">
        <h2 className="mb-4 text-xl font-semibold">Troubleshooting Guide</h2>
        <div className="space-y-3 text-sm">
          <div>
            <strong style={{color: "var(--color-success)"}}>✅ processed:</strong> Webhook
            received and workout data updated successfully
          </div>
          <div>
            <strong style={{color: "var(--color-warning)"}}>⚠️ ignored:</strong> Webhook
            received but event type not processed (only workout.updated is
            processed)
          </div>
          <div>
            <strong style={{color: "var(--color-danger)"}}>❌ failed:</strong> Webhook
            received but processing failed - check error message
          </div>
          <div>
            <strong style={{color: "var(--color-info)"}}>🔄 received:</strong> Webhook
            received but processing not completed yet
          </div>
        </div>

        <div className="mt-4 border-t pt-4" style={{borderColor: "var(--color-border)"}}>
          <p className="text-sm text-muted">
            If you're not seeing any events, verify your webhook URL is
            configured in the Whoop Developer Dashboard and that you've
            triggered a workout update in your Whoop app.
          </p>
        </div>
      </div>
    </div>
  );
}
