import type { TableMetadata, ColumnMeta, GeneratedFile, GeneratedTable } from './types.js';

const TYPE_MAP: Record<string, string> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'string',
  uuid: 'string',
  json: 'Record<string, unknown>',
};

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function mapColumnType(type: string): string {
  return TYPE_MAP[type] ?? 'unknown';
}

function generateEnumType(options: Array<{ value: string | number | boolean }>): string {
  const values = options.map(o => JSON.stringify(o.value)).join(' | ');
  return values;
}

/**
 * Derives a PascalCase enum const name from a table name + field name.
 * e.g. tableName="orders", field="status" → "OrdersStatus"
 */
function enumConstName(tableName: string, field: string): string {
  return toPascalCase(tableName) + toPascalCase(field);
}

/**
 * Emits a `const` enum object + companion type for a field with options[].
 * Example:
 *   export const OrdersStatus = { pending: 'pending', ... } as const;
 *   export type OrdersStatus = typeof OrdersStatus[keyof typeof OrdersStatus];
 */
function generateEnumConst(
  constName: string,
  options: Array<{ value: string | number | boolean }>
): string {
  const entries = options
    .map(o => {
      const key = String(o.value).replace(/[^a-zA-Z0-9_$]/g, '_');
      const val = JSON.stringify(o.value);
      return `  ${key}: ${val},`;
    })
    .join('\n');

  return (
    `export const ${constName} = {\n${entries}\n} as const;\n` +
    `export type ${constName} = typeof ${constName}[keyof typeof ${constName}];`
  );
}

/**
 * Collect all enum consts that need to be generated for a table.
 * Deduplicates by constName so a shared field (e.g. status appearing in both
 * columns and filters) only produces one const.
 */
function collectEnumConsts(
  tableName: string,
  columns: ColumnMeta[],
  filters: TableMetadata['filters']
): Array<{ constName: string; options: Array<{ value: string | number | boolean }> }> {
  const seen = new Set<string>();
  const result: Array<{ constName: string; options: Array<{ value: string | number | boolean }> }> = [];

  for (const col of columns) {
    if (col.options && col.options.length > 0) {
      const name = enumConstName(tableName, col.name);
      if (!seen.has(name)) {
        seen.add(name);
        result.push({ constName: name, options: col.options });
      }
    }
  }

  for (const f of filters) {
    if (f.options && f.options.length > 0) {
      const name = enumConstName(tableName, f.field);
      if (!seen.has(name)) {
        seen.add(name);
        result.push({ constName: name, options: f.options });
      }
    }
  }

  return result;
}

function generateRowInterface(
  tableName: string,
  columns: ColumnMeta[]
): string {
  const interfaceName = `${toPascalCase(tableName)}Row`;

  const fields = columns
    .filter(col => !col.hidden)
    .map(col => {
      let tsType: string;
      if (col.options && col.options.length > 0) {
        // Use the enum const type name instead of an inline union
        tsType = enumConstName(tableName, col.name);
      } else {
        tsType = mapColumnType(col.type);
      }
      const nullable = col.type === 'date' && !col.computed ? ' | null' : '';
      return `  ${col.name}: ${tsType}${nullable};`;
    })
    .join('\n');

  return `export interface ${interfaceName} extends Record<string, unknown> {\n${fields}\n}`;
}

function generateFiltersInterface(
  tableName: string,
  columns: ColumnMeta[],
  filters: TableMetadata['filters']
): string {
  const interfaceName = `${toPascalCase(tableName)}Filters`;

  if (filters.length === 0) {
    return `export interface ${interfaceName} {}`;
  }

  const fields = filters.map(f => {
    // Prefer filter-level options, fall back to column-level options
    const filterOptions = f.options && f.options.length > 0 ? f.options : null;
    const col = columns.find(c => c.name === f.field);
    const colOptions = col?.options && col.options.length > 0 ? col.options : null;
    const hasOptions = filterOptions ?? colOptions;

    let valueType: string;
    if (hasOptions) {
      valueType = enumConstName(tableName, f.field);
    } else {
      valueType = mapColumnType(f.type);
    }

    const operators = f.operators.filter(op => !['isNull', 'isNotNull'].includes(op));

    if (operators.length === 0) {
      return `  ${f.field}?: { operator: 'isNull' | 'isNotNull' };`;
    }

    const operatorUnion = operators.map(op => `'${op}'`).join(' | ');

    if (f.type === 'date' || f.type === 'number') {
      return `  ${f.field}?: { operator: ${operatorUnion}; value: ${valueType} | [${valueType}, ${valueType}] };`;
    }

    if (['in', 'notIn'].some(op => operators.includes(op))) {
      return `  ${f.field}?: { operator: ${operatorUnion}; value: ${valueType} | ${valueType}[] };`;
    }

    return `  ${f.field}?: { operator: ${operatorUnion}; value: ${valueType} };`;
  }).join('\n');

  return `export interface ${interfaceName} {\n${fields}\n}`;
}

