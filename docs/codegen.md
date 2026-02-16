# Type Generation CLI

The `@tablecraft/codegen` package generates TypeScript types from your TableCraft API metadata, providing full type safety for your frontend code.

## Installation

{% tabs %}
{% tab title="pnpm" %}
```bash
# Install as dev dependency
pnpm add -D @tablecraft/codegen
```
{% endtab %}

{% tab title="npx" %}
```bash
# Use directly with npx
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated
```
{% endtab %}
{% endtabs %}

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

{% tabs %}
{% tab title="Generate All" %}
```bash
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated
```
{% endtab %}

{% tab title="Specific Tables" %}
```bash
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated --tables users orders
```
{% endtab %}

{% tab title="Authenticated" %}
```bash
npx @tablecraft/codegen --url https://api.example.com/engine --out ./src/generated -H "Authorization: Bearer token"
```
{% endtab %}
{% endtabs %}

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

{% tabs %}
{% tab title="Row Interface" %}
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
{% endtab %}

{% tab title="Filters Interface" %}
Filter types with operator unions:

```typescript
export interface UsersFilters {
  id?: { operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between'; value: number | [number, number] };
  email?: { operator: 'eq' | 'contains' | 'startsWith' | 'endsWith'; value: string };
  isActive?: { operator: 'eq' | 'neq'; value: boolean };
}
```
{% endtab %}

{% tab title="Adapter Factory" %}
Typed adapter factory functions:

```typescript
export function createUsersAdapter(options: {
  baseUrl: string;
  headers?: Record<string, string>;
}): DataAdapter<UsersRow>
```
{% endtab %}
{% endtabs %}

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

## Benefits

<table data-view="cards">
    <thead>
        <tr>
            <th>Benefit</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Autocomplete</td>
            <td>Column names and filter operators appear in your IDE.</td>
        </tr>
        <tr>
            <td>Type Checking</td>
            <td>Catch errors like typos or invalid types at compile time.</td>
        </tr>
        <tr>
            <td>Refactoring</td>
            <td>Rename columns safely across the entire codebase.</td>
        </tr>
        <tr>
            <td>Documentation</td>
            <td>Generated types serve as always-up-to-date documentation.</td>
        </tr>
    </tbody>
</table>

## CI/CD Integration

Add to your `package.json` to ensure types are always fresh before building:

```json
{
  "scripts": {
    "codegen": "tablecraft-codegen --url $API_URL --out ./src/generated",
    "prebuild": "pnpm codegen"
  }
}
```
