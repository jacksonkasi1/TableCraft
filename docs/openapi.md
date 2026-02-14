# OpenAPI Spec Generation

## Overview

TableCraft can **automatically generate OpenAPI 3.0 specifications** from your table configurations. This allows you to:

- 📄 Auto-document your APIs
- 🔧 Generate client SDKs (using tools like `openapi-generator`)
- 🧪 Test APIs with Swagger UI / Postman
- 📝 Share API contracts with frontend teams

## How It Works

### 1. Generate Spec from Config

```typescript
import { generateOpenApiSpec } from '@tablecraft/engine';
import { orders } from './tablecraft.config';

const spec = generateOpenApiSpec(orders.toConfig());

console.log(JSON.stringify(spec, null, 2));
```

### 2. Serve as JSON Endpoint

Create an endpoint that serves the spec:

**Next.js Example:**
```typescript
// app/api/docs/[table]/route.ts
import { generateOpenApiSpec } from '@tablecraft/engine';
import * as configs from '@/tablecraft.config';

export async function GET(
  request: Request,
  { params }: { params: { table: string } }
) {
  const config = configs[params.table];
  
  if (!config) {
    return Response.json({ error: 'Table not found' }, { status: 404 });
  }

  const spec = generateOpenApiSpec(config.toConfig());
  return Response.json(spec);
}
```

**Access:** `GET /api/docs/orders` → Returns OpenAPI spec for `orders` table

### 3. Combine Multiple Tables

Generate a unified spec for all your tables:

```typescript
import { generateOpenApiSpec } from '@tablecraft/engine';
import * as configs from './tablecraft.config';

function generateFullSpec() {
  const baseSpec = {
    openapi: '3.0.3',
    info: {
      title: 'My API',
      version: '1.0.0',
      description: 'Auto-generated from TableCraft configs',
    },
    servers: [
      { url: 'https://api.example.com', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    paths: {},
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };

  // Merge all table specs
  for (const [name, config] of Object.entries(configs)) {
    const tableSpec = generateOpenApiSpec(config.toConfig());
    Object.assign(baseSpec.paths, tableSpec.paths);
  }

  return baseSpec;
}

// Serve at /api/docs
export async function GET() {
  return Response.json(generateFullSpec());
}
```

### 4. Write to File (Build-Time)

Generate static OpenAPI files during build:

```typescript
// scripts/generate-openapi.ts
import { writeFileSync } from 'fs';
import { generateOpenApiSpec } from '@tablecraft/engine';
import * as configs from './tablecraft.config';

const fullSpec = {
  openapi: '3.0.3',
  info: { title: 'My API', version: '1.0.0' },
  paths: {},
};

for (const [name, config] of Object.entries(configs)) {
  const spec = generateOpenApiSpec(config.toConfig());
  Object.assign(fullSpec.paths, spec.paths);
}

writeFileSync(
  'public/openapi.json',
  JSON.stringify(fullSpec, null, 2)
);

console.log('✅ OpenAPI spec written to public/openapi.json');
```

Add to `package.json`:
```json
{
  "scripts": {
    "build": "tsx scripts/generate-openapi.ts && next build"
  }
}
```

## Generated Spec Structure

### Example Input

```typescript
const orders = defineTable(ordersTable)
  .search('status', 'customerName')
  .options('status', [
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
  ])
  .aggregate('totalRevenue', 'sum', 'total')
  .exportable('csv', 'json')
  .access({ roles: ['admin', 'sales'] });
```

### Generated Output

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "orders API",
    "version": "1.0.0"
  },
  "paths": {
    "/api/orders": {
      "get": {
        "summary": "List orders",
        "operationId": "listOrders",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": { "type": "integer", "default": 1 }
          },
          {
            "name": "pageSize",
            "in": "query",
            "required": false,
            "schema": { "type": "integer", "default": 25, "maximum": 100 }
          },
          {
            "name": "sort",
            "in": "query",
            "required": false,
            "schema": { "type": "string" },
            "description": "Comma-separated fields. Prefix with - for desc."
          },
          {
            "name": "search",
            "in": "query",
            "required": false,
            "schema": { "type": "string" },
            "description": "Search across: status, customerName"
          },
          {
            "name": "export",
            "in": "query",
            "required": false,
            "schema": { "type": "string", "enum": ["csv", "json"] }
          },
          {
            "name": "filter[status]",
            "in": "query",
            "required": false,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": { "type": "string", "description": "Order ID" },
                          "total": { "type": "number" },
                          "status": { "type": "string" },
                          "customerName": { "type": "string" }
                        }
                      }
                    },
                    "meta": {
                      "type": "object",
                      "properties": {
                        "total": { "type": "integer" },
                        "page": { "type": "integer" },
                        "pageSize": { "type": "integer" },
                        "totalPages": { "type": "integer" }
                      }
                    },
                    "aggregations": {
                      "type": "object",
                      "properties": {
                        "totalRevenue": { "type": "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "security": [
          { "bearerAuth": [] }
        ]
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  }
}
```

## Use Cases

### 1. Swagger UI Integration

Serve the spec and mount Swagger UI:

```typescript
// app/api-docs/page.tsx
'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocs() {
  return <SwaggerUI url="/api/docs" />;
}
```

### 2. Generate TypeScript Client

Use `openapi-generator` to create a typed client:

```bash
# Install generator
npm install -g @openapitools/openapi-generator-cli

