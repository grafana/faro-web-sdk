import { Platform } from 'react-native';

/**
 * Convert a numeric value to a performance timing string (rounded to nearest ms)
 * Follows the same pattern as web SDK for consistency
 */
export function toPerformanceTimingString(value: number | null | undefined): string {
  if (value == null || typeof value !== 'number') {
    return 'unknown';
  }

  // Round to nearest millisecond and ensure non-negative
  return Math.round(value > 0 ? value : 0).toString();
}

/**
 * Get current platform information
 */
export function getPlatformInfo(): { platform: string; platformVersion: string } {
  return {
    platform: Platform.OS,
    platformVersion: Platform.Version.toString(),
  };
}

/**
 * Get current timestamp in milliseconds
 * Uses performance.now() for high-resolution timing
 */
export function now(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
}

/**
 * Simple performance marker for tracking timing
 */
export class PerformanceMarker {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = now();
  }

  /**
   * Mark the end time and return duration
   */
  end(): number {
    this.endTime = now();
    return this.getDuration();
  }

  /**
   * Get duration in milliseconds
   * If not ended, returns time elapsed so far
   */
  getDuration(): number {
    const end = this.endTime ?? now();
    return end - this.startTime;
  }

  /**
   * Get the start time
   */
  getStartTime(): number {
    return this.startTime;
  }

  /**
   * Check if marker has been ended
   */
  hasEnded(): boolean {
    return this.endTime !== undefined;
  }
}

/**
 * Global timing storage for tracking app lifecycle
 */
class PerformanceTimingStore {
  private timings: Map<string, number> = new Map();
  private markers: Map<string, PerformanceMarker> = new Map();

  /**
   * Store a timing value
   */
  set(key: string, value: number): void {
    this.timings.set(key, value);
  }

  /**
   * Get a timing value
   */
  get(key: string): number | undefined {
    return this.timings.get(key);
  }

  /**
   * Start a performance marker
   */
  startMarker(key: string): PerformanceMarker {
    const marker = new PerformanceMarker();
    this.markers.set(key, marker);
    return marker;
  }

  /**
   * End a performance marker and return duration
   */
  endMarker(key: string): number | undefined {
    const marker = this.markers.get(key);
    if (!marker) {
      return undefined;
    }
    return marker.end();
  }

  /**
   * Get a performance marker
   */
  getMarker(key: string): PerformanceMarker | undefined {
    return this.markers.get(key);
  }

  /**
   * Check if a marker exists
   */
  hasMarker(key: string): boolean {
    return this.markers.has(key);
  }

  /**
   * Clear all timings and markers
   */
  clear(): void {
    this.timings.clear();
    this.markers.clear();
  }
}

/**
 * Global performance timing store
 * Used to track app-wide performance metrics
 */
export const performanceStore = new PerformanceTimingStore();
