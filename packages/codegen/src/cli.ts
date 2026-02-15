#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { codegenWrite } from './index.js';

interface CliArgs {
  url: string;
  out: string;
  tables?: string[];
  header?: string[];
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('tablecraft-codegen')
    .usage('$0 --url <api-url> --out <output-dir>')
    .option('url', {
      alias: 'u',
      type: 'string',
      description: 'Base URL of your TableCraft API',
      demandOption: true,
    })
    .option('out', {
      alias: 'o',
      type: 'string',
      description: 'Output directory for generated types',
      demandOption: true,
    })
    .option('tables', {
      alias: 't',
      type: 'array',
      string: true,
      description: 'Specific tables to generate (default: all)',
    })
    .option('header', {
      alias: 'H',
      type: 'array',
      string: true,
      description: 'Custom headers (e.g., -H "Authorization: Bearer token")',
    })
    .example('$0 --url http://localhost:5000/engine --out ./src/generated', 'Generate all tables')
    .example('$0 --url http://localhost:5000/engine --out ./src/generated --tables products orders', 'Generate specific tables')
    .example('$0 --url http://localhost:5000/engine --out ./src/generated -H "Authorization: Bearer token"', 'With auth header')
    .help()
    .alias('help', 'h')
    .parse();

  const headers: Record<string, string> = {};
  
  if (argv.header) {
    for (const h of argv.header) {
      const [key, ...valueParts] = h.split(':');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    }
  }

  try {
    await codegenWrite({
      url: argv.url,
      outputDir: argv.out,
      tables: argv.tables,
      headers,
    });
  } catch (error) {
    console.error('[TableCraft] ❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