# Generate client
openapi-generator-cli generate \
  -i http://localhost:3000/api/docs \
  -g typescript-fetch \
  -o ./src/api-client
```

### 3. Postman Collection

Import the spec into Postman:

1. Open Postman
2. Click **Import** → **Link**
3. Paste: `http://localhost:3000/api/docs`
4. All endpoints auto-populate with parameters

### 4. API Documentation Site

Use Redoc for beautiful docs:

```tsx
// app/docs/page.tsx
import { RedocStandalone } from 'redoc';

export default function Docs() {
  return (
    <RedocStandalone
      specUrl="/api/docs"
      options={{
        theme: { colors: { primary: { main: '#3b82f6' } } },
      }}
    />
  );
}
```

## What Gets Included

### ✅ Automatically Generated

- **Paths**: One per table (`/api/{tableName}`)
- **Query Parameters**:
  - Pagination: `page`, `pageSize`
  - Sorting: `sort`
  - Filtering: `filter[field]` for each filterable column
  - Search: `search` (if enabled)
  - Export: `export` (if enabled)
- **Response Schema**:
  - `data[]` array with column types
  - `meta` object with pagination info
  - `aggregations` object (if configured)
- **Security**: Bearer auth (if `access` is configured)
- **Descriptions**: Uses `label` from column config

### ❌ Not Included

- **POST/PUT/DELETE**: Only GET endpoints (TableCraft is read-only)
- **Nested includes**: Doesn't document nested relations
- **Raw SQL columns**: Included but type may be generic
- **Custom operators**: Only shows field names, not operator syntax

## Limitations & Future

Current limitations:

1. **Single Endpoint Per Table**: Doesn't generate separate endpoints for `_meta`, `export`, or grouped queries
2. **Basic Types**: All filters shown as `string` type (no operator-specific schemas)
3. **No Examples**: Doesn't include example values
4. **No Webhooks**: OpenAPI 3.1 webhooks not supported

**Planned improvements** (Phase 10+):

- [ ] Include `cursor`, `select`, `distinct` parameters
- [ ] Document `/_meta` endpoint
- [ ] Add example values from `options`
- [ ] Generate schemas for nested `include` responses
- [ ] Support OpenAPI 3.1 (JSON Schema 2020-12)

## Real-World Example

**Full setup for a production API:**

```typescript
// scripts/build-docs.ts
import { writeFileSync } from 'fs';
import { generateOpenApiSpec } from '@tablecraft/engine';
import * as configs from '../src/tablecraft.config';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Acme Corp API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'RESTful API for Acme Corp data platform',
    contact: {
      name: 'API Support',
      email: 'api@acmecorp.com',
    },
  },
  servers: [
    { url: 'https://api.acmecorp.com', description: 'Production' },
    { url: 'https://staging-api.acmecorp.com', description: 'Staging' },
  ],
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from /auth/login',
      },
    },
  },
  tags: [
    { name: 'Orders', description: 'Order management' },
    { name: 'Customers', description: 'Customer data' },
    { name: 'Products', description: 'Product catalog' },
  ],
};

// Generate spec for each table
for (const [name, config] of Object.entries(configs)) {
  const tableSpec = generateOpenApiSpec(config.toConfig());
  Object.assign(spec.paths, tableSpec.paths);
}

// Write to public directory
writeFileSync('public/openapi.json', JSON.stringify(spec, null, 2));
writeFileSync('public/openapi.yaml', convertToYAML(spec)); // Using js-yaml

console.log('✅ OpenAPI docs generated');
console.log('   - JSON: public/openapi.json');
console.log('   - YAML: public/openapi.yaml');
```

**Add to CI/CD:**

```yaml
# .github/workflows/docs.yml
name: Generate API Docs

on:
  push:
    branches: [main]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build:docs
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
```

## Summary

**OpenAPI generation in TableCraft:**

✅ **Automatic** - Generated from your table configs  
✅ **Flexible** - Serve at runtime or write to file  
✅ **Standards-compliant** - Valid OpenAPI 3.0.3  
✅ **Tool-friendly** - Works with Swagger, Postman, generators  
⚠️ **Read-only** - Only documents GET endpoints  
⚠️ **Basic** - Doesn't include advanced features (yet)  

**Use it for:**
- Sharing API contracts with frontend teams
- Generating typed clients
- Interactive API testing (Swagger UI)
- Automated documentation

**Don't use it for:**
- Full CRUD documentation (POST/PUT/DELETE)
- GraphQL schema generation
- gRPC definitions
