import {
  Column,
  SQL,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  ilike,
  inArray,
  notInArray,
  between,
  isNull,
  isNotNull,
} from 'drizzle-orm';
import { Operator } from '../types/table';

/**
 * Maps a string operator name + column + value to a Drizzle SQL condition.
 * Shared across QueryBuilder, FilterBuilder, etc.
 */
export function applyOperator(
  operator: Operator,
  column: Column,
  value: unknown
): SQL | undefined {
  switch (operator) {
    case 'eq':
      return eq(column, value);
    case 'neq':
      return ne(column, value);
    case 'gt':
      return gt(column, value);
    case 'gte':
      return gte(column, value);
    case 'lt':
      return lt(column, value);
    case 'lte':
      return lte(column, value);
    case 'like':
      return like(column, value as string);
    case 'ilike':
      return ilike(column, value as string);
    case 'in':
      return Array.isArray(value) ? inArray(column, value) : undefined;
    case 'notIn':
      return Array.isArray(value) ? notInArray(column, value) : undefined;
    case 'between':
      return Array.isArray(value) && value.length === 2
        ? between(column, value[0], value[1])
        : undefined;
    case 'isNull':
      return isNull(column);
    case 'isNotNull':
      return isNotNull(column);
    case 'contains':
      return ilike(column, `%${escapeLikePattern(String(value))}%`);
    case 'startsWith':
      return ilike(column, `${escapeLikePattern(String(value))}%`);
    case 'endsWith':
      return ilike(column, `%${escapeLikePattern(String(value))}`);
    default:
      return undefined;
  }
}

/**
 * Escapes special characters in LIKE/ILIKE patterns to prevent injection.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}
