import { db } from "~/server/db";
import { webhookEvents } from "~/server/db/schema";
import { desc } from "drizzle-orm";
import { type Metadata } from "next";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

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
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Australia/Sydney'
  }).format(date);
}

function getStatusBadge(status: string) {
  const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
  switch (status) {
    case 'processed':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'failed':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'ignored':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'received':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
}

export default async function WebhookDebugPage() {
  const events = await db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.createdAt))
    .limit(50) as WebhookEvent[];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Webhook Debug Dashboard</h1>
        <p className="text-gray-400">Last 50 webhook events received from external providers</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No webhook events found</h2>
          <p className="text-gray-400 mb-4">
            No webhook events have been received yet. Make sure your webhook URL is configured correctly in the Whoop Developer Dashboard.
          </p>
          <div className="text-sm text-gray-500">
            <p><strong>Webhook URL:</strong> https://your-domain.com/api/webhooks/whoop</p>
            <p><strong>Expected Events:</strong> workout.updated</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-semibold text-blue-400">
                    {event.provider}.{event.eventType}
                  </span>
                  <span className={getStatusBadge(event.status)}>
                    {event.status}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <div>ID: {event.id}</div>
                  <div>{formatDate(event.createdAt)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">External User ID</h4>
                  <p className="text-sm text-gray-100">{event.externalUserId || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Entity ID</h4>
                  <p className="text-sm text-gray-100">{event.externalEntityId || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Processing Time</h4>
                  <p className="text-sm text-gray-100">
                    {event.processingTime ? `${event.processingTime}ms` : 'N/A'}
                  </p>
                </div>
              </div>

              {event.error && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-red-300 mb-1">Error</h4>
                  <p className="text-sm text-red-200 bg-red-900/20 p-2 rounded">{event.error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Payload</h4>
                  <pre className="text-xs bg-gray-900 p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Headers</h4>
                  <pre className="text-xs bg-gray-900 p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(event.headers, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting Guide</h2>
        <div className="space-y-3 text-sm">
          <div>
            <strong className="text-green-400">✅ processed:</strong> Webhook received and workout data updated successfully
          </div>
          <div>
            <strong className="text-yellow-400">⚠️ ignored:</strong> Webhook received but event type not processed (only workout.updated is processed)
          </div>
          <div>
            <strong className="text-red-400">❌ failed:</strong> Webhook received but processing failed - check error message
          </div>
          <div>
            <strong className="text-blue-400">🔄 received:</strong> Webhook received but processing not completed yet
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            If you're not seeing any events, verify your webhook URL is configured in the Whoop Developer Dashboard 
            and that you've triggered a workout update in your Whoop app.
          </p>
        </div>
      </div>
    </div>
  );
}
