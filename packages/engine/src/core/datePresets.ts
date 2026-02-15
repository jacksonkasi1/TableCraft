import { Column, SQL, and, gte, lt } from 'drizzle-orm';
import { DatePreset } from '../types/table';

/**
 * Resolves a date preset name into a concrete date range.
 * All dates are in UTC.
 */
export function resolveDatePreset(preset: DatePreset): { start: Date; end: Date } | undefined {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  switch (preset) {
    case 'today':
      return { start: today, end: tomorrow };

    case 'yesterday':
      return { start: addDays(today, -1), end: today };

    case 'last7days':
      return { start: addDays(today, -7), end: tomorrow };

    case 'last30days':
      return { start: addDays(today, -30), end: tomorrow };

    case 'last90days':
      return { start: addDays(today, -90), end: tomorrow };

    case 'thisWeek':
      return { start: startOfWeek(today), end: tomorrow };

    case 'lastWeek': {
      const thisWeekStart = startOfWeek(today);
      return { start: addDays(thisWeekStart, -7), end: thisWeekStart };
    }

    case 'thisMonth':
      return { start: startOfMonth(today), end: tomorrow };

    case 'lastMonth': {
      const thisMonthStart = startOfMonth(today);
      const lastMonthStart = new Date(thisMonthStart);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      return { start: lastMonthStart, end: thisMonthStart };
    }

    case 'thisQuarter':
      return { start: startOfQuarter(today), end: tomorrow };

    case 'lastQuarter': {
      const thisQ = startOfQuarter(today);
      const lastQ = new Date(thisQ);
      lastQ.setMonth(lastQ.getMonth() - 3);
      return { start: lastQ, end: thisQ };
    }

    case 'thisYear':
      return { start: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), end: tomorrow };

    case 'lastYear': {
      const year = today.getUTCFullYear();
      return { start: new Date(Date.UTC(year - 1, 0, 1)), end: new Date(Date.UTC(year, 0, 1)) };
    }

    case 'custom':
      return undefined;

    default:
      return undefined;
  }
}

/**
 * Builds a SQL WHERE condition from a date preset.
 */
export function buildDatePresetCondition(
  column: Column,
  preset: DatePreset
): SQL | undefined {
  const range = resolveDatePreset(preset);
  if (!range) return undefined;

  return and(
    gte(column, range.start),
    lt(column, range.end)
  );
}

/**
 * Checks if a filter value is a date preset name.
 */
export function isDatePreset(value: unknown): value is DatePreset {
  const presets = new Set([
    'today', 'yesterday', 'last7days', 'last30days', 'last90days',
    'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth',
    'thisQuarter', 'lastQuarter', 'thisYear', 'lastYear', 'custom',
  ]);
  return typeof value === 'string' && presets.has(value as string);
}

// ── Date helpers (no dependencies) ──

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + n);
  return result;
}

function startOfWeek(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = start
  return addDays(startOfDay(d), -diff);
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(Date.UTC(d.getFullYear(), q, 1));
}
