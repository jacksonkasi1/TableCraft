import {
  Table,
  SQL,
  getTableColumns,
  and,
  eq,
  count as drizzleCount,
} from 'drizzle-orm';
import { TableConfig, TableDefinition } from './types/table';
import { EngineParams, EngineContext, EngineResult, TableEngine } from './types/engine';
import { validateConfig, validateAgainstSchema } from './core/validator';
import { QueryBuilder } from './core/queryBuilder';
import { FilterBuilder } from './core/filterBuilder';
import { SearchBuilder } from './core/searchBuilder';
import { SortBuilder } from './core/sortBuilder';
import { PaginationBuilder } from './core/paginationBuilder';
import { AggregationBuilder } from './core/aggregationBuilder';
import { SubqueryBuilder } from './core/subqueryBuilder';
import { SoftDeleteHandler } from './core/softDelete';
import { MemoryCache } from './core/cache';
import { formatResponse, applyJsTransforms } from './utils/responseFormatter';
import { exportData } from './utils/export';

const globalCache = new MemoryCache();

export interface CreateEngineOptions {
  db: any; // Drizzle database instance
  schema: Record<string, unknown>;
  config: TableDefinition; // Accept input type (optional fields allowed)
  /** Skip Zod + schema validation (if you pre-validated) */
  skipValidation?: boolean;
}

/**
 * Creates a TableEngine for a single table configuration.
 */
