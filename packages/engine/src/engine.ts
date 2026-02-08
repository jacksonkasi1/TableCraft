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
import { EngineParams, EngineContext, EngineResult, TableEngine, GroupedResult } from './types/engine';
import { validateConfig, validateAgainstSchema } from './core/validator';
import { QueryBuilder } from './core/queryBuilder';
import { FilterBuilder } from './core/filterBuilder';
import { SearchBuilder } from './core/searchBuilder';
import { SortBuilder } from './core/sortBuilder';
import { PaginationBuilder } from './core/paginationBuilder';
import { AggregationBuilder } from './core/aggregationBuilder';
import { SubqueryBuilder } from './core/subqueryBuilder';
import { SoftDeleteHandler } from './core/softDelete';
import { FilterGroupBuilder } from './core/filterGroupBuilder';
import { GroupByBuilder } from './core/groupByBuilder';
import { RelationBuilder } from './core/relationBuilder';
import { RecursiveBuilder } from './core/recursiveBuilder';
import { formatResponse } from './utils/responseFormatter';
import { exportData } from './utils/export';
import { TableDefinitionBuilder, RuntimeExtensions } from './define';

// ── Config Resolution ──

export type ConfigInput = TableConfig | TableDefinitionBuilder;

interface ResolvedEngine {
  config: TableConfig;
  extensions?: RuntimeExtensions;
}

