import { TableConfig, ColumnConfig, JoinConfig } from '../types/table';
import { EngineContext } from '../types/engine';

/**
 * The metadata response that describes a table's schema to the frontend.
 * Everything the frontend needs to auto-build a data table.
 */
export interface TableMetadata {
  name: string;
  dateRangeColumn?: string | null;
  dateColumns: string[];
  columns: ColumnMetadata[];
  capabilities: {
    search: boolean;
    searchFields: string[];
    export: boolean;
    exportFormats: string[];
    pagination: {
      enabled: boolean;
      defaultPageSize: number;
      maxPageSize: number;
      cursor: boolean;
    };
    sort: {
      enabled: boolean;
      defaultSort: { field: string; order: string }[];
    };
    groupBy: boolean;
    groupByFields: string[];
    recursive: boolean;
  };
  filters: FilterMetadata[];
  aggregations: AggregationMetadata[];
  includes: IncludeMetadata[];
  staticFilters: string[];
}

export interface ColumnMetadata {
  name: string;
  type: string;
  label: string;
  hidden: boolean;
  sortable: boolean;
  filterable: boolean;
  computed?: boolean;
  source?: 'base' | 'join' | 'computed' | 'subquery';
  joinTable?: string;
  format?: string;
  align?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  options?: { value: string | number | boolean; label: string; color?: string }[];
  datePresets?: string[];
  operators: string[];
}

export interface FilterMetadata {
  field: string;
  type: string;
  label: string;
  operators: string[];
  options?: { value: string | number | boolean; label: string; color?: string }[];
  datePresets?: string[];
}

export interface AggregationMetadata {
  alias: string;
  type: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field: string;
}

export interface IncludeMetadata {
  as: string;
  table: string;
  columns?: string[];
  nested?: IncludeMetadata[];
}

/**
 * Builds metadata from a TableConfig, filtered by the requesting user's roles.
 * Handles: base columns, join columns, computed columns, subqueries,
 * aggregations, includes, groupBy, recursive, and static filters.
 */