export function createTableEngine(options: CreateEngineOptions): TableEngine {
  const { db, schema, config: rawConfig, skipValidation } = options;

  // Validate and parse config to ensure defaults are applied
  // If skipValidation is true, we assume rawConfig is already a valid TableConfig
  // but strictly speaking, we should parse it to get defaults.
  // However, skipValidation usually implies we trust it completely.
  // For safety, let's always parse unless we are sure.
  
  let config: TableConfig;
  
  if (skipValidation) {
      config = rawConfig as TableConfig;
  } else {
      config = validateConfig(rawConfig);
      validateAgainstSchema(config, schema);
  }

  const queryBuilder = new QueryBuilder(schema);
  const filterBuilder = new FilterBuilder(schema);
  const searchBuilder = new SearchBuilder(schema);
  const sortBuilder = new SortBuilder(schema);
  const paginationBuilder = new PaginationBuilder();
  const aggregationBuilder = new AggregationBuilder(schema);
  const subqueryBuilder = new SubqueryBuilder(schema);
  const softDeleteHandler = new SoftDeleteHandler(schema);

  const baseTable = schema[config.base] as Table;

  /**
   * Collects all WHERE conditions: backend, soft-delete, tenant, dynamic filters, search.
   */
  function buildWhereConditions(
    params: EngineParams,
    context: EngineContext
  ): SQL | undefined {
    const parts: (SQL | undefined)[] = [];

    // 1. Backend security conditions
    parts.push(queryBuilder.buildBackendConditions(config, context));

    // 2. Soft delete
    parts.push(
      softDeleteHandler.buildSoftDeleteCondition(config, params.includeDeleted)
    );

    // 3. Tenant isolation
    if (config.tenant?.enabled && context.tenantId !== undefined) {
      const cols = getTableColumns(baseTable);
      const tenantField = config.tenant.field ?? 'tenantId';
      const tenantCol = cols[tenantField];
      if (tenantCol) {
        parts.push(eq(tenantCol, context.tenantId));
      }
    }

    // 4. Static filters from config
    parts.push(filterBuilder.buildStaticFilters(config));

    // 5. Dynamic filters from request
    if (params.filters) {
      parts.push(filterBuilder.buildFilters(config, params.filters));
    }

    // 6. Search
    if (params.search) {
      parts.push(searchBuilder.buildSearch(config, params.search));
    }

    const valid = parts.filter((p): p is SQL => p !== undefined);
    return valid.length > 0 ? and(...valid) : undefined;
  }

  // ---- Public API ----

  async function query(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<EngineResult> {
    // Cache check
    if (config.cache?.enabled) {
      const cacheKey = MemoryCache.buildKey(config.name, { params, context });
      const cached = globalCache.get(cacheKey) as any; // Cast because stub returns undefined type mostly
      if (cached && !cached.stale) {
        return cached.value;
      }
      if (cached?.stale && !globalCache.isRevalidating(cacheKey)) {
        // Return stale, kick off revalidation in background
        globalCache.markRevalidating(cacheKey);
        void revalidate(cacheKey, params, context);
        return cached.value;
      }
    }

    const result = await executeQuery(params, context);

    // Cache set
    if (config.cache?.enabled) {
      const cacheKey = MemoryCache.buildKey(config.name, { params, context });
      globalCache.set(
        cacheKey,
        result,
        config.cache.ttl ?? 60,
        config.cache.staleWhileRevalidate ?? 0
      );
    }

    return result;
  }

  async function revalidate(
    cacheKey: string,
    params: EngineParams,
    context: EngineContext
  ): Promise<void> {
    try {
      const result = await executeQuery(params, context);
      globalCache.set(
        cacheKey,
        result,
        config.cache?.ttl ?? 60,
        config.cache?.staleWhileRevalidate ?? 0
      );
    } finally {
      globalCache.unmarkRevalidating(cacheKey);
    }
  }

  async function executeQuery(
    params: EngineParams,
    context: EngineContext
  ): Promise<EngineResult> {
    // Build selection
    const selection: Record<string, any> = queryBuilder.buildSelect(baseTable, config);

    // Add subquery columns
    const subqueries = subqueryBuilder.buildSubqueries(config);
    if (subqueries) {
      Object.assign(selection, subqueries);
    }

    // WHERE
    const where = buildWhereConditions(params, context);

    // ORDER BY
    const orderBy = sortBuilder.buildSort(config, params.sort);

    // PAGINATION
    const pagination = paginationBuilder.buildPagination(
      config,
      params.page,
      params.pageSize
    );

    // Build data query
    let dataQuery = db.select(selection).from(baseTable);
    dataQuery = queryBuilder.buildJoins(dataQuery, config);
    if (where) dataQuery = dataQuery.where(where);
    if (orderBy.length > 0) dataQuery = dataQuery.orderBy(...orderBy);
    dataQuery = dataQuery.limit(pagination.limit).offset(pagination.offset);

    // Build count query
    let countQuery = db
      .select({ total: drizzleCount() })
      .from(baseTable);
    countQuery = queryBuilder.buildJoins(countQuery, config);
    if (where) countQuery = countQuery.where(where);

    // Build aggregations query (if configured)
    let aggPromise: Promise<any[]> | undefined;
    const aggSelect = aggregationBuilder.buildAggregations(config);
    if (aggSelect) {
      let aggQuery = db.select(aggSelect).from(baseTable);
      aggQuery = queryBuilder.buildJoins(aggQuery, config);
      if (where) aggQuery = aggQuery.where(where);
      aggPromise = aggQuery;
    }

    // Execute in parallel
    const [data, countResult, aggResult] = await Promise.all([
      dataQuery,
      countQuery,
      aggPromise ?? Promise.resolve(undefined),
    ]);

    const total = countResult?.[0]?.total ?? 0;
    const meta = paginationBuilder.buildMeta(total, pagination);

    // Parse aggregation results
    let aggregations: Record<string, number> | undefined;
    if (aggResult && aggResult[0]) {
      aggregations = {};
      for (const [key, val] of Object.entries(aggResult[0])) {
        if (key === '_totalCount') continue;
        aggregations[key] = Number(val) || 0;
      }
      if (Object.keys(aggregations).length === 0) aggregations = undefined;
    }

    return formatResponse(data, meta, config, aggregations);
  }

  async function countRows(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<number> {
    const where = buildWhereConditions(params, context);

    let q = db.select({ total: drizzleCount() }).from(baseTable);
    q = queryBuilder.buildJoins(q, config);
    if (where) q = q.where(where);

    const result = await q;
    return result?.[0]?.total ?? 0;
  }

  async function exportRows(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<string> {
    const exportParams = { ...params, page: undefined, pageSize: undefined };

    const selection = queryBuilder.buildSelect(baseTable, config);
    const where = buildWhereConditions(exportParams, context);
    const orderBy = sortBuilder.buildSort(config, exportParams.sort);

    let q = db.select(selection).from(baseTable);
    q = queryBuilder.buildJoins(q, config);
    if (where) q = q.where(where);
    if (orderBy.length > 0) q = q.orderBy(...orderBy);
    q = q.limit(10_000);

    const data = await q;
    const transformed = applyJsTransforms(data, config);

    const format = params.export ?? 'json';
    return exportData(transformed, format, config);
  }

  return {
    query,
    count: countRows,
    exportData: exportRows,
    getConfig: () => config,
  };
}

/**
 * Creates engines for multiple configs at once, keyed by config name.
 */
export function createEngines(options: {
  db: any;
  schema: Record<string, unknown>;
  configs: TableDefinition[] | Record<string, TableDefinition>;
}): Record<string, TableEngine> {
  const { db, schema, configs } = options;

  const configArray = Array.isArray(configs)
    ? configs
    : Object.values(configs);

  const engines: Record<string, TableEngine> = {};

  for (const config of configArray) {
    engines[config.name] = createTableEngine({ db, schema, config });
  }

  return engines;
}
