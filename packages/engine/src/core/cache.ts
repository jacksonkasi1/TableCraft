interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  staleWhileRevalidate: number;
}

/**
 * Simple in-memory cache with TTL and stale-while-revalidate.
 * For production, swap with Redis / Vercel KV via an adapter.
 */
export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private revalidating = new Set<string>();

  get<T>(key: string): { value: T; stale: boolean } | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    const ageSec = (Date.now() - entry.timestamp) / 1000;

    if (ageSec <= entry.ttl) {
      return { value: entry.data, stale: false };
    }

    if (ageSec <= entry.ttl + entry.staleWhileRevalidate) {
      return { value: entry.data, stale: true };
    }

    this.store.delete(key);
    return undefined;
  }

  set<T>(key: string, data: T, ttl: number, swr: number = 0): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      staleWhileRevalidate: swr,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.revalidating.clear();
  }

  isRevalidating(key: string): boolean {
    return this.revalidating.has(key);
  }

  markRevalidating(key: string): void {
    this.revalidating.add(key);
  }

  unmarkRevalidating(key: string): void {
    this.revalidating.delete(key);
  }

  /**
   * Deterministic cache key from config name + request params.
   */
  static buildKey(name: string, params: Record<string, unknown>): string {
    const sorted = JSON.stringify(params, Object.keys(params).sort());
    return `tablecraft:${name}:${sorted}`;
  }
}
