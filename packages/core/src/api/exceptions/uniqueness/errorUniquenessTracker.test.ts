import type { Metas } from '@grafana/faro-core';

import { ErrorUniquenessTracker } from './errorUniquenessTracker';

describe('ErrorUniquenessTracker', () => {
  let mockMetas: Metas;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Clear any Date.now mocks
    jest.restoreAllMocks();

    // Mock Metas with session ID
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

    // Mock localStorage
    mockLocalStorage = {};

    const getItemMock = jest.fn((key: string) => mockLocalStorage[key] || null);
    const setItemMock = jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    const removeItemMock = jest.fn((key: string) => {
      delete mockLocalStorage[key];
    });

    global.localStorage = {
      getItem: getItemMock,
      setItem: setItemMock,
      removeItem: removeItemMock,
      clear: jest.fn(),
      length: 0,
      key: jest.fn(),
    } as any;

    // Mock window
    (global as any).window = { localStorage: global.localStorage };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('creates empty cache when localStorage is empty', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);
      const stats = tracker.getStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(500); // default
      expect(stats.disabled).toBe(false);
    });

    it('respects custom maxSize', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas, 100);
      const stats = tracker.getStats();

      expect(stats.maxSize).toBe(100);
    });

    it('uses session ID in storage key', () => {
      new ErrorUniquenessTracker(mockMetas);

      expect(localStorage.getItem).toHaveBeenCalledWith('com.grafana.faro.error-signatures.test-session-123');
    });

    it('uses default session ID when session is missing', () => {
      mockMetas.value.session = undefined;
      new ErrorUniquenessTracker(mockMetas);

      expect(localStorage.getItem).toHaveBeenCalledWith('com.grafana.faro.error-signatures.default');
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
      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    it('handles corrupted cache data', () => {
      mockLocalStorage['com.grafana.faro.error-signatures.test-session-123'] = 'corrupted{json';

      const tracker = new ErrorUniquenessTracker(mockMetas);
      const stats = tracker.getStats();

      expect(stats.size).toBe(0);
      expect(stats.disabled).toBe(true);
    });

    it('disables tracking when localStorage is unavailable', () => {
      (global as any).window = undefined;

      const tracker = new ErrorUniquenessTracker(mockMetas);
      const stats = tracker.getStats();

      expect(stats.disabled).toBe(true);
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

    it('updates lastSeen timestamp on duplicate check', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);
      const originalTime = Date.now();

      jest.spyOn(Date, 'now').mockReturnValue(originalTime);
      tracker.markAsSeen(12345);

      jest.spyOn(Date, 'now').mockReturnValue(originalTime + 5000);
      tracker.isUnique(12345);

      const stats = tracker.getStats();
      expect(stats.newestTimestamp).toBe(originalTime + 5000);
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

    it('returns true when disabled', () => {
      (global as any).window = undefined;
      const tracker = new ErrorUniquenessTracker(mockMetas);

      expect(tracker.isUnique(12345)).toBe(true);
      expect(tracker.isUnique(12345)).toBe(true); // Always unique
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

      tracker.markAsSeen(12345);

      expect(localStorage.setItem).toHaveBeenCalled();
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

    it('does nothing when disabled', () => {
      (global as any).window = undefined;
      const tracker = new ErrorUniquenessTracker(mockMetas);

      tracker.markAsSeen(12345);

      expect(localStorage.setItem).not.toHaveBeenCalled();
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
      const now1 = 1000;
      const now2 = 2000;
      jest.spyOn(Date, 'now').mockReturnValueOnce(now1).mockReturnValueOnce(now1).mockReturnValueOnce(now2).mockReturnValueOnce(now2);

      const tracker = new ErrorUniquenessTracker(mockMetas, 100);
      tracker.markAsSeen(111);
      tracker.markAsSeen(222);

      const stats = tracker.getStats();

      expect(stats).toEqual({
        size: 2,
        maxSize: 100,
        disabled: false,
        oldestTimestamp: now1,
        newestTimestamp: now2,
      });
    });

    it('handles empty cache', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);
      const stats = tracker.getStats();

      expect(stats.oldestTimestamp).toBeUndefined();
      expect(stats.newestTimestamp).toBeUndefined();
    });
  });

  describe('localStorage persistence across instances', () => {
    it('shares cache between instances with same session', () => {
      const tracker1 = new ErrorUniquenessTracker(mockMetas);
      tracker1.markAsSeen(12345);

      // Create new instance (simulates page reload)
      const tracker2 = new ErrorUniquenessTracker(mockMetas);

      expect(tracker2.isUnique(12345)).toBe(false);
    });

    it('does not share cache between different sessions', () => {
      const tracker1 = new ErrorUniquenessTracker(mockMetas);
      tracker1.markAsSeen(12345);

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

  describe('error handling', () => {
    it('disables tracking on localStorage write failure', () => {
      const tracker = new ErrorUniquenessTracker(mockMetas);

      // Cause setItem to throw
      (localStorage.setItem as jest.Mock).mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      tracker.markAsSeen(12345);

      const stats = tracker.getStats();
      expect(stats.disabled).toBe(true);
    });

    it('handles missing session gracefully', () => {
      mockMetas.value.session = undefined;
      const tracker = new ErrorUniquenessTracker(mockMetas);

      tracker.markAsSeen(12345);
      expect(tracker.isUnique(12345)).toBe(false);
    });
  });
});
