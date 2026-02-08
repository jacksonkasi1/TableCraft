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
} from './types/table';
import {
  introspectTable,
  getSensitiveColumnNames,
  detectSensitiveColumns,
} from './utils/introspect';

// ── Type-safe column names ──

type InferColumns<T> = T extends { _: { columns: infer C } }
  ? keyof C & string
  : string;

// ── Quick Options (Level 1) ──

export interface QuickOptions<T extends Table = Table> {
  hide?: InferColumns<T>[];
  search?: InferColumns<T>[];
  filter?: InferColumns<T>[];
  sort?: string;
  pageSize?: number;
  maxPageSize?: number;
  labels?: Partial<Record<InferColumns<T>, string>>;
}

// ── Builder (Level 2) ──

export class TableDefinitionBuilder<T extends Table = Table> {
  /** @internal */
  _config: TableConfig;
  /** @internal */
  _table: T;
  /** @internal */
  _transforms: Map<string, (value: unknown) => unknown> = new Map();
  /** @internal */
  _computedExpressions: Map<string, SQL> = new Map();

  constructor(table: T, config: TableConfig) {
    this._table = table;
    this._config = config;
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

  /**
   * Auto-hides columns that look sensitive (password, token, salt, etc.)
   * This is OPT-IN. Nothing is hidden unless you call this.
   *
   * @returns The list of column names that were hidden, so you know exactly what happened.
   */
  autoHide(): this {
    const sensitive = getSensitiveColumnNames();
    for (const col of this._config.columns) {
      // Cast to string to satisfy type checker (though it is string at runtime)
      const nameStr = String(col.name);
      if (sensitive.has(nameStr)) {
        col.hidden = true;
      }
    }
    return this;
  }

  /**
   * Returns a list of columns detected as potentially sensitive.
   * Does NOT hide anything — just tells you so you can decide.
   */
  inspectSensitive(): string[] {
    return detectSensitiveColumns(this._table);
  }

  // ──── Labels ────

  label(column: InferColumns<T>, label: string): this {
    const col = this._config.columns.find((c) => c.name === column);
    if (col) col.label = label;
    return this;
  }

  labels(map: Partial<Record<InferColumns<T>, string>>): this {
    for (const [name, lbl] of Object.entries(map)) {
      if (lbl) this.label(name as any, lbl as string);
    }
    return this;
  }

  // ──── Search ────

  search(...columns: InferColumns<T>[]): this {
    this._config.search = { fields: columns as string[], enabled: true };
    return this;
  }

  /** Make ALL columns searchable (every text column) */
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
    this._config.filters.push({
      field: field as string,
      operator,
      value,
      type: 'static',
    });
    return this;
  }

  noFilter(): this {
    for (const col of this._config.columns) {
      col.filterable = false;
    }
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
    for (const col of this._config.columns) {
      col.sortable = false;
    }
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
    this._config.pagination = {
      defaultPageSize: 10,
      maxPageSize: 100,
      enabled: false,
    };
    return this;
  }

  // ──── Joins ────

  join(
    table: Table,
    options?: {
      on?: string;
      type?: 'left' | 'right' | 'inner' | 'full';
      alias?: string;
      columns?: string[];
    }
  ): this {
    if (!this._config.joins) this._config.joins = [];

    const joinedName = getTableName(table);
    const baseName = this._config.base;

    let onCondition = options?.on ?? '';
    if (onCondition && !onCondition.includes('=') && !onCondition.includes('.')) {
      onCondition = `${baseName}.${onCondition} = ${joinedName}.id`;
    }

    const joinConfig: JoinConfig = {
      table: joinedName,
      type: options?.type ?? 'left',
      on: onCondition,
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
    // Add as a column in config metadata
    this._config.columns.push({
      name,
      type: options?.type ?? 'string',
      label: options?.label ?? name,
      hidden: false,
      sortable: true,
      filterable: false, // Computed columns usually need specific handling for filtering
      computed: true,
    });
    // Store the SQL expression for the engine to use in SELECT
    this._computedExpressions.set(name, expression);
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

  /** Apply an inline JS transform function to a column (runs after fetch) */
  transform(column: InferColumns<T>, fn: (value: unknown) => unknown): this {
    this._transforms.set(column as string, fn);
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
