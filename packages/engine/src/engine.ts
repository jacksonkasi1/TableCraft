import {
  Table,
  SQL,
  sql,
  getTableColumns,
  and,
  eq,
  gte,
  lte,
  count as drizzleCount,
  getTableName,
} from 'drizzle-orm';
import { TableConfig } from './types/table';
import { EngineParams, EngineContext, EngineResult, GroupedResult, TableEngine, CountMode, QueryDebugInfo } from './types/engine';
import { validateConfig, validateAgainstSchema } from './core/validator';
import { validateInput } from './core/inputValidator';
import { QueryBuilder } from './core/queryBuilder';
import { FilterBuilder } from './core/filterBuilder';
import { FilterGroupBuilder } from './core/filterGroupBuilder';
import { SearchBuilder } from './core/searchBuilder';
import { SortBuilder } from './core/sortBuilder';
import { PaginationBuilder } from './core/paginationBuilder';
import { CursorPaginationBuilder } from './core/cursorPagination';
import { AggregationBuilder } from './core/aggregationBuilder';
import { SubqueryBuilder } from './core/subqueryBuilder';
import { SoftDeleteHandler } from './core/softDelete';
import { GroupByBuilder } from './core/groupByBuilder';
import { RelationBuilder } from './core/relationBuilder';
import { RecursiveBuilder } from './core/recursiveBuilder';
import { FieldSelector } from './core/fieldSelector';
import { detectDialect, supportsFeature, Dialect } from './core/dialect';
import { formatResponse, applyJsTransforms } from './utils/responseFormatter';
import { exportData } from './utils/export';
import { TableDefinitionBuilder, RuntimeExtensions, drizzleOperators } from './define';
import { TableCraftError, QueryError, DialectError } from './errors';
import { applyRoleBasedVisibility } from './core/roleFilter';
import { buildMetadata } from './core/metadataBuilder';

// ── Config Resolution ──

export type ConfigInput = TableConfig | TableDefinitionBuilder<any>;

function resolveInput(input: ConfigInput): {
  config: TableConfig;
  ext: RuntimeExtensions<any>;
} {
  if (input && typeof input === 'object' && '_config' in input && '_ext' in input) {
    const b = input as TableDefinitionBuilder<any>;
    return { config: b.toConfig(), ext: b._ext as RuntimeExtensions<any> };
  }
  return {
    config: input as TableConfig,
    ext: {
      computedExpressions: new Map(),
      transforms: new Map(),
      rawSelects: new Map(),
      rawWheres: [],
      dynamicWheres: [],
      rawJoins: [],
      rawOrderBys: [],
      ctes: new Map(),
      sqlJoinConditions: new Map(),
    },
  };
}

function normalizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...schema };
  for (const value of Object.values(schema)) {
    if (typeof value === 'object' && value !== null) {
      try {
        // @ts-ignore - Drizzle types might strict on what getTableName accepts
        const name = getTableName(value as Table);
        if (name) normalized[name] = value;
      } catch {
        // Not a table, ignore
      }
    }
  }
  return normalized;
}

// ── Factory ──

export interface CreateEngineOptions {
  db: any;
  schema: Record<string, unknown>;
  config: ConfigInput;
  skipValidation?: boolean;
}

