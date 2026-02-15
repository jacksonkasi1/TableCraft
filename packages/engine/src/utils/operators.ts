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

function isDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value);
}

const STRING_OPERATORS = ['like', 'ilike', 'contains', 'startsWith', 'endsWith'];

function toDbValue(value: unknown, operator?: Operator): unknown {
  if (operator && STRING_OPERATORS.includes(operator)) {
    return value;
  }
  if (isDateString(value)) {
    return new Date(value);
  }
  if (Array.isArray(value)) {
    return value.map(v => {
      if (operator && STRING_OPERATORS.includes(operator)) {
        return v;
      }
      return isDateString(v) ? new Date(v) : v;
    });
  }
  return value;
}

export function applyOperator(
  operator: Operator,
  column: Column,
  value: unknown
): SQL | undefined {
  const dbValue = toDbValue(value, operator);
  
  switch (operator) {
    case 'eq':
      return eq(column, dbValue);
    case 'neq':
      return ne(column, dbValue);
    case 'gt':
      return gt(column, dbValue);
    case 'gte':
      return gte(column, dbValue);
    case 'lt':
      return lt(column, dbValue);
    case 'lte':
      return lte(column, dbValue);
    case 'like':
      return like(column, dbValue as string);
    case 'ilike':
      return ilike(column, dbValue as string);
    case 'in':
      return Array.isArray(dbValue) ? inArray(column, dbValue) : undefined;
    case 'notIn':
      return Array.isArray(dbValue) ? notInArray(column, dbValue) : undefined;
    case 'between':
      return Array.isArray(dbValue) && dbValue.length === 2
        ? between(column, dbValue[0], dbValue[1])
        : undefined;
    case 'isNull':
      return isNull(column);
    case 'isNotNull':
      return isNotNull(column);
    case 'contains':
      return ilike(column, `%${escapeLikePattern(String(dbValue))}%`);
    case 'startsWith':
      return ilike(column, `${escapeLikePattern(String(dbValue))}%`);
    case 'endsWith':
      return ilike(column, `%${escapeLikePattern(String(dbValue))}`);
    default:
      return undefined;
  }
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export { toDbValue, isDateString };
