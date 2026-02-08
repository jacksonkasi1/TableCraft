# @tablecraft/adapter-elysia

Elysia (Bun) adapter for [TableCraft](https://github.com/your-org/tablecraft).

## Install

```bash
bun add @tablecraft/engine @tablecraft/adapter-elysia
```

## Usage

```ts
import { Elysia } from 'elysia';
import { createElysiaPlugin } from '@tablecraft/adapter-elysia';

const app = new Elysia()
  .use(createElysiaPlugin({
    db,
    schema,
    configs,
    getContext: ({ request }) => ({
      tenantId: request.headers.get('x-tenant-id'),
    }),
  }))
  .listen(3000);
```
