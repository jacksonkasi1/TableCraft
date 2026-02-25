import { TableConfig, ColumnConfig } from '../types/table';
import { EngineParams, FilterParam } from '../types/engine';
import { ValidationError, FieldError } from '../errors';
import { collectSortableJoinFields, collectSelectableJoinFields } from '../utils/joinUtils';

/**
 * Validates request params against the table config BEFORE hitting the database.
 * Catches type mismatches, invalid fields, and bad values early.
 */
export function validateInput(params: EngineParams, config: TableConfig): void {
  validateSelectFields(params, config);
  validateFilterValues(params, config);
  validateSortFields(params, config);
}

function validateSelectFields(params: EngineParams, config: TableConfig): void {
  if (!params.select?.length) return;

  // Build valid set from base columns (non-hidden only)
  const validNames = new Set(config.columns.filter((c) => !c.hidden).map((c) => c.name));

  // Also allow selectable fields from joined tables
  if (config.joins?.length) {
    collectSelectableJoinFields(config.joins, validNames);
  }

  for (const field of params.select) {
    if (!validNames.has(field)) {
      throw new FieldError(field, 'does not exist or is not accessible. Available: ' + [...validNames].join(', '));
    }
  }
}

function validateFilterValues(params: EngineParams, config: TableConfig): void {
  if (!params.filters) return;

  const columnMap = new Map<string, ColumnConfig>();
  for (const col of config.columns) {
    columnMap.set(col.name, col);
  }

  for (const [field, filterOrFilters] of Object.entries(params.filters)) {
    const col = columnMap.get(field);

    if (!col) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'test') {
        console.warn(`[TableCraft] Filter field '${field}' does not exist in table '${config.name}', skipping`);
      }
      continue;
    }

    if (!col.filterable) {
      throw new FieldError(field, 'is not filterable');
    }

    const filters = Array.isArray(filterOrFilters) ? filterOrFilters : [filterOrFilters];
    for (const filter of filters) {
      if (filter.operator === 'isNull' || filter.operator === 'isNotNull') continue;
      validateValueType(field, col.type, filter);
    }
  }
}

function validateValueType(field: string, colType: string, filter: FilterParam): void {
  const value = filter.value;
  if (value === null || value === undefined) return;

  // For array operators, validate each element
  if (filter.operator === 'in' || filter.operator === 'notIn') {
    if (!Array.isArray(value)) {
      // Defensive: requestParser should have already wrapped scalars into arrays.
      // If we still get a scalar here, it means someone called the engine directly
      // without going through parseRequest — give a clear, actionable error.
      throw new ValidationError(
        field,
        `array (for '${filter.operator}' operator). If passing a single value, wrap it in an array: [${JSON.stringify(value)}]`,
        value
      );
    }
    for (const item of value) {
      validateSingleValue(field, colType, item);
    }
    return;
  }

  // For between, validate both bounds
  if (filter.operator === 'between') {
    if (!Array.isArray(value) || value.length !== 2) {
      throw new ValidationError(field, 'array of [min, max]', value);
    }
    validateSingleValue(field, colType, value[0]);
    validateSingleValue(field, colType, value[1]);
    return;
  }

  validateSingleValue(field, colType, value);
}

function validateSingleValue(field: string, colType: string, value: unknown): void {
  switch (colType) {
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ValidationError(field, 'number', value);
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new ValidationError(field, 'boolean', value);
      }
      break;

    case 'uuid':
      if (typeof value !== 'string' || !isValidUUID(value)) {
        throw new ValidationError(field, 'valid UUID', value);
      }
      break;

    case 'date':
      if (typeof value === 'string') {
        const d = new Date(value);
        if (isNaN(d.getTime())) {
          throw new ValidationError(field, 'valid date string', value);
        }
      } else if (!(value instanceof Date)) {
        throw new ValidationError(field, 'date', value);
      }
      break;

    // string, json — accept anything
  }
}

function validateSortFields(params: EngineParams, config: TableConfig): void {
  if (!params.sort?.length) return;

  const sortable = new Set(
    config.columns.filter((c) => c.sortable !== false).map((c) => c.name)
  );

  // Also collect sortable fields from joins (same pattern as FilterBuilder
  // uses collectFilterableJoinFields for filterable fields)
  if (config.joins?.length) {
    collectSortableJoinFields(config.joins, sortable);
  }

  for (const s of params.sort) {
    if (!sortable.has(s.field)) {
      throw new FieldError(s.field, 'is not sortable. Sortable: ' + [...sortable].join(', '));
    }
  }
}



function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
