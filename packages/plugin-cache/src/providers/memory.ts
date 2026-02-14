import type { CacheProvider } from '../types';

interface MemoryEntry {
  data: unknown;
  expiresAt: number;
  staleUntil: number;
}

/**
 * Simple in-memory cache provider.
 * Zero dependencies. Works everywhere.
 *
 * Good for: single-process servers, development, testing.
 * Not for: multi-instance deployments (use Redis instead).
 */
export function memoryProvider(options?: {
  /** Maximum entries before evicting oldest. Default: 1000 */
  maxEntries?: number;
  /** Cleanup interval in ms. Default: 60000 (1 min) */
  cleanupInterval?: number;
}): CacheProvider & { clear(): void; size(): number } {
  const maxEntries = options?.maxEntries ?? 1000;
  const cleanupMs = options?.cleanupInterval ?? 60_000;

  const store = new Map<string, MemoryEntry>();

  // Periodic cleanup of expired entries
  let cleanupTimer: ReturnType<typeof setInterval> | undefined;
  if (cleanupMs > 0) {
    cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now > entry.staleUntil) {
          store.delete(key);
        }
      }
    }, cleanupMs);

    // Don't block process exit
    if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
      cleanupTimer.unref();
    }
  }

  return {
    get<T>(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;

      const now = Date.now();

      // Completely expired (past stale window too)
      if (now > entry.staleUntil) {
        store.delete(key);
        return undefined;
      }

      // Fresh or stale — return it either way
      // The withCache wrapper handles the stale logic
      return entry.data as T;
    },

    set<T>(key: string, value: T, ttlSeconds: number): void {
      // Evict oldest if at capacity
      if (store.size >= maxEntries && !store.has(key)) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }

      const now = Date.now();
      const ttlMs = ttlSeconds * 1000;

      store.set(key, {
        data: value,
        expiresAt: now + ttlMs,
        staleUntil: now + ttlMs, // SWR handled at wrapper level
      });
    },

    delete(key: string): void {
      store.delete(key);
    },

    clear(): void {
      store.clear();
    },

    size(): number {
      return store.size;
    },
  };
}
