import {
  Table,
  SQL,
  getTableName,
  eq, ne, gt, gte, lt, lte,
  like, ilike, inArray, notInArray,
  between, notBetween, isNull, isNotNull,
  exists, notExists, and, or, not, sql
} from 'drizzle-orm';

export const drizzleOperators = {
  eq, ne, gt, gte, lt, lte,
  like, ilike, inArray, notInArray,
  between, notBetween, isNull, isNotNull,
  exists, notExists, and, or, not, sql
};

// ** import types
import { EngineParams, EngineContext } from './types/engine';
import {
  TableConfig,
  ColumnConfig,
  JoinConfig,
  Operator,
  SortConfig,
  FilterExpression,
  IncludeConfig,
  ColumnFormat,
  DatePreset,
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

export interface RuntimeExtensions<T extends Table = Table> {
  computedExpressions: Map<string, SQL>;
  transforms: Map<string, (value: unknown) => unknown>;
  rawSelects: Map<string, SQL>;
  rawWheres: SQL[];
  dynamicWheres: ((
    ctx: { query: EngineParams; context: EngineContext },
    ops: typeof drizzleOperators,
    table: T
  ) => SQL | undefined | Promise<SQL | undefined>)[];
  rawJoins: SQL[];
  rawOrderBys: SQL[];
  ctes: Map<string, SQL>;
  sqlJoinConditions: Map<string, SQL>;
  hooks?: {
    beforeQuery?: (params: any, context: any) => any;
    afterQuery?: (data: Record<string, unknown>[], params: any, context: any) => any;
    onError?: (error: Error, params: any, context: any) => any;
  };
}

function emptyExtensions<T extends Table = Table>(): RuntimeExtensions<T> {
  return {
    computedExpressions: new Map(),
    transforms: new Map(),
    rawSelects: new Map(),
    rawWheres: [],
    dynamicWheres: [],
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
  _ext: RuntimeExtensions<T>;

  constructor(table: T, config: TableConfig) {
    this._table = table;
    this._config = config;
    this._ext = emptyExtensions();
  }

  // ──── Column Format / Metadata ────

  /** Set display format for a column */
  format(column: InferColumns<T>, fmt: ColumnFormat): this {
    const col = this._config.columns.find((c) => c.name === column);
    if (col) (col as any).format = fmt;
    return this;
  }

  /** Set column alignment */
  align(column: InferColumns<T>, alignment: 'left' | 'center' | 'right'): this {
    const col = this._config.columns.find((c) => c.name === column);
    if (col) (col as any).align = alignment;
    return this;
  }

  /** Set column width (px) */
  width(column: InferColumns<T>, w: number, options?: { min?: number; max?: number }): this {
    const col = this._config.columns.find((c) => c.name === column);
    if (col) {
      (col as any).width = w;
      if (options?.min) (col as any).minWidth = options.min;
      if (options?.max) (col as any).maxWidth = options.max;
    }
    return this;
  }

  // ──── Enum Options ────

  /**
   * Declare the valid values for a column.
   * Used by frontend to render dropdown filters.
   * @example
   * .options('status', [
   *   { value: 'active', label: 'Active', color: 'green' },
   *   { value: 'inactive', label: 'Inactive', color: 'gray' },
   *   { value: 'banned', label: 'Banned', color: 'red' },
   * ])
   */
  options(
    column: InferColumns<T>,
    opts: { value: string | number | boolean; label: string; color?: string }[]
  ): this {
    const col = this._config.columns.find((c) => c.name === column);
    if (col) (col as any).options = opts;
    return this;
  }

  // ──── Date Presets ────

  /**
   * Set which date presets are available for filtering.
   * @example
   * .datePresets('createdAt', ['today', 'last7days', 'thisMonth', 'custom'])
   */
  datePresets(
    column: InferColumns<T>,
    presets: DatePreset[]
  ): this {
    const col = this._config.columns.find((c) => c.name === column);
    if (col) (col as any).datePresets = presets;
    return this;
  }

  // ──── Role-Based Column Visibility ────

  /**
   * Restrict column visibility to specific roles.
   * Columns without visibleTo are visible to everyone.
   * @example
   * .visibleTo('salary', ['admin', 'hr'])
   * .visibleTo('internalNotes', ['admin'])
   */
  visibleTo(column: InferColumns<T>, roles: string[]): this {
    const col = this._config.columns.find((c) => c.name === column);
    if (col) (col as any).visibleTo = roles;
    return this;
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

  computed(name: string, expression: SQL, options?: { type?: ColumnConfig['type']; label?: string; sortable?: boolean }): this {
    this._config.columns.push({
      name,
      type: options?.type ?? 'string',
      label: options?.label ?? name,
      hidden: false,
      sortable: options?.sortable ?? true,
      filterable: false,
      computed: true,
    });
    this._ext.computedExpressions.set(name, expression);
    return this;
  }

  // ──── Backend Conditions ────

  where(
    condition:
      | { field: string; op: Operator; value: unknown }
      | ((
          ctx: { query: EngineParams; context: EngineContext },
          ops: typeof drizzleOperators,
          table: T
        ) => SQL | undefined | Promise<SQL | undefined>)
  ): this {
    if (typeof condition === 'function') {
      this._ext.dynamicWheres.push(condition);
      return this;
    }

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

  // ──── Column Metadata (universal) ────

  /**
   * Enrich any column's metadata — works on base columns, join columns,
   * computed columns, rawSelect columns, or any column by name.
   *
   * Use this to describe raw SQL columns to the frontend, or override
   * any auto-detected metadata.
   *
   * @example
   * .rawSelect('revenue', sql`SUM(orders.total)`)
   * .columnMeta('revenue', {
   *   type: 'number',
   *   label: 'Total Revenue',
   *   format: 'currency',
   *   align: 'right',
   *   filterable: true,
   *   sortable: true,
   *   options: [
   *     { value: 'high', label: 'High (>$1000)', color: 'green' },
   *   ],
   * })
   */
  columnMeta(
    column: string,
    meta: {
      type?: ColumnConfig['type'];
      label?: string;
      format?: ColumnFormat;
      align?: 'left' | 'center' | 'right';
      width?: number;
      minWidth?: number;
      maxWidth?: number;
      sortable?: boolean;
      filterable?: boolean;
      hidden?: boolean;
      options?: { value: string | number | boolean; label: string; color?: string }[];
      datePresets?: DatePreset[];
      visibleTo?: string[];
    }
  ): this {
    // Find in base columns first
    let col = this._config.columns.find((c) => c.name === column);

    // Then search join columns
    if (!col && this._config.joins) {
      col = this._findJoinColumn(this._config.joins, column);
    }

    if (!col) {
      // Column doesn't exist yet — this is fine for rawSelect/computed that
      // haven't been registered yet. Create a placeholder.
      col = {
        name: column,
        type: meta.type ?? 'string',
        hidden: false,
        computed: true,
      };
      this._config.columns.push(col);
    }

    // Apply all provided metadata
    if (meta.type !== undefined) col.type = meta.type;
    if (meta.label !== undefined) col.label = meta.label;
    if (meta.sortable !== undefined) col.sortable = meta.sortable;
    if (meta.filterable !== undefined) col.filterable = meta.filterable;
    if (meta.hidden !== undefined) col.hidden = meta.hidden;
    if (meta.format !== undefined) (col as any).format = meta.format;
    if (meta.align !== undefined) (col as any).align = meta.align;
    if (meta.width !== undefined) (col as any).width = meta.width;
    if (meta.minWidth !== undefined) (col as any).minWidth = meta.minWidth;
    if (meta.maxWidth !== undefined) (col as any).maxWidth = meta.maxWidth;
    if (meta.options !== undefined) (col as any).options = meta.options;
    if (meta.datePresets !== undefined) (col as any).datePresets = meta.datePresets;
    if (meta.visibleTo !== undefined) (col as any).visibleTo = meta.visibleTo;

    return this;
  }

  /** Find a column inside the join tree by name */
  private _findJoinColumn(joins: JoinConfig[], name: string): ColumnConfig | undefined {
    for (const join of joins) {
      if (join.columns) {
        const col = join.columns.find((c: ColumnConfig) => c.name === name);
        if (col) return col;
      }
      if (join.joins) {
        const found = this._findJoinColumn(join.joins, name);
        if (found) return found;
      }
    }
    return undefined;
  }

  // ──── Raw SQL Escape Hatches ────

  /**
   * Add a raw SQL expression as a select column.
   * By default typed as 'string'. Use the options parameter or
   * chain `.columnMeta()` to set the correct type, label, format, etc.
   *
   * @example
   * // Basic
   * .rawSelect('revenue', sql`SUM(orders.total)`)
   *
   * // With inline metadata
   * .rawSelect('revenue', sql`SUM(orders.total)`, {
   *   type: 'number', label: 'Revenue', format: 'currency',
   * })
   *
   * // Or chain .columnMeta() for full control
   * .rawSelect('revenue', sql`SUM(orders.total)`)
   * .columnMeta('revenue', { type: 'number', label: 'Revenue', format: 'currency' })
   */
  rawSelect(
    alias: string,
    sqlExpr: SQL,
    options?: {
      type?: ColumnConfig['type'];
      label?: string;
      format?: ColumnFormat;
      align?: 'left' | 'center' | 'right';
      sortable?: boolean;
      filterable?: boolean;
      hidden?: boolean;
      width?: number;
      options?: { value: string | number | boolean; label: string; color?: string }[];
      visibleTo?: string[];
    }
  ): this {
    this._ext.rawSelects.set(alias, sqlExpr);
    // Register as a computed column with metadata
    this._config.columns.push({
      name: alias,
      type: options?.type ?? 'string',
      label: options?.label,
      hidden: options?.hidden ?? false,
      sortable: options?.sortable ?? true,
      filterable: options?.filterable ?? false,
      computed: true,
      ...(options?.format && { format: options.format }),
      ...(options?.align && { align: options.align }),
      ...(options?.width && { width: options.width }),
      ...(options?.options && { options: options.options }),
      ...(options?.visibleTo && { visibleTo: options.visibleTo }),
    } as any);
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

  /**
   * Add a raw SQL ORDER BY expression.
   *
   * **Warning**: This bypasses the sortable whitelist entirely. The expression
   * is appended unconditionally to ORDER BY without any field validation.
   * Ensure the SQL is safe and not derived from user-supplied input.
   * Prefer `.sort()` or `.sortable()` for user-facing sort controls.
   */
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

    // Dedupe subquery entries by alias — replace if exists
    const entry = { alias, table: getTableName(table), type, filter };
    const existingIdx = this._config.subqueries.findIndex(e => e.alias === alias);
    if (existingIdx >= 0) {
      this._config.subqueries[existingIdx] = entry;
    } else {
      this._config.subqueries.push(entry);
    }

    // Register as a computed column so sorting/filtering validation passes.
    // The actual SQL expression is built at query-time by SubqueryBuilder and
    // merged into the sqlExpressions map by the engine.
    //
    // 'first' mode returns row_to_json() — a non-scalar JSON object — which
    // cannot be used in ORDER BY. Mark it sortable: false to prevent DB errors.
    // 'count' (integer) and 'exists' (boolean) are scalar and safe to sort.
    const existingCol = this._config.columns.find(c => c.name === alias);
    if (existingCol) {
      existingCol.type = type === 'exists' ? 'boolean' : type === 'count' ? 'number' : 'json';
      existingCol.sortable = type !== 'first';
      existingCol.filterable = false;
      existingCol.computed = true;
    } else {
      this._config.columns.push({
        name: alias,
        type: type === 'exists' ? 'boolean' : type === 'count' ? 'number' : 'json',
        label: alias,
        hidden: false,
        sortable: type !== 'first',
        filterable: false,
        computed: true,
      });
    }

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

  // ──── Count Mode ────

  /**
   * Control how row counting works.
   * 'exact' = SELECT COUNT(*) — accurate but slow on large tables
   * 'estimated' = PostgreSQL's reltuples — fast but approximate
   * 'none' = skip counting entirely — fastest
   */
  countMode(mode: 'exact' | 'estimated' | 'none'): this {
    if (!(this._config as any)._countMode) {
      (this._config as any)._countMode = mode;
    }
    (this._config as any)._countMode = mode;
    return this;
  }

  // ──── DISTINCT ────

  /** Enable DISTINCT on queries */
  distinct(): this {
    (this._config as any)._distinct = true;
    return this;
  }

  // ──── Hooks ────

  /** Add a hook that runs before every query */
  beforeQuery(fn: (params: any, context: any) => any): this {
    this._ext.hooks = this._ext.hooks ?? {};
    this._ext.hooks.beforeQuery = fn;
    return this;
  }

  /** Add a hook that runs after every query */
  afterQuery(fn: (data: Record<string, unknown>[], params: any, context: any) => any): this {
    this._ext.hooks = this._ext.hooks ?? {};
    this._ext.hooks.afterQuery = fn;
    return this;
  }

  /** Add an error handler */
  onError(fn: (error: Error, params: any, context: any) => any): this {
    this._ext.hooks = this._ext.hooks ?? {};
    this._ext.hooks.onError = fn;
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
