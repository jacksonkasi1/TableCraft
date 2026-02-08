import { TableConfigSchema, TableConfig } from '../types/table';
import { getTableColumns, Table } from 'drizzle-orm';

/**
 * Validates a raw configuration object against the Zod schema.
 * @param config The raw configuration object.
 * @returns The validated TableConfig object.
 * @throws ZodError if validation fails.
 */
export function validateConfig(config: unknown): TableConfig {
  return TableConfigSchema.parse(config);
}

/**
 * Validates the configuration against the actual Drizzle schema.
 * Ensures that the base table and columns exist.
 * @param config The validated TableConfig object.
 * @param drizzleSchema An object containing Drizzle table definitions.
 * @returns True if valid.
 * @throws Error if validation fails.
 */
export function validateAgainstSchema(
  config: TableConfig,
  drizzleSchema: Record<string, unknown> // Using unknown here as we'll cast to Drizzle Table
): boolean {
  // 1. Verify base table exists
  const baseTable = drizzleSchema[config.base];
  if (!baseTable) {
    throw new Error(`Base table '${config.base}' not found in Drizzle schema.`);
  }

  // Check if it's a valid Drizzle table (simplistic check)
  // In a real app, we might check for specific Drizzle symbols or properties
  if (typeof baseTable !== 'object' || baseTable === null) {
     throw new Error(`Schema entry '${config.base}' is not a valid table object.`);
  }

  // Cast to Table to use getTableColumns
  const table = baseTable as Table;
  
  try {
      // 2. Verify columns exist in table
      const tableColumns = getTableColumns(table);
      const tableColumnNames = new Set(Object.keys(tableColumns));

      for (const col of config.columns) {
        // Resolve database field name (default to col.name)
        const dbField = col.field ?? col.name;

        // Handle joined columns "table.column"
        if (dbField.includes('.')) {
          const [tableName, colName] = dbField.split('.');
          const joinedTable = drizzleSchema[tableName] as Table;
          
          if (!joinedTable) {
             throw new Error(`Table '${tableName}' referenced in column '${col.name}' not found in schema.`);
          }
          
          const joinedColumns = getTableColumns(joinedTable);
          if (!joinedColumns[colName]) {
             throw new Error(`Column '${colName}' referenced in '${col.name}' does not exist in table '${tableName}'.`);
          }
          continue; // Validated
        }

        // Check if column is a subquery alias
        if (config.subqueries?.some(s => s.alias === col.name)) {
          continue;
        }

        // Check if column is an aggregation alias
        if (config.aggregations?.some(a => a.alias === col.name)) {
          continue;
        }

        // Validate against base table
        if (!tableColumnNames.has(dbField)) {
          throw new Error(`Column '${dbField}' configured in '${config.name}' does not exist in table '${config.base}'.`);
        }
      }

      // 3. Verify join tables (if any)
      if (config.joins) {
        for (const join of config.joins) {
           const joinTable = drizzleSchema[join.table];
           if (!joinTable) {
             throw new Error(`Joined table '${join.table}' not found in Drizzle schema.`);
           }
           // Recursive validation could happen here if we wanted to validate join columns too
        }
      }

  } catch (e: any) {
      // getTableColumns throws if it's not a valid table, catch that too
      throw new Error(`Failed to validate against Drizzle schema: ${e.message}`);
  }

  return true;
}
