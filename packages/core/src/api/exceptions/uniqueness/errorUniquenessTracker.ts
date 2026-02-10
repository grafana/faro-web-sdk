import { internalLogger } from '../../../internalLogger';
import type { Metas } from '../../../metas';
import { stringifyExternalJson } from '../../../utils/json';
import { getItem, isWebStorageAvailable, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

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
    this.hasLocalStorage = isWebStorageAvailable(webStorageType.local);
    this.cache = this.loadCache() ?? this.createEmptyCache(maxSize);
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
      return true;
    }

    entry.lastSeen = Date.now();
    this.moveToEnd(entry);
    this.saveCache();

    return false;
  }

  /**
   * Mark an error hash as seen.
   * Adds to cache with LRU eviction if at capacity.
   *
   * @param errorHash - Hash of error signature
   * @param timestampMs - Optional timestamp in milliseconds (defaults to Date.now())
   */
  markAsSeen(errorHash: number, timestampMs?: number): void {
    if (this.disabled) {
      return;
    }

    const now = Date.now();
    const firstSeenTime = timestampMs ?? now;

    const existingEntry = this.cache.entries.find((entry) => entry.hash === errorHash);
    if (existingEntry) {
      existingEntry.lastSeen = now;
      this.moveToEnd(existingEntry);
      this.saveCache();
      return;
    }

    const newEntry: ErrorCacheEntry = {
      hash: errorHash,
      timestamp: firstSeenTime,
      lastSeen: now,
    };

    // LRU eviction: remove oldest if at capacity
    if (this.cache.entries.length >= this.cache.maxSize) {
      this.cache.entries.shift();
    }

    this.cache.entries.push(newEntry);
    this.saveCache();
  }

  clear(): void {
    if (this.saveTimeout) {
      window.clearTimeout(this.saveTimeout);
      this.saveScheduled = false;
    }

    this.cache.entries = [];

    this.performSave();
  }

  getStats() {
    return {
      size: this.cache.entries.length,
      maxSize: this.cache.maxSize,
      disabled: this.disabled,
    };
  }

  isDisabled(): boolean {
    return this.disabled;
  }

  getFirstSeen(errorHash: number): number | null {
    if (this.disabled) {
      return null;
    }

    const entry = this.cache.entries.find((entry) => entry.hash === errorHash);
    return entry ? entry.timestamp : null;
  }

  private loadCache(): ErrorSignatureCache | null {
    let stored: string | null;
    try {
      stored = getItem(this.storageKey, webStorageType.local);
    } catch (error) {
      internalLogger.warn('Error uniqueness tracking disabled: localStorage unavailable', error);
      this.clearStorage();
      this.disabled = true;
      return null;
    }

    if (!stored) {
      return null;
    }

    try {
      const parsed: ErrorSignatureCache = JSON.parse(stored);

      if (parsed.version !== CACHE_VERSION || !Array.isArray(parsed.entries) || typeof parsed.maxSize !== 'number') {
        this.clearStorage();
        return null;
      }

      return parsed;
    } catch (error) {
      internalLogger.warn('Error uniqueness cache corrupted, recreating', error);
      this.clearStorage();
      return null;
    }
  }

  private saveCache(): void {
    if (this.disabled || !this.hasLocalStorage) {
      return;
    }

    if (this.saveScheduled) {
      return;
    }

    this.saveScheduled = true;

    // Debounce: batch multiple saves into one write
    this.saveTimeout = window.setTimeout(() => {
      this.saveScheduled = false;
      this.performSave();
    }, 100);
  }

  private performSave(): void {
    if (this.disabled || !this.hasLocalStorage) {
      return;
    }

    try {
      const serialized = stringifyExternalJson(this.cache);
      setItem(this.storageKey, serialized, webStorageType.local);
    } catch (error) {
      internalLogger.warn('Error uniqueness tracking disabled: localStorage write failed', error);
      this.disabled = true;
    }
  }

  private createEmptyCache(maxSize: number): ErrorSignatureCache {
    return {
      version: CACHE_VERSION,
      maxSize,
      entries: [],
    };
  }

  private clearStorage(): void {
    try {
      removeItem(this.storageKey, webStorageType.local);
    } catch {
      // Ignore errors
    }
  }

  private moveToEnd(entry: ErrorCacheEntry): void {
    this.cache.entries = this.cache.entries.filter((e) => e !== entry);
    this.cache.entries.push(entry);
  }
}
