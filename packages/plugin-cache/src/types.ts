/**
 * The contract any cache provider must fulfill.
 * Dead simple — get, set, delete. That's it.
 *
 * Return values can be sync or async. The plugin handles both.
 *
 * Implement this interface to plug in ANY cache backend:
 * Redis, Memcached, DynamoDB, Cloudflare KV, filesystem, whatever.
 */
export interface CacheProvider {
  get<T = unknown>(key: string): Promise<T | undefined> | T | undefined;
  set<T = unknown>(key: string, value: T, ttlSeconds: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}

/**
 * Options for the withCache wrapper.
 */
export interface CacheOptions {
  /**
   * Cache provider. Defaults to in-memory if not specified.
   */
  provider?: CacheProvider;

  /**
   * Time-to-live in seconds. How long cached results stay fresh.
   * @default 60
   */
  ttl?: number;

  /**
   * Stale-while-revalidate window in seconds.
   * If set, returns stale data immediately while refreshing in the background.
   * Set to 0 to disable.
   * @default 0
   */
  swr?: number;

  /**
   * Custom key builder. Receives the config name, params, and context.
   * Override this if you need custom cache key logic.
   */
  keyBuilder?: (name: string, params: unknown, context: unknown) => string;

  /**
   * Whether to cache count queries too.
   * @default false
   */
  cacheCount?: boolean;

  /**
   * Whether to cache export queries too.
   * @default false
   */
  cacheExport?: boolean;
}
