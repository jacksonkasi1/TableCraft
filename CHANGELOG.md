# Changelog

All notable changes to TableCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

- **Security:** `@tablecraft/adapter-next` now requires Next.js 15.5.18+ or
  16.2.6+, excluding releases affected by GHSA-gx5p-jg67-6x7h and
  GHSA-26hh-7cqf-hhc6.

## [0.1.1] - 2026-04-30

### Security
- **CRITICAL**: Fixed supply chain attack in `axios` by forcing bump to `^1.15.2` globally (CVE-2026-34841).
- **HIGH**: Patched SQL Injection vulnerability in `@tablecraft/engine` by bumping `drizzle-orm` to `^0.45.2`.
- **HIGH**: Resolved Arbitrary File Read and Path Traversal in `vite` by bumping to `^6.4.3`.
- **HIGH**: Fixed BODY_SIZE_LIMIT bypass and DoS in SvelteKit by bumping `@sveltejs/kit` to `^2.58.0`.
- **HIGH**: Mitigated transitive `undici` WebSocket overflows in `@tablecraft/table` dev dependencies by bumping `jsdom` to `^29.1.1`.
- **HIGH**: Protected Next.js adapter from Server Component DoS by enforcing `next` peer dependency `>=16.2.3`.
- **MODERATE**: Upgraded `hono` (`^4.12.14`), `elysia` (`^1.4.28`), `tsup` (`^8.5.1`), and `postcss` (`^8.5.12`).

### Changed
- Published updated packages: `@tablecraft/client@0.1.12`, `@tablecraft/table@0.2.26`, `@tablecraft/codegen@0.0.11`, `@tablecraft/plugin-cache@0.1.0-beta.6`, and all framework adapters.

## [0.1.0] - 2026-02-18

### Added
- **Core Engine:** Drizzle-based table query builder engine (`@tablecraft/engine`).
- **Pagination Strategies:** Cursor and Offset pagination.
- **Client SDK:** Type-safe Client SDK (`@tablecraft/client`).
- **Axios Adapter:** Built-in adapter (`createAxiosFetchAdapter`).
- **React Hooks:** Hooks (`useTableQuery`, `useTableMeta`).
- **Server Adapters:** Native adapters for Hono, Next.js, Express, and Elysia.
- **UI Components:** `DataTable` built on Shadcn UI (`@tablecraft/table`).
- **Documentation:** Initial release.

[0.1.1]: https://github.com/jacksonkasi1/TableCraft/releases/tag/v0.1.1
[0.1.0]: https://github.com/jacksonkasi1/TableCraft/releases/tag/v0.1.0