export function createTableEngine(options: CreateEngineOptions): TableEngine {
  const { db, skipValidation } = options;
  const schema = normalizeSchema(options.schema);
  const { config, ext } = resolveInput(options.config);

  if (!skipValidation) {
    validateConfig(config);
    validateAgainstSchema(config, schema);
  }

  // Detect database dialect
  const dialect: Dialect = detectDialect(db);

  // Initialize all builders
  const queryBuilder = new QueryBuilder(schema);
  const filterBuilder = new FilterBuilder(schema);
  const filterGroupBuilder = new FilterGroupBuilder(schema);
  const searchBuilder = new SearchBuilder(schema);
  const sortBuilder = new SortBuilder(schema);
  const paginationBuilder = new PaginationBuilder();
  const cursorPagination = new CursorPaginationBuilder(schema);
  const aggregationBuilder = new AggregationBuilder(schema);
  const subqueryBuilder = new SubqueryBuilder(schema);
  const softDeleteHandler = new SoftDeleteHandler(schema);
  const groupByBuilder = new GroupByBuilder(schema);
  const relationBuilder = new RelationBuilder(schema);
  const recursiveBuilder = new RecursiveBuilder(schema);
  const fieldSelector = new FieldSelector();

  const baseTable = schema[config.base] as Table;
  const countMode: CountMode = (config as any)._countMode ?? 'exact';

  // ── WHERE builder ──

  async function buildWhereConditions(
    params: EngineParams,
    context: EngineContext
  ): Promise<SQL | undefined> {
    const parts: (SQL | undefined)[] = [];

    parts.push(queryBuilder.buildBackendConditions(config, context));
    parts.push(softDeleteHandler.buildSoftDeleteCondition(config, params.includeDeleted));

    if (config.tenant?.enabled && context.tenantId !== undefined) {
      const cols = getTableColumns(baseTable);
      const tenantField = config.tenant.field ?? 'tenantId';
      const tenantCol = cols[tenantField];
      if (tenantCol) parts.push(eq(tenantCol, context.tenantId));
    }

    // Global date range filter
    if (params.dateRange && (params.dateRange.from || params.dateRange.to)) {
      const cols = getTableColumns(baseTable);
      
      const metadata = buildMetadata(config, context);
      let dateColName = config.dateRangeColumn ?? metadata.dateRangeColumn;

      if (dateColName) {
        const colDef = config.columns.find((c) => c.name === dateColName);
        const dbFieldName = colDef?.field ?? dateColName;
        const dateCol = cols[dbFieldName];

        if (dateCol) {
          if (params.dateRange.from) {
            const fromDate = new Date(params.dateRange.from);
            if (!isNaN(fromDate.getTime())) {
              parts.push(gte(dateCol, fromDate));
            }
          }
          if (params.dateRange.to) {
            const toDate = new Date(params.dateRange.to);
            if (!isNaN(toDate.getTime())) {
              parts.push(lte(dateCol, toDate));
            }
          }
        }
      }
    }

    parts.push(filterBuilder.buildStaticFilters(config));
    if (params.filters) parts.push(filterBuilder.buildFilters(config, params.filters));
    if (params.search) parts.push(searchBuilder.buildSearch(config, params.search));
    if (config.filterGroups?.length) parts.push(filterGroupBuilder.buildAll(config.filterGroups, config));
    for (const raw of ext.rawWheres) parts.push(raw);
    for (const dynamicFn of ext.dynamicWheres) {
      const result = await dynamicFn({ query: params, context }, drizzleOperators, baseTable);
      if (result) parts.push(result);
    }

    const valid = parts.filter((p): p is SQL => p !== undefined);
    return valid.length > 0 ? and(...valid) : undefined;
  }

  // ── Count helpers ──

  async function getCount(where: SQL | undefined): Promise<number | null> {
    if (countMode === 'none') return null;

    if (countMode === 'estimated' && supportsFeature(dialect, 'estimatedCount')) {
      const result = await db.execute(
        sql`SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = ${config.base}`
      );
      const rows = Array.isArray(result) ? result : result?.rows ?? [];
      const estimate = rows[0]?.estimate;
      return typeof estimate === 'number' ? estimate : 0;
    }

    // Exact count
    let q = db.select({ total: drizzleCount() }).from(baseTable);
    q = queryBuilder.buildJoins(q, config, ext.sqlJoinConditions);
    if (where) q = q.where(where);
    const result = await q;
    return result?.[0]?.total ?? 0;
  }

  // ── Standard query ──

  async function query(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<EngineResult> {
    // Hook: beforeQuery
    let resolvedParams = params;
    if (ext.hooks?.beforeQuery) {
      resolvedParams = await ext.hooks.beforeQuery(params, context);
    }

    try {
      // Apply role-based visibility
      const effectiveConfig = applyRoleBasedVisibility(config, context);

      // Validate input
      validateInput(resolvedParams, effectiveConfig);

      // Build selection
      let selection: Record<string, any> = queryBuilder.buildSelect(baseTable, effectiveConfig);
      for (const [name, expr] of ext.computedExpressions) selection[name] = expr;
      for (const [name, expr] of ext.rawSelects) selection[name] = expr;
      const subqueries = subqueryBuilder.buildSubqueries(effectiveConfig);
      if (subqueries) Object.assign(selection, subqueries);

      // Field selection: ?select=id,name
      selection = fieldSelector.applyFieldSelection(selection, resolvedParams.select, effectiveConfig);

      const where = await buildWhereConditions(resolvedParams, context);

      // Decide: cursor pagination or offset pagination
      const useCursor = !!resolvedParams.cursor;

      let data: Record<string, unknown>[];
      let total: number | null;
      let nextCursor: string | null | undefined;

      if (useCursor) {
        // ── Cursor-based pagination ──
        // Note: rawSelects deliberately overwrite computedExpressions when keys collide.
        const sqlExpressions = new Map([...ext.computedExpressions, ...ext.rawSelects]);

        const maxSize = config.pagination?.maxPageSize ?? 100;
        const pageSize = Math.min(resolvedParams.pageSize ?? config.pagination?.defaultPageSize ?? 10, maxSize);
        const sortConfig = resolvedParams.sort?.map(s => ({ field: s.field, order: s.order })) ?? config.defaultSort;

        const cursorResult = cursorPagination.build(config, resolvedParams.cursor, pageSize, sortConfig, sqlExpressions);

        let cursorWhere = where;
        if (cursorResult.whereCondition) {
          cursorWhere = where ? and(where, cursorResult.whereCondition) : cursorResult.whereCondition;
        }

        let q = resolvedParams.distinct
          ? db.selectDistinct(selection).from(baseTable)
          : db.select(selection).from(baseTable);

        q = queryBuilder.buildJoins(q, config, ext.sqlJoinConditions);
        if (cursorWhere) q = q.where(cursorWhere);
        if (cursorResult.orderBy.length) q = q.orderBy(...cursorResult.orderBy);
        q = q.limit(cursorResult.limit);

        const rawData = await q;
        const cursorMeta = cursorPagination.buildMeta(rawData, pageSize, sortConfig);
        data = cursorMeta.data;
        nextCursor = cursorMeta.meta.nextCursor;
        total = null; // Cursor pagination doesn't need total

      } else {
        // ── Offset-based pagination ──
        // Note: rawSelects deliberately overwrite computedExpressions when keys collide.
        const sqlExpressions = new Map([...ext.computedExpressions, ...ext.rawSelects]);
        const orderBy = sortBuilder.buildSort(config, resolvedParams.sort, sqlExpressions);
        const pagination = paginationBuilder.buildPagination(config, resolvedParams.page, resolvedParams.pageSize);

        let dataQuery = resolvedParams.distinct
          ? db.selectDistinct(selection).from(baseTable)
          : db.select(selection).from(baseTable);

        dataQuery = queryBuilder.buildJoins(dataQuery, config, ext.sqlJoinConditions);
        if (where) dataQuery = dataQuery.where(where);

        const allOrderBy = [...orderBy, ...ext.rawOrderBys];
        if (allOrderBy.length > 0) dataQuery = dataQuery.orderBy(...allOrderBy);
        dataQuery = dataQuery.limit(pagination.limit).offset(pagination.offset);

        const [fetchedData, fetchedTotal] = await Promise.all([
          dataQuery,
          getCount(where),
        ]);

        data = fetchedData;
        total = fetchedTotal;
      }

      // Aggregations
      let aggregations: Record<string, number> | undefined;
      const aggSelect = aggregationBuilder.buildAggregations(config);
      if (aggSelect) {
        let aggQuery = db.select(aggSelect).from(baseTable);
        aggQuery = queryBuilder.buildJoins(aggQuery, config, ext.sqlJoinConditions);
        if (where) aggQuery = aggQuery.where(where);
        const aggResult = await aggQuery;
        if (aggResult?.[0]) {
          aggregations = {};
          for (const [key, val] of Object.entries(aggResult[0])) {
            if (key === '_totalCount') continue;
            aggregations[key] = Number(val) || 0;
          }
          if (Object.keys(aggregations).length === 0) aggregations = undefined;
        }
      }

      // Format response
      const pagination = paginationBuilder.buildPagination(config, resolvedParams.page, resolvedParams.pageSize);
      const meta = {
        total,
        page: useCursor ? 1 : pagination.page,
        pageSize: pagination.pageSize,
        totalPages: total !== null ? Math.ceil(total / pagination.pageSize) : null,
        ...(useCursor && { nextCursor }),
        countMode,
      };

      let result = formatResponse(data, meta as any, config, aggregations);

      // Apply field selection to response
      if (resolvedParams.select?.length) {
        result.data = fieldSelector.filterResponseFields(result.data, resolvedParams.select);
      }

      // Apply inline transforms
      if (ext.transforms.size > 0) {
        result.data = result.data.map((row) => {
          const r = { ...row };
          for (const [field, fn] of ext.transforms) {
            if (field in r) r[field] = fn(r[field]);
          }
          return r;
        });
      }

      // Resolve includes
      if (config.include?.length) {
        result.data = await relationBuilder.resolve(db, result.data, config);
      }

      // Hook: afterQuery
      if (ext.hooks?.afterQuery) {
        result.data = await ext.hooks.afterQuery(result.data, resolvedParams, context);
      }

      return result;

    } catch (error: unknown) {
      // Hook: onError
      if (ext.hooks?.onError && error instanceof Error) {
        const transformed = await ext.hooks.onError(error, resolvedParams, context);
        throw transformed;
      }
      if (error instanceof TableCraftError) throw error;
      throw new QueryError(
        error instanceof Error ? error.message : 'Query execution failed',
        error
      );
    }
  }

  // ── Grouped query ──

  async function queryGrouped(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<GroupedResult> {
    // Apply role-based visibility
    const effectiveConfig = applyRoleBasedVisibility(config, context);

    const groupedSelect = groupByBuilder.buildGroupedSelect(effectiveConfig);
    if (!groupedSelect) throw new QueryError(`No groupBy configured on '${effectiveConfig.name}'`);

    const groupByColumns = groupByBuilder.buildGroupByColumns(effectiveConfig);
    if (!groupByColumns?.length) throw new QueryError(`No valid groupBy columns on '${effectiveConfig.name}'`);

    const where = await buildWhereConditions(params, context);
    const having = groupByBuilder.buildHaving(effectiveConfig);

    let q = db.select(groupedSelect).from(baseTable);
    q = queryBuilder.buildJoins(q, effectiveConfig, ext.sqlJoinConditions);
    if (where) q = q.where(where);
    q = q.groupBy(...groupByColumns);
    if (having) q = q.having(having);

    const sqlExpressions = new Map([...ext.computedExpressions, ...ext.rawSelects]);
    const orderBy = sortBuilder.buildSort(effectiveConfig, params.sort, sqlExpressions);
    if (orderBy.length > 0) q = q.orderBy(...orderBy);

    const data = await q;

    const aggregations: Record<string, number> = {};
    if (effectiveConfig.aggregations) {
      for (const agg of effectiveConfig.aggregations) {
        aggregations[agg.alias] = data.reduce(
          (sum: number, row: any) => sum + (Number(row[agg.alias]) || 0), 0
        );
      }
    }

    return { data, meta: { total: data.length }, aggregations };
  }

  // ── Recursive query ──

  async function queryRecursive(
    // params and context are unused but kept for interface consistency
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params: EngineParams = {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: EngineContext = {}
  ): Promise<EngineResult> {
    if (!supportsFeature(dialect, 'recursiveCTE')) {
      throw new DialectError('Recursive CTE', dialect);
    }

    const data = await recursiveBuilder.execute(db, config);

    let processed = data;
    if (ext.transforms.size > 0) {
      processed = processed.map((row) => {
        const r = { ...row };
        for (const [field, fn] of ext.transforms) {
          if (field in r) r[field] = fn(r[field]);
        }
        return r;
      });
    }

    return {
      data: processed,
      meta: { total: processed.length, page: 1, pageSize: processed.length, totalPages: 1, countMode: 'exact' },
    };
  }

  // ── Count ──

  async function countRows(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<number> {
    const where = await buildWhereConditions(params, context);
    const result = await getCount(where);
    return result ?? 0;
  }

  // ── Export ──

  async function exportRows(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<string> {
    // Apply role-based visibility
    const effectiveConfig = applyRoleBasedVisibility(config, context);

    let selection: Record<string, any> = queryBuilder.buildSelect(baseTable, effectiveConfig);
    for (const [name, expr] of ext.computedExpressions) selection[name] = expr;
    if (params.select?.length) {
      selection = fieldSelector.applyFieldSelection(selection, params.select, effectiveConfig);
    }

    const where = await buildWhereConditions({ ...params, page: undefined, pageSize: undefined }, context);
    const sqlExpressions = new Map([...ext.computedExpressions, ...ext.rawSelects]);
    const orderBy = sortBuilder.buildSort(effectiveConfig, params.sort, sqlExpressions);

    let q = db.select(selection).from(baseTable);
    q = queryBuilder.buildJoins(q, effectiveConfig, ext.sqlJoinConditions);
    if (where) q = q.where(where);
    if (orderBy.length > 0) q = q.orderBy(...orderBy);
    q = q.limit(10_000);

    const data = await q;
    const transformed = applyJsTransforms(data, effectiveConfig);
    return exportData(transformed, params.export ?? 'json', effectiveConfig);
  }

  // ── Explain (debug) ──

  async function explain(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<QueryDebugInfo> {
    let selection: Record<string, any> = queryBuilder.buildSelect(baseTable, config);
    for (const [name, expr] of ext.computedExpressions) selection[name] = expr;

    const where = await buildWhereConditions(params, context);
    const sqlExpressions = new Map([...ext.computedExpressions, ...ext.rawSelects]);
    const orderBy = sortBuilder.buildSort(config, params.sort, sqlExpressions);
    const pagination = paginationBuilder.buildPagination(config, params.page, params.pageSize);

    let q = db.select(selection).from(baseTable);
    q = queryBuilder.buildJoins(q, config, ext.sqlJoinConditions);
    if (where) q = q.where(where);
    if (orderBy.length > 0) q = q.orderBy(...orderBy);
    q = q.limit(pagination.limit).offset(pagination.offset);

    // Drizzle's .toSQL() returns { sql, params }
    const built = q.toSQL();

    return {
      sql: built.sql,
      params: built.params,
      duration: 0,
      timestamp: Date.now(),
    };
  }

  return {
    query,
    queryGrouped,
    queryRecursive,
    count: countRows,
    exportData: exportRows,
    explain,
    getMetadata: (context?: EngineContext) => buildMetadata(config, context),
    getConfig: () => config,
  };
}

// ── Multi-engine factory ──

export function createEngines(options: {
  db: any;
  schema: Record<string, unknown>;
  configs: ConfigInput[] | Record<string, ConfigInput>;
}): Record<string, TableEngine> {
  const { db, schema, configs } = options;
  const entries = Array.isArray(configs) ? configs : Object.values(configs);
  const engines: Record<string, TableEngine> = {};
  for (const input of entries) {
    const { config } = resolveInput(input);
    engines[config.name] = createTableEngine({ db, schema, config: input });
  }
  return engines;
}
