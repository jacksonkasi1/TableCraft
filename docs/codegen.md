# Type Generation CLI

The `@tablecraft/codegen` package generates TypeScript types from your TableCraft API metadata, providing full type safety for your frontend code.

## Installation

```bash
# Install as dev dependency
pnpm add -D @tablecraft/codegen

# Or use directly with npx
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated
```

## Usage

### Basic Usage

```bash
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated
```

This will:
1. Fetch metadata from all tables via `/_tables` endpoint
2. Generate TypeScript interfaces for each table
3. Create typed adapter factory functions

### Options

| Option | Alias | Description | Required |
|--------|-------|-------------|----------|
| `--url` | `-u` | Base URL of your TableCraft API | Yes |
| `--out` | `-o` | Output directory for generated files | Yes |
| `--tables` | `-t` | Specific tables to generate (default: all) | No |
| `--header` | `-H` | Custom headers (e.g., `-H "Authorization: Bearer token"`) | No |

### Examples

```bash
# Generate all tables
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated

# Generate specific tables
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated --tables users orders

# With authentication
npx @tablecraft/codegen --url https://api.example.com/engine --out ./src/generated -H "Authorization: Bearer token"
```

## Generated Files

```
src/generated/
├── index.ts          # Re-exports all types
├── users.ts          # UsersRow, UsersFilters, createUsersAdapter
├── orders.ts         # OrdersRow, OrdersFilters, createOrdersAdapter
├── products.ts       # ProductsRow, ProductsFilters, createProductsAdapter
└── package.json      # Package configuration
```

## Generated Types

### Row Interface

Each table generates a Row interface with all column types:

```typescript
export interface UsersRow extends Record<string, unknown> {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string | null;
}
```

### Filters Interface

Filter types with operator unions:

```typescript
export interface UsersFilters {
  id?: { operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between'; value: number | [number, number] };
  email?: { operator: 'eq' | 'contains' | 'startsWith' | 'endsWith'; value: string };
  isActive?: { operator: 'eq' | 'neq'; value: boolean };
}
```

### Adapter Factory

Typed adapter factory functions:

```typescript
export function createUsersAdapter(options: {
  baseUrl: string;
  headers?: Record<string, string>;
}): DataAdapter<UsersRow>
```

## Using Generated Types

### With DataTable

```typescript
import { DataTable } from '@tablecraft/table';
import { createOrdersAdapter, type OrdersRow } from './generated';

function OrdersPage() {
  const adapter = createOrdersAdapter({
    baseUrl: '/api/engine',
  });

  return <DataTable<OrdersRow> adapter={adapter} />;
}
```

### With Custom Adapter

```typescript
import { createTableCraftAdapter } from '@tablecraft/table';
import type { UsersRow, UsersFilters } from './generated';

const adapter = createTableCraftAdapter<UsersRow>({
  baseUrl: '/api/engine',
  table: 'users',
});
```

## Type Safety Benefits

1. **Autocomplete** - Column names and filter operators
2. **Type checking** - Catch errors at compile time
3. **Refactoring** - Rename columns safely across codebase
4. **Documentation** - Types serve as inline documentation

## CI/CD Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "codegen": "tablecraft-codegen --url $API_URL --out ./src/generated",
    "prebuild": "pnpm codegen"
  }
}
```

## Configuration File (Coming Soon)

Future versions will support a configuration file:

```yaml
# tablecraft.config.yaml
api:
  url: http://localhost:5000/engine
  headers:
    Authorization: Bearer ${API_TOKEN}

output:
  dir: ./src/generated
  
tables:
  - users
  - orders
  - products
```
