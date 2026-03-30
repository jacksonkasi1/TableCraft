You are an experienced, pragmatic software engineering AI agent. Do not over-engineer a solution when a simple one is possible. Keep edits minimal. If you want an exception to ANY rule, you MUST stop and get permission first.

## Project Overview

**TableCraft** is a Drizzle table query builder engine paired with Shadcn and Airtable-like concepts to enable complex table setup in 5 minutes instead of 1 hour. It is structured as a monorepo utilizing Bun workspaces.

**Technologies:**
- **Language:** TypeScript, JavaScript
- **Runtime & Package Manager:** Bun
- **Frontend:** React, Shadcn/ui
- **Database / ORM:** Drizzle ORM
- **Framework Adapters:** Hono.js, Express.js, Next.js, Elysia (Bun)

## Reference

### Key Directories
- `packages/` - Core workspace packages
  - `engine/` - Core query building engine
  - `client/` - Frontend SDK (React + vanilla JS)
  - `table/` - React DataTable component
  - `codegen/` - TypeScript type generator CLI
  - `plugin-cache/` - Caching plugin
  - `adapter-*/` - Framework adapters (Hono, Express, Next, Elysia)
- `apps/` - Example applications consuming the packages
  - `hono-example/` - Backend demo with Hono
  - `vite-web-example/` - Frontend demo with Vite + React
- `docs/` - Documentation
- `plan/` - Planning documents

## Essential Commands

These commands should be run from the root of the workspace.

- **Build all packages:**
  ```bash
  bun run build
  ```
- **Run tests:**
  ```bash
  bun test
  ```
- **Type check:**
  ```bash
  bun run typecheck
  ```
- **Install dependencies:**
  ```bash
  bun install
  ```

## Patterns

### Import Organization
Imports must be organized with proper comment headers:

```typescript
// ** import types
import type { TableConfig, ColumnConfig } from './types';

// ** import core packages
import { Hono } from 'hono';

// ** import database
import { db, users, orders } from '@repo/db';
import { eq, and, or } from 'drizzle-orm';

// ** import utils
import { logger } from '@repo/logs';

// ** import constants
import { MAX_PAGE_SIZE } from './constants';
```

## Anti-patterns
- Do not use `any` in TypeScript; prefer explicit types.
- Do not omit JSDoc comments for public APIs.
- Avoid loose typings; rely on the strict TypeScript configuration.

## Code Style

- **TypeScript:** Use strict config. `interface` for object types, `type` for unions/intersections.
- **Naming Conventions:**
  - Files: `kebab-case` (e.g., `query-builder.ts`)
  - Interfaces: `PascalCase`
  - Functions: `camelCase`
  - Constants: `SCREAMING_SNAKE`
  - React Components: `PascalCase`
  - React Hooks: `camelCase` with `use` prefix
- **Formatting:** 2-space indentation, no trailing whitespace, add newline at end of files, 100 char max line length.

## Commit and Pull Request Guidelines

### Validation Steps
Before committing, you must ensure that all code compiles, typechecks pass, and tests pass:
1. Run `bun run typecheck`
2. Run `bun test`
3. Run `bun run build`

### Commit Message Conventions
The repository follows **Conventional Commits**:
```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```
Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

### Pull Request Description
- Provide a clear description of the problem solved or feature added.
- Link to relevant issues or planning documents if applicable.
- Confirm that all validation steps (`typecheck`, `test`, `build`) have passed.
