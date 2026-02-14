# @tablecraft/adapter-express

Express adapter for [TableCraft](https://github.com/your-org/tablecraft).

## Install

```bash
bun add @tablecraft/engine @tablecraft/adapter-express
```

## Usage

### Dynamic route

```ts
import express from 'express';
import { createExpressMiddleware } from '@tablecraft/adapter-express';

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
```

### Single table

```ts
import { createExpressHandler } from '@tablecraft/adapter-express';

app.get('/api/users', createExpressHandler({ db, schema, config: usersConfig }));
```
