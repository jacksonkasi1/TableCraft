import { describe, it, expect } from 'vitest';
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
  it('today should return a valid date range', () => {
    const range = resolveDatePreset('today')!;
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
    expect(range.start.getTime()).toBeLessThan(range.end.getTime());
  });

  it('yesterday should return a valid date range', () => {
    const range = resolveDatePreset('yesterday')!;
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
    expect(range.start.getTime()).toBeLessThan(range.end.getTime());
  });

  it('last7days should span approximately 7 days', () => {
    const range = resolveDatePreset('last7days')!;
    const diffDays = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(7);
    expect(diffDays).toBeLessThanOrEqual(9);
  });

  it('thisMonth should return a valid range', () => {
    const range = resolveDatePreset('thisMonth')!;
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
    expect(range.start.getTime()).toBeLessThan(range.end.getTime());
  });

  it('lastMonth should return a valid range', () => {
    const range = resolveDatePreset('lastMonth')!;
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
    expect(range.start.getTime()).toBeLessThan(range.end.getTime());
  });

  it('thisYear should return a valid range', () => {
    const range = resolveDatePreset('thisYear')!;
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
    expect(range.start.getTime()).toBeLessThan(range.end.getTime());
  });

  it('custom should return undefined', () => {
    expect(resolveDatePreset('custom')).toBeUndefined();
  });
});