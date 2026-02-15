import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveDatePreset, isDatePreset } from '../src/core/datePresets';

describe('isDatePreset', () => {
  it('should recognize valid presets', () => {
    expect(isDatePreset('today')).toBe(true);
    expect(isDatePreset('last7days')).toBe(true);
    expect(isDatePreset('thisMonth')).toBe(true);
    expect(isDatePreset('lastQuarter')).toBe(true);
    expect(isDatePreset('custom')).toBe(true);
  });

  it('should reject invalid values', () => {
    expect(isDatePreset('invalid')).toBe(false);
    expect(isDatePreset(123)).toBe(false);
    expect(isDatePreset(null)).toBe(false);
    expect(isDatePreset('2024-01-01')).toBe(false);
  });
});

describe('resolveDatePreset', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('today should return start of today to start of tomorrow (half-open interval)', () => {
    const range = resolveDatePreset('today')!;
    expect(range.start.toISOString()).toBe('2024-06-15T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2024-06-16T00:00:00.000Z');
  });

  it('yesterday should return start of yesterday to start of today (half-open interval)', () => {
    const range = resolveDatePreset('yesterday')!;
    expect(range.start.toISOString()).toBe('2024-06-14T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2024-06-15T00:00:00.000Z');
  });

  it('last7days should span 7 days (half-open interval)', () => {
    const range = resolveDatePreset('last7days')!;
    expect(range.start.toISOString()).toBe('2024-06-08T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2024-06-16T00:00:00.000Z');
    const diffDays = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(8);
  });

  it('thisMonth should return first day of month to tomorrow (half-open interval)', () => {
    const range = resolveDatePreset('thisMonth')!;
    expect(range.start.toISOString()).toBe('2024-06-01T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2024-06-16T00:00:00.000Z');
  });

  it('lastMonth should return full previous month (half-open interval)', () => {
    const range = resolveDatePreset('lastMonth')!;
    expect(range.start.toISOString()).toBe('2024-05-01T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2024-06-01T00:00:00.000Z');
  });

  it('thisYear should return first day of year to tomorrow (half-open interval)', () => {
    const range = resolveDatePreset('thisYear')!;
    expect(range.start.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2024-06-16T00:00:00.000Z');
  });

  it('custom should return undefined', () => {
    expect(resolveDatePreset('custom')).toBeUndefined();
  });
});