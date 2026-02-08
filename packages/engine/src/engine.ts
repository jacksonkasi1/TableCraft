import {
  Table,
  SQL,
  getTableColumns,
  and,
  eq,
  count as drizzleCount,
  getTableName,
} from 'drizzle-orm';
import { TableConfig } from './types/table';
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
import { formatResponse, applyJsTransforms } from './utils/responseFormatter';
import { exportData } from './utils/export';
import type { TableDefinitionBuilder } from './define';

// ── Config Resolution ──

export type ConfigInput = TableConfig | TableDefinitionBuilder;

function resolveConfig(input: ConfigInput): TableConfig {
  if ('toConfig' in input && typeof input.toConfig === 'function') {
    return input.toConfig();
  }
  return input as TableConfig;
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
  const config = resolveConfig(options.config);

  if (!skipValidation) {
    validateConfig(config);
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

  function buildWhereConditions(
    params: EngineParams,
    context: EngineContext
  ): SQL | undefined {
    const parts: (SQL | undefined)[] = [];

    parts.push(queryBuilder.buildBackendConditions(config, context));
    parts.push(softDeleteHandler.buildSoftDeleteCondition(config, params.includeDeleted));

    if (config.tenant?.enabled && context.tenantId !== undefined) {
      const cols = getTableColumns(baseTable);
      const tenantField = config.tenant.field ?? 'tenantId';
      const tenantCol = cols[tenantField];
      if (tenantCol) parts.push(eq(tenantCol, context.tenantId));
    }

    parts.push(filterBuilder.buildStaticFilters(config));
    if (params.filters) parts.push(filterBuilder.buildFilters(config, params.filters));
    if (params.search) parts.push(searchBuilder.buildSearch(config, params.search));

    const valid = parts.filter((p): p is SQL => p !== undefined);
    return valid.length > 0 ? and(...valid) : undefined;
  }

  // ── query ──

  async function query(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<EngineResult> {
    const selection: Record<string, any> = queryBuilder.buildSelect(baseTable, config);

    // Add computed SQL expressions from builder
    const builder = options.config as TableDefinitionBuilder | undefined;
    if (builder?._computedExpressions?.size) {
      for (const [name, expr] of builder._computedExpressions) {
        selection[name] = expr;
      }
    }

    const subqueries = subqueryBuilder.buildSubqueries(config);
    if (subqueries) Object.assign(selection, subqueries);

    const where = buildWhereConditions(params, context);
    const orderBy = sortBuilder.buildSort(config, params.sort);
    const pagination = paginationBuilder.buildPagination(config, params.page, params.pageSize);

    let dataQuery = db.select(selection).from(baseTable);
    dataQuery = queryBuilder.buildJoins(dataQuery, config);
    if (where) dataQuery = dataQuery.where(where);
    if (orderBy.length > 0) dataQuery = dataQuery.orderBy(...orderBy);
    dataQuery = dataQuery.limit(pagination.limit).offset(pagination.offset);

    let countQuery = db.select({ total: drizzleCount() }).from(baseTable);
    countQuery = queryBuilder.buildJoins(countQuery, config);
    if (where) countQuery = countQuery.where(where);

    let aggPromise: Promise<any[]> | undefined;
    const aggSelect = aggregationBuilder.buildAggregations(config);
    if (aggSelect) {
      let aggQuery = db.select(aggSelect).from(baseTable);
      aggQuery = queryBuilder.buildJoins(aggQuery, config);
      if (where) aggQuery = aggQuery.where(where);
      aggPromise = aggQuery;
    }

    const [data, countResult, aggResult] = await Promise.all([
      dataQuery,
      countQuery,
      aggPromise ?? Promise.resolve(undefined),
    ]);

    const total = countResult?.[0]?.total ?? 0;
    const meta = paginationBuilder.buildMeta(total, pagination);

    let aggregations: Record<string, number> | undefined;
    if (aggResult?.[0]) {
      aggregations = {};
      for (const [key, val] of Object.entries(aggResult[0])) {
        if (key === '_totalCount') continue;
        aggregations[key] = Number(val) || 0;
      }
      if (Object.keys(aggregations).length === 0) aggregations = undefined;
    }

    // Format response (applies built-in transforms)
    const result = formatResponse(data, meta, config, aggregations);

    // Apply inline JS transforms from builder
    if (builder?._transforms?.size) {
      result.data = result.data.map((row) => {
        const r = { ...row };
        for (const [field, fn] of builder._transforms) {
          if (field in r) r[field] = fn(r[field]);
        }
        return r;
      });
    }

    return result;
  }

  // ── count ──

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

  // ── export ──

  async function exportRows(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<string> {
    const selection = queryBuilder.buildSelect(baseTable, config);

    // Add computed SQL expressions from builder
    const builder = options.config as TableDefinitionBuilder | undefined;
    if (builder?._computedExpressions?.size) {
      for (const [name, expr] of builder._computedExpressions) {
        selection[name] = expr;
      }
    }

    const where = buildWhereConditions(
      { ...params, page: undefined, pageSize: undefined },
      context
    );
    const orderBy = sortBuilder.buildSort(config, params.sort);

    let q = db.select(selection).from(baseTable);
    q = queryBuilder.buildJoins(q, config);
    if (where) q = q.where(where);
    if (orderBy.length > 0) q = q.orderBy(...orderBy);
    q = q.limit(10_000);

    const data = await q;
    const transformed = applyJsTransforms(data, config);

    // Apply inline JS transforms from builder
    let finalData = transformed;
    if (builder?._transforms?.size) {
      finalData = finalData.map((row) => {
        const r = { ...row };
        for (const [field, fn] of builder._transforms) {
          if (field in r) r[field] = fn(r[field]);
        }
        return r;
      });
    }

    return exportData(finalData, params.export ?? 'json', config);
  }

  return {
    query,
    count: countRows,
    exportData: exportRows,
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
  const entries = Array.isArray(configs)
    ? configs
    : Object.values(configs);

  const engines: Record<string, TableEngine> = {};
  for (const input of entries) {
    const resolved = resolveConfig(input);
    engines[resolved.name] = createTableEngine({ db, schema, config: input });
  }
  return engines;
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
