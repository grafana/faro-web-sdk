/**
 * LRU cache for tracking unique error signatures across page reloads.
 * Uses localStorage for persistence within a session.
 */

import type { Metas } from '../../metas';
import { stringifyExternalJson } from '../../utils/json';
import { getItem, isLocalStorageAvailable, removeItem, setItem, webStorageType } from '../../utils/webStorage';

interface ErrorCacheEntry {
  hash: number;
  timestamp: number;
  lastSeen: number;
}

interface ErrorSignatureCache {
  version: number;
  maxSize: number;
  entries: ErrorCacheEntry[];
}

const CACHE_VERSION = 1;
const DEFAULT_MAX_SIZE = 500;

/**
 * Manages session-scoped unique error tracking with LRU eviction.
 * Persists to localStorage to survive page reloads.
 */
export class ErrorUniquenessTracker {
  private cache: ErrorSignatureCache;
  private storageKey: string;
  private metas: Metas;
  private disabled: boolean = false;
  private hasLocalStorage: boolean;
  private saveScheduled: boolean = false;
  private saveTimeout?: number;

  constructor(metas: Metas, maxSize: number = DEFAULT_MAX_SIZE) {
    this.metas = metas;
    const sessionId = this.metas.value.session?.id ?? 'default';
    this.storageKey = `com.grafana.faro.error-signatures.${sessionId}`;

    // Check localStorage availability once at construction
    this.hasLocalStorage = isLocalStorageAvailable;

    // Try to load from storage or initialize new cache
    this.cache = this.loadCache() || this.createEmptyCache(maxSize);
  }

  /**
   * Check if an error hash has been seen before.
   * Updates lastSeen timestamp and moves to end of LRU if found.
   *
   * @param errorHash - Hash of error signature
   * @returns true if error is unique (not seen before), false if duplicate
   */
  isUnique(errorHash: number): boolean {
    if (this.disabled) {
      return true; // Always unique if disabled
    }

    const index = this.cache.entries.findIndex((entry) => entry.hash === errorHash);

    if (index === -1) {
      // Not found - it's unique
      return true;
    }

    // Found - update lastSeen and move to end (most recently used)
    const entry = this.cache.entries[index];
    if (!entry) {
      return true; // Safety check
    }

    entry.lastSeen = Date.now();

    // Move to end for LRU
    this.cache.entries.splice(index, 1);
    this.cache.entries.push(entry);
    this.saveCache();

    return false; // Not unique (duplicate)
  }

  /**
   * Mark an error hash as seen.
   * Adds to cache with LRU eviction if at capacity.
   *
   * @param errorHash - Hash of error signature
   */
  markAsSeen(errorHash: number): void {
    if (this.disabled) {
      return;
    }

    const now = Date.now();

    // Check if already in cache (shouldn't be if isUnique was called first)
    const existingIndex = this.cache.entries.findIndex((entry) => entry.hash === errorHash);
    if (existingIndex !== -1) {
      // Already tracked, just update timestamps
      const entry = this.cache.entries[existingIndex];
      if (entry) {
        entry.lastSeen = now;
        this.cache.entries.splice(existingIndex, 1);
        this.cache.entries.push(entry);
        this.saveCache();
      }
      return;
    }

    // Add new entry
    const newEntry: ErrorCacheEntry = {
      hash: errorHash,
      timestamp: now,
      lastSeen: now,
    };

    // LRU eviction: remove oldest if at capacity
    if (this.cache.entries.length >= this.cache.maxSize) {
      this.cache.entries.shift(); // Remove first (oldest)
    }

    this.cache.entries.push(newEntry);
    this.saveCache();
  }

  /**
   * Clear all cached error signatures.
   * Removes from localStorage.
   */
  clear(): void {
    // Cancel any pending save
    if (this.saveTimeout) {
      window.clearTimeout(this.saveTimeout);
      this.saveScheduled = false;
    }

    this.cache.entries = [];

    // Clear immediately (not debounced)
    this.performSave();
  }

  /**
   * Get cache statistics for debugging.
   */
  getStats() {
    return {
      size: this.cache.entries.length,
      maxSize: this.cache.maxSize,
      disabled: this.disabled,
      oldestTimestamp: this.cache.entries[0]?.timestamp,
      newestTimestamp: this.cache.entries[this.cache.entries.length - 1]?.timestamp,
    };
  }

  /**
   * Load cache from localStorage.
   */
  private loadCache(): ErrorSignatureCache | null {
    if (!this.hasLocalStorage) {
      console.warn('[Faro] Error uniqueness tracking disabled: localStorage not available');
      this.disabled = true;
      return null;
    }

    try {
      const stored = getItem(this.storageKey, webStorageType.local);
      if (!stored) {
        return null;
      }

      const parsed: ErrorSignatureCache = JSON.parse(stored);

      // Validate cache structure
      if (parsed.version !== CACHE_VERSION || !Array.isArray(parsed.entries) || typeof parsed.maxSize !== 'number') {
        // Invalid cache, discard
        console.warn('[Faro] Invalid error uniqueness cache, discarding');
        this.clearStorage();
        return null;
      }

      return parsed;
    } catch (error) {
      // localStorage not available or corrupted
      console.warn('[Faro] Error uniqueness tracking disabled due to corrupted cache:', error);
      this.clearStorage();
      this.disabled = true;
      return null;
    }
  }

  /**
   * Save cache to localStorage (debounced to avoid blocking main thread).
   * Multiple rapid calls are batched into a single write.
   */
  private saveCache(): void {
    if (this.disabled || !this.hasLocalStorage) {
      return;
    }

    // Already scheduled, skip
    if (this.saveScheduled) {
      return;
    }

    this.saveScheduled = true;

    // Debounce: batch multiple saves into one write
    // 100ms is enough to batch rapid errors, short enough to feel instant
    this.saveTimeout = window.setTimeout(() => {
      this.saveScheduled = false;
      this.performSave();
    }, 100);
  }

  /**
   * Actually write to localStorage (called by debounced saveCache).
   */
  private performSave(): void {
    if (this.disabled || !this.hasLocalStorage) {
      return;
    }

    try {
      const serialized = stringifyExternalJson(this.cache);
      setItem(this.storageKey, serialized, webStorageType.local);
    } catch (error) {
      // localStorage write failed - disable tracking and log warning
      console.warn('[Faro] Error uniqueness tracking disabled due to localStorage error:', error);
      this.disabled = true;
    }
  }

  /**
   * Create empty cache structure.
   */
  private createEmptyCache(maxSize: number): ErrorSignatureCache {
    return {
      version: CACHE_VERSION,
      maxSize,
      entries: [],
    };
  }

  /**
   * Clear storage key.
   */
  private clearStorage(): void {
    if (!this.hasLocalStorage) {
      return;
    }

    try {
      removeItem(this.storageKey, webStorageType.local);
    } catch {
      // Ignore errors
    }
  }
}
