import { describe, test, expect } from 'vitest';
import { calculateReadiness, calculateOverloadMultiplier, clip, roundToIncrement } from '~/lib/health-calculations';

describe('Health Calculations', () => {
  describe('clip function', () => {
    test('bounds values correctly', () => {
      expect(clip(0.5, 0.8, 1.2)).toBe(0.8);
      expect(clip(1.5, 0.8, 1.2)).toBe(1.2);
      expect(clip(1.0, 0.8, 1.2)).toBe(1.0);
      expect(clip(0, -5, 5)).toBe(0);
      expect(clip(-10, -5, 5)).toBe(-5);
      expect(clip(10, -5, 5)).toBe(5);
    });

    test('handles edge cases', () => {
      expect(clip(1, 1, 1)).toBe(1);
      expect(clip(0.9999, 1, 2)).toBe(1);
      expect(clip(2.0001, 1, 2)).toBe(2);
    });
  });

  describe('calculateReadiness', () => {
    test('with complete WHOOP data - good metrics', () => {
      const whoop = {
        recovery_score: 80,
        sleep_performance: 90,
        hrv_now_ms: 50,
        hrv_baseline_ms: 45,
        rhr_now_bpm: 55,
        rhr_baseline_bpm: 60,
      };
      
      const { rho, flags } = calculateReadiness(whoop);
      
      // Should be high readiness (good metrics)
      expect(rho).toBeGreaterThan(0.7);
      expect(flags).toContain('good_recovery');
      expect(flags).toContain('good_sleep');
      expect(flags).not.toContain('missing_hrv');
      expect(flags).not.toContain('missing_rhr');
    });

    test('with complete WHOOP data - poor metrics', () => {
      const whoop = {
        recovery_score: 40,
        sleep_performance: 30,
        hrv_now_ms: 30,
        hrv_baseline_ms: 45,
        rhr_now_bpm: 70,
        rhr_baseline_bpm: 60,
      };
      
      const { rho, flags } = calculateReadiness(whoop);
      
      // Should be low readiness (poor metrics)
      expect(rho).toBeLessThan(0.5);
      expect(flags).toContain('low_recovery');
      expect(flags).toContain('poor_sleep');
    });

    test('with missing HRV data', () => {
      const whoop = {
        recovery_score: 70,
        sleep_performance: 75,
        // hrv_now_ms and hrv_baseline_ms missing
        rhr_now_bpm: 55,
        rhr_baseline_bpm: 60,
      };
      
      const { rho, flags } = calculateReadiness(whoop);
      
      expect(flags).toContain('missing_hrv');
      expect(flags).not.toContain('missing_rhr');
      expect(rho).toBeGreaterThan(0);
      expect(rho).toBeLessThan(1);
    });

    test('with missing RHR data', () => {
      const whoop = {
        recovery_score: 70,
        sleep_performance: 75,
        hrv_now_ms: 45,
        hrv_baseline_ms: 45,
        // rhr_now_bpm and rhr_baseline_bpm missing
      };
      
      const { rho, flags } = calculateReadiness(whoop);
      
      expect(flags).toContain('missing_rhr');
      expect(flags).not.toContain('missing_hrv');
    });

    test('with high yesterday strain', () => {
      const whoop = {
        recovery_score: 80,
        sleep_performance: 85,
        hrv_now_ms: 50,
        hrv_baseline_ms: 45,
        rhr_now_bpm: 55,
        rhr_baseline_bpm: 60,
        yesterday_strain: 16, // High strain > 14
      };
      
      const { rho, flags } = calculateReadiness(whoop);
      
      expect(flags).toContain('high_strain_yesterday');
      // Rho should be reduced by 0.05 due to high strain
    });

    test('with all missing data (fallback values)', () => {
      const whoop = {};
      
      const { rho, flags } = calculateReadiness(whoop);
      
      expect(rho).toBe(0.65); // 0.4*0.5 + 0.3*0.5 + 0.15*1 + 0.15*1 = 0.65
      expect(flags).toContain('missing_hrv');
      expect(flags).toContain('missing_rhr');
      expect(flags).toContain('poor_sleep');
      expect(flags).toContain('low_recovery');
    });

    test('HRV ratio calculations', () => {
      // Test HRV component calculation
      const whoopHighHRV = {
        recovery_score: 50,
        sleep_performance: 50,
        hrv_now_ms: 60, // High HRV (60/45 = 1.33, clipped to 1.2)
        hrv_baseline_ms: 45,
        rhr_now_bpm: 60,
        rhr_baseline_bpm: 60,
      };
      
      const { rho: rhoHigh } = calculateReadiness(whoopHighHRV);
      
      const whoopLowHRV = {
        recovery_score: 50,
        sleep_performance: 50,
        hrv_now_ms: 30, // Low HRV (30/45 = 0.67, clipped to 0.8)
        hrv_baseline_ms: 45,
        rhr_now_bpm: 60,
        rhr_baseline_bpm: 60,
      };
      
      const { rho: rhoLow } = calculateReadiness(whoopLowHRV);
      
      expect(rhoHigh).toBeGreaterThan(rhoLow);
    });

    test('RHR ratio calculations', () => {
      // Test RHR component calculation  
      const whoopLowRHR = {
        recovery_score: 50,
        sleep_performance: 50,
        hrv_now_ms: 45,
        hrv_baseline_ms: 45,
        rhr_now_bpm: 50, // Low RHR is good (60/50 = 1.2)
        rhr_baseline_bpm: 60,
      };
      
      const { rho: rhoGood } = calculateReadiness(whoopLowRHR);
      
      const whoopHighRHR = {
        recovery_score: 50,
        sleep_performance: 50,
        hrv_now_ms: 45,
        hrv_baseline_ms: 45,
        rhr_now_bpm: 70, // High RHR is bad (60/70 = 0.86, clipped to 0.86)
        rhr_baseline_bpm: 60,
      };
      
      const { rho: rhoBad } = calculateReadiness(whoopHighRHR);
      
      expect(rhoGood).toBeGreaterThan(rhoBad);
    });
  });

  describe('calculateOverloadMultiplier', () => {
    test('high readiness increases load', () => {
      const delta = calculateOverloadMultiplier(0.9, 'intermediate');
      expect(delta).toBeGreaterThan(1);
      expect(delta).toBeLessThanOrEqual(1.1);
    });

    test('low readiness decreases load', () => {
      const delta = calculateOverloadMultiplier(0.2, 'intermediate');
      expect(delta).toBeLessThan(1);
      expect(delta).toBeGreaterThanOrEqual(0.9);
    });

    test('moderate readiness maintains load', () => {
      const delta = calculateOverloadMultiplier(0.5, 'intermediate');
      expect(delta).toBeCloseTo(1, 1);
    });

    test('beginner safety cap applies', () => {
      // Even with very high readiness, beginner cap should limit to 1.05
      const delta = calculateOverloadMultiplier(0.95, 'beginner');
      expect(delta).toBeLessThanOrEqual(1.05);
      expect(delta).toBeGreaterThan(1);
    });

    test('intermediate and advanced have no extra safety cap', () => {
      const deltaIntermediate = calculateOverloadMultiplier(0.9, 'intermediate');
      const deltaAdvanced = calculateOverloadMultiplier(0.9, 'advanced');
      
      expect(deltaIntermediate).toBeCloseTo(deltaAdvanced, 2);
      expect(deltaIntermediate).toBeGreaterThan(1.05); // Should exceed beginner cap
    });

    test('bounds are respected', () => {
      // Test extreme values
      const deltaMax = calculateOverloadMultiplier(1.0, 'advanced');
      const deltaMin = calculateOverloadMultiplier(0.0, 'advanced');
      
      expect(deltaMax).toBeLessThanOrEqual(1.1);
      expect(deltaMin).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('roundToIncrement', () => {
    test('rounds to default 2.5kg increment', () => {
      expect(roundToIncrement(81.2)).toBe(80);
      expect(roundToIncrement(82.6)).toBe(82.5);
      expect(roundToIncrement(83.8)).toBe(85);
      expect(roundToIncrement(85)).toBe(85);
    });

    test('rounds to custom increment', () => {
      expect(roundToIncrement(81.2, 5)).toBe(80);
      expect(roundToIncrement(82.6, 5)).toBe(85);
      expect(roundToIncrement(87.4, 5)).toBe(85);
      expect(roundToIncrement(87.6, 5)).toBe(90);
    });

    test('rounds to smaller increments', () => {
      expect(roundToIncrement(80.3, 1)).toBe(80);
      expect(roundToIncrement(80.6, 1)).toBe(81);
      expect(roundToIncrement(80.4, 0.5)).toBe(80.5);
    });

    test('handles zero and negative weights', () => {
      expect(roundToIncrement(0)).toBe(0);
      expect(roundToIncrement(-5.2)).toBe(-5);
      expect(roundToIncrement(-2.6)).toBe(-2.5);
    });
  });
});