# TableCraft Engine Documentation

Welcome to the TableCraft Engine documentation! This engine simplifies database interactions by allowing you to define table configurations and automatically generate powerful APIs with filtering, sorting, pagination, and more.

## Getting Started

Start with the basics to understand how to define tables and fetch data.

### Table of Contents

1. [**Basics**](./1-basics.md)
   - Defining your first table.
   - Standard query parameters (sort, filter, paginate).
   - Basic API setup.

2. [**Relationships & Joins**](./2-relationships.md)
   - Connecting tables (e.g., Users → Orders).
   - Fetching related data.
   - Filtering across relationships.

3. [**Advanced Configuration**](./3-advanced.md)
   - Computed columns (SQL expressions).
   - Custom search logic.
   - Transforms (formatting data).

4. [**Security & Access Control**](./4-security.md)
   - Handling sensitive data (passwords, tokens).
   - Tenant isolation.
   - Soft deletes.

5. [**Extending & Raw SQL**](./5-extending.md)
   - When the engine isn't enough.
   - Writing raw Drizzle queries.
   - Using `manualResult` for consistent API responses.

6. [**Error Handling**](./6-errors.md)
   - Input validation and field checking.
   - Typed error class (ValidationError, FieldError).
   - Handling errors in your API framework.

## Features

### Date Filtering

Automatic date range filtering with smart detection:

- Auto-detects date columns from schema
- Prefers `createdAt` as default filter column
- Full calendar date picker in frontend
- Quick presets (Today, This Week, This Month, etc.)

[Learn more about Date Filtering →](./date-filtering.md)

### Type Generation

Generate TypeScript types from your API:

- Full type safety for frontend code
- Autocomplete for columns and filters
- Typed adapter factory functions
- CI/CD integration ready

```bash
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated
```

[Learn more about Type Generation →](./codegen.md)

## API Reference

7. [**Metadata API**](./metadata-api.md)
   - Auto-generated frontend schema (`/_meta` endpoint).
   - Building data tables without hardcoding columns.
   - Role-based column visibility.
   - Date presets and enum dropdowns.
   - Frontend SDK (`@tablecraft/client`) and React hooks.

8. [**OpenAPI Spec Generation**](./openapi.md)
   - Auto-generate OpenAPI 3.0 specifications from your configs.
   - Serve specs at runtime or write to files.
   - Integration with Swagger UI, Postman, and code generators.
   - Document all query parameters, filters, and responses.

9. [**Type Safety**](./type-safety.md)
   - Type-safe helpers for common operations.
   - Date range filtering with TypeScript.

10. [**Examples**](./examples.md)
    - Real-world usage patterns.

## Quick Example

```typescript
import { defineTable } from '@tablecraft/engine';
import { products } from './db/schema';

export const productConfig = defineTable(products)
  .label('name', 'Product Name')
  .search('name', 'category')
  .sort('-price')
  .filter('category', 'isArchived')
  .pageSize(20)
  .toConfig();
```

## Packages

| Package | Description |
|---------|-------------|
| `@tablecraft/engine` | Core engine with query building |
| `@tablecraft/table` | React DataTable component |
| `@tablecraft/client` | Frontend SDK |
| `@tablecraft/codegen` | TypeScript type generator |
| `@tablecraft/adapter-hono` | Hono.js adapter |
| `@tablecraft/adapter-express` | Express adapter |
| `@tablecraft/adapter-next` | Next.js adapter |
| `@tablecraft/adapter-elysia` | Elysia (Bun) adapter |
| `@tablecraft/plugin-cache` | Caching plugin |
