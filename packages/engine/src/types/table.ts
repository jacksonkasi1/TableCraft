import { z } from 'zod';

// --- Primitives ---
export const OperatorSchema = z.enum([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 
  'like', 'ilike', 'in', 'notIn', 'between', 
  'isNull', 'isNotNull', 'contains', 'startsWith', 'endsWith'
]);
export type Operator = z.infer<typeof OperatorSchema>;

export const JoinTypeSchema = z.enum(['left', 'right', 'inner', 'full']);
export type JoinType = z.infer<typeof JoinTypeSchema>;

export const FilterTypeSchema = z.enum(['static', 'dynamic']);
export type FilterType = z.infer<typeof FilterTypeSchema>;

export const AggregationTypeSchema = z.enum(['count', 'sum', 'avg', 'min', 'max']);
export type AggregationType = z.infer<typeof AggregationTypeSchema>;

// --- Column Config ---
export const ColumnConfigSchema = z.object({
  name: z.string(), // Output key / Identifier
  field: z.string().optional(), // Database column name (defaults to name). Can be "table.column"
  type: z.enum(['string', 'number', 'boolean', 'date', 'json', 'uuid']),
  label: z.string().optional(),
  hidden: z.boolean().default(false).optional(),
  sortable: z.boolean().default(true).optional(),
  filterable: z.boolean().default(true).optional(),
  // Database-level transform (e.g., "upper", "trim") applied in SQL
  dbTransform: z.array(z.string()).optional(),
  // JavaScript-level transform applied after fetching
  jsTransform: z.array(z.string()).optional(),
});
export type ColumnConfig = z.infer<typeof ColumnConfigSchema>;
export type ColumnDefinition = z.input<typeof ColumnConfigSchema>;

// --- Join Config (Recursive) ---
// Using z.lazy for recursive types
export const JoinConfigSchema: z.ZodType<any> = z.lazy(() => z.object({
  table: z.string(), // Name of the joined table (as defined in config or db)
  alias: z.string().optional(),
  type: JoinTypeSchema.default('left').optional(),
  on: z.string(), // SQL condition or simple "localKey=foreignKey"
  columns: z.array(ColumnConfigSchema).optional(),
  // Recursive joins
  joins: z.array(z.lazy(() => JoinConfigSchema)).optional(),
}));
export type JoinConfig = z.infer<typeof JoinConfigSchema>;
export type JoinDefinition = z.input<typeof JoinConfigSchema>;

// --- Filter & Search Config ---
export const FilterConfigSchema = z.object({
  field: z.string(),
  operator: OperatorSchema.default('eq').optional(),
  value: z.any().optional(), // For static filters
  label: z.string().optional(),
  type: FilterTypeSchema.default('dynamic').optional(), // dynamic = from URL, static = fixed
});
export type FilterConfig = z.infer<typeof FilterConfigSchema>;

export const SearchConfigSchema = z.object({
  fields: z.array(z.string()), // Columns to search across
  enabled: z.boolean().default(true).optional(),
});
export type SearchConfig = z.infer<typeof SearchConfigSchema>;

export const SortConfigSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']).default('asc').optional(),
});
export type SortConfig = z.infer<typeof SortConfigSchema>;

export const PaginationConfigSchema = z.object({
  defaultPageSize: z.number().default(10).optional(),
  maxPageSize: z.number().default(100).optional(),
  enabled: z.boolean().default(true).optional(),
});
export type PaginationConfig = z.infer<typeof PaginationConfigSchema>;

// --- Advanced Features ---
export const AggregationConfigSchema = z.object({
  alias: z.string(),
  type: AggregationTypeSchema,
  field: z.string(),
});
export type AggregationConfig = z.infer<typeof AggregationConfigSchema>;

export const SubqueryConfigSchema = z.object({
  alias: z.string(),
  table: z.string(),
  type: z.enum(['count', 'exists', 'first']), // Simplistic subquery types for now
  filter: z.string().optional(), // Condition for the subquery
});
export type SubqueryConfig = z.infer<typeof SubqueryConfigSchema>;

export const BackendConditionSchema = z.object({
  field: z.string(),
  operator: OperatorSchema,
  value: z.any(), // Static value or context variable (e.g., "$user.id")
});
export type BackendCondition = z.infer<typeof BackendConditionSchema>;

// --- Platform Features ---
export const TenantConfigSchema = z.object({
  field: z.string().default('tenantId').optional(),
  enabled: z.boolean().default(true).optional(),
});
export type TenantConfig = z.infer<typeof TenantConfigSchema>;

export const SoftDeleteConfigSchema = z.object({
  field: z.string().default('deletedAt').optional(),
  enabled: z.boolean().default(true).optional(),
});
export type SoftDeleteConfig = z.infer<typeof SoftDeleteConfigSchema>;

export const CacheConfigSchema = z.object({
  ttl: z.number().default(60).optional(), // Seconds
  enabled: z.boolean().default(false).optional(),
  staleWhileRevalidate: z.number().optional(),
});
export type CacheConfig = z.infer<typeof CacheConfigSchema>;

export const ExportConfigSchema = z.object({
  formats: z.array(z.enum(['csv', 'json'])).default(['csv', 'json']).optional(),
  enabled: z.boolean().default(true).optional(),
});
export type ExportConfig = z.infer<typeof ExportConfigSchema>;

export const AccessControlSchema = z.object({
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});
export type AccessControl = z.infer<typeof AccessControlSchema>;

// --- Root Configuration ---
export const TableConfigSchema = z.object({
  name: z.string(), // Unique identifier for the config
  base: z.string(), // Base Drizzle table name
  
  columns: z.array(ColumnConfigSchema),
  
  joins: z.array(JoinConfigSchema).optional(),
  
  filters: z.array(FilterConfigSchema).optional(),
  search: SearchConfigSchema.optional(),
  defaultSort: z.array(SortConfigSchema).optional(),
  pagination: PaginationConfigSchema.optional(),
  
  backendConditions: z.array(BackendConditionSchema).optional(),
  aggregations: z.array(AggregationConfigSchema).optional(),
  subqueries: z.array(SubqueryConfigSchema).optional(),
  
  tenant: TenantConfigSchema.optional(),
  softDelete: SoftDeleteConfigSchema.optional(),
  cache: CacheConfigSchema.optional(),
  export: ExportConfigSchema.optional(),
  
  access: AccessControlSchema.optional(),
});
export type TableConfig = z.infer<typeof TableConfigSchema>;
export type TableDefinition = z.input<typeof TableConfigSchema>;
