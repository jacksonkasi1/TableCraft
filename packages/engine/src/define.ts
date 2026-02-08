import {
  Table,
  SQL,
  getTableName,
} from 'drizzle-orm';
import {
  TableConfig,
  ColumnConfig,
  JoinConfig,
  Operator,
  SortConfig,
  FilterExpression,
  IncludeConfig,
} from './types/table';
import {
  introspectTable,
  getSensitiveColumnNames,
  detectSensitiveColumns,
} from './utils/introspect';

type InferColumns<T> = T extends { _: { columns: infer C } }
  ? keyof C & string
  : string;

// ── Quick Options ──

export interface QuickOptions<T extends Table = Table> {
  hide?: InferColumns<T>[];
  search?: InferColumns<T>[];
  filter?: InferColumns<T>[];
  sort?: string;
  pageSize?: number;
  maxPageSize?: number;
  labels?: Partial<Record<InferColumns<T>, string>>;
}

// ── Runtime Extensions ──
// These hold SQL objects and functions that can't be serialized into TableConfig.

export interface RuntimeExtensions {
  computedExpressions: Map<string, SQL>;
  transforms: Map<string, (value: unknown) => unknown>;
  rawSelects: Map<string, SQL>;
  rawWheres: SQL[];
  rawJoins: SQL[];
  rawOrderBys: SQL[];
  ctes: Map<string, SQL>;
  sqlJoinConditions: Map<string, SQL>;
}

function emptyExtensions(): RuntimeExtensions {
  return {
    computedExpressions: new Map(),
    transforms: new Map(),
    rawSelects: new Map(),
    rawWheres: [],
    rawJoins: [],
    rawOrderBys: [],
    ctes: new Map(),
    sqlJoinConditions: new Map(),
  };
}

// ── Builder ──

export class TableDefinitionBuilder<T extends Table = Table> {
  _config: TableConfig;
  _table: T;
  _ext: RuntimeExtensions;

  constructor(table: T, config: TableConfig) {
    this._table = table;
    this._config = config;
    this._ext = emptyExtensions();
  }

  // ──── Column Visibility ────

  hide(...columns: InferColumns<T>[]): this {
    for (const name of columns) {
      const col = this._config.columns.find((c) => c.name === name);
      if (col) col.hidden = true;
    }
    return this;
  }

  show(...columns: InferColumns<T>[]): this {
    for (const name of columns) {
      const col = this._config.columns.find((c) => c.name === name);
      if (col) col.hidden = false;
    }
    return this;
  }

  only(...columns: InferColumns<T>[]): this {
    const keep = new Set(columns as string[]);
    for (const col of this._config.columns) {
      col.hidden = !keep.has(col.name);
    }
    return this;
  }

  autoHide(): this {
    const sensitive = getSensitiveColumnNames();
    for (const col of this._config.columns) {
      if (sensitive.has(col.name)) col.hidden = true;
    }
    return this;
  }

  inspectSensitive(): string[] {
    return detectSensitiveColumns(this._table);
  }

  // ──── Labels ────

  label(column: InferColumns<T>, lbl: string): this {
    const col = this._config.columns.find((c) => c.name === column);
    if (col) col.label = lbl;
    return this;
  }

  labels(map: Partial<Record<InferColumns<T>, string>>): this {
    for (const [name, lbl] of Object.entries(map)) {
      if (lbl) this.label(name as InferColumns<T>, lbl as string);
    }
    return this;
  }

  // ──── Search ────

  search(...columns: InferColumns<T>[]): this {
    // Cast to unknown first to avoid tuple/array type mismatch in strict mode
    this._config.search = { fields: columns as unknown as string[], enabled: true };
    return this;
  }

  searchAll(): this {
    const textCols = this._config.columns
      .filter((c) => c.type === 'string' && !c.hidden)
      .map((c) => c.name);
    this._config.search = { fields: textCols, enabled: true };
    return this;
  }

  noSearch(): this {
    this._config.search = { fields: [], enabled: false };
    return this;
  }

  // ──── Filtering ────

