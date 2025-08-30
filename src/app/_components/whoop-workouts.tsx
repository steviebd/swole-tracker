"use client";

import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Card } from "~/app/_components/ui/Card";
import { useApiMutation } from "~/hooks/useApiMutation";

interface WhoopWorkout {
  _id: string;
  whoopWorkoutId: string | number;
  start: number;
  end: number;
  timezoneOffset?: string;
  sportName?: string;
  scoreState?: "SCORED" | "PENDING_SCORE" | "UNSCORABLE" | string;
  score?: {
    strain: number;
    averageHeartRate: number;
    maxHeartRate: number;
    kilojoule: number;
    percentInZoneOne: number;
    percentInZoneTwo: number;
    percentInZoneThree: number;
    percentInZoneFour: number;
    percentInZoneFive: number;
  };
  during?: {
    averageHeartRate: number;
    maxHeartRate: number;
    kilojoule: number;
  };
  zoneDuration?: {
    zoneZeroMilli: number;
    zoneOneMilli: number;
    zoneTwoMilli: number;
    zoneThreeMilli: number;
    zoneFourMilli: number;
    zoneFiveMilli: number;
  };
  _creationTime: number;
  updatedAt?: number;
}

interface WhoopIntegrationStatus {
  isConnected: boolean;
  connectedAt: number | null;
  expiresAt: number | null | undefined;
  isExpired: boolean;
  scope: string | null | undefined;
}

export function WhoopWorkouts() {
  const integrationStatus: WhoopIntegrationStatus | undefined = useQuery(api.whoop.getIntegrationStatus);
  const whoopWorkouts: WhoopWorkout[] | undefined = useQuery(api.whoop.getWorkouts, { limit: 20 });
  
  const handleDisconnect = useApiMutation(api.whoop.disconnectIntegration);

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (start: number, end: number) => {
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getHeartRateZoneColor = (zone: number) => {
    const colors = [
      "bg-gray-500",    // Zone 0
      "bg-blue-500",    // Zone 1
      "bg-green-500",   // Zone 2
      "bg-yellow-500",  // Zone 3
      "bg-orange-500",  // Zone 4
      "bg-red-500",     // Zone 5
    ];
    return colors[zone] || "bg-gray-500";
  };

  // Loading states
  if (integrationStatus === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // Not connected state
  if (!integrationStatus.isConnected) {
    return (
      <Card className="p-6 text-center">
        <div className="space-y-4">
          <div className="text-6xl">⌚</div>
          <h2 className="text-xl font-semibold">WHOOP Not Connected</h2>
          <p className="text-muted-foreground">
            Connect your WHOOP account to view your workout data and sync it with your training logs.
          </p>
          <div className="pt-2">
            <Button variant="outline" disabled>
              Connect WHOOP Account
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              WHOOP integration setup is in progress. Check back soon!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Connected but expired token
  if (integrationStatus.isExpired) {
    return (
      <Card className="p-6 text-center">
        <div className="space-y-4">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold">WHOOP Connection Expired</h2>
          <p className="text-muted-foreground">
            Your WHOOP connection has expired. Please reconnect to continue syncing your workout data.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" disabled>
              Reconnect WHOOP
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleDisconnect({})}
            >
              Disconnect
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Connected state
  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="font-medium">WHOOP Connected</p>
              <p className="text-sm text-muted-foreground">
                Connected {integrationStatus.connectedAt ? formatDateTime(integrationStatus.connectedAt) : 'recently'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDisconnect({})}
          >
            Disconnect
          </Button>
        </div>
      </Card>

      {/* Workouts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent WHOOP Workouts</h3>
          {whoopWorkouts && (
            <p className="text-sm text-muted-foreground">
              {whoopWorkouts.length} workout{whoopWorkouts.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {whoopWorkouts === undefined ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : whoopWorkouts.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="space-y-3">
              <div className="text-4xl">🏃‍♂️</div>
              <h3 className="text-lg font-medium">No Workouts Found</h3>
              <p className="text-muted-foreground">
                No WHOOP workouts were found. Complete some workouts with your WHOOP device to see them here.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {whoopWorkouts.map((workout) => (
              <Card key={workout._id} className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{workout.sportName || "Unknown Activity"}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        workout.scoreState === "SCORED" 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : workout.scoreState === "PENDING_SCORE"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                      }`}>
                        {workout.scoreState === "SCORED" ? "Scored" : 
                         workout.scoreState === "PENDING_SCORE" ? "Processing" : "Unscoreable"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateTime(workout.start)}
                    </div>
                  </div>

                  {/* Duration */}
                  <p className="text-sm text-muted-foreground">
                    Duration: {formatDuration(workout.start, workout.end)}
                  </p>

                  {/* Metrics */}
                  {workout.score && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Strain</p>
                        <p className="font-medium">{workout.score.strain.toFixed(1)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Avg HR</p>
                        <p className="font-medium">{workout.score.averageHeartRate} bpm</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Max HR</p>
                        <p className="font-medium">{workout.score.maxHeartRate} bpm</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Calories</p>
                        <p className="font-medium">{Math.round(workout.score.kilojoule / 4.184)}</p>
                      </div>
                    </div>
                  )}

                  {/* Heart Rate Zones */}
                  {workout.score && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Heart Rate Zones</p>
                      <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                        {[
                          workout.score.percentInZoneOne,
                          workout.score.percentInZoneTwo,
                          workout.score.percentInZoneThree,
                          workout.score.percentInZoneFour,
                          workout.score.percentInZoneFive,
                        ].map((percent, index) => (
                          percent > 0 && (
                            <div
                              key={index}
                              className={getHeartRateZoneColor(index + 1)}
                              style={{ width: `${percent}%` }}
                              title={`Zone ${index + 1}: ${percent.toFixed(1)}%`}
                            />
                          )
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Zone 1</span>
                        <span>Zone 5</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}