"use client";
import { useState, useCallback, useEffect } from "react";
import type {
  HealthAdviceRequest,
  HealthAdviceResponse,
} from "~/server/api/schemas/health-advice";
import {
  trackHealthAdviceUsage,
  trackHealthAdviceError,
  trackHealthAdvicePerformance,
  trackManualWellnessSubmission,
} from "~/lib/analytics/health-advice";
import { api } from "~/trpc/react";
import { logger } from "~/lib/logger";
import type {
  SubjectiveWellnessData,
  ManualWellnessData,
} from "~/lib/subjective-wellness-mapper";
import {
  createWhoopDataWithDefaults,
  mapManualWellnessToWhoopMetrics,
} from "~/lib/subjective-wellness-mapper";
import type { EnhancedHealthAdviceRequest } from "~/server/api/schemas/wellness";

export function useHealthAdvice(sessionId?: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<HealthAdviceResponse | null>(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<number>(0);

  const utils = api.useUtils();

  // tRPC mutations and queries
  const saveHealthAdvice = api.healthAdvice.save.useMutation();
  const saveHealthAdviceWithWellness =
    api.healthAdvice.saveWithWellness.useMutation();
  const updateAcceptedCount =
    api.healthAdvice.updateAcceptedSuggestions.useMutation();
  const { data: existingAdvice } = api.healthAdvice.getBySessionId.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId },
  );

  // WHOOP integration status
  const { data: whoopStatus } = api.whoop.getIntegrationStatus.useQuery();

  // Load existing advice if available
  useEffect(() => {
    if (existingAdvice && !advice) {
      setAdvice(JSON.parse(existingAdvice.response) as HealthAdviceResponse);
      setAcceptedSuggestions(existingAdvice.user_accepted_suggestions);
    }
  }, [existingAdvice, advice]);

  const fetchAdvice = useCallback(
    async (request: HealthAdviceRequest) => {
      setLoading(true);
      setError(null);

      const startTime = performance.now();

      try {
        const response = await fetch("/api/health-advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        const endTime = performance.now();
        const totalDuration = endTime - startTime;

        if (!response.ok) {
          const errorData = await response.json();

          // Track error
          trackHealthAdviceError({
            sessionId: request.session_id,
            errorType:
              response.status === 400 ? "validation_error" : "api_error",
            errorMessage: errorData.error || "Failed to fetch advice",
            modelUsed: "unknown",
            hasWhoopData: request.whoop
              ? Object.keys(request.whoop || {}).length > 0
              : false,
            experienceLevel: request.user_profile.experience_level,
          });

          throw new Error(errorData.error || "Failed to fetch advice");
        }

        const data = await response.json();
        setAdvice(data);

        // Save to database
        if (sessionId) {
          try {
            await saveHealthAdvice.mutateAsync({
              sessionId,
              request,
              response: data,
              responseTimeMs: totalDuration,
              modelUsed: "health-model",
            });
            void utils.healthAdvice.getHistory.invalidate();
            void utils.healthAdvice.getBySessionId.invalidate({ sessionId });
            void utils.wellness.getHistory.invalidate();
          } catch (dbError) {
            logger.error("Failed to save health advice to database", dbError, {
              sessionId,
            });
            // Don't fail the entire operation if database save fails
          }
        }

        // Track successful usage
        const totalSuggestions = data.per_exercise.reduce(
          (sum: number, ex: HealthAdviceResponse["per_exercise"][0]) =>
            sum + ex.sets.length,
          0,
        );

        trackHealthAdviceUsage({
          sessionId: request.session_id,
          readiness: data.readiness.rho,
          overloadMultiplier: data.readiness.overload_multiplier,
          userAcceptedSuggestions: acceptedSuggestions,
          totalSuggestions,
          modelUsed: "health-model",
          responseTime: totalDuration,
          hasWhoopData: Object.keys(request.whoop || {}).length > 0,
          experienceLevel: request.user_profile.experience_level,
          flags: data.readiness.flags,
          warnings: data.warnings,
        });

        // Track performance
        trackHealthAdvicePerformance({
          sessionId: request.session_id,
          totalDuration,
          modelUsed: "health-model",
          inputSize: JSON.stringify(request).length,
          outputSize: JSON.stringify(data).length,
        });
      } catch (err: any) {
        const errorType = err.message.includes("fetch")
          ? "network_error"
          : "api_error";

        trackHealthAdviceError({
          sessionId: request.session_id,
          errorType,
          errorMessage: err.message,
          hasWhoopData: Object.keys(request.whoop || {}).length > 0,
          experienceLevel: request.user_profile.experience_level,
        });

        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [
      sessionId,
      saveHealthAdvice,
      acceptedSuggestions,
      utils.healthAdvice.getBySessionId,
      utils.healthAdvice.getHistory,
      utils.wellness.getHistory,
    ],
  );

  const fetchAdviceWithSubjectiveData = useCallback(
    async (
      request: Omit<HealthAdviceRequest, "whoop">,
      subjectiveData: SubjectiveWellnessData,
    ) => {
      const whoopData = createWhoopDataWithDefaults(subjectiveData);
      const fullRequest: HealthAdviceRequest = {
        ...request,
        whoop: whoopData,
      };

      return fetchAdvice(fullRequest);
    },
    [fetchAdvice],
  );

  const fetchAdviceWithManualWellness = useCallback(
    async (
      request: Omit<HealthAdviceRequest, "whoop">,
      manualData: ManualWellnessData,
      wellnessDataId?: number,
    ) => {
      setLoading(true);
      setError(null);

      const startTime = performance.now();

      try {
        // Convert manual wellness to WHOOP-compatible metrics
        const whoopData = mapManualWellnessToWhoopMetrics(manualData);

        // Create enhanced request with manual wellness context
        const enhancedRequest: EnhancedHealthAdviceRequest = {
          ...request,
          whoop: whoopData,
          manual_wellness: {
            energy_level: manualData.energyLevel,
            sleep_quality: manualData.sleepQuality,
            has_whoop_data: false,
            device_timezone: manualData.deviceTimezone,
            notes: manualData.notes,
          },
        };

        const response = await fetch("/api/health-advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enhancedRequest),
        });

        const endTime = performance.now();
        const totalDuration = endTime - startTime;

        if (!response.ok) {
          const errorData = await response.json();

          // Track error
          trackHealthAdviceError({
            sessionId: request.session_id,
            errorType:
              response.status === 400 ? "validation_error" : "api_error",
            errorMessage: errorData.error || "Failed to fetch advice",
            modelUsed: "unknown",
            hasWhoopData: false,
            experienceLevel: request.user_profile.experience_level,
          });

          throw new Error(errorData.error || "Failed to fetch advice");
        }

        const data = await response.json();
        setAdvice(data);

        // Save to database with wellness context
        if (sessionId) {
          try {
            await saveHealthAdviceWithWellness.mutateAsync({
              sessionId,
              request: enhancedRequest,
              response: data,
              responseTimeMs: totalDuration,
              modelUsed: "health-model",
              wellnessDataId,
            });
            void utils.healthAdvice.getHistory.invalidate();
            void utils.healthAdvice.getBySessionId.invalidate({ sessionId });
            void utils.wellness.getHistory.invalidate();
            void utils.wellness.getStats.invalidate();
          } catch (dbError) {
            logger.error("Failed to save health advice to database", dbError, {
              sessionId,
            });
            // Don't fail the entire operation if database save fails
          }
        }

        // Track successful usage with manual wellness data
        const totalSuggestions = data.per_exercise.reduce(
          (sum: number, ex: HealthAdviceResponse["per_exercise"][0]) =>
            sum + ex.sets.length,
          0,
        );

        // Track manual wellness submission separately
        trackManualWellnessSubmission({
          sessionId: request.session_id,
          energyLevel: manualData.energyLevel,
          sleepQuality: manualData.sleepQuality,
          hasNotes: !!(manualData.notes && manualData.notes.trim().length > 0),
          notesLength: manualData.notes?.length || 0,
          deviceTimezone: manualData.deviceTimezone,
          submissionTime: totalDuration,
        });

        trackHealthAdviceUsage({
          sessionId: request.session_id,
          readiness: data.readiness.rho,
          overloadMultiplier: data.readiness.overload_multiplier,
          userAcceptedSuggestions: acceptedSuggestions,
          totalSuggestions,
          modelUsed: "health-model",
          responseTime: totalDuration,
          hasWhoopData: false,
          experienceLevel: request.user_profile.experience_level,
          flags: data.readiness.flags,
          warnings: data.warnings,
          hasManualWellness: true,
          manualWellnessData: {
            energyLevel: manualData.energyLevel,
            sleepQuality: manualData.sleepQuality,
            hasNotes: !!(
              manualData.notes && manualData.notes.trim().length > 0
            ),
          },
        });

        // Track performance
        trackHealthAdvicePerformance({
          sessionId: request.session_id,
          totalDuration,
          modelUsed: "health-model",
          inputSize: JSON.stringify(enhancedRequest).length,
          outputSize: JSON.stringify(data).length,
        });
      } catch (err: any) {
        const errorType = err.message.includes("fetch")
          ? "network_error"
          : "api_error";

        trackHealthAdviceError({
          sessionId: request.session_id,
          errorType,
          errorMessage: err.message,
          hasWhoopData: false,
          experienceLevel: request.user_profile.experience_level,
        });

        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [
      sessionId,
      saveHealthAdviceWithWellness,
      acceptedSuggestions,
      utils.healthAdvice.getBySessionId,
      utils.healthAdvice.getHistory,
      utils.wellness.getHistory,
      utils.wellness.getStats,
    ],
  );

  const clearAdvice = useCallback(() => {
    setAdvice(null);
    setError(null);
    setAcceptedSuggestions(0);
  }, []);

  const acceptSuggestion = useCallback(async () => {
    const newCount = acceptedSuggestions + 1;
    setAcceptedSuggestions(newCount);

    if (sessionId) {
      try {
        await updateAcceptedCount.mutateAsync({
          sessionId,
          acceptedCount: newCount,
        });
        void utils.healthAdvice.getBySessionId.invalidate({ sessionId });
      } catch (dbError) {
        console.error("Failed to update accepted suggestions count:", dbError);
        // Revert on error
        setAcceptedSuggestions(acceptedSuggestions);
      }
    }
  }, [
    sessionId,
    acceptedSuggestions,
    updateAcceptedCount,
    utils.healthAdvice.getBySessionId,
  ]);

  const rejectSuggestion = useCallback(async () => {
    if (acceptedSuggestions > 0) {
      const newCount = acceptedSuggestions - 1;
      setAcceptedSuggestions(newCount);

      if (sessionId) {
        try {
          await updateAcceptedCount.mutateAsync({
            sessionId,
            acceptedCount: newCount,
          });
          void utils.healthAdvice.getBySessionId.invalidate({ sessionId });
        } catch (dbError) {
          logger.error("Failed to update accepted suggestions count", dbError, {
            sessionId,
          });
          // Revert on error
          setAcceptedSuggestions(acceptedSuggestions);
        }
      }
    }
  }, [
    sessionId,
    acceptedSuggestions,
    updateAcceptedCount,
    utils.healthAdvice.getBySessionId,
  ]);

  return {
    advice,
    loading,
    error,
    acceptedSuggestions,
    fetchAdvice,
    fetchAdviceWithSubjectiveData,
    fetchAdviceWithManualWellness,
    clearAdvice,
    acceptSuggestion,
    rejectSuggestion,
    hasExistingAdvice: !!existingAdvice,
    whoopStatus: {
      isConnected: whoopStatus?.isConnected ?? false,
      hasIntegration: !!whoopStatus,
      connectedAt: whoopStatus?.connectedAt ?? null,
    },
  };
}
