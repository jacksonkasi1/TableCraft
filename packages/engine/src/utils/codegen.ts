import { TableConfig } from '../types/table';

/**
 * Generates a standalone Drizzle TypeScript query file from a TableConfig.
 * This is the "eject" feature — lets you go from config → code.
 */
export function generateDrizzleCode(config: TableConfig): string {
  const lines: string[] = [];

  lines.push(`import { eq, and, or, asc, desc, ilike, count, sql } from 'drizzle-orm';`);
  lines.push(`import { db } from './db'; // adjust path`);

  const tables = new Set<string>();
  tables.add(config.base);
  if (config.joins) {
    for (const j of config.joins) {
      tables.add(j.table);
      collectNestedJoinTables(j, tables);
    }
  }
  lines.push(
    `import { ${[...tables].join(', ')} } from './schema'; // adjust path`
  );
  lines.push('');

  lines.push(`export async function query${capitalise(config.name)}(params: {`);
  lines.push(`  page?: number;`);
  lines.push(`  pageSize?: number;`);

  if (config.filters) {
    for (const f of config.filters) {
      if (f.type !== 'static') {
        lines.push(`  ${f.field}?: any;`);
      }
    }
  }

  if (config.search?.enabled) {
    lines.push(`  search?: string;`);
  }
  lines.push(`} = {}) {`);

  const visibleCols = config.columns.filter((c) => !c.hidden);
  lines.push(`  const data = await db`);
  lines.push(`    .select({`);
  for (const col of visibleCols) {
    if (col.dbTransform && col.dbTransform.length > 0) {
      const wrapped = col.dbTransform.reduce(
        (acc, fn) => `${fn}(${acc})`,
        `${config.base}.${col.name}`
      );
      lines.push(`      ${col.name}: sql\`${wrapped}\`,`);
    } else {
      lines.push(`      ${col.name}: ${config.base}.${col.name},`);
    }
  }
  lines.push(`    })`);
  lines.push(`    .from(${config.base})`);

  if (config.joins) {
    for (const j of config.joins) {
      const joinMethod =
        j.type === 'inner' ? 'innerJoin'
          : j.type === 'right' ? 'rightJoin'
          : j.type === 'full' ? 'fullJoin'
          : 'leftJoin';
      lines.push(`    .${joinMethod}(${j.table}, sql\`${j.on}\`)`);
    }
  }

  const whereParts: string[] = [];

  if (config.backendConditions) {
    for (const bc of config.backendConditions) {
      whereParts.push(`eq(${config.base}.${bc.field}, ${JSON.stringify(bc.value)})`);
    }
  }

  if (config.softDelete?.enabled) {
    const field = config.softDelete.field ?? 'deletedAt';
    whereParts.push(`sql\`${config.base}.${field} IS NULL\``);
  }

  if (config.filters) {
    for (const f of config.filters) {
      if (f.type === 'static' && f.value !== undefined) {
        whereParts.push(`eq(${config.base}.${f.field}, ${JSON.stringify(f.value)})`);
      } else if (f.type !== 'static') {
        whereParts.push(
          `...(params.${f.field} != null ? [eq(${config.base}.${f.field}, params.${f.field})] : [])`
        );
      }
    }
  }

  if (config.search?.enabled && config.search.fields.length > 0) {
    const searchParts = config.search.fields.map(
      (f) => `ilike(${config.base}.${f}, \`%\${params.search}%\`)`
    );
    whereParts.push(`...(params.search ? [or(${searchParts.join(', ')})] : [])`);
  }

  if (whereParts.length > 0) {
    lines.push(`    .where(and(`);
    for (const wp of whereParts) {
      lines.push(`      ${wp},`);
    }
    lines.push(`    ))`);
  }

  if (config.defaultSort && config.defaultSort.length > 0) {
    const sortParts = config.defaultSort.map((s) =>
      s.order === 'desc'
        ? `desc(${config.base}.${s.field})`
        : `asc(${config.base}.${s.field})`
    );
    lines.push(`    .orderBy(${sortParts.join(', ')})`);
  }

  const defaultSize = config.pagination?.defaultPageSize ?? 10;
  const maxSize = config.pagination?.maxPageSize ?? 100;
  lines.push(`    .limit(Math.min(params.pageSize ?? ${defaultSize}, ${maxSize}))`);
  lines.push(`    .offset(((params.page ?? 1) - 1) * Math.min(params.pageSize ?? ${defaultSize}, ${maxSize}));`);
  lines.push('');

  lines.push(`  const [{ total }] = await db`);
  lines.push(`    .select({ total: count() })`);
  lines.push(`    .from(${config.base});`);
  lines.push('');

  lines.push(`  const pageSize = Math.min(params.pageSize ?? ${defaultSize}, ${maxSize});`);
  lines.push(`  return {`);
  lines.push(`    data,`);
  lines.push(`    meta: {`);
  lines.push(`      total,`);
  lines.push(`      page: params.page ?? 1,`);
  lines.push(`      pageSize,`);
  lines.push(`      totalPages: Math.ceil(total / pageSize),`);
  lines.push(`    },`);
  lines.push(`  };`);
  lines.push(`}`);

  return lines.join('\n');
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function collectNestedJoinTables(join: any, tables: Set<string>): void {
  if (join.joins) {
    for (const j of join.joins) {
      tables.add(j.table);
      collectNestedJoinTables(j, tables);
    }
  }
}
