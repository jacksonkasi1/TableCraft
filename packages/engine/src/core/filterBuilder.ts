import {
  Table,
  Column,
  SQL,
  getTableColumns,
  and,
} from 'drizzle-orm';
import { TableConfig, JoinConfig, ColumnConfig } from '../types/table.js';
import { FilterParam } from '../types/engine.js';
import { applyOperator } from '../utils/operators.js';
import { isDatePreset, buildDatePresetCondition } from './datePresets.js';
// ** import utils
import {
  collectFilterableJoinFields,
  findJoin,
  getJoinTable,
  isJoinColumnInJoins,
} from '../utils/joinUtils.js';

// Internal: resolved column reference plus the config entry it came from
interface ResolvedColumn {
  column: Column;
  colConfig: ColumnConfig | undefined;
  /** True when this column came from a join (not the base table) */
  fromJoin: boolean;
}

export class FilterBuilder {
  constructor(private schema: Record<string, unknown>) { }

  /**
   * Builds dynamic WHERE conditions from user-provided filter params.
   * Only allows filtering on columns explicitly marked as filterable.
   */
  buildFilters(
    config: TableConfig,
    params: Record<string, FilterParam | FilterParam[]>
  ): SQL | undefined {
    if (!params || Object.keys(params).length === 0) {
      return undefined;
    }

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const baseColumns = getTableColumns(table);

    // Build a whitelist of filterable field names
    const filterableFields = new Set<string>();

    // From explicit dynamic filter definitions
    if (config.filters) {
      for (const f of config.filters) {
        if (f.type !== 'static') {
          filterableFields.add(f.field);
        }
      }
    }

    // From base columns marked filterable (default true)
    for (const col of config.columns) {
      if (col.filterable !== false) {
        filterableFields.add(col.name);
      }
    }

    // From join columns marked filterable (recursive)
    const joinFields = new Set<string>();
    if (config.joins) {
      collectFilterableJoinFields(config.joins, joinFields);
      for (const jf of joinFields) {
        filterableFields.add(jf);
      }
    }

    const conditions: SQL[] = [];

    for (const [field, paramOrParams] of Object.entries(params)) {
      // Security: reject fields not in the whitelist
      if (!filterableFields.has(field)) continue;

      // Determine whether this field is a join column using the Set
      const isJoinField = joinFields.has(field);

      // Resolve the column — could be on the base table or a joined table.
      // Pass isJoinField so that base-table columns can never shadow join columns.
      const resolved = this.resolveColumn(config, baseColumns, field, isJoinField);
      if (!resolved) {
        console.warn(`[FilterBuilder] Could not resolve column "${field}" — filter skipped`);
        continue;
      }

      const { column: col } = resolved;
      const paramsList = Array.isArray(paramOrParams) ? paramOrParams : [paramOrParams];

      for (const param of paramsList) {
        // Check if value is a date preset
        if (isDatePreset(param.value)) {
          const presetCondition = buildDatePresetCondition(col, param.value);
          if (presetCondition) conditions.push(presetCondition);
          continue;
        }

        const condition = applyOperator(param.operator, col, param.value);
        if (condition) conditions.push(condition);
      }
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Builds conditions for filters with type='static' (preset values in config).
   * Supports both base columns and join columns.
   */
  buildStaticFilters(config: TableConfig): SQL | undefined {
    if (!config.filters) return undefined;

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const baseColumns = getTableColumns(table);
    const conditions: SQL[] = [];

    for (const filter of config.filters) {
      if (filter.type !== 'static' || filter.value === undefined) continue;

      const isJoinField = isJoinColumnInJoins(config.joins ?? [], filter.field);
      const resolved = this.resolveColumn(config, baseColumns, filter.field, isJoinField);

      if (!resolved) {
        console.warn(`[FilterBuilder] Static filter: could not resolve column "${filter.field}" — skipped`);
        continue;
      }

      const col = resolved.column;
      const op = filter.operator ?? 'eq';
      const condition = applyOperator(op, col, filter.value);
      if (condition) conditions.push(condition);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Resolves a column reference. Supports:
   * 1. Direct column on the base table (only when isJoinField is false)
   * 2. Dot-syntax for joined tables: "users.role"
   * 3. Plain aliased name from a joined table: "role" (searched recursively through join configs)
   *
   * When `isJoinField` is true the base-column lookup is skipped entirely to prevent
   * a base-schema column with the same name from silently shadowing a join column.
   */
  private resolveColumn(
    config: TableConfig,
    baseColumns: Record<string, Column>,
    field: string,
    isJoinField: boolean
  ): ResolvedColumn | undefined {
    const baseColConfig = config.columns.find(c => c.name === field);
    const dbField = baseColConfig?.field ?? field;
    if (dbField.includes('.')) {
      const [tableName, colName] = dbField.split('.');
      const join = findJoin(config.joins ?? [], tableName);
      const joinedTable = join && getJoinTable(this.schema, join);
      if (!joinedTable) return undefined;

      const column = getTableColumns(joinedTable)[colName];
      return column ? { column, colConfig: baseColConfig, fromJoin: true } : undefined;
    }

    // If this field belongs to a join, skip the base column entirely to avoid shadowing
    if (!isJoinField) {
      const column = baseColumns[dbField];
      if (column) {
        return { column, colConfig: baseColConfig, fromJoin: false };
      }
    }

    // Plain name — search join configs recursively
    return this.resolveJoinColumn(config, field);
  }

  /**
   * Searches join configs recursively for a column with the given plain name.
   * Returns the drizzle Column from the joined table's schema.
   */
  private resolveJoinColumn(
    config: { joins?: JoinConfig[] },
    fieldName: string
  ): ResolvedColumn | undefined {
    if (!config.joins) return undefined;

    for (const join of config.joins) {
      const joinColConfig = join.columns?.find(c => c.name === fieldName);

      if (joinColConfig) {
        const joinedTable = getJoinTable(this.schema, join);
        const dbCol = joinColConfig.field ?? fieldName;
        const column = joinedTable && getTableColumns(joinedTable)[dbCol];
        if (column) return { column, colConfig: joinColConfig, fromJoin: true };
      }

      // Recurse into nested joins
      if (join.joins) {
        const nested = this.resolveJoinColumn({ joins: join.joins }, fieldName);
        if (nested) return nested;
      }
    }

    return undefined;
  }
}

