import {
  Table,
  Column,
  SQL,
  getTableColumns,
  and,
} from 'drizzle-orm';
import { TableConfig } from '../types/table';
import { FilterParam } from '../types/engine';
import { applyOperator } from '../utils/operators';
import { isDatePreset, buildDatePresetCondition } from './datePresets';

export class FilterBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds dynamic WHERE conditions from user-provided filter params.
   * Only allows filtering on columns explicitly marked as filterable.
   */
  buildFilters(
    config: TableConfig,
    params: Record<string, FilterParam>
  ): SQL | undefined {
    if (!params || Object.keys(params).length === 0) {
      return undefined;
    }

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const columns = getTableColumns(table);

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

    // From columns marked filterable (default true)
    for (const col of config.columns) {
      if (col.filterable !== false) {
        filterableFields.add(col.name);
      }
    }

    const conditions: SQL[] = [];

    for (const [field, param] of Object.entries(params)) {
      // Security: reject fields not in the whitelist
      if (!filterableFields.has(field)) continue;

      // Find the config for this field to resolve "field" property
      const colConfig = config.columns.find(c => c.name === field);
      const dbFieldName = colConfig?.field ?? field;

      // Resolve the column — could be on the base table or a joined table
      const col = this.resolveColumn(config, columns, dbFieldName);
      if (!col) continue;

      // Check if value is a date preset
      if (isDatePreset(param.value)) {
        const presetCondition = buildDatePresetCondition(col, param.value);
        if (presetCondition) conditions.push(presetCondition);
        continue;
      }

      const condition = applyOperator(param.operator, col, param.value);
      if (condition) conditions.push(condition);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Builds conditions for filters with type='static' (preset values in config).
   */
  buildStaticFilters(config: TableConfig): SQL | undefined {
    if (!config.filters) return undefined;

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const columns = getTableColumns(table);
    const conditions: SQL[] = [];

    for (const filter of config.filters) {
      if (filter.type !== 'static' || filter.value === undefined) continue;

      const col = columns[filter.field];
      if (!col) continue;

      // Default to 'eq' if not specified (though schema defaults it, z.input might miss it)
      const op = filter.operator ?? 'eq';
      const condition = applyOperator(op, col, filter.value);
      if (condition) conditions.push(condition);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Resolves a column reference. Supports "joinedTable.column" dot-syntax
   * for columns on joined tables.
   */
  private resolveColumn(
    config: TableConfig,
    baseColumns: Record<string, Column>,
    field: string
  ): Column | undefined {
    // Direct column on the base table
    if (baseColumns[field]) {
      return baseColumns[field];
    }

    // Dot-syntax for joined tables: "orders.total"
    if (field.includes('.')) {
      const [tableName, colName] = field.split('.');
      const joinedTable = this.schema[tableName] as Table | undefined;
      if (!joinedTable) return undefined;

      // Verify this table is actually joined
      const isJoined = config.joins?.some(
        (j) => j.table === tableName || j.alias === tableName
      );
      if (!isJoined) return undefined;

      const joinedCols = getTableColumns(joinedTable);
      return joinedCols[colName];
    }

    return undefined;
  }
}
