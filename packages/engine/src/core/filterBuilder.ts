import {
  Table,
  Column,
  SQL,
  getTableColumns,
  and,
} from 'drizzle-orm';
import { TableConfig, JoinConfig, ColumnConfig } from '../types/table';
import { FilterParam } from '../types/engine';
import { applyOperator } from '../utils/operators';
import { isDatePreset, buildDatePresetCondition } from './datePresets';

// Internal: resolved column reference plus the config entry it came from
interface ResolvedColumn {
  column: Column;
  colConfig: ColumnConfig | undefined;
  /** True when this column came from a join (not the base table) */
  fromJoin: boolean;
}

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
    if (config.joins) {
      collectFilterableJoinFields(config.joins, filterableFields);
    }

    const conditions: SQL[] = [];

    for (const [field, param] of Object.entries(params)) {
      // Security: reject fields not in the whitelist
      if (!filterableFields.has(field)) continue;

      // Determine whether this field is a join column
      const isJoinField = isJoinColumn(config, field);

      // Resolve the column — could be on the base table or a joined table.
      // Pass isJoinField so that base-table columns can never shadow join columns.
      const resolved = this.resolveColumn(config, baseColumns, field, isJoinField);
      if (!resolved) {
        console.warn(`[FilterBuilder] Could not resolve column "${field}" — filter skipped`);
        continue;
      }

      const { column: col, colConfig } = resolved;

      // Allow the config to override the db field name via colConfig.field
      // (already handled inside resolveColumn, but colConfig is available for future use)
      void colConfig;

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

      // Try base column first; fall back to join column
      let col: Column | undefined = baseColumns[filter.field];

      if (!col) {
        // Look in join columns (recursive)
        const resolved = this.resolveJoinColumn(config, filter.field);
        col = resolved?.column;
      }

      if (!col) {
        console.warn(`[FilterBuilder] Static filter: could not resolve column "${filter.field}" — skipped`);
        continue;
      }

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
    // Dot-syntax takes priority regardless of join vs base — it is explicit
    if (field.includes('.')) {
      const [tableName, colName] = field.split('.');
      const joinedTable = this.schema[tableName] as Table | undefined;
      if (!joinedTable) return undefined;

      // Verify this table is actually joined (security check)
      const isJoined = config.joins?.some(
        (j) => j.table === tableName || j.alias === tableName
      );
      if (!isJoined) return undefined;

      const joinedCols = getTableColumns(joinedTable);
      const column = joinedCols[colName];
      return column ? { column, colConfig: undefined, fromJoin: true } : undefined;
    }

    // If this field belongs to a join, skip the base column entirely to avoid shadowing
    if (!isJoinField) {
      const baseColConfig = config.columns.find(c => c.name === field);
      const dbFieldName = baseColConfig?.field ?? field;
      const column = baseColumns[dbFieldName];
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const joinColConfig = (join.columns as any[] | undefined)?.find(
        (c: ColumnConfig) => c.name === fieldName
      ) as ColumnConfig | undefined;

      if (joinColConfig) {
        const joinedTable = this.schema[join.table] as Table | undefined;
        if (!joinedTable) continue;

        const joinedCols = getTableColumns(joinedTable);
        const dbCol = joinColConfig.field ?? fieldName;
        const column = joinedCols[dbCol];
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

// ---------------------------------------------------------------------------
// Module-level helpers (pure, no `this` dependency)
// ---------------------------------------------------------------------------

/**
 * Recursively populates `out` with filterable field names from all join configs.
 */
function collectFilterableJoinFields(joins: JoinConfig[], out: Set<string>): void {
  for (const join of joins) {
    if (join.columns) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const col of join.columns as any[]) {
        if ((col as ColumnConfig).filterable !== false) {
          out.add((col as ColumnConfig).name);
        }
      }
    }
    if (join.joins) {
      collectFilterableJoinFields(join.joins, out);
    }
  }
}

/**
 * Returns true if `fieldName` is defined in any join config (recursively).
 * Used to prevent base-table columns from shadowing join columns.
 */
function isJoinColumn(config: TableConfig, fieldName: string): boolean {
  if (!config.joins) return false;
  return isJoinColumnInJoins(config.joins, fieldName);
}

function isJoinColumnInJoins(joins: JoinConfig[], fieldName: string): boolean {
  for (const join of joins) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((join.columns as any[] | undefined)?.some((c: ColumnConfig) => c.name === fieldName)) {
      return true;
    }
    if (join.joins && isJoinColumnInJoins(join.joins, fieldName)) {
      return true;
    }
  }
  return false;
}