export function buildMetadata(
  config: TableConfig,
  context?: EngineContext
): TableMetadata {
  const userRoles = context?.user?.roles ?? [];

  // ── Collect ALL columns from every source ──

  const allColumns: (ColumnConfig & { _source?: string; _joinTable?: string })[] = [];

  // 1. Base table columns (includes computed columns added via .computed())
  for (const col of config.columns) {
    allColumns.push({
      ...col,
      _source: col.computed ? 'computed' : 'base',
    } as any);
  }

  // 2. Join columns — walk the join tree recursively
  if (config.joins) {
    collectJoinColumnsRecursive(config.joins, allColumns);
  }

  // 3. Subquery virtual columns
  if (config.subqueries) {
    for (const sub of config.subqueries) {
      // Subqueries produce a virtual column with the alias name
      // Only add if not already in allColumns (define.ts builder always pre-populates
      // via .subquery(), but raw TableConfig JSON objects bypass the builder).
      if (!allColumns.some(c => c.name === sub.alias)) {
        // 'first' mode returns row_to_json() — non-scalar JSON object.
        // 'count' returns integer, 'exists' returns boolean.
        // filterable: false matches define.ts to keep both paths consistent.
        const subqueryType = sub.type === 'exists' ? 'boolean' : sub.type === 'count' ? 'number' : 'json';
        allColumns.push({
          name: sub.alias,
          type: subqueryType,
          label: sub.alias,
          hidden: false,
          sortable: sub.type !== 'first',
          filterable: false,
          computed: true,
          _source: 'subquery',
        } as any);
      }
    }
  }

  // ── Filter by role-based visibility ──

  const visibleColumns = allColumns.filter((col) => {
    if (col.hidden) return false;
    const visibleTo = (col as any).visibleTo as string[] | undefined;
    if (!visibleTo || visibleTo.length === 0) return true;
    if (userRoles.length === 0) return false;
    return visibleTo.some((role) => userRoles.includes(role));
  });

  // ── Build column metadata ──

  const columns: ColumnMetadata[] = visibleColumns.map((col) => {
    const source = (col as any)._source as string | undefined;
    const joinTable = (col as any)._joinTable as string | undefined;

    return {
      name: col.name,
      type: col.type,
      label: col.label ?? col.name,
      hidden: false,
      sortable: col.sortable ?? true,
      filterable: col.filterable ?? true,
      computed: col.computed ?? false,
      source: (source ?? 'base') as 'base' | 'join' | 'computed' | 'subquery',
      ...(joinTable && { joinTable }),
      format: (col as any).format,
      align: (col as any).align,
      width: (col as any).width,
      minWidth: (col as any).minWidth,
      maxWidth: (col as any).maxWidth,
      options: (col as any).options,
      datePresets: (col as any).datePresets,
      operators: getOperatorsForType(col.type),
    };
  });

  // ── Build filter metadata (only filterable visible columns) ──

  const filters: FilterMetadata[] = visibleColumns
    .filter((col) => col.filterable)
    .map((col) => ({
      field: col.name,
      type: col.type,
      label: col.label ?? col.name,
      operators: getOperatorsForType(col.type),
      options: (col as any).options,
      datePresets: (col as any).datePresets,
    }));

  // ── Build aggregation metadata ──

  const aggregations: AggregationMetadata[] = (config.aggregations ?? []).map(agg => ({
    alias: agg.alias,
    type: agg.type,
    field: agg.field,
  }));

  // ── Build include metadata (nested relations) ──

  const includes: IncludeMetadata[] = (config.include ?? []).map(buildIncludeMetadata);

  // ── Build static filters list (inform frontend about pre-applied filters) ──

  const staticFilters: string[] = [];
  if (config.filters) {
    for (const f of config.filters) {
      if (f.type === 'static') staticFilters.push(f.field);
    }
  }
  if (config.backendConditions) {
    for (const bc of config.backendConditions) {
      staticFilters.push(bc.field);
    }
  }

  // ── Auto-detect date range column if not explicit ──
  const dateColumns = allColumns
    .filter(c => c.type === 'date' && !c.computed && !c.hidden)
    .map(c => c.name);

  let dateRangeColumn: string | null = null;
  
  if (config.dateRangeColumn) {
    const colDef = allColumns.find(c => c.name === config.dateRangeColumn);
    if (colDef && colDef.type === 'date' && !colDef.computed && !colDef.hidden) {
      dateRangeColumn = config.dateRangeColumn;
    }
  }
  
  if (!dateRangeColumn && dateColumns.length > 0) {
    const hasCreatedAt = dateColumns.includes('createdAt') || dateColumns.includes('created_at');
    if (hasCreatedAt) {
      dateRangeColumn = dateColumns.find(c => c === 'createdAt' || c === 'created_at') ?? null;
    } else {
      dateRangeColumn = dateColumns[0];
    }
  }

  return {
    name: config.name,
    dateRangeColumn,
    dateColumns,
    columns,
    capabilities: {
      search: config.search?.enabled ?? false,
      searchFields: config.search?.fields ?? [],
      export: config.export?.enabled ?? true,
      exportFormats: config.export?.formats ?? ['csv', 'json'],
      pagination: {
        enabled: config.pagination?.enabled ?? true,
        defaultPageSize: config.pagination?.defaultPageSize ?? 10,
        maxPageSize: config.pagination?.maxPageSize ?? 100,
        cursor: true,
      },
      sort: {
        enabled: visibleColumns.some((c) => c.sortable),
        defaultSort: (config.defaultSort ?? []).map(s => ({
          field: s.field,
          order: s.order ?? 'asc'
        })),
      },
      groupBy: !!(config.groupBy?.fields?.length),
      groupByFields: config.groupBy?.fields ?? [],
      recursive: !!config.recursive,
    },
    filters,
    aggregations,
    includes,
    staticFilters,
  };
}

/**
 * Recursively collects columns from join configs.
 */
function collectJoinColumnsRecursive(
  joins: JoinConfig[],
  out: (ColumnConfig & { _source?: string; _joinTable?: string })[]
): void {
  for (const join of joins) {
    if (join.columns) {
      for (const col of join.columns) {
        // Skip if a column with the same name already exists (base takes priority)
        if (!out.some(c => c.name === col.name)) {
          out.push({
            ...col,
            _source: 'join',
            _joinTable: join.alias ?? join.table,
          } as any);
        }
      }
    }
    // Recurse into nested joins
    if (join.joins) {
      collectJoinColumnsRecursive(join.joins, out);
    }
  }
}

/**
 * Builds metadata for an include config, recursing into nested includes.
 */
function buildIncludeMetadata(inc: any): IncludeMetadata {
  const meta: IncludeMetadata = {
    as: inc.as,
    table: inc.table,
  };
  if (inc.columns?.length) meta.columns = inc.columns;
  if (inc.include?.length) {
    meta.nested = inc.include.map(buildIncludeMetadata);
  }
  return meta;
}

/**
 * Returns the valid filter operators for a column type.
 */
function getOperatorsForType(type: string): string[] {
  const common = ['eq', 'neq', 'isNull', 'isNotNull'];

  switch (type) {
    case 'string':
      return [...common, 'contains', 'startsWith', 'endsWith', 'like', 'ilike', 'in', 'notIn'];
    case 'number':
      return [...common, 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn'];
    case 'date':
      return [...common, 'gt', 'gte', 'lt', 'lte', 'between'];
    case 'boolean':
      return ['eq', 'neq'];
    case 'uuid':
      return [...common, 'in', 'notIn'];
    case 'json':
      return ['eq', 'neq', 'isNull', 'isNotNull'];
    default:
      return common;
  }
}
