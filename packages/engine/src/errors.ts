/**
 * Base error class for all TableCraft errors.
 * Every error has a `code` for programmatic handling.
 */
export class TableCraftError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'TableCraftError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Configuration is invalid (bad column name, missing table, etc.)
 */
export class ConfigError extends TableCraftError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', 400, details);
    this.name = 'ConfigError';
  }
}

/**
 * A filter, sort, or select references a field that doesn't exist or isn't allowed.
 */
export class FieldError extends TableCraftError {
  constructor(field: string, reason: string) {
    super(`Field '${field}': ${reason}`, 'FIELD_ERROR', 400, { field, reason });
    this.name = 'FieldError';
  }
}

/**
 * A filter value has the wrong type for its column.
 */
export class ValidationError extends TableCraftError {
  constructor(field: string, expected: string, received: unknown) {
    super(
      `Invalid value for '${field}': expected ${expected}, got ${typeof received}`,
      'VALIDATION_ERROR',
      400,
      { field, expected, received }
    );
    this.name = 'ValidationError';
  }
}

/**
 * Access denied — user lacks required role/permission.
 */
export class AccessDeniedError extends TableCraftError {
  constructor(resource: string, reason?: string) {
    super(
      `Access denied to '${resource}'${reason ? `: ${reason}` : ''}`,
      'ACCESS_DENIED',
      403,
      { resource, reason }
    );
    this.name = 'AccessDeniedError';
  }
}

/**
 * The requested resource/table was not found.
 */
export class NotFoundError extends TableCraftError {
  constructor(resource: string) {
    super(`Resource '${resource}' not found`, 'NOT_FOUND', 404, { resource });
    this.name = 'NotFoundError';
  }
}

/**
 * The database query failed.
 */
export class QueryError extends TableCraftError {
  constructor(message: string, details?: unknown) {
    super(message, 'QUERY_ERROR', 500, details);
    this.name = 'QueryError';
  }
}

/**
 * A feature is not supported on the current database dialect.
 */
export class DialectError extends TableCraftError {
  constructor(feature: string, dialect: string) {
    super(
      `'${feature}' is not supported on ${dialect}. Use PostgreSQL or write a raw query.`,
      'DIALECT_ERROR',
      400,
      { feature, dialect }
    );
    this.name = 'DialectError';
  }
}