  filter(...columns: InferColumns<T>[]): this {
    const filterSet = new Set(columns as string[]);
    for (const col of this._config.columns) {
      col.filterable = filterSet.has(col.name);
    }
    return this;
  }

  staticFilter(field: InferColumns<T>, operator: Operator, value: unknown): this {
    if (!this._config.filters) this._config.filters = [];
    this._config.filters.push({ field: field as string, operator, value, type: 'static' });
    return this;
  }

  noFilter(): this {
    for (const col of this._config.columns) col.filterable = false;
    return this;
  }

  // ──── OR Logic / Filter Groups ────

  /**
   * Add an OR group of conditions.
   * @example .whereOr(
   *   { field: 'status', op: 'eq', value: 'active' },
   *   { field: 'priority', op: 'eq', value: 'high' },
   * )
   * → WHERE ... AND (status = 'active' OR priority = 'high')
   */
  whereOr(...conditions: { field: string; op: Operator; value: unknown }[]): this {
    if (!this._config.filterGroups) this._config.filterGroups = [];
    this._config.filterGroups.push({
      type: 'or',
      conditions: conditions.map((c) => ({
        field: c.field,
        operator: c.op,
        value: c.value,
      })),
    });
    return this;
  }

  /**
   * Add a filter group with explicit AND/OR type.
   * Supports nested groups for complex logic.
   * @example .whereGroup('or', [
   *   { field: 'status', operator: 'eq', value: 'active' },
   *   { type: 'and', conditions: [
   *     { field: 'priority', operator: 'eq', value: 'high' },
   *     { field: 'total', operator: 'gt', value: 1000 },
   *   ]},
   * ])
   */
  whereGroup(type: 'and' | 'or', conditions: FilterExpression[]): this {
    if (!this._config.filterGroups) this._config.filterGroups = [];
    this._config.filterGroups.push({ type, conditions });
    return this;
  }

  // ──── Sorting ────

  sort(...specs: string[]): this {
    this._config.defaultSort = specs.map(parseSortSpec);
    return this;
  }

  sortable(...columns: InferColumns<T>[]): this {
    const sortSet = new Set(columns as string[]);
    for (const col of this._config.columns) {
      col.sortable = sortSet.has(col.name);
    }
    return this;
  }

  noSort(): this {
    for (const col of this._config.columns) col.sortable = false;
    this._config.defaultSort = undefined;
    return this;
  }

  // ──── Pagination ────

  pageSize(size: number, options?: { max?: number }): this {
    this._config.pagination = {
      ...this._config.pagination,
      defaultPageSize: size,
      maxPageSize: options?.max ?? this._config.pagination?.maxPageSize ?? 100,
      enabled: true,
    };
    return this;
  }

  noPagination(): this {
    this._config.pagination = { defaultPageSize: 10, maxPageSize: 100, enabled: false };
    return this;
  }

  // ──── Joins (accepts string OR SQL) ────

  join(
    table: Table,
    options?: {
      on?: string | SQL;
      type?: 'left' | 'right' | 'inner' | 'full';
      alias?: string;
      columns?: string[];
    }
  ): this {
    if (!this._config.joins) this._config.joins = [];

    const joinedName = getTableName(table);
    const baseName = this._config.base;
    const key = options?.alias ?? joinedName;

    let onString = '';

    if (options?.on) {
      if (typeof options.on === 'string') {
        // Shorthand: "customerId" → "base.customerId = joined.id"
        if (!options.on.includes('=') && !options.on.includes('.')) {
          onString = `${baseName}.${options.on} = ${joinedName}.id`;
        } else {
          onString = options.on;
        }
      } else {
        // It's a SQL object. Store it in extensions map.
        // We use a placeholder string for the config.
        onString = `__SQL__:${key}`;
        this._ext.sqlJoinConditions.set(key, options.on);
      }
    } else {
      // Default guess
      onString = `${baseName}.${joinedName}Id = ${joinedName}.id`;
    }

    const joinConfig: JoinConfig = {
      table: joinedName,
      type: options?.type ?? 'left',
      on: onString,
      ...(options?.alias && { alias: options.alias }),
      ...(options?.columns && {
        columns: options.columns.map((name) => ({
          name,
          type: 'string' as const,
          hidden: false,
          sortable: true,
          filterable: true,
        })),
      }),
    };

    this._config.joins.push(joinConfig);
    return this;
  }

