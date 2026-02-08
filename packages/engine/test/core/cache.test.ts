import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryCache } from '../../src/core/cache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  it('should set and get a value', () => {
    cache.set('key1', { data: 'hello' }, 60);
    const result = cache.get<{ data: string }>('key1');
    expect(result).toBeDefined();
    expect(result!.value.data).toBe('hello');
    expect(result!.stale).toBe(false);
  });

  it('should return undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should expire after TTL', () => {
    vi.useFakeTimers();
    cache.set('key', 'value', 5); // 5 seconds TTL

    vi.advanceTimersByTime(6000); // 6 seconds later
    expect(cache.get('key')).toBeUndefined();

    vi.useRealTimers();
  });

  it('should return stale during stale-while-revalidate window', () => {
    vi.useFakeTimers();
    cache.set('key', 'value', 5, 10); // 5s TTL, 10s SWR

    vi.advanceTimersByTime(8000); // 8 seconds (past TTL, within SWR)
    const result = cache.get<string>('key');
    expect(result).toBeDefined();
    expect(result!.stale).toBe(true);
    expect(result!.value).toBe('value');

    vi.useRealTimers();
  });

  it('should expire after TTL + SWR', () => {
    vi.useFakeTimers();
    cache.set('key', 'value', 5, 10);

    vi.advanceTimersByTime(16000); // 16 seconds (past both)
    expect(cache.get('key')).toBeUndefined();

    vi.useRealTimers();
  });

  it('should delete a key', () => {
    cache.set('key', 'value', 60);
    cache.delete('key');
    expect(cache.get('key')).toBeUndefined();
  });

  it('should clear all keys', () => {
    cache.set('k1', 'v1', 60);
    cache.set('k2', 'v2', 60);
    cache.clear();
    expect(cache.get('k1')).toBeUndefined();
    expect(cache.get('k2')).toBeUndefined();
  });

  it('should track revalidation status', () => {
    expect(cache.isRevalidating('k1')).toBe(false);
    cache.markRevalidating('k1');
    expect(cache.isRevalidating('k1')).toBe(true);
    cache.unmarkRevalidating('k1');
    expect(cache.isRevalidating('k1')).toBe(false);
  });

  it('should build deterministic keys', () => {
    const k1 = MemoryCache.buildKey('users', { page: 1, sort: 'name' });
    const k2 = MemoryCache.buildKey('users', { sort: 'name', page: 1 });
    expect(k1).toBe(k2);
  });
});