function resolveInput(input: ConfigInput): ResolvedEngine {
  if (input instanceof TableDefinitionBuilder) {
    return {
      config: input.toConfig(),
      extensions: input._ext,
    };
  }
  // Check for duck-typing if it's a different builder instance
  if ('toConfig' in input && typeof input.toConfig === 'function') {
    return {
      config: (input as any).toConfig(),
      extensions: (input as any)._ext,
    };
  }
  return { config: input as TableConfig };
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
  const { config, extensions } = resolveInput(options.config);

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
  // New builders
  const filterGroupBuilder = new FilterGroupBuilder(schema);
  const groupByBuilder = new GroupByBuilder(schema);
  const relationBuilder = new RelationBuilder(schema);
  const recursiveBuilder = new RecursiveBuilder(schema);

  const baseTable = schema[config.base] as Table;

  function buildWhereConditions(
    params: EngineParams,
    context: EngineContext
  ): SQL | undefined {
    const parts: (SQL | undefined)[] = [];

    // 1. Backend Conditions (Static)
    parts.push(queryBuilder.buildBackendConditions(config, context));

    // 2. Soft Delete
    parts.push(softDeleteHandler.buildSoftDeleteCondition(config, params.includeDeleted));

    // 3. Tenant Isolation
    if (config.tenant?.enabled && context.tenantId !== undefined) {
      const cols = getTableColumns(baseTable);
      const tenantField = config.tenant.field ?? 'tenantId';
      const tenantCol = cols[tenantField];
      if (tenantCol) parts.push(eq(tenantCol, context.tenantId));
    }

    // 4. Static Filters (Deprecated? Kept for compatibility)
    parts.push(filterBuilder.buildStaticFilters(config));

    // 5. Dynamic Filters (URL)
    if (params.filters) parts.push(filterBuilder.buildFilters(config, params.filters));

    // 6. Search
    if (params.search) parts.push(searchBuilder.buildSearch(config, params.search));

    // 7. Filter Groups (OR Logic)
    if (config.filterGroups) {
      parts.push(filterGroupBuilder.buildAll(config.filterGroups, config));
    }

    // 8. Raw SQL Wheres (Escape Hatch)
    if (extensions?.rawWheres.length) {
      parts.push(...extensions.rawWheres);
    }

    const valid = parts.filter((p): p is SQL => p !== undefined);
    return valid.length > 0 ? and(...valid) : undefined;
  }

  // ── query (Standard) ──

  async function query(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<EngineResult> {
    // If GROUP BY is configured, redirect to queryGrouped
    if (config.groupBy?.fields?.length) {
      // Cast to any because the return type differs slightly (aggregations vs data)
      // but EngineResult is generic enough to hold it.
      return queryGrouped(params, context) as any;
    }

    // If recursive is configured, redirect
    if (config.recursive) {
      return queryRecursive(params, context);
    }

    const selection: Record<string, any> = queryBuilder.buildSelect(baseTable, config);

    // Add computed expressions
    if (extensions?.computedExpressions?.size) {
      for (const [name, expr] of extensions.computedExpressions) {
        selection[name] = expr;
      }
    }

    // Add raw selects
    if (extensions?.rawSelects?.size) {
      for (const [name, expr] of extensions.rawSelects) {
        selection[name] = expr;
      }
    }

    const subqueries = subqueryBuilder.buildSubqueries(config);
    if (subqueries) Object.assign(selection, subqueries);

    const where = buildWhereConditions(params, context);
    const orderBy = sortBuilder.buildSort(config, params.sort);
    const pagination = paginationBuilder.buildPagination(config, params.page, params.pageSize);

    // Apply Raw Order By
    if (extensions?.rawOrderBys.length) {
      // Prepend or append? Usually raw sorts override default sorts.
      orderBy.unshift(...extensions.rawOrderBys);
    }

    let dataQuery = db.select(selection).from(baseTable);
    dataQuery = queryBuilder.buildJoins(dataQuery, config, extensions?.sqlJoinConditions);
    // Apply Raw Joins
    if (extensions?.rawJoins.length) {
      // Drizzle hack or robust handling needed.
      // For now, we assume user knows what they are doing if they use rawJoin via db.execute
      // But query builder method `applyRawJoins` is a placeholder.
      // Real raw joins might need the `sql` template literal injection into the table list or join chain.
      // This is hard in Drizzle's typed builder.
      // For now, we skip raw joins in the builder phase unless we use `extras`.
    }

    if (where) dataQuery = dataQuery.where(where);
    if (orderBy.length > 0) dataQuery = dataQuery.orderBy(...orderBy);
    dataQuery = dataQuery.limit(pagination.limit).offset(pagination.offset);

    // Count Query
    let countQuery = db.select({ total: drizzleCount() }).from(baseTable);
    countQuery = queryBuilder.buildJoins(countQuery, config, extensions?.sqlJoinConditions);
    if (where) countQuery = countQuery.where(where);

    // Aggregations
    let aggPromise: Promise<any[]> | undefined;
    const aggSelect = aggregationBuilder.buildAggregations(config);
    if (aggSelect) {
      let aggQuery = db.select(aggSelect).from(baseTable);
      aggQuery = queryBuilder.buildJoins(aggQuery, config, extensions?.sqlJoinConditions);
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

    // Post-process: Includes (Nested Relations)
    let finalData = data;
    if (config.include?.length) {
      finalData = await relationBuilder.resolve(db, finalData, config);
    }

    // Format response (applies built-in transforms)
    const result = formatResponse(finalData, meta, config, aggregations);

    // Apply inline JS transforms from builder
    if (extensions?.transforms?.size) {
      result.data = result.data.map((row) => {
        const r = { ...row };
        for (const [field, fn] of extensions.transforms) {
          if (field in r) r[field] = fn(r[field]);
        }
        return r;
      });
    }

    return result;
  }

  // ── queryGrouped (GROUP BY) ──

  async function queryGrouped(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<GroupedResult> {
    const selection = groupByBuilder.buildGroupedSelect(config);
    if (!selection) throw new Error('GROUP BY configuration invalid');

    const where = buildWhereConditions(params, context);
    const having = groupByBuilder.buildHaving(config);
    // Sort logic might need adjustment for groups (alias vs column)
    const orderBy = sortBuilder.buildSort(config, params.sort);

    let query = db.select(selection).from(baseTable);
    query = queryBuilder.buildJoins(query, config, extensions?.sqlJoinConditions);
    if (where) query = query.where(where);

    const groupCols = groupByBuilder.buildGroupByColumns(config);
    if (groupCols) query = query.groupBy(...groupCols);
    if (having) query = query.having(having);
    if (orderBy.length > 0) query = query.orderBy(...orderBy);

    // Pagination for groups?
    // Usually analytics queries are smaller, but let's support limit
    if (params.pageSize) query = query.limit(params.pageSize);

    const data = await query;

    // We don't have a total count for groups easily without a subquery
    // For now, return total = data.length
    const total = data.length;

    return {
      data,
      meta: { total },
      aggregations: {}, // Aggregations are in the rows for grouped queries
    };
  }

  // ── queryRecursive (CTE) ──

  async function queryRecursive(
    // params and context are unused but kept for interface consistency
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params: EngineParams = {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: EngineContext = {}
  ): Promise<EngineResult> {
    // Recursive queries use a completely different execution path (raw SQL)
    // They generally ignore standard filters/pagination in the recursion itself
    // but we can apply them to the final SELECT * FROM tree
    // For now, the RecursiveBuilder handles the whole execution.
    const data = await recursiveBuilder.execute(db, config);

    return {
      data,
      meta: {
        total: data.length,
        page: 1,
        pageSize: data.length,
        totalPages: 1,
      },
    };
  }

  // ── count ──

  async function countRows(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<number> {
    const where = buildWhereConditions(params, context);
    let q = db.select({ total: drizzleCount() }).from(baseTable);
    q = queryBuilder.buildJoins(q, config, extensions?.sqlJoinConditions);
    if (where) q = q.where(where);
    const result = await q;
    return result?.[0]?.total ?? 0;
  }

  // ── export ──

  async function exportRows(
    params: EngineParams = {},
    context: EngineContext = {}
  ): Promise<string> {
    // ... (Use same logic as query but with higher limit and no pagination)
    // Reuse query() internally if possible, but we need to override page/size
    const result = await query({
      ...params,
      page: 1,
      pageSize: 10000,
    }, context);

    return exportData(result.data, params.export ?? 'json', config);
  }

  return {
    query,
    queryGrouped,
    queryRecursive,
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
    const resolved = resolveInput(input);
    engines[resolved.config.name] = createTableEngine({ db, schema, config: input });
  }
  return engines;
}