function generateColumnType(
  tableName: string,
  columns: ColumnMeta[]
): string {
  const pascalName = toPascalCase(tableName);
  const visibleColumns = columns.filter(col => !col.hidden);
  const columnNames = visibleColumns.length > 0
    ? visibleColumns.map(col => `'${col.name}'`).join(' | ')
    : 'never';
  return `export type ${pascalName}Column = ${columnNames};`;
}

/**
 * Emits a typed tuple const for static (server-applied) filters so consumers
 * know which fields are auto-applied and cannot be overridden.
 *
 * export const OrdersStaticFilters = ['tenantId', 'deletedAt'] as const;
 * export type OrdersStaticFilter = (typeof OrdersStaticFilters)[number];
 */
function generateStaticFiltersConst(
  tableName: string,
  staticFilters: string[]
): string | null {
  if (staticFilters.length === 0) return null;

  const pascalName = toPascalCase(tableName);
  const constName = `${pascalName}StaticFilters`;
  const typeName = `${pascalName}StaticFilter`;
  const values = staticFilters.map(f => `'${f}'`).join(', ');

  return (
    `export const ${constName} = [${values}] as const;\n` +
    `export type ${typeName} = (typeof ${constName})[number];`
  );
}

function generateAdapterFunction(
  tableName: string,
  apiName: string
): string {
  const pascalName = toPascalCase(tableName);

  return `export function create${pascalName}Adapter(options: {
  baseUrl: string;
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  customFilters?: CustomFilters<${pascalName}Filters>;
}): DataAdapter<${pascalName}Row> {
  return createTableCraftAdapter<${pascalName}Row, ${pascalName}Filters>({
    ...options,
    table: '${apiName}',
  });
}`;
}

export function generateTableFile(
  metadata: TableMetadata,
  version: string
): GeneratedTable {
  const { name, columns, filters, staticFilters } = metadata;
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);

  const header = `// AUTO-GENERATED by @tablecraft/codegen
// DO NOT EDIT MANUALLY
// @tablecraft-version: ${version}
// @tablecraft-table: ${name}
// Generated: ${new Date().toISOString()}

import { createTableCraftAdapter, type DataAdapter, type CustomFilters } from '@tablecraft/table';

`;

  // Collect enum consts for columns and filters that have options[]
  const enumConsts = collectEnumConsts(name, columns, filters);
  const enumConstsBlock = enumConsts
    .map(e => generateEnumConst(e.constName, e.options))
    .join('\n\n');

  const rowInterface = generateRowInterface(name, columns);
  const filtersInterface = generateFiltersInterface(name, columns, filters);
  const columnType = generateColumnType(name, columns);
  const staticFiltersConst = generateStaticFiltersConst(name, staticFilters ?? []);
  const adapterFunction = generateAdapterFunction(name, name);

  const parts: string[] = [];
  if (enumConstsBlock) {
    parts.push(enumConstsBlock, '');
  }
  parts.push(rowInterface, '', filtersInterface, '', columnType);
  if (staticFiltersConst) {
    parts.push('', staticFiltersConst);
  }
  parts.push('', adapterFunction);

  const content = header + parts.join('\n');

  return {
    tableName: name,
    filename: `${kebabName}.ts`,
    rowType: `${pascalName}Row`,
    filtersType: `${pascalName}Filters`,
    columnType: `${pascalName}Column`,
    adapterFunction: `create${pascalName}Adapter`,
    content,
  };
}

export function generateIndexFile(
  tables: GeneratedTable[]
): GeneratedFile {
  const exports = tables.map(t => {
    const kebabName = toKebabCase(t.tableName);
    return `export * from './${kebabName}.js';`;
  }).join('\n');

  const content = `// AUTO-GENERATED by @tablecraft/codegen
// DO NOT EDIT MANUALLY
// Generated: ${new Date().toISOString()}

${exports}
`;

  return {
    filename: 'index.ts',
    content,
  };
}

export function generatePackageJson(): GeneratedFile {
  const content = `{
  "name": "tablecraft-types",
  "version": "0.0.1",
  "main": "./index.js",
  "types": "./index.d.ts",
  "exports": {
    ".": {
      "import": "./index.js",
      "types": "./index.d.ts"
    }
  },
  "peerDependencies": {
    "@tablecraft/table": ">=0.0.1"
  }
}
`;

  return {
    filename: 'package.json',
    content,
  };
}
