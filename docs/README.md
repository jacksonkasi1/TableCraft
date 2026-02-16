# TableCraft Engine Documentation

Welcome to the TableCraft Engine documentation! This engine simplifies database interactions by allowing you to define table configurations and automatically generate powerful APIs with filtering, sorting, pagination, and more.

## Getting Started

Start with the basics to understand how to define tables and fetch data.

{% columns %}
{% column %}
### Basics
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
{% endcolumn %}

{% column %}
### Core Concepts
4. [**Security & Access Control**](./4-security.md)
   - Handling sensitive data.
   - Tenant isolation.
   - Soft deletes.

5. [**Extending & Raw SQL**](./5-extending.md)
   - When the engine isn't enough.
   - Writing raw Drizzle queries.
   - Using `manualResult`.

6. [**Error Handling**](./6-errors.md)
   - Input validation.
   - Typed error class.
{% endcolumn %}
{% endcolumns %}

## Features

{% tabs %}
{% tab title="Date Filtering" %}
Automatic date range filtering with smart detection:

- Auto-detects date columns from schema
- Prefers `createdAt` as default filter column
- Full calendar date picker in frontend
- Quick presets (Today, This Week, This Month, etc.)

[Learn more about Date Filtering →](./date-filtering.md)
{% endtab %}

{% tab title="Type Generation" %}
Generate TypeScript types from your API:

- Full type safety for frontend code
- Autocomplete for columns and filters
- Typed adapter factory functions
- CI/CD integration ready

```bash
npx @tablecraft/codegen --url http://localhost:3000/api/engine --out ./src/generated
```

[Learn more about Type Generation →](./codegen.md)
{% endtab %}
{% endtabs %}

## API Reference

<table data-view="cards">
    <thead>
        <tr>
            <th>Topic</th>
            <th>Description</th>
            <th data-card-target data-type="content-ref">Link</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Metadata API</td>
            <td>Auto-generated frontend schema endpoint.</td>
            <td><a href="metadata-api.md">metadata-api.md</a></td>
        </tr>
        <tr>
            <td>OpenAPI Spec</td>
            <td>Auto-generate Swagger/OpenAPI 3.0 specs.</td>
            <td><a href="openapi.md">openapi.md</a></td>
        </tr>
        <tr>
            <td>Type Safety</td>
            <td>Helpers for SQL type safety.</td>
            <td><a href="type-safety.md">type-safety.md</a></td>
        </tr>
        <tr>
            <td>Examples</td>
            <td>Real-world usage patterns.</td>
            <td><a href="examples.md">examples.md</a></td>
        </tr>
    </tbody>
</table>

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
