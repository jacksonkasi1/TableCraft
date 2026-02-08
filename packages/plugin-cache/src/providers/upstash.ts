import type { CacheProvider } from '../types';

/**
 * Upstash Redis provider for serverless environments.
 *
 * Install: `bun add @upstash/redis`
 *
 * @example
 * ```ts
 * import { Redis } from '@upstash/redis';
 * import { upstashProvider } from '@tablecraft/plugin-cache/upstash';
 *
 * const redis = new Redis({ url: '...', token: '...' });
 * const provider = upstashProvider(redis);
 * ```
 */
export function upstashProvider(
  client: {
    get<T = unknown>(key: string): Promise<T | null>;
    set<T = unknown>(key: string, value: T, opts?: { ex?: number }): Promise<any>;
    del(...keys: string[]): Promise<number>;
  },
  options?: {
    prefix?: string;
  }
): CacheProvider {
  const prefix = options?.prefix ?? 'tablecraft:';

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const result = await client.get<T>(prefix + key);
      return result ?? undefined;
    },

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
      await client.set(prefix + key, value, { ex: ttlSeconds });
    },

    async delete(key: string): Promise<void> {
      await client.del(prefix + key);
    },
  };
}
