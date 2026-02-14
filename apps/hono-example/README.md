# Hono Comparison Example

This example demonstrates the power of **TableCraft** by comparing a manually written Drizzle implementation against the TableCraft Engine implementation for the same database schema.

Both implementations connect to the same PostgreSQL database and expose identical APIs.

## Comparison Overview

The comparison focuses on four resources:

### 1. Products Resource (Filtering & Sorting)

| Feature | Manual Implementation (`src/routes/manual/products.ts`) | TableCraft Engine (`src/routes/engine.ts`) |
| :--- | :--- | :--- |
| **Route** | `GET /manual/products` | `GET /engine/products` |
| **Search** | Custom ILIKE query builder | Built-in `.searchAll()` |
| **Filtering** | Manual `if (category)` checks | Built-in `.filter('category')` |
| **Sorting** | Manual `orderBy` logic | Built-in `.sort('-price')` & dynamic |
| **Pagination** | Manual `limit`/`offset` math | Built-in `.pageSize()` |
| **Archived** | Manual `eq(isArchived, false)` | Configured `.staticFilter()` |

### 2. Orders Resource (Complex Logic)

| Feature | Manual Implementation (`src/routes/manual/orders.ts`) | TableCraft Engine (`src/routes/engine.ts`) |
| :--- | :--- | :--- |
| **Route** | `GET /manual/orders` | `GET /engine/orders` |
| **Joins** | Manual `.leftJoin(users, ...)` | Configured `.join(users)` |
| **Computed** | Raw SQL `CASE WHEN...` | Configured `.computed()` |
| **Subqueries** | Raw SQL `(SELECT count...)` | Configured `.subquery()` |
| **Tenant** | Manual `eq(tenantId, ...)` | Configured `.tenant('tenantId')` |
| **Soft Delete** | Manual `isNull(deletedAt)` | Configured `.softDelete()` |

### 3. Users Resource (Hiding & Transforming)

| Feature | Manual Implementation (`src/routes/manual/users.ts`) | TableCraft Engine (`src/routes/engine.ts`) |
| :--- | :--- | :--- |
| **Route** | `GET /manual/users` | `GET /engine/users` |
| **Hide** | Manual `select` exclusion | Built-in `.hide('tenantId')` |
| **Transform** | Manual `map` (email lower, role upper) | Built-in `.transform()` |
| **Search** | Manual `or(ilike(...))` | Built-in `.search('email', 'role')` |

### 4. Tenants Resource (Introspection)

| Feature | Manual Implementation (`src/routes/manual/tenants.ts`) | TableCraft Engine (`src/routes/engine.ts`) |
| :--- | :--- | :--- |
| **Route** | `GET /manual/tenants` | `GET /engine/tenants` |
| **Setup** | Manual boilerplate | Zero-config introspection |

## Example Queries

```bash
# Products: Search 'pro', filter category, sort price desc
curl "http://localhost:5000/manual/products?search=pro&category=electronics&sort=-price"
curl "http://localhost:5000/engine/products?search=pro&filter[category]=electronics&sort=-price"

# Orders: Includes computed status, VAT, and customer details
curl "http://localhost:5000/manual/orders"
curl "http://localhost:5000/engine/orders"

# Users: Hides tenantId, transforms email/role
curl "http://localhost:5000/manual/users"
curl "http://localhost:5000/engine/users"
```

## Setup & Running

1.  **Install Dependencies**:
    ```bash
    bun install
    ```

2.  **Start Server**:
    ```bash
    bun dev
    ```

3.  **Run Comparison Tests**:
    ```bash
    bun test
    ```
