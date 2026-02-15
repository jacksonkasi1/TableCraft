# @tablecraft/adapter-express

Express adapter for TableCraft — build powerful data APIs in your Express application.

## Links

- [GitHub](https://github.com/jacksonkasi1/TableCraft)
- [Documentation](https://jacksonkasi.gitbook.io/tablecraft/)

## Install

```bash
bun add @tablecraft/engine @tablecraft/adapter-express express
# or
npm install @tablecraft/engine @tablecraft/adapter-express express
# or
yarn add @tablecraft/engine @tablecraft/adapter-express express
# or
pnpm add @tablecraft/engine @tablecraft/adapter-express express
```

## Features

- **Express.js native** — Seamless integration with Express middleware ecosystem
- **Dynamic routes** — Single endpoint for multiple tables
- **Type-safe** — Full TypeScript support
- **Middleware compatible** — Works with authentication, logging, and other Express middleware

## Usage

### Dynamic route (multiple tables)

```ts
import express from 'express';
import { createExpressMiddleware } from '@tablecraft/adapter-express';
import { db } from './db';
import * as schema from './db/schema';
import { configs } from './tablecraft.config';

const app = express();

app.get('/api/data/:table', createExpressMiddleware({
  db,
  schema,
  configs,
  getContext: (req) => ({
    tenantId: req.headers['x-tenant-id'],
    user: req.user, // from auth middleware
  }),
}));

app.listen(3000);
```

### Single table route

```ts
import express from 'express';
import { createExpressHandler } from '@tablecraft/adapter-express';

const app = express();

app.get('/api/users', createExpressHandler({ 
  db, 
  schema, 
  config: usersConfig,
  getContext: (req) => ({
    tenantId: req.headers['x-tenant-id'],
  }),
}));
```

### With authentication middleware

```ts
import express from 'express';
import { createExpressMiddleware } from '@tablecraft/adapter-express';
import { authMiddleware } from './auth';

const app = express();

// Auth middleware populates req.user
app.use(authMiddleware);

app.get('/api/data/:table', createExpressMiddleware({
  db,
  schema,
  configs,
  getContext: (req) => ({
    tenantId: req.user.tenantId,
    user: req.user,
  }),
}));
```

### With error handling

```ts
import express from 'express';
import { createExpressMiddleware } from '@tablecraft/adapter-express';

const app = express();

app.get('/api/data/:table', createExpressMiddleware({
  db,
  schema,
  configs,
  getContext: (req) => ({ tenantId: req.headers['x-tenant-id'] }),
  onError: (error, req, res) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  },
}));

// Global error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

## Configuration Options

```ts
createExpressMiddleware({
  db,                    // Drizzle database instance
  schema,                // Drizzle schema object
  configs,               // Table configs map
  getContext: (req) => ({
    tenantId: string,
    user: { id: string, roles: string[] },
  }),
  onError: (error, req, res) => {
    // Custom error handling
  },
});
```

## License

MIT
