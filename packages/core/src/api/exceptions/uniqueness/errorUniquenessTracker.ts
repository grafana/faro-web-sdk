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
const PENDING_SESSION_ID = '__pending-initialization__';

/**
 * Manages session-scoped unique error tracking with LRU eviction.
 * Persists to localStorage to survive page reloads within the same session.
 *
 * Each session has its own isolated error cache stored in localStorage.
 * When the session ID changes (e.g., session expiration, inactivity timeout),
 * the tracker automatically deletes the old cache and starts fresh with an empty cache,
 * ensuring error uniqueness is properly scoped per session.
 *
 * Cache invalidation scenarios:
 * - During user session: Listens for session ID changes via metas, deletes old cache, starts fresh
 * - On page reload: Reads current session ID and loads existing cache from localStorage if available
 * - Session expiration: New session ID triggers deletion of old cache and creates fresh empty cache
 *
 * Note: Only the error cache is managed here. The Faro session object in web storage is never touched.
 */
export class ErrorUniquenessTracker {
  private cache: ErrorSignatureCache;
  private storageKey: string;
  private metas: Metas;
  private disabled: boolean = false;
  private hasLocalStorage: boolean;
  private saveScheduled: boolean = false;
  private saveTimeout?: number;
  private currentSessionId: string;
  private maxSize: number;

  constructor(metas: Metas, maxSize: number = DEFAULT_MAX_SIZE) {
    this.metas = metas;
    this.maxSize = maxSize;
    this.hasLocalStorage = isWebStorageAvailable(webStorageType.local);

    this.currentSessionId = this.metas.value.session?.id ?? PENDING_SESSION_ID;
    this.storageKey = `com.grafana.faro.error-signatures.${this.currentSessionId}`;
    this.cache = this.loadCache() ?? this.createEmptyCache(maxSize);

    this.metas.addListener((meta) => {
      const newSessionId = meta.session?.id ?? PENDING_SESSION_ID;
      if (newSessionId !== this.currentSessionId) {
        this.handleSessionChange(newSessionId);
      }
    });
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

  /**
   * Handle session ID change by managing cache persistence and cleanup.
   *
   * When transitioning from initialization (__pending-initialization__) to a real session ID:
   * - Attempts to load persisted cache for the real session from localStorage
   * - Preserves error tracking across page reloads within the same session
   *
   * When transitioning between real session IDs (session expiration):
   * - Deletes the old session's error cache from localStorage
   * - Starts with fresh empty cache for the new session
   *
   * Note: This only manages the error cache, NOT the Faro session object in web storage.
   */
  private handleSessionChange(newSessionId: string): void {
    // Clear any pending saves for the old session
    if (this.saveTimeout) {
      window.clearTimeout(this.saveTimeout);
      this.saveScheduled = false;
    }

    const isTransitioningFromInit = this.currentSessionId === PENDING_SESSION_ID;

    if (isTransitioningFromInit) {
      this.handleInitializationTransition(newSessionId);
    } else {
      // Handle session expiration: clear old cache and start fresh
      internalLogger.debug(`Session expired: ${this.currentSessionId} → ${newSessionId}, starting fresh cache`);

      this.clearStorage();
      this.currentSessionId = newSessionId;
      this.storageKey = `com.grafana.faro.error-signatures.${newSessionId}`;
      this.cache = this.createEmptyCache(this.maxSize);
    }
  }

  /**
   * Handle transition from initialization state to real session.
   * Attempts to load persisted cache or migrate pre-initialization errors.
   */
  private handleInitializationTransition(newSessionId: string): void {
    internalLogger.debug(`Session initialized: ${newSessionId}, loading persisted cache`);

    this.currentSessionId = newSessionId;
    this.storageKey = `com.grafana.faro.error-signatures.${newSessionId}`;

    try {
      const loadedCache = this.loadCache();

      if (loadedCache) {
        // Found persisted cache for this session (page reload scenario)
        this.cache = loadedCache;
        internalLogger.debug(`Loaded ${loadedCache.entries.length} error entries from persisted cache`);
      } else if (this.cache.entries.length > 0) {
        // No persisted cache, but we have errors tracked during initialization
        // Migrate them to the new session key
        this.performSave();
        internalLogger.debug(
          `Migrated ${this.cache.entries.length} pre-initialization errors to session ${newSessionId}`
        );
      } else {
        internalLogger.debug('No cache to load or migrate, starting with empty cache');
      }
    } catch (error) {
      internalLogger.warn('Unexpected error during cache initialization transition', error);
    }
  }
}
