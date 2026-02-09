/**
 * LRU cache for tracking unique error signatures across page reloads.
 * Uses localStorage for persistence within a session.
 */

import type { Metas } from '../../metas';
import { stringifyExternalJson } from '../../utils/json';
import { getItem, isWebStorageAvailable, removeItem, setItem, webStorageType } from '../../utils/webStorage';

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

    // Check localStorage availability once at construction using webStorage utility
    this.hasLocalStorage = isWebStorageAvailable(webStorageType.local);

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

    const entry = this.cache.entries.find((entry) => entry.hash === errorHash);

    if (!entry) {
      // Not found - it's unique
      return true;
    }

    // Found - update lastSeen and move to end (most recently used)
    entry.lastSeen = Date.now();
    this.moveToEnd(entry);
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
    const existingEntry = this.cache.entries.find((entry) => entry.hash === errorHash);
    if (existingEntry) {
      // Already tracked, just update timestamps and move to end
      existingEntry.lastSeen = now;
      this.moveToEnd(existingEntry);
      this.saveCache();
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
    };
  }

  /**
   * Load cache from localStorage using webStorage utility.
   */
  private loadCache(): ErrorSignatureCache | null {
    try {
      const stored = getItem(this.storageKey, webStorageType.local);
      if (!stored) {
        return null;
      }

      const parsed: ErrorSignatureCache = JSON.parse(stored);

      // Validate cache structure
      if (parsed.version !== CACHE_VERSION || !Array.isArray(parsed.entries) || typeof parsed.maxSize !== 'number') {
        // Invalid cache, discard
        this.clearStorage();
        return null;
      }

      return parsed;
    } catch (_error) {
      // localStorage not available or corrupted
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
   * Actually write to localStorage using webStorage utility (called by debounced saveCache).
   */
  private performSave(): void {
    if (this.disabled || !this.hasLocalStorage) {
      return;
    }

    try {
      const serialized = stringifyExternalJson(this.cache);
      setItem(this.storageKey, serialized, webStorageType.local);
    } catch (_error) {
      // localStorage write failed - disable tracking and log warning
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
   * Clear storage key using webStorage utility.
   */
  private clearStorage(): void {
    try {
      removeItem(this.storageKey, webStorageType.local);
    } catch {
      // Ignore errors
    }
  }

  /**
   * Move an entry to the end of the cache (mark as most recently used).
   * Uses filter to remove and push to add - more modern and avoids double search.
   */
  private moveToEnd(entry: ErrorCacheEntry): void {
    this.cache.entries = this.cache.entries.filter((e) => e !== entry);
    this.cache.entries.push(entry);
  }
}
