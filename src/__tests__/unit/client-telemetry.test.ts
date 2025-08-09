
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  getDeviceType,
  getThemeUsed,
  startLongTaskObserver,
  collectTTI_TBT,
  recordInputLatencyStart,
  recordInputLatencyEnd,
  snapshotInputLatency,
  snapshotMetricsBlob,
  vibrate,
} from '~/lib/client-telemetry';

describe('client-telemetry', () => {
  describe('getDeviceType', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should return "other" when navigator is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      });
      expect(getDeviceType()).toBe('other');
    });

    it('should detect android', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android');
      expect(getDeviceType()).toBe('android');
    });

    it('should detect ios', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone');
      expect(getDeviceType()).toBe('ios');
    });

    it('should detect ipad', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPad');
      expect(getDeviceType()).toBe('ipad');
    });

    it('should detect desktop', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Windows NT');
      expect(getDeviceType()).toBe('desktop');
    });
  });

  describe('getThemeUsed', () => {
    it('should return null when document is undefined', () => {
      const originalDocument = global.document;
      Object.defineProperty(global, 'document', {
        value: undefined,
        writable: true,
      });
      expect(getThemeUsed()).toBe(null);
      Object.defineProperty(global, 'document', {
        value: originalDocument,
        writable: true,
      });
    });

    it('should return theme from document dataset', () => {
      document.documentElement.dataset.theme = 'dark';
      expect(getThemeUsed()).toBe('dark');
    });
  });

  describe('getDeviceType additional cases', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should detect iPad via touch support on Mac', () => {
      const originalDocument = global.document;
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        writable: true,
      });
      Object.defineProperty(global, 'document', {
        value: { ontouchend: true },
        writable: true,
      });
      expect(getDeviceType()).toBe('ipad');
      Object.defineProperty(global, 'document', {
        value: originalDocument,
        writable: true,
      });
    });

    it('should handle navigator with vendor property', () => {
      Object.defineProperty(global, 'navigator', {
        value: { vendor: 'Apple Computer, Inc.' },
        writable: true,
      });
      expect(getDeviceType()).toBe('other');
    });

    it('should handle window.opera property', () => {
      const originalWindow = global.window;
      Object.defineProperty(global, 'window', {
        value: { opera: 'Opera/9.80' },
        writable: true,
      });
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: undefined },
        writable: true,
      });
      expect(getDeviceType()).toBe('other');
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
      });
    });

    it('should detect linux desktop', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (X11; Linux x86_64)');
      expect(getDeviceType()).toBe('desktop');
    });

    it('should detect iPod as ios', () => {
      const originalDocument = global.document;
      Object.defineProperty(global, 'document', {
        value: {}, // No touch support
        writable: true,
      });
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X)');
      expect(getDeviceType()).toBe('ios');
      Object.defineProperty(global, 'document', {
        value: originalDocument,
        writable: true,
      });
    });

    it('should detect macintosh as desktop when no touch', () => {
      const originalDocument = global.document;
      Object.defineProperty(global, 'document', {
        value: {},
        writable: true,
      });
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
      expect(getDeviceType()).toBe('desktop');
      Object.defineProperty(global, 'document', {
        value: originalDocument,
        writable: true,
      });
    });

    it('should detect X11 as desktop', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (X11; Ubuntu; Linux x86_64)');
      expect(getDeviceType()).toBe('desktop');
    });
  });

  describe('Performance Metrics', () => {
    const originalPerformance = global.performance;

    afterEach(() => {
      Object.defineProperty(global, 'performance', {
        value: originalPerformance,
        writable: true,
      });
    });

    it('should handle undefined performance object', () => {
      Object.defineProperty(global, 'performance', {
        value: undefined,
        writable: true,
      });
      expect(collectTTI_TBT()).toEqual({});
      expect(recordInputLatencyStart()).toBe(null);
      recordInputLatencyEnd(1);
      expect(snapshotInputLatency()).toEqual({ samples: [] });
    });

    it('should collect TTI and TBT', () => {
      const now = Date.now();
      const performance = {
        getEntriesByType: vi.fn().mockReturnValue([
          {
            domContentLoadedEventEnd: now + 200,
            loadEventEnd: now + 300,
            startTime: now,
            name: 'first-contentful-paint',
          },
        ]),
        now: vi.fn().mockReturnValue(now + 500),
      };
      Object.defineProperty(global, 'performance', {
        value: performance,
        writable: true,
      });
      const { tti, tbt } = collectTTI_TBT();
      expect(tti).toBeDefined();
      expect(tbt).toBeDefined();
    });

    it('should handle missing navigation entry', () => {
      const performance = {
        getEntriesByType: vi.fn()
          .mockReturnValueOnce([]) // navigation entries
          .mockReturnValueOnce([{ name: 'first-contentful-paint', startTime: 100 }]), // paint entries
        now: vi.fn().mockReturnValue(500),
      };
      Object.defineProperty(global, 'performance', {
        value: performance,
        writable: true,
      });
      const { tti, tbt } = collectTTI_TBT();
      expect(tti).toBeDefined();
      expect(tbt).toBeDefined();
    });

    it('should handle missing paint entries', () => {
      const now = Date.now();
      const performance = {
        getEntriesByType: vi.fn()
          .mockReturnValueOnce([{
            domContentLoadedEventEnd: now + 200,
            startTime: now,
          }])
          .mockReturnValueOnce([]), // no paint entries
        now: vi.fn().mockReturnValue(now + 500),
      };
      Object.defineProperty(global, 'performance', {
        value: performance,
        writable: true,
      });
      const { tti, tbt } = collectTTI_TBT();
      expect(tti).toBeDefined();
      expect(tbt).toBeDefined();
    });

    it('should handle performance observer not available', () => {
      const originalPerformanceObserver = global.PerformanceObserver;
      Object.defineProperty(global, 'PerformanceObserver', {
        value: undefined,
        writable: true,
      });
      expect(() => startLongTaskObserver()).not.toThrow();
      Object.defineProperty(global, 'PerformanceObserver', {
        value: originalPerformanceObserver,
        writable: true,
      });
    });

    it('should handle performance observer errors', () => {
      const originalPerformanceObserver = global.PerformanceObserver;
      Object.defineProperty(global, 'PerformanceObserver', {
        value: class {
          constructor() {
            throw new Error('Not supported');
          }
        },
        writable: true,
      });
      expect(() => startLongTaskObserver()).not.toThrow();
      Object.defineProperty(global, 'PerformanceObserver', {
        value: originalPerformanceObserver,
        writable: true,
      });
    });
  });

  describe('vibrate', () => {
    it('should not throw when navigator is undefined', () => {
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      });
      expect(() => vibrate(100)).not.toThrow();
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should call navigator.vibrate', () => {
      const vibrateMock = vi.fn();
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: { ...originalNavigator, vibrate: vibrateMock },
        writable: true,
      });
      vibrate(200);
      expect(vibrateMock).toHaveBeenCalledWith(200);
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });
  });
});
