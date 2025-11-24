"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function MigratePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const migrateMutation = api.workouts.migrateMasterExercises.useMutation();

  const runMigration = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const migrationResult = await migrateMutation.mutateAsync();
      setResult(migrationResult);

      // Auto-refresh after successful migration
      if (migrationResult.success) {
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Master Exercise Migration
        </h1>

        <div className="mb-6">
          <p className="mb-2 text-gray-600">
            This migration creates master exercise links for existing exercises
            that don't have them yet.
          </p>
          <p className="text-sm text-gray-500">
            This is a one-time migration that will enable the key lift toggle
            functionality to work correctly.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mb-4 rounded border border-green-400 bg-green-100 p-3 text-green-700">
            <h3 className="mb-2 font-semibold">Migration Complete!</h3>
            <ul className="space-y-1 text-sm">
              <li>✅ Success: {result.success ? "Yes" : "No"}</li>
              <li>📝 Created: {result.created || 0} master exercises</li>
              <li>🔗 Linked: {result.linked || 0} exercises</li>
              <li>📊 Total migrated: {result.migrated || 0} exercises</li>
            </ul>
            {result.success && (
              <p className="mt-2 text-sm">
                Redirecting to homepage in 3 seconds...
              </p>
            )}
          </div>
        )}

        <button
          onClick={runMigration}
          disabled={isRunning}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isRunning ? "Running Migration..." : "Run Migration"}
        </button>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
