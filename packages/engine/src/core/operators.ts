import { 
  Column, 
  SQL, 
  eq, ne, gt, gte, lt, lte, like, ilike, inArray, notInArray, between, isNull, isNotNull 
} from 'drizzle-orm';
import { Operator } from '../types/table';

export const mapOperator = (operator: Operator, column: Column, value: any): SQL | undefined => {
  switch (operator) {
    case 'eq': return eq(column, value);
    case 'neq': return ne(column, value);
    case 'gt': return gt(column, value);
    case 'gte': return gte(column, value);
    case 'lt': return lt(column, value);
    case 'lte': return lte(column, value);
    case 'like': return like(column, value);
    case 'ilike': return ilike(column, value);
    case 'in': return Array.isArray(value) ? inArray(column, value) : undefined;
    case 'notIn': return Array.isArray(value) ? notInArray(column, value) : undefined;
    case 'between': return Array.isArray(value) && value.length === 2 ? between(column, value[0], value[1]) : undefined;
    case 'isNull': return isNull(column);
    case 'isNotNull': return isNotNull(column);
    case 'contains': return ilike(column, `%${value}%`);
    case 'startsWith': return ilike(column, `${value}%`);
    case 'endsWith': return ilike(column, `%${value}`);
    default: return undefined;
  }
};
