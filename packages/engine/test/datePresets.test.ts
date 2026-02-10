import { describe, it, expect, beforeEach, afterEach, setSystemTime } from 'bun:test';
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
    setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    setSystemTime();
  });

  it('today should be start of today to start of tomorrow', () => {
    const range = resolveDatePreset('today')!;
    expect(range.start.toISOString()).toBe('2024-06-15T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2024-06-16T00:00:00.000Z');
  });

  it('yesterday should be start of yesterday to start of today', () => {
    const range = resolveDatePreset('yesterday')!;
    expect(range.start.toISOString()).toBe('2024-06-14T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2024-06-15T00:00:00.000Z');
  });

  it('last7days should span 7 days back', () => {
    const range = resolveDatePreset('last7days')!;
    expect(range.start.toISOString()).toBe('2024-06-08T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2024-06-16T00:00:00.000Z');
  });

  it('thisMonth should be start of June', () => {
    const range = resolveDatePreset('thisMonth')!;
    expect(range.start.toISOString()).toBe('2024-06-01T00:00:00.000Z');
  });

  it('lastMonth should be May', () => {
    const range = resolveDatePreset('lastMonth')!;
    expect(range.start.toISOString()).toBe('2024-05-01T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2024-06-01T00:00:00.000Z');
  });

  it('thisYear should start from January 1st', () => {
    const range = resolveDatePreset('thisYear')!;
    expect(range.start.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('custom should return undefined', () => {
    expect(resolveDatePreset('custom')).toBeUndefined();
  });
});
