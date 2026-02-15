# @tablecraft/codegen

Generate TypeScript types from TableCraft API metadata — keep your frontend types in sync with your backend.

## Links

- [GitHub](https://github.com/jacksonkasi1/TableCraft)
- [Documentation](https://jacksonkasi.gitbook.io/tablecraft/)

## Install

```bash
bun add -D @tablecraft/codegen
# or
npm install -D @tablecraft/codegen
# or
yarn add -D @tablecraft/codegen
# or
pnpm add -D @tablecraft/codegen
```

## Features

- **Auto-generated types** — Generate TypeScript interfaces from your table configs
- **Type-safe queries** — Get autocomplete for filters, sorts, and column names
- **CLI tool** — Simple command-line interface for code generation
- **Watch mode** — Regenerate types on API changes during development

## Usage

### CLI

```bash
# Generate types from a running TableCraft API
npx tablecraft-codegen --url http://localhost:3000/api/data --output ./src/generated

# Or use with a config file
npx tablecraft-codegen --config tablecraft.config.json
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url, -u` | TableCraft API URL | Required |
| `--output, -o` | Output directory | `./src/generated` |
| `--config, -c` | Path to config file | - |
| `--watch, -w` | Watch for changes | `false` |

### Generated Output

```ts
// src/generated/users.ts
export interface User {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
}

export type UserFilter = {
  id?: number | { eq?: number; in?: number[] };
  name?: string | { eq?: string; contains?: string };
  status?: 'active' | 'inactive' | 'pending';
};

export type UserSort = 'id' | '-id' | 'name' | '-name' | 'createdAt' | '-createdAt';
```

## Programmatic Usage

```ts
import { generateTypes } from '@tablecraft/codegen';

const types = await generateTypes({
  url: 'http://localhost:3000/api/data',
  tables: ['users', 'orders', 'products'],
});

console.log(types); // Generated TypeScript code as string
```

## License

MIT
