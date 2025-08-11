'use client';
import { useState, useCallback } from 'react';
import type { HealthAdviceRequest, HealthAdviceResponse } from '~/server/api/schemas/health-advice';
import { trackHealthAdviceUsage, trackHealthAdviceError, trackHealthAdvicePerformance } from '~/lib/analytics/health-advice';

export function useHealthAdvice() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<HealthAdviceResponse | null>(null);

  const fetchAdvice = useCallback(async (request: HealthAdviceRequest) => {
    setLoading(true);
    setError(null);
    
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/health-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Track error
        trackHealthAdviceError({
          sessionId: request.session_id,
          errorType: response.status === 400 ? 'validation_error' : 'api_error',
          errorMessage: errorData.error || 'Failed to fetch advice',
          modelUsed: 'unknown',
          hasWhoopData: Object.keys(request.whoop).length > 0,
          experienceLevel: request.user_profile.experience_level
        });
        
        throw new Error(errorData.error || 'Failed to fetch advice');
      }
      
      const data = await response.json();
      setAdvice(data);
      
      // Track successful usage
      const totalSuggestions = data.per_exercise.reduce((sum: number, ex: HealthAdviceResponse['per_exercise'][0]) => sum + ex.sets.length, 0);
      
      trackHealthAdviceUsage({
        sessionId: request.session_id,
        readiness: data.readiness.rho,
        overloadMultiplier: data.readiness.overload_multiplier,
        userAcceptedSuggestions: 0, // Will be updated when user interacts
        totalSuggestions,
        modelUsed: 'health-model', // Could be extracted from response if needed
        responseTime: totalDuration,
        hasWhoopData: Object.keys(request.whoop).length > 0,
        experienceLevel: request.user_profile.experience_level,
        flags: data.readiness.flags,
        warnings: data.warnings
      });
      
      // Track performance
      trackHealthAdvicePerformance({
        sessionId: request.session_id,
        totalDuration,
        modelUsed: 'health-model',
        inputSize: JSON.stringify(request).length,
        outputSize: JSON.stringify(data).length
      });
      
    } catch (err: any) {
      const errorType = err.message.includes('fetch') ? 'network_error' : 'api_error';
      
      trackHealthAdviceError({
        sessionId: request.session_id,
        errorType,
        errorMessage: err.message,
        hasWhoopData: Object.keys(request.whoop).length > 0,
        experienceLevel: request.user_profile.experience_level
      });
      
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAdvice = useCallback(() => {
    setAdvice(null);
    setError(null);
  }, []);

  return { advice, loading, error, fetchAdvice, clearAdvice };
}