  // ──── Computed Columns ────

  computed(name: string, expression: SQL, options?: { type?: ColumnConfig['type']; label?: string }): this {
    this._config.columns.push({
      name,
      type: options?.type ?? 'string',
      label: options?.label ?? name,
      hidden: false,
      sortable: true,
      filterable: false,
      computed: true,
    });
    this._ext.computedExpressions.set(name, expression);
    return this;
  }

  // ──── Backend Conditions ────

  where(condition: { field: string; op: Operator; value: unknown }): this {
    if (!this._config.backendConditions) this._config.backendConditions = [];
    this._config.backendConditions.push({
      field: condition.field,
      operator: condition.op,
      value: condition.value,
    });
    return this;
  }

  // ──── Transforms ────

  dbTransform(column: InferColumns<T>, ...transforms: string[]): this {
    const col = this._config.columns.find((c) => c.name === column);
    if (col) col.dbTransform = transforms;
    return this;
  }

  jsTransform(column: InferColumns<T>, ...transforms: string[]): this {
    const col = this._config.columns.find((c) => c.name === column);
    if (col) col.jsTransform = transforms;
    return this;
  }

  transform(column: InferColumns<T>, fn: (value: unknown) => unknown): this {
    this._ext.transforms.set(column as string, fn);
    return this;
  }

  // ──── GROUP BY & HAVING ────

  groupBy(...fields: InferColumns<T>[]): this {
    if (!this._config.groupBy) this._config.groupBy = { fields: [] };
    this._config.groupBy.fields = fields as string[];
    return this;
  }

  having(alias: string, operator: Operator, value: unknown): this {
    if (!this._config.groupBy) this._config.groupBy = { fields: [] };
    if (!this._config.groupBy.having) this._config.groupBy.having = [];
    this._config.groupBy.having.push({ alias, operator, value });
    return this;
  }

  // ──── Aggregations ────

  aggregate(
    alias: string,
    type: 'count' | 'sum' | 'avg' | 'min' | 'max',
    field: InferColumns<T>
  ): this {
    if (!this._config.aggregations) this._config.aggregations = [];
    this._config.aggregations.push({ alias, type, field: field as string });
    return this;
  }

  // ──── Nested Relations (Includes) ────

  include(
    table: Table,
    options: {
      foreignKey: string;
      localKey?: string;
      as: string;
      columns?: string[];
      limit?: number;
      where?: { field: string; op: Operator; value: unknown }[];
      orderBy?: string[];
      // Nested includes would go here (recursive definition needed in types)
    }
  ): this {
    if (!this._config.include) this._config.include = [];

    const includeConfig: IncludeConfig = {
      table: getTableName(table),
      foreignKey: options.foreignKey,
      localKey: options.localKey ?? 'id',
      as: options.as,
      columns: options.columns,
      limit: options.limit,
      where: options.where?.map((w) => ({
        field: w.field,
        operator: w.op,
        value: w.value,
      })),
      orderBy: options.orderBy?.map(parseSortSpec),
    };

    this._config.include.push(includeConfig);
    return this;
  }

  // ──── Recursive Queries (CTE) ────

  recursive(options: {
    parentKey: string;
    childKey?: string;
    maxDepth?: number;
    startWith?: { field: string; op: Operator; value: unknown };
    depthAlias?: string;
    pathAlias?: string;
  }): this {
    this._config.recursive = {
      parentKey: options.parentKey,
      childKey: options.childKey ?? 'id',
      maxDepth: options.maxDepth ?? 10,
      depthAlias: options.depthAlias ?? 'depth',
      pathAlias: options.pathAlias,
      startWith: options.startWith
        ? {
            field: options.startWith.field,
            operator: options.startWith.op,
            value: options.startWith.value,
          }
        : undefined,
    };
    return this;
  }

  // ──── Raw SQL Escape Hatches ────

