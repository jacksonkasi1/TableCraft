# OpenAPI Spec Generation

TableCraft can **automatically generate OpenAPI 3.0 specifications** from your table configurations.

## How It Works

{% stepper %}
{% step %}
### Generate Spec from Config

```typescript
import { generateOpenApiSpec } from '@tablecraft/engine';
import { orders } from './tablecraft.config';

const spec = generateOpenApiSpec(orders.toConfig());

console.log(JSON.stringify(spec, null, 2));
```
{% endstep %}

{% step %}
### Serve as JSON Endpoint

Create an endpoint that serves the spec.

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

**Access:** `GET /api/docs/orders`
{% endstep %}

{% step %}
### Combine Multiple Tables

Generate a unified spec for all your tables.

```typescript
function generateFullSpec() {
  const baseSpec = {
    openapi: '3.0.3',
    info: { title: 'My API', version: '1.0.0' },
    paths: {},
  };

  // Merge all table specs
  for (const [name, config] of Object.entries(configs)) {
    const tableSpec = generateOpenApiSpec(config.toConfig());
    Object.assign(baseSpec.paths, tableSpec.paths);
  }

  return baseSpec;
}
```
{% endstep %}
{% endstepper %}

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

### Generated Output (Snippet)

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

{% tabs %}
{% tab title="Swagger UI" %}
Serve the spec and mount Swagger UI:

```tsx
// app/api-docs/page.tsx
'use client';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocs() {
  return <SwaggerUI url="/api/docs" />;
}
```
{% endtab %}

{% tab title="Client Gen" %}
Use `openapi-generator` to create a typed client:

```bash
openapi-generator-cli generate \
  -i http://localhost:3000/api/docs \
  -g typescript-fetch \
  -o ./src/api-client
```
{% endtab %}

{% tab title="Postman" %}
1. Open Postman
2. Click **Import** → **Link**
3. Paste: `http://localhost:3000/api/docs`
4. All endpoints auto-populate with parameters
{% endtab %}
{% endtabs %}

## What Gets Included

### ✅ Automatically Generated
*   **Paths**: One per table (`/api/{tableName}`)
*   **Query Parameters**: Pagination, Sorting, Filtering, Search, Export
*   **Response Schema**: `data[]`, `meta`, `aggregations`
*   **Security**: Bearer auth (if `access` is configured)

### ❌ Not Included
*   **POST/PUT/DELETE**: Only GET endpoints (TableCraft is read-only)
*   **Nested includes**: Doesn't document nested relations
*   **Raw SQL columns**: Included but type may be generic
