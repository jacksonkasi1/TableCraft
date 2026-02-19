# Contributing to TableCraft

Thank you for your interest in contributing to TableCraft! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Areas Needing Contributions](#areas-needing-contributions)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, be constructive, and help each other grow.

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- Node.js >= 18 (for compatibility)
- Git

### Getting Started

1. **Fork and Clone**

```bash
git clone https://github.com/YOUR_USERNAME/TableCraft.git
cd TableCraft
```

2. **Install Dependencies**

```bash
bun install
```

3. **Build All Packages**

```bash
bun run build
```

4. **Run Tests**

```bash
bun test
```

5. **Type Check**

```bash
bun run typecheck
```

---

## Project Structure

```text
TableCraft/
├── packages/
│   ├── engine/           # Core query building engine
│   ├── client/           # Frontend SDK (React + vanilla JS)
│   ├── table/            # React DataTable component
│   ├── codegen/          # TypeScript type generator CLI
│   ├── plugin-cache/     # Caching plugin
│   ├── adapter-hono/     # Hono.js adapter
│   ├── adapter-express/  # Express.js adapter
│   ├── adapter-next/     # Next.js adapter
│   └── adapter-elysia/   # Elysia (Bun) adapter
├── apps/
│   ├── hono-example/     # Backend demo with Hono
│   └── vite-web-example/ # Frontend demo with Vite + React
├── docs/                 # Documentation
└── plan/                 # Planning documents
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

- Write clean, readable code
- Follow the [Code Style Guidelines](#code-style-guidelines)
- Add tests for new functionality
- Update documentation if needed

### 3. Run Checks

```bash
# Type check
bun run typecheck

# Run tests
bun test

# Build all packages
bun run build
```

### 4. Commit Changes

Follow the [Commit Convention](#commit-convention).

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## Code Style Guidelines

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use `interface` for object types, `type` for unions/intersections
- Document public APIs with JSDoc comments

### Import Organization

Organize imports with proper comment headers:

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

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `query-builder.ts` |
| Interfaces | PascalCase | `TableConfig` |
| Functions | camelCase | `buildQuery()` |
| Constants | SCREAMING_SNAKE | `MAX_PAGE_SIZE` |
| React Components | PascalCase | `DataTable` |
| React Hooks | camelCase with `use` prefix | `useTableQuery` |

### Code Formatting

- Use 2-space indentation
- No trailing whitespace
- Add newline at end of files
- Max line length: 100 characters

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvement |

### Examples

```bash
feat(engine): add cursor pagination support
fix(client): handle abort errors gracefully
docs(readme): update installation instructions
test(engine): add tests for filter builder
chore(deps): update dependencies
```

---

## Pull Request Process

### Before Submitting

- [ ] Code compiles without errors (`bun run typecheck`)
- [ ] All tests pass (`bun test`)
- [ ] Build succeeds (`bun run build`)
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow convention

### PR Title

Use the same format as commit messages:

```text
feat(table): add column resize persistence
```

### PR Description

Include:

1. **What** - What changes were made
2. **Why** - Why these changes were needed
3. **How** - How the changes were implemented
4. **Testing** - How to test the changes

### Review Process

1. At least one approval required
2. All CI checks must pass
3. No merge conflicts
4. Squash and merge to `main`

---

## Areas Needing Contributions

We're actively seeking contributors for these areas:

### 🤝 High Priority

| Area | Description | Skills Needed |
|------|-------------|---------------|
| **Vue 3 Composables** | `useTableQuery()`, `useTableMeta()` for Vue 3 | Vue 3 Composition API, TypeScript |
| **Svelte Stores** | `createTableStore()` for Svelte | Svelte stores, TypeScript |
| **Documentation** | Improve and expand docs | Technical writing |

### 🌟 Medium Priority

| Area | Description | Skills Needed |
|------|-------------|---------------|
| **Vue DataTable** | Full DataTable component for Vue | Vue 3, TanStack Table, shadcn-vue |
| **Svelte DataTable** | Full DataTable component for Svelte | Svelte, TanStack Table, shadcn-svelte |
| **GraphQL Adapter** | Adapter for GraphQL backends | GraphQL, TypeScript |
| **Supabase Adapter** | Native Supabase integration | Supabase, TypeScript |

### 💡 Good First Issues

Look for issues labeled `good-first-issue` on GitHub. These are perfect for new contributors:

- Documentation improvements
- Bug fixes
- Small feature additions
- Test coverage improvements

---

## Getting Help

- **GitHub Issues**: [Open an issue](https://github.com/jacksonkasi1/TableCraft/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jacksonkasi1/TableCraft/discussions)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TableCraft! 🎉