  rawSelect(alias: string, sqlExpr: SQL): this {
    this._ext.rawSelects.set(alias, sqlExpr);
    // Also register as a computed column so it passes validation
    this._config.columns.push({
      name: alias,
      type: 'string', // Default assume string, user can cast
      hidden: false,
      computed: true,
    });
    return this;
  }

  rawWhere(sqlExpr: SQL): this {
    this._ext.rawWheres.push(sqlExpr);
    return this;
  }

  rawJoin(sqlExpr: SQL): this {
    this._ext.rawJoins.push(sqlExpr);
    return this;
  }

  rawOrderBy(sqlExpr: SQL): this {
    this._ext.rawOrderBys.push(sqlExpr);
    return this;
  }

  cte(name: string, sqlExpr: SQL): this {
    this._ext.ctes.set(name, sqlExpr);
    return this;
  }

  // ──── Subqueries ────

  subquery(
    alias: string,
    table: Table,
    type: 'count' | 'exists' | 'first',
    filter?: string
  ): this {
    if (!this._config.subqueries) this._config.subqueries = [];
    this._config.subqueries.push({
      alias,
      table: getTableName(table),
      type,
      filter,
    });
    return this;
  }

  // ──── Platform Features ────

  softDelete(field?: string): this {
    this._config.softDelete = {
      field: field ?? this._config.softDelete?.field ?? 'deletedAt',
      enabled: true,
    };
    return this;
  }

  tenant(field?: string): this {
    this._config.tenant = {
      field: field ?? this._config.tenant?.field ?? 'tenantId',
      enabled: true,
    };
    return this;
  }

  exportable(...formats: ('csv' | 'json')[]): this {
    this._config.export = {
      formats: formats.length > 0 ? formats : ['csv', 'json'],
      enabled: true,
    };
    return this;
  }

  access(options: { roles?: string[]; permissions?: string[] }): this {
    this._config.access = options;
    return this;
  }

  // ──── Name Override ────

  as(name: string): this {
    this._config.name = name;
    return this;
  }

  // ──── Output ────

  toConfig(): TableConfig {
    return { ...this._config };
  }
}

// ── Main Entry ──

export function defineTable<T extends Table>(
  table: T,
  options?: QuickOptions<T> | TableConfig
): TableDefinitionBuilder<T> {
  if (options && 'columns' in options && Array.isArray(options.columns)) {
    return new TableDefinitionBuilder(table, options as TableConfig);
  }

  const config = introspectTable(table);

  if (options) {
    applyQuickOptions(config, options as QuickOptions<T>);
  }

  return new TableDefinitionBuilder(table, config);
}

// ── Helpers ──

function applyQuickOptions<T extends Table>(
  config: TableConfig,
  options: QuickOptions<T>
): void {
  if (options.hide) {
    for (const name of options.hide) {
      const col = config.columns.find((c) => c.name === name);
      if (col) col.hidden = true;
    }
  }

  if (options.search) {
    config.search = { fields: options.search as string[], enabled: true };
  }

  if (options.filter) {
    const filterSet = new Set(options.filter as string[]);
    for (const col of config.columns) {
      col.filterable = filterSet.has(col.name);
    }
  }

  if (options.sort) {
    const specs = options.sort.split(',').map((s) => s.trim()).filter(Boolean);
    config.defaultSort = specs.map(parseSortSpec);
  }

  if (options.pageSize !== undefined) {
    config.pagination = {
      ...config.pagination,
      defaultPageSize: options.pageSize,
      maxPageSize: options.maxPageSize ?? config.pagination?.maxPageSize ?? 100,
      enabled: true,
    };
  }

  if (options.maxPageSize !== undefined && config.pagination) {
    config.pagination.maxPageSize = options.maxPageSize;
  }

  if (options.labels) {
    for (const [name, label] of Object.entries(options.labels)) {
      if (!label) continue;
      const col = config.columns.find((c) => c.name === name);
      if (col) col.label = label as string;
    }
  }
}

function parseSortSpec(spec: string): SortConfig {
  if (spec.startsWith('-')) {
    return { field: String(spec.slice(1)), order: 'desc' };
  }
  if (spec.startsWith('+')) {
    return { field: String(spec.slice(1)), order: 'asc' };
  }
  return { field: String(spec), order: 'asc' };
}
