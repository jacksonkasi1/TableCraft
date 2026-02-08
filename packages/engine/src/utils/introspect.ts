import {
  Table,
  Column,
  getTableColumns,
  getTableName,
} from 'drizzle-orm';
import { TableConfig, ColumnConfig } from '../types/table';

/**
 * Maps a Drizzle column's internal dataType/columnType to our simplified type system.
 */
function mapColumnType(column: Column): ColumnConfig['type'] {
  const ct = (column.columnType ?? '').toLowerCase();

  if (ct.includes('uuid')) return 'uuid';
  if (ct.includes('json')) return 'json';
  if (ct.includes('bool')) return 'boolean';
  if (ct.includes('timestamp') || ct.includes('date')) return 'date';
  if (ct.includes('decimal') || ct.includes('numeric')) return 'number';

  switch (column.dataType) {
    case 'number':
    case 'bigint':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'date';
    case 'json':
      return 'json';
    case 'string':
    default:
      return 'string';
  }
}

/**
 * Detects whether a column is likely a text column (useful for auto-search).
 */
function isTextColumn(column: Column): boolean {
  const ct = (column.columnType ?? '').toLowerCase();
  return (
    column.dataType === 'string' &&
    !ct.includes('uuid') &&
    !ct.includes('enum') &&
    !ct.includes('decimal') &&
    !ct.includes('numeric')
  );
}

/**
 * Column names commonly considered sensitive.
 * NOT auto-hidden — only used by autoHide() when developer explicitly opts in.
 */
const SENSITIVE_COLUMNS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'hashedPassword',
  'hashed_password',
  'salt',
  'secret',
  'token',
  'refreshToken',
  'refresh_token',
]);

/** Common soft-delete field names */
const SOFT_DELETE_FIELDS = ['deletedAt', 'deleted_at', 'deletedOn', 'deleted_on'];

/** Common tenant field names */
const TENANT_FIELDS = ['tenantId', 'tenant_id', 'orgId', 'org_id', 'organizationId', 'organization_id'];

/**
 * Returns the list of column names that look sensitive in this table.
 * Does NOT hide them — just reports them. Developer decides.
 */
export function detectSensitiveColumns(table: Table): string[] {
  const columns = getTableColumns(table);
  return Object.keys(columns).filter((name) => SENSITIVE_COLUMNS.has(name));
}

/**
 * Returns the set of sensitive column names (for use by autoHide).
 */
export function getSensitiveColumnNames(): Set<string> {
  return new Set(SENSITIVE_COLUMNS);
}

/**
 * Introspects a Drizzle table and produces a default TableConfig.
 *
 * NOTHING is hidden by default. Every column is visible, sortable, filterable.
 * The developer has full control.
 */
export function introspectTable(table: Table): TableConfig {
  const tableName = getTableName(table);
  const columns = getTableColumns(table);

  const columnConfigs: ColumnConfig[] = [];
  const searchableFields: string[] = [];
  let detectedSoftDelete: string | undefined;
  let detectedTenant: string | undefined;
  let defaultSortField: string | undefined;

  for (const [name, column] of Object.entries(columns)) {
    const type = mapColumnType(column);

    const config: ColumnConfig = {
      name,
      type,
      label: humanise(name),
      hidden: false,       // ← NOTHING hidden by default
      sortable: true,
      filterable: true,
    };

    columnConfigs.push(config);

    // Detect searchable text columns (used as default for search config)
    if (isTextColumn(column)) {
      searchableFields.push(name);
    }

    // Detect soft delete field
    if (!detectedSoftDelete && SOFT_DELETE_FIELDS.includes(name)) {
      detectedSoftDelete = name;
    }

    // Detect tenant field
    if (!detectedTenant && TENANT_FIELDS.includes(name)) {
      detectedTenant = name;
    }

    // Detect default sort
    if (name === 'createdAt' || name === 'created_at') {
      defaultSortField = name;
    } else if (!defaultSortField && (name === 'updatedAt' || name === 'updated_at')) {
      defaultSortField = name;
    } else if (!defaultSortField && name === 'id') {
      defaultSortField = name;
    }
  }

  const tableConfig: TableConfig = {
    name: tableName,
    base: tableName,
    columns: columnConfigs,
    pagination: {
      defaultPageSize: 10,
      maxPageSize: 100,
      enabled: true,
    },
  };

  if (searchableFields.length > 0) {
    tableConfig.search = {
      fields: searchableFields.slice(0, 5),
      enabled: true,
    };
  }

  if (defaultSortField) {
    tableConfig.defaultSort = [{ field: defaultSortField, order: 'desc' }];
  }

  // Detected but NOT enabled — developer opts in
  if (detectedSoftDelete) {
    tableConfig.softDelete = {
      field: detectedSoftDelete,
      enabled: false, // ← opt-in
    };
  }

  if (detectedTenant) {
    tableConfig.tenant = {
      field: detectedTenant,
      enabled: false, // ← opt-in
    };
  }

  return tableConfig;
}

/**
 * Converts camelCase/snake_case to human-readable label.
 */
export function humanise(name: string): string {
  if (name === 'id') return 'ID';

  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, 'ID')
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bApi\b/g, 'API');
}

export { isTextColumn, mapColumnType };
