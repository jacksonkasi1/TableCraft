import * as fs from 'fs';
import * as path from 'path';
import type { CodegenOptions, GeneratedFile, GeneratedTable, TableMetadata } from './types.js';
import { fetchAllTables } from './fetch-meta.js';
import { generateTableFile, generateIndexFile, generatePackageJson } from './generator.js';

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, content, 'utf-8');
}

function generateVersion(): string {
  return `${Date.now()}`;
}

function validateTableNames(metadatas: TableMetadata[]): void {
  const names = new Map<string, string[]>();
  
  for (const meta of metadatas) {
    const existing = names.get(meta.name) || [];
    existing.push(meta.name);
    names.set(meta.name, existing);
  }

  const duplicates = Array.from(names.entries()).filter(([, arr]) => arr.length > 1);
  
  if (duplicates.length > 0) {
    const messages = duplicates.map(([name]) => `  - '${name}'`);
    throw new Error(
      `Duplicate table names found:\n${messages.join('\n')}\n` +
      `Please rename tables using .name('uniqueName') in your config.`
    );
  }
}

export async function codegen(options: CodegenOptions): Promise<{
  tables: GeneratedTable[];
  files: GeneratedFile[];
}> {
  console.log(`[TableCraft] Fetching metadata from ${options.url}...`);
  
  const metadatas = await fetchAllTables(options);
  
  if (metadatas.length === 0) {
    console.warn('[TableCraft] No tables found. Make sure your API is running.');
    return { tables: [], files: [] };
  }

  console.log(`[TableCraft] Found ${metadatas.length} tables: ${metadatas.map(m => m.name).join(', ')}`);

  validateTableNames(metadatas);

  const version = generateVersion();
  const tables: GeneratedTable[] = [];
  const files: GeneratedFile[] = [];

  for (const meta of metadatas) {
    console.log(`[TableCraft] Generating types for '${meta.name}'...`);
    const table = generateTableFile(meta, version);
    tables.push(table);
    files.push({
      filename: table.filename,
      content: table.content,
    });
  }

  files.push(generateIndexFile(tables));
  files.push(generatePackageJson());

  return { tables, files };
}

export async function codegenWrite(options: CodegenOptions): Promise<void> {
  const { files, tables } = await codegen(options);

  if (files.length === 0) {
    console.log('[TableCraft] No files generated.');
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  ensureDir(outputDir);

  for (const file of files) {
    const filePath = path.join(outputDir, file.filename);
    writeFile(filePath, file.content);
    console.log(`[TableCraft] Generated: ${file.filename}`);
  }

  console.log(`\n[TableCraft] ✅ Generated ${tables.length} table types in ${outputDir}`);
  console.log(`[TableCraft] Usage:`);
  console.log(`  import { ${tables[0]?.adapterFunction}, ${tables[0]?.rowType} } from './${path.basename(outputDir)}';`);
}

export * from './types.js';
export * from './generator.js';
export * from './fetch-meta.js';
