import type { TableEngine, EngineParams, EngineContext, EngineResult, GroupedResult } from '@tablecraft/engine';
import type { CacheOptions, CacheProvider } from './types';
import { memoryProvider } from './providers/memory';

/**
 * Default cache key builder.
 * Deterministic: same params + context = same key.
 */
function defaultKeyBuilder(
  name: string,
  params: unknown,
  context: unknown
): string {
  const p = JSON.stringify(params ?? {}, Object.keys((params ?? {}) as any).sort());
  const c = JSON.stringify(context ?? {}, Object.keys((context ?? {}) as any).sort());
  return `${name}:${p}:${c}`;
}

/**
 * Wraps a TableEngine with caching.
 * Pure function composition — no mutation, no magic.
 *
 * @example
 * ```ts
 * import { withCache } from '@tablecraft/plugin-cache';
 *
 * // Memory cache (zero config)
 * const cached = withCache(engine);
 *
 * // With options
 * const cached = withCache(engine, { ttl: 120, swr: 30 });
 *
 * // With Redis
 * import { redisProvider } from '@tablecraft/plugin-cache/redis';
 * const cached = withCache(engine, {
 *   ttl: 300,
 *   provider: redisProvider(redisClient),
 * });
 * ```
 */
export function withCache(engine: TableEngine, options?: CacheOptions): TableEngine {
  const ttl = options?.ttl ?? 60;
  const swr = options?.swr ?? 0;
  const provider: CacheProvider = options?.provider ?? memoryProvider();
  const buildKey = options?.keyBuilder ?? defaultKeyBuilder;
  const cacheCount = options?.cacheCount ?? false;
  const cacheExport = options?.cacheExport ?? false;

  const configName = engine.getConfig().name;

  // Track in-flight SWR revalidations to avoid duplicate work
  const revalidating = new Set<string>();

  return {
    async query(
      params: EngineParams = {},
      context: EngineContext = {}
    ): Promise<EngineResult> {
      const key = `q:${buildKey(configName, params, context)}`;

      // Try cache
      const cached = await Promise.resolve(provider.get<EngineResult>(key));
      if (cached !== undefined) {
        return cached;
      }

      // Cache miss — execute
      const result = await engine.query(params, context);

      // Store (fire and forget)
      const totalTtl = ttl + swr;
      Promise.resolve(provider.set(key, result, totalTtl)).catch(() => {});

      return result;
    },

    async queryGrouped(
      params: EngineParams = {},
      context: EngineContext = {}
    ): Promise<GroupedResult> {
      const key = `g:${buildKey(configName, params, context)}`;

      // Try cache
      const cached = await Promise.resolve(provider.get<GroupedResult>(key));
      if (cached !== undefined) {
        return cached;
      }

      // Cache miss — execute
      const result = await engine.queryGrouped(params, context);

      // Store (fire and forget)
      const totalTtl = ttl + swr;
      Promise.resolve(provider.set(key, result, totalTtl)).catch(() => {});

      return result;
    },

    async queryRecursive(
      params: EngineParams = {},
      context: EngineContext = {}
    ): Promise<EngineResult> {
      const key = `r:${buildKey(configName, params, context)}`;

      // Try cache
      const cached = await Promise.resolve(provider.get<EngineResult>(key));
      if (cached !== undefined) {
        return cached;
      }

      // Cache miss — execute
      const result = await engine.queryRecursive(params, context);

      // Store (fire and forget)
      const totalTtl = ttl + swr;
      Promise.resolve(provider.set(key, result, totalTtl)).catch(() => {});

      return result;
    },

    async count(
      params: EngineParams = {},
      context: EngineContext = {}
    ): Promise<number> {
      if (!cacheCount) return engine.count(params, context);

      const key = `c:${buildKey(configName, params, context)}`;

      const cached = await Promise.resolve(provider.get<number>(key));
      if (cached !== undefined) return cached;

      const result = await engine.count(params, context);
      Promise.resolve(provider.set(key, result, ttl)).catch(() => {});
      return result;
    },

    async exportData(
      params: EngineParams = {},
      context: EngineContext = {}
    ): Promise<string> {
      if (!cacheExport) return engine.exportData(params, context);

      const key = `e:${buildKey(configName, params, context)}`;

      const cached = await Promise.resolve(provider.get<string>(key));
      if (cached !== undefined) return cached;

      const result = await engine.exportData(params, context);
      Promise.resolve(provider.set(key, result, ttl)).catch(() => {});
      return result;
    },

    getConfig: () => engine.getConfig(),
  };
}

/**
 * Wraps multiple engines at once.
 *
 * @example
 * ```ts
 * const engines = createEngines({ db, schema, configs });
 * const cached = withCacheAll(engines, { ttl: 60 });
 * ```
 */
export function withCacheAll(
  engines: Record<string, TableEngine>,
  options?: CacheOptions
): Record<string, TableEngine> {
  const result: Record<string, TableEngine> = {};
  for (const [name, engine] of Object.entries(engines)) {
    result[name] = withCache(engine, options);
  }
  return result;
}

/**
 * Wraps specific engines with different cache configs.
 *
 * @example
 * ```ts
 * const cached = withCacheMap(engines, {
 *   users: { ttl: 300 },
 *   orders: { ttl: 30, provider: redisProvider(redis) },
 *   // products not listed → no cache
 * });
 * ```
 */
export function withCacheMap(
  engines: Record<string, TableEngine>,
  configMap: Record<string, CacheOptions>
): Record<string, TableEngine> {
  const result: Record<string, TableEngine> = {};
  for (const [name, engine] of Object.entries(engines)) {
    if (configMap[name]) {
      result[name] = withCache(engine, configMap[name]);
    } else {
      result[name] = engine;
    }
  }
  return result;
}
