# Changelog

All notable changes to TableCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [0.2.27] - 2026-07-12

### Added

- Row grouping with controlled and imperative expansion APIs.
- Static and lazy tree adapters backed by `useTreeAdapter` and `useStaticAdapter`.
- Lazy-tree `sourceKey` lifecycle handling for safe source-switch refetches.
- Cross-page selection and export support across paginated views.
- Custom static-tree ID and child resolvers for arbitrary client hierarchies.
- Toolbar placement APIs (`toolbar` and `toolbarPlacement` options).
- Retail hierarchy demonstration and PostgreSQL integration coverage for the
  end-to-end Hono example.

### Changed

- Stable lazy-tree adapter identity without unnecessary root refetches on
  re-render.
- Deterministic retail sorting and pagination in the integration demo.
- Exact selected-ID validation when persisting tree selection state.
- Improved grouping callback consistency for controlled and uncontrolled
  group expansion.
- Patched Next.js peer dependency floors to `>=15.5.18 <16` or `>=16.2.6`.

### Fixed

- Interactive cell controls no longer select or click rows on click or focus.
- Group rows are excluded from selection and row-action handlers.
- Stale tree requests and source-switch data are safely cancelled on unmount
  and re-source.
- CSV formula injection protection by prefixing dangerous cells with a tab.
- CSV download test harness behavior aligned with the production export flow.
- Tree URL query parameter cleanup when a tree adapter unmounts.
- Duplicate and cyclic tree handling in the static adapter.

### Security

- `@tablecraft/adapter-next` now requires Next.js `>=15.5.18 <16` or
  `>=16.2.6`, excluding releases affected by
  [GHSA-gx5p-jg67-6x7h](https://github.com/advisories/GHSA-gx5p-jg67-6x7h) and
  [GHSA-26hh-7cqf-hhc6](https://github.com/advisories/GHSA-26hh-7cqf-hhc6).
- Prevented unsafe CSV formula execution by neutralizing `=`, `+`, `-`, `@`,
  tab, and carriage-return prefixes.
- Disabled persisted checkout credentials in the CI checkout step.

See [#38](https://github.com/jacksonkasi1/TableCraft/pull/38) for the full
release pull request.

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
