import type { Metas } from '@grafana/faro-core';

import { internalLogger } from '../../../internalLogger';

import { ErrorUniquenessTracker } from './errorUniquenessTracker';

jest.mock('../../../internalLogger', () => ({
  internalLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Test constants
const DEBOUNCE_TIMEOUT = 150; // 100ms debounce + 50ms buffer

// Helper to mark error as seen and flush debounced save
function markAsSeenAndFlush(tracker: ErrorUniquenessTracker, hash: number, timestamp?: number): void {
  tracker.markAsSeen(hash, timestamp);
  jest.advanceTimersByTime(DEBOUNCE_TIMEOUT);
}

describe('ErrorUniquenessTracker', () => {
  let mockMetas: Metas;
  let mockLocalStorage: Record<string, string>;
  let getItemMock: jest.Mock;
  let setItemMock: jest.Mock;
  let removeItemMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    mockMetas = {
      value: {
        session: {
          id: 'test-session-123',
          attributes: {},
        },
      },
      add: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    } as any;

    mockLocalStorage = {};

    getItemMock = jest.fn((key: string) => mockLocalStorage[key] || null);
    setItemMock = jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    removeItemMock = jest.fn((key: string) => {
      delete mockLocalStorage[key];
    });

    const mockStorage = {
      getItem: getItemMock,
      setItem: setItemMock,
      removeItem: removeItemMock,
      clear: jest.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: jest.fn(),
    } as any;

    global.localStorage = mockStorage;

    Object.defineProperty(global, 'window', {
      value: {
        localStorage: mockStorage,
        sessionStorage: mockStorage,
        setTimeout: global.setTimeout,
        clearTimeout: global.clearTimeout,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('creates empty cache when localStorage is empty', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);
      const stats = tracker.getStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(500); // default
      expect(stats.disabled).toBe(false);
      expect(tracker.isDisabled()).toBe(false);
    });

    it('respects custom maxSize', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas, 100);
      const stats = tracker.getStats();

      expect(stats.maxSize).toBe(100);
    });

    it('uses session ID in storage key', () => {
      new ErrorUniquenessTracker(mockMetas);

      expect(getItemMock).toHaveBeenCalledWith('com.grafana.faro.error-signatures.test-session-123');
    });

    it('loads existing cache from localStorage', () => {
      const existingCache = {
        version: 1,
        maxSize: 500,
        entries: [
          { hash: 12345, timestamp: 1000, lastSeen: 1000 },
          { hash: 67890, timestamp: 2000, lastSeen: 2000 },
        ],
      };
      mockLocalStorage['com.grafana.faro.error-signatures.test-session-123'] = JSON.stringify(existingCache);

      const tracker = new ErrorUniquenessTracker(mockMetas);
      const stats = tracker.getStats();

      expect(stats.size).toBe(2);
    });

    it('discards invalid cache version', () => {
      const invalidCache = {
        version: 999,
        maxSize: 500,
        entries: [],
      };
      mockLocalStorage['com.grafana.faro.error-signatures.test-session-123'] = JSON.stringify(invalidCache);

      const tracker = new ErrorUniquenessTracker(mockMetas);
      const stats = tracker.getStats();

      expect(stats.size).toBe(0);
      expect(removeItemMock).toHaveBeenCalled();
    });

    it('recreates cache when data is corrupted', () => {
      mockLocalStorage['com.grafana.faro.error-signatures.test-session-123'] = 'corrupted{json';

      const tracker = new ErrorUniquenessTracker(mockMetas);
      const stats = tracker.getStats();

      expect(stats.size).toBe(0);
      expect(stats.disabled).toBe(false);
      expect(tracker.isDisabled()).toBe(false);
    });

    it('continues operating after cache corruption', () => {
      mockLocalStorage['com.grafana.faro.error-signatures.test-session-123'] = 'corrupted{json';

      const tracker = new ErrorUniquenessTracker(mockMetas);

      // Should log warning but continue operating
      expect(internalLogger.warn).toHaveBeenCalledWith(
        'Error uniqueness cache corrupted, recreating',
        expect.any(SyntaxError)
      );

      // Verify tracker is still functional
      expect(tracker.isUnique(12345)).toBe(true);
      tracker.markAsSeen(12345);
      expect(tracker.isUnique(12345)).toBe(false);

      // Verify it can save to localStorage
      markAsSeenAndFlush(tracker, 67890);
      expect(setItemMock).toHaveBeenCalled();
    });
  });

  describe('isUnique', () => {
    it('returns true for first occurrence of error', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);
      const result = tracker.isUnique(12345);

      expect(result).toBe(true);
    });

    it('returns false for duplicate error', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      tracker.markAsSeen(12345);
      const result = tracker.isUnique(12345);

      expect(result).toBe(false);
    });

    it('moves accessed entry to end of LRU', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas, 3);

      // Add three entries
      tracker.markAsSeen(111);
      tracker.markAsSeen(222);
      tracker.markAsSeen(333);

      // Access first entry (should move to end)
      tracker.isUnique(111);

      // Add fourth entry (should evict 222, not 111)
      tracker.markAsSeen(444);

      expect(tracker.isUnique(222)).toBe(true); // 222 was evicted
      expect(tracker.isUnique(111)).toBe(false); // 111 still in cache
      expect(tracker.isUnique(333)).toBe(false); // 333 still in cache
      expect(tracker.isUnique(444)).toBe(false); // 444 still in cache
    });
  });

  describe('markAsSeen', () => {
    it('adds error hash to cache', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      tracker.markAsSeen(12345);

      const stats = tracker.getStats();
      expect(stats.size).toBe(1);
    });

    it('persists to localStorage', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      markAsSeenAndFlush(tracker, 12345);

      expect(setItemMock).toHaveBeenCalled();
      const savedData = mockLocalStorage['com.grafana.faro.error-signatures.test-session-123'];
      const saved = JSON.parse(savedData!);
      expect(saved.entries).toHaveLength(1);
      expect(saved.entries[0].hash).toBe(12345);
    });

    it('does not add duplicates', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      tracker.markAsSeen(12345);
      tracker.markAsSeen(12345);

      const stats = tracker.getStats();
      expect(stats.size).toBe(1);
    });

    it('evicts oldest entry when at capacity', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas, 3);

      tracker.markAsSeen(111);
      tracker.markAsSeen(222);
      tracker.markAsSeen(333);
      tracker.markAsSeen(444); // Should evict 111

      expect(tracker.isUnique(111)).toBe(true); // Evicted
      expect(tracker.isUnique(222)).toBe(false); // Still in cache
      expect(tracker.isUnique(333)).toBe(false); // Still in cache
      expect(tracker.isUnique(444)).toBe(false); // Still in cache
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      tracker.markAsSeen(111);
      tracker.markAsSeen(222);
      tracker.clear();

      const stats = tracker.getStats();
      expect(stats.size).toBe(0);
    });

    it('persists cleared state to localStorage', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      tracker.markAsSeen(111);
      tracker.clear();

      const savedData = mockLocalStorage['com.grafana.faro.error-signatures.test-session-123'];
      const saved = JSON.parse(savedData!);
      expect(saved.entries).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('returns cache statistics', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas, 100);
      tracker.markAsSeen(111);
      tracker.markAsSeen(222);

      const stats = tracker.getStats();

      expect(stats).toEqual({
        size: 2,
        maxSize: 100,
        disabled: false,
      });
    });
  });

  describe('localStorage persistence across instances', () => {
    it('shares cache between instances with same session', () => {
      const tracker1 = new ErrorUniquenessTracker(mockMetas);
      markAsSeenAndFlush(tracker1, 12345);

      // Create new instance (simulates page reload)
      const tracker2 = new ErrorUniquenessTracker(mockMetas);

      expect(tracker2.isUnique(12345)).toBe(false);
    });

    it('does not share cache between different sessions', () => {
      const tracker1 = new ErrorUniquenessTracker(mockMetas);
      markAsSeenAndFlush(tracker1, 12345);

      // Different session
      mockMetas.value.session!.id = 'different-session';
      const tracker2 = new ErrorUniquenessTracker(mockMetas);

      expect(tracker2.isUnique(12345)).toBe(true);
    });
  });

  describe('LRU eviction', () => {
    it('maintains LRU order correctly', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas, 5);

      // Fill cache
      tracker.markAsSeen(1);
      tracker.markAsSeen(2);
      tracker.markAsSeen(3);
      tracker.markAsSeen(4);
      tracker.markAsSeen(5);

      // Access items 2 and 4 (moves them to end)
      tracker.isUnique(2);
      tracker.isUnique(4);

      // Add two more items (should evict 1 and 3)
      tracker.markAsSeen(6);
      tracker.markAsSeen(7);

      expect(tracker.isUnique(1)).toBe(true); // Evicted
      expect(tracker.isUnique(3)).toBe(true); // Evicted
      expect(tracker.isUnique(2)).toBe(false); // Still in cache
      expect(tracker.isUnique(4)).toBe(false); // Still in cache
      expect(tracker.isUnique(5)).toBe(false); // Still in cache
      expect(tracker.isUnique(6)).toBe(false); // Still in cache
      expect(tracker.isUnique(7)).toBe(false); // Still in cache
    });
  });

  describe('when disabled', () => {
    it('allows all operations when localStorage unavailable', () => {
      getItemMock.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      const tracker = new ErrorUniquenessTracker(mockMetas);

      expect(tracker.isDisabled()).toBe(true);
      expect(tracker.isUnique(12345)).toBe(true);
      expect(tracker.isUnique(12345)).toBe(true); // Always returns true when disabled

      setItemMock.mockClear();
      tracker.markAsSeen(12345);
      jest.advanceTimersByTime(DEBOUNCE_TIMEOUT);

      expect(setItemMock).not.toHaveBeenCalled();
    });

    it('logs warning when localStorage is unavailable', () => {
      getItemMock.mockImplementation(() => {
        throw new Error('Storage error');
      });

      new ErrorUniquenessTracker(mockMetas);

      expect(internalLogger.warn).toHaveBeenCalledWith(
        'Error uniqueness tracking disabled: localStorage unavailable',
        expect.any(Error)
      );
    });

    it('disables tracker when storage access throws SecurityError', () => {
      getItemMock.mockImplementation(() => {
        const error = new Error('Security error: access denied');
        error.name = 'SecurityError';
        throw error;
      });

      const tracker = new ErrorUniquenessTracker(mockMetas);

      expect(tracker.isDisabled()).toBe(true);
      expect(internalLogger.warn).toHaveBeenCalledWith(
        'Error uniqueness tracking disabled: localStorage unavailable',
        expect.any(Error)
      );
    });
  });

  describe('getFirstSeen', () => {
    it('returns timestamp for seen error', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);
      const timestamp = 1234567890;

      tracker.markAsSeen(12345, timestamp);

      expect(tracker.getFirstSeen(12345)).toBe(timestamp);
    });

    it('returns null for unseen error', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      expect(tracker.getFirstSeen(99999)).toBeNull();
    });

    it('returns null when disabled', () => {
      getItemMock.mockImplementation(() => {
        throw new Error('Storage not available');
      });

      const tracker = new ErrorUniquenessTracker(mockMetas);

      tracker.markAsSeen(12345);

      expect(tracker.getFirstSeen(12345)).toBeNull();
    });
  });

  describe('error handling', () => {
    it('remains enabled when localStorage write fails silently', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      setItemMock.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      tracker.markAsSeen(12345);
      jest.advanceTimersByTime(DEBOUNCE_TIMEOUT);

      // webStorage utility catches write errors, so tracker stays enabled
      expect(tracker.isDisabled()).toBe(false);
      expect(tracker.isUnique(12345)).toBe(false);
    });

    it('handles missing session gracefully', () => {
      mockMetas.value.session = undefined;
      const tracker = new ErrorUniquenessTracker(mockMetas);

      expect(getItemMock).toHaveBeenCalledWith('com.grafana.faro.error-signatures.__pending-initialization__');

      tracker.markAsSeen(12345);
      expect(tracker.isUnique(12345)).toBe(false);
    });
  });

  describe('session change invalidation', () => {
    it('deletes old cache from localStorage and starts with fresh empty cache on session change', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      // Mark errors as seen in the first session
      markAsSeenAndFlush(tracker, 12345);
      markAsSeenAndFlush(tracker, 67890);
      expect(tracker.isUnique(12345)).toBe(false);
      expect(tracker.isUnique(67890)).toBe(false);

      const oldSessionKey = 'com.grafana.faro.error-signatures.test-session-123';
      expect(mockLocalStorage[oldSessionKey]).toBeDefined();

      // Get the listener that was registered
      const metasListener = (mockMetas.addListener as jest.Mock).mock.calls[0][0];

      // Simulate session change
      metasListener({
        session: {
          id: 'new-session-456',
          attributes: {},
        },
      });

      // Old cache should be deleted from localStorage
      expect(mockLocalStorage[oldSessionKey]).toBeUndefined();

      // Previously seen errors should now be unique in fresh cache
      expect(tracker.isUnique(12345)).toBe(true);
      expect(tracker.isUnique(67890)).toBe(true);

      // Cache should be empty (size 0)
      expect(tracker.getStats().size).toBe(0);
    });

    it('loads persisted cache when transitioning from pending initialization to real session', () => {
      // Start with no session (simulates pre-initialization)
      mockMetas.value.session = undefined;
      const tracker = new ErrorUniquenessTracker(mockMetas);

      // Mark error as seen and flush to localStorage
      const timestamp = Date.now();
      markAsSeenAndFlush(tracker, 12345, timestamp);
      expect(tracker.isUnique(12345)).toBe(false);

      // Verify cache was saved (even though to __pending-initialization__ key initially)
      const pendingKey = 'com.grafana.faro.error-signatures.__pending-initialization__';
      expect(mockLocalStorage[pendingKey]).toBeDefined();

      // Get the listener that was registered
      const metasListener = (mockMetas.addListener as jest.Mock).mock.calls[0][0];

      // Simulate session initialization with real session ID
      metasListener({
        session: {
          id: 'actual-session-456',
          attributes: {},
        },
      });

      // Error should still be not unique (cache should have persisted)
      expect(tracker.isUnique(12345)).toBe(false);

      // Cache size should be 1 (not 0)
      expect(tracker.getStats().size).toBe(1);

      // First seen timestamp should be preserved
      expect(tracker.getFirstSeen(12345)).toBe(timestamp);

      // Cache should now be at the real session key
      const actualKey = 'com.grafana.faro.error-signatures.actual-session-456';
      expect(mockLocalStorage[actualKey]).toBeDefined();
    });

    it('simulates page reload with same session - cache persists', () => {
      // First page load: create tracker with real session
      const tracker1 = new ErrorUniquenessTracker(mockMetas);

      // Mark errors as seen and flush to localStorage
      const timestamp1 = Date.now();
      const timestamp2 = Date.now() + 1000;
      markAsSeenAndFlush(tracker1, 11111, timestamp1);
      markAsSeenAndFlush(tracker1, 22222, timestamp2);
      expect(tracker1.isUnique(11111)).toBe(false);
      expect(tracker1.isUnique(22222)).toBe(false);

      // Verify cache was saved to localStorage
      const sessionKey = 'com.grafana.faro.error-signatures.test-session-123';
      expect(mockLocalStorage[sessionKey]).toBeDefined();
      const savedCache = JSON.parse(mockLocalStorage[sessionKey]!);
      expect(savedCache.entries).toHaveLength(2);

      // Simulate page reload: reset session to undefined (pre-initialization state)
      mockMetas.value.session = undefined;

      // Create new tracker instance (simulates page reload)
      const tracker2 = new ErrorUniquenessTracker(mockMetas);

      // Get the listener for tracker2
      const metasListener = (mockMetas.addListener as jest.Mock).mock.calls[1][0];

      // Simulate session instrumentation initializing with same session ID
      metasListener({
        session: {
          id: 'test-session-123',
          attributes: {},
        },
      });

      // Both errors should still be not unique (cache persisted across reload)
      expect(tracker2.isUnique(11111)).toBe(false);
      expect(tracker2.isUnique(22222)).toBe(false);

      // Cache should contain both entries
      expect(tracker2.getStats().size).toBe(2);

      // First seen timestamps should be preserved
      expect(tracker2.getFirstSeen(11111)).toBe(timestamp1);
      expect(tracker2.getFirstSeen(22222)).toBe(timestamp2);
    });

    it('does not invalidate cache if session ID stays the same', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      markAsSeenAndFlush(tracker, 12345);
      expect(tracker.isUnique(12345)).toBe(false);

      const metasListener = (mockMetas.addListener as jest.Mock).mock.calls[0][0];

      // Clear the remove mock to check if it gets called
      removeItemMock.mockClear();

      // Trigger listener with same session ID
      metasListener({
        session: {
          id: 'test-session-123',
          attributes: {},
        },
      });

      // Cache should not be cleared
      expect(removeItemMock).not.toHaveBeenCalled();

      // Error should still be in cache
      expect(tracker.isUnique(12345)).toBe(false);
    });
  });
});
