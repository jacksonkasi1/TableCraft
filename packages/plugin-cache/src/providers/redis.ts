import type { CacheProvider } from '../types';

/**
 * Redis cache provider using ioredis.
 *
 * Install: `bun add ioredis`
 *
 * @example
 * ```ts
 * import Redis from 'ioredis';
 * import { redisProvider } from '@tablecraft/plugin-cache/redis';
 *
 * const redis = new Redis('redis://localhost:6379');
 * const provider = redisProvider(redis, { prefix: 'tc:' });
 * ```
 */
export function redisProvider(
  /** An ioredis client instance */
  client: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: any[]): Promise<any>;
    del(...keys: string[]): Promise<number>;
  },
  options?: {
    /** Key prefix. Default: "tablecraft:" */
    prefix?: string;
  }
): CacheProvider {
  const prefix = options?.prefix ?? 'tablecraft:';

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const raw = await client.get(prefix + key);
      if (raw === null) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    },

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
      const serialised = JSON.stringify(value);
      await client.set(prefix + key, serialised, 'EX', ttlSeconds);
    },

    async delete(key: string): Promise<void> {
      await client.del(prefix + key);
    },
  };
}
