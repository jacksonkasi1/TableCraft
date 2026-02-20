# Changelog

All notable changes to TableCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-18

### Added
- **Core Engine:** Drizzle-based table query builder engine (`@tablecraft/engine`) with support for sorting, filtering, relations, and computed columns.
- **Pagination Strategies:** Full support for both Cursor and Offset pagination under the hood.
- **Client SDK:** Type-safe Client SDK (`@tablecraft/client`) with native `fetch` support.
- **Axios Adapter:** Built-in Axios adapter (`createAxiosFetchAdapter`) inside the client SDK for easy integration with existing Axios instances and interceptors.
- **React Hooks:** Powerful React hooks (`useTableQuery`, `useTableMeta`) to handle pagination, sorting, filtering, and aborting previous requests out of the box.
- **Server Adapters:** Native adapters for major backend frameworks including Hono, Next.js, Express, and Elysia.
- **UI Components:** Extensible `DataTable` component built on top of Shadcn UI (`@tablecraft/table`).
- **Documentation:** Initial release of comprehensive documentation including setup, guides, and custom adapter tutorials.

[0.1.0]: https://github.com/jacksonkasi1/TableCraft/releases/tag/v0.1.0