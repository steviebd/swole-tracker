"use client";

import { useState, useEffect } from "react";
import { workoutManager, type OfflineWorkoutSession } from "~/lib/mobile-offline-queue";
import { useOnlineStatus } from "~/hooks/use-online-status";

export function OfflineWorkoutManager() {
  const [activeSessions, setActiveSessions] = useState<OfflineWorkoutSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<OfflineWorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const [active, completed] = await Promise.all([
        workoutManager.getActiveSessions(),
        workoutManager.getCompletedSessions(),
      ]);
      setActiveSessions(active);
      setCompletedSessions(completed);
    } catch (error) {
      console.error('Failed to load offline sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      await workoutManager.completeSession(sessionId);
      await loadSessions();
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await workoutManager.deleteSession(sessionId);
      await loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const formatDuration = (startTime: number) => {
    const minutes = Math.floor((Date.now() - startTime) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-sm text-content-secondary">Loading offline sessions...</p>
      </div>
    );
  }

  const hasOfflineData = activeSessions.length > 0 || completedSessions.length > 0;

  if (!hasOfflineData) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <div className="bg-[var(--color-info-muted)] border border-[var(--color-info)]/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-[var(--color-info)]">Active Workout Sessions</h3>
            <span className="text-xs bg-[var(--color-info)]/20 text-[var(--color-info)] px-2 py-1 rounded">
              {activeSessions.length} active
            </span>
          </div>
          
          <div className="space-y-2">
            {activeSessions.map((session) => (
              <div key={session.id} className="bg-surface-primary rounded p-3 border border-interactive-primary">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm">
                      Workout Session
                    </p>
                    <p className="text-xs text-content-secondary">
                      Started: {formatTime(session.startTime)} • Duration: {formatDuration(session.startTime)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCompleteSession(session.id)}
                      className="text-xs bg-[var(--color-success)] text-white px-2 py-1 rounded hover:bg-[var(--color-success)]/80"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="text-xs bg-[var(--color-danger)] text-white px-2 py-1 rounded hover:bg-[var(--color-danger)]/80"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {session.exercises.length > 0 && (
                  <div className="text-xs text-content-secondary">
                    <p>{session.exercises.length} exercises</p>
                    <p>
                      {session.exercises.reduce((total, ex) => 
                        total + ex.sets.filter(set => set.completed).length, 0
                      )} sets completed
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed sessions waiting for sync */}
      {completedSessions.length > 0 && (
        <div className="bg-[var(--color-warning-muted)] border border-[var(--color-warning)]/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-yellow-900">Pending Sync</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {completedSessions.length} pending
              </span>
              {!isOnline && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  Offline
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            {completedSessions.map((session) => (
              <div key={session.id} className="bg-surface-primary rounded p-3 border border-status-warning">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">
                      Completed Workout
                    </p>
                    <p className="text-xs text-content-secondary">
                      Completed: {formatTime(session.lastSaved)}
                    </p>
                    <p className="text-xs text-content-secondary">
                      {session.exercises.length} exercises, {
                        session.exercises.reduce((total, ex) => 
                          total + ex.sets.filter(set => set.completed).length, 0
                        )
                      } sets
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-yellow-600">
                      {isOnline ? 'Syncing...' : 'Will sync when online'}
                    </div>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="mt-1 text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {!isOnline && (
            <div className="mt-3 text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
              These workouts will automatically sync when you're back online.
            </div>
          )}
        </div>
      )}
    </div>
  );
}