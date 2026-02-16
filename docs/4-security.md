# 4. Security & Access Control

Security is built into the core of the TableCraft Engine. You can easily hide sensitive data, enforce tenant isolation, and manage soft deletes.

## 1. Hiding Sensitive Data

You often have columns like `password_hash`, `stripe_token`, or `internal_notes` that should never be exposed via the API.

### Manual Hiding
You can explicitly hide columns using `.hide()`.

```typescript
// src/config/users.ts
import { defineTable } from '@tablecraft/engine';
import { users } from '../db/schema';

export const userConfig = defineTable(users)
  .hide('password', 'salt', 'resetToken') // Always excluded from SELECT *
  .toConfig();
```

### Auto-Hiding (Recommended)
 The engine can automatically detect and hide common sensitive column names (like `password`, `token`, `secret`, `key`).

```typescript
export const userConfig = defineTable(users)
  .autoHide() // Automatically hides 'password', 'api_key', etc.
  .toConfig();
```

**Tip:** You can inspect what would be hidden without applying it:
```typescript
console.log(defineTable(users).inspectSensitive());
// Output: ['password', 'twoFactorSecret']
```

## 2. Multi-Tenancy (Tenant Isolation)

If you are building a SaaS application, ensuring users only see their own organization's data is critical. The engine handles this automatically via the `.tenant()` configuration.

### Configuration
Tell the engine which column stores the Tenant ID.

```typescript
// src/config/orders.ts
export const orderConfig = defineTable(orders)
  .tenant('org_id') // Defaults to 'tenantId' if not specified
  .toConfig();
```

### Usage
When creating the engine instance, pass the `tenantId` in the context. The engine will automatically append `WHERE org_id = ?` to *every* query, ensuring isolation.

```typescript
// src/routes/api.ts
app.use('*', async (c, next) => {
  const user = c.get('user'); // Get user from auth middleware

  const engine = createTableEngine({
    db,
    config: orderConfig,
  });

  // The engine context is separate from the params
  const result = await engine.query(
    c.req.query(),      // params (page, sort, filter)
    { tenantId: user.orgId } // context (security)
  );

  return c.json(result);
});
```

**Result:**
The user *cannot* bypass this filter, even if they try to pass `?filter[org_id]=other_org`. The context override is secure.

## 3. Soft Deletes

Soft deleting allows you to mark a row as deleted without removing it from the database. The engine respects this automatically.

### Configuration
Tell the engine which column tracks deletion.

```typescript
export const productConfig = defineTable(products)
  .softDelete('deleted_at') // Defaults to 'deletedAt'
  .toConfig();
```

### Behavior
By default, queries will automatically filter out deleted rows (`WHERE deleted_at IS NULL`).

If you need to query deleted items (e.g., for an admin trash can view), you can pass `includeDeleted: true` in the query params options (if allowed) or via the engine method options.

```typescript
// Fetch including deleted items (e.g., for admin restore)
await engine.query({ includeDeleted: true });
```

## 4. Access Control (RBAC)

You can define role-based access control directly on the table definition. This relies on the `context` object passed to the engine during execution.

### Configuration

Define which roles or permissions are required to access the table:

```typescript
export const userConfig = defineTable(users)
  .access({
    roles: ['admin', 'manager'],       // Only these roles can query this table
    permissions: ['read:users']        // Or users with this permission
  })
  .toConfig();
```

### Passing Context (Crucial)

For RBAC to work, you **must** provide the user's roles and permissions in the `context`. The engine checks `context.user.roles` and `context.user.permissions` against your configuration.

**In Adapters (Next.js, Hono, Express, Elysia):**

Use the `getContext` function in your adapter setup to extract user info from the request (e.g., from a JWT or session).

```typescript
// Example with Hono adapter
createHonoApp({
  db,
  schema,
  configs,
  // This is where you populate the security context
  getContext: async (c) => {
    const user = c.get('jwtPayload'); // Assuming you have auth middleware
    return {
      user: {
        id: user.sub,
        roles: user.roles,       // e.g. ['admin']
        permissions: user.perms  // e.g. ['read:users']
      },
      tenantId: user.orgId // Also used for multi-tenancy
    };
  }
});
```

**Direct Engine Usage:**

If you use the engine directly, pass the context as the second argument to `query`.

```typescript
const engine = createTableEngine({ db, config });

await engine.query(params, {
  // Context object
  user: {
    roles: ['member'], // This user would be denied if 'admin' is required
    permissions: []
  }
});
```

## Next Steps

Learn how to extend the engine with [Raw SQL & Custom Logic](./5-extending.md) for complex use cases.