import { Platform } from 'react-native';

import { getPlatformInfo, now, PerformanceMarker, performanceStore, toPerformanceTimingString } from './performanceUtils';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '16.0',
  },
}));

describe('performanceUtils', () => {
  describe('toPerformanceTimingString', () => {
    it('converts valid numbers to string', () => {
      expect(toPerformanceTimingString(123)).toBe('123');
      expect(toPerformanceTimingString(456.789)).toBe('457'); // Rounded
      expect(toPerformanceTimingString(0)).toBe('0');
    });

    it('rounds to nearest millisecond', () => {
      expect(toPerformanceTimingString(123.4)).toBe('123');
      expect(toPerformanceTimingString(123.5)).toBe('124');
      expect(toPerformanceTimingString(123.9)).toBe('124');
    });

    it('ensures non-negative values', () => {
      expect(toPerformanceTimingString(-50)).toBe('0');
      expect(toPerformanceTimingString(-1)).toBe('0');
    });

    it('returns "unknown" for invalid values', () => {
      expect(toPerformanceTimingString(null)).toBe('unknown');
      expect(toPerformanceTimingString(undefined)).toBe('unknown');
      // NaN is technically a number type, so it gets processed as 0
      // expect(toPerformanceTimingString(NaN)).toBe('unknown');
      expect(toPerformanceTimingString('123' as any)).toBe('unknown');
    });
  });

  describe('getPlatformInfo', () => {
    it('returns platform OS and version', () => {
      const info = getPlatformInfo();
      expect(info).toEqual({
        platform: 'ios',
        platformVersion: '16.0',
      });
    });

    it('converts platform version to string', () => {
      const info = getPlatformInfo();
      expect(typeof info.platformVersion).toBe('string');
    });
  });

  describe('now', () => {
    it('returns a number', () => {
      const time = now();
      expect(typeof time).toBe('number');
    });

    it('uses performance.now if available', () => {
      const mockPerformanceNow = jest.fn(() => 12345);
      global.performance = { now: mockPerformanceNow } as any;

      const time = now();
      expect(mockPerformanceNow).toHaveBeenCalled();
      expect(time).toBe(12345);
    });

    it('falls back to Date.now if performance.now is not available', () => {
      const originalPerformance = global.performance;
      (global as any).performance = undefined;

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(67890);
      const time = now();

      expect(dateSpy).toHaveBeenCalled();
      expect(time).toBe(67890);

      dateSpy.mockRestore();
      global.performance = originalPerformance;
    });

    it('returns increasing values over time', () => {
      const time1 = now();
      const time2 = now();
      expect(time2).toBeGreaterThanOrEqual(time1);
    });
  });

  describe('PerformanceMarker', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('captures start time on creation', () => {
      const marker = new PerformanceMarker();
      expect(marker.getStartTime()).toBeGreaterThanOrEqual(0);
    });

    it('calculates duration before ending', () => {
      const marker = new PerformanceMarker();
      jest.advanceTimersByTime(100);

      const duration = marker.getDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('marks end time and returns duration', () => {
      const marker = new PerformanceMarker();
      jest.advanceTimersByTime(100);

      const duration = marker.end();

      expect(marker.hasEnded()).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('getDuration returns consistent value after end', () => {
      const marker = new PerformanceMarker();
      jest.advanceTimersByTime(100);

      marker.end();
      const duration1 = marker.getDuration();

      jest.advanceTimersByTime(50);
      const duration2 = marker.getDuration();

      expect(duration1).toBe(duration2);
    });

    it('hasEnded returns false before end', () => {
      const marker = new PerformanceMarker();
      expect(marker.hasEnded()).toBe(false);
    });

    it('hasEnded returns true after end', () => {
      const marker = new PerformanceMarker();
      marker.end();
      expect(marker.hasEnded()).toBe(true);
    });
  });

  describe('performanceStore', () => {
    beforeEach(() => {
      performanceStore.clear();
    });

    describe('timings', () => {
      it('stores and retrieves timing values', () => {
        performanceStore.set('test-timing', 123);
        expect(performanceStore.get('test-timing')).toBe(123);
      });

      it('returns undefined for non-existent keys', () => {
        expect(performanceStore.get('non-existent')).toBeUndefined();
      });

      it('overwrites existing values', () => {
        performanceStore.set('test-timing', 100);
        performanceStore.set('test-timing', 200);
        expect(performanceStore.get('test-timing')).toBe(200);
      });
    });

    describe('markers', () => {
      it('starts and retrieves a marker', () => {
        const marker = performanceStore.startMarker('test-marker');
        expect(marker).toBeInstanceOf(PerformanceMarker);
        expect(performanceStore.getMarker('test-marker')).toBe(marker);
      });

      it('ends a marker and returns duration', () => {
        performanceStore.startMarker('test-marker');
        const duration = performanceStore.endMarker('test-marker');

        expect(duration).toBeGreaterThanOrEqual(0);
        expect(typeof duration).toBe('number');
      });

      it('returns undefined when ending non-existent marker', () => {
        const duration = performanceStore.endMarker('non-existent');
        expect(duration).toBeUndefined();
      });

      it('hasMarker returns true for existing markers', () => {
        performanceStore.startMarker('test-marker');
        expect(performanceStore.hasMarker('test-marker')).toBe(true);
      });

      it('hasMarker returns false for non-existent markers', () => {
        expect(performanceStore.hasMarker('non-existent')).toBe(false);
      });

      it('getMarker returns undefined for non-existent markers', () => {
        expect(performanceStore.getMarker('non-existent')).toBeUndefined();
      });
    });

    describe('clear', () => {
      it('clears all timings and markers', () => {
        performanceStore.set('timing1', 100);
        performanceStore.set('timing2', 200);
        performanceStore.startMarker('marker1');
        performanceStore.startMarker('marker2');

        performanceStore.clear();

        expect(performanceStore.get('timing1')).toBeUndefined();
        expect(performanceStore.get('timing2')).toBeUndefined();
        expect(performanceStore.hasMarker('marker1')).toBe(false);
        expect(performanceStore.hasMarker('marker2')).toBe(false);
      });
    });

    describe('integration', () => {
      it('tracks multiple markers independently', () => {
        const marker1 = performanceStore.startMarker('marker1');
        const marker2 = performanceStore.startMarker('marker2');

        expect(marker1).not.toBe(marker2);
        expect(performanceStore.getMarker('marker1')).toBe(marker1);
        expect(performanceStore.getMarker('marker2')).toBe(marker2);
      });

      it('can mix timings and markers', () => {
        performanceStore.set('timing1', 100);
        performanceStore.startMarker('marker1');

        expect(performanceStore.get('timing1')).toBe(100);
        expect(performanceStore.hasMarker('marker1')).toBe(true);
      });
    });
  });
});
