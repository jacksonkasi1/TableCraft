# TableCraft — Deep Analysis Report

> **Generated for:** TableCraft monorepo (Bun workspaces)
> **Scope:** Security audit, dependency health, version consistency, architectural observations, and remediation roadmap

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Security Audit Summary](#2-security-audit-summary)
3. [High / Critical Vulnerabilities](#3-high--critical-vulnerabilities)
4. [Moderate Vulnerabilities](#4-moderate-vulnerabilities)
5. [Low Severity Vulnerabilities](#5-low-severity-vulnerabilities)
6. [Version Inconsistencies](#6-version-inconsistencies)
7. [Code Quality & Architectural Observations](#7-code-quality--architectural-observations)
8. [Priority Fix Matrix](#8-priority-fix-matrix)
9. [Recommended Actions](#9-recommended-actions)

---

## 1. Project Overview

| Field | Value |
|-------|-------|
| **Name** | TableCraft |
| **Monorepo toolchain** | Bun workspaces |
| **Tagline** | Drizzle table query builder engine + Shadcn + Airtable = Complex table setup in 5 minutes instead of 1 hour |

### Packages

| Package | Role |
|---------|------|
| `@tablecraft/engine` | Core Drizzle query builder engine |
| `@tablecraft/client` | Client-side SDK |
| `@tablecraft/table` | UI table component layer |
| `@tablecraft/codegen` | Code generation utilities |
| `@tablecraft/plugin-cache` | Caching plugin |
| `@tablecraft/adapter-elysia` | Elysia HTTP adapter |
| `@tablecraft/adapter-express` | Express HTTP adapter |
| `@tablecraft/adapter-hono` | Hono HTTP adapter |
| `@tablecraft/adapter-next` | Next.js adapter |
| `@tablecraft/adapter-sveltekit` | SvelteKit adapter |

### Apps

| App | Description |
|-----|-------------|
| `web` | Primary web application |
| `vite-web-example` | Vite-based example app |
| `hono-example` | Hono framework example |
| `sveltekit-example` | SvelteKit framework example |

---

## 2. Security Audit Summary

> **Tool:** `bun audit`

| Severity | Count |
|----------|------:|
| 🔴 High | 25 |
| 🟡 Moderate | 35 |
| 🔵 Low | 2 |
| **Total** | **62** |

The 62 vulnerabilities span direct and transitive dependencies across most packages in the monorepo. The most critical issues involve SQL Injection, arbitrary file read, path traversal, and multiple denial-of-service vectors. Several vulnerabilities exist in packages that are already several major or minor versions behind their current safe release.

---

## 3. High / Critical Vulnerabilities

### 3.1 — `drizzle-orm < 0.45.2` — SQL Injection

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9) |
| **Severity** | 🔴 HIGH |
| **Root cause** | SQL Injection via improperly escaped SQL identifiers |
| **Affected packages** | `@tablecraft/engine`, `hono-example`, `sveltekit-example` |
| **Fix** | Bump `drizzle-orm` to `^0.45.2` |

SQL Injection is among the most severe vulnerability classes in any application. Any package that passes user-controlled identifiers to Drizzle queries is directly exposed. This must be treated as **P0**.

---

### 3.2 — `hono < 4.12.4` — Multiple Advisories (10+)

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 HIGH |
| **Affected packages** | `adapter-hono`, `hono-example`, `vite-web-example` (via shadcn) |
| **Fix** | Bump `hono` to `^4.12.4` |

Known advisories include:

| Advisory | Description |
|----------|-------------|
| [GHSA-q5qw-h33p-qvwr](https://github.com/advisories/GHSA-q5qw-h33p-qvwr) | Arbitrary file access via `serveStatic` |
| — | SSE CRLF Injection |
| — | Cookie Injection |
| — | Prototype Pollution |

Over 10 individual advisories affect the installed version. Upgrading to `^4.12.4` resolves all of them.

---

### 3.3 — `elysia < 1.4.26` — String URL Format ReDoS

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-f45g-68q3-5w8x](https://github.com/advisories/GHSA-f45g-68q3-5w8x) |
| **Severity** | 🔴 HIGH |
| **Affected packages** | `adapter-elysia` |
| **Fix** | Bump `elysia` to `^1.4.26` |

A malformed URL string can trigger catastrophic backtracking in the regex engine, causing the server process to hang. This is exploitable remotely without authentication.

---

### 3.4 — `vite <= 6.4.1` — Three CVEs

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 HIGH |
| **Affected packages** | `web`, `vite-web-example`, `sveltekit-example` |
| **Fix** | Bump `vite` to `^6.4.3` |

| Advisory | Description |
|----------|-------------|
| [GHSA-v2wj-q39q-566r](https://github.com/advisories/GHSA-v2wj-q39q-566r) | `server.fs.deny` bypassed with query strings |
| [GHSA-p9ff-h696-f583](https://github.com/advisories/GHSA-p9ff-h696-f583) | Arbitrary File Read via dev server WebSocket |
| [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) | Path Traversal in Optimized Deps `.map` handling |

These vulnerabilities are particularly dangerous in development environments where Vite's dev server is exposed on a network interface — a very common scenario.

---

### 3.5 — `@sveltejs/kit <= 2.57.0` — BODY_SIZE_LIMIT Bypass + Redirect DoS

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 HIGH |
| **Affected packages** | `sveltekit-example`, `adapter-sveltekit` |
| **Fix** | Bump `@sveltejs/kit` to `^2.57.1` |

| Advisory | Description |
|----------|-------------|
| [GHSA-2crg-3p73-43xp](https://github.com/advisories/GHSA-2crg-3p73-43xp) | `BODY_SIZE_LIMIT` bypass allows unbounded request bodies |
| [GHSA-3f6h-2hrp-w5wx](https://github.com/advisories/GHSA-3f6h-2hrp-w5wx) | Unvalidated redirect destination enables DoS |

---

### 3.6 — `undici >= 7.0.0 < 7.24.0` — 6 Advisories

| Field | Detail |
|-------|--------|
| **Affected packages** | `@tablecraft/table` (via `jsdom` devDependency) |
| **Fix** | Downgrade `jsdom` to `^26.1.0` (which pulls in a safe undici version) |

| Advisory | Severity | Description |
|----------|----------|-------------|
| [GHSA-f269-vfmq-vjvj](https://github.com/advisories/GHSA-f269-vfmq-vjvj) | 🔴 HIGH | WebSocket 64-bit length integer overflow |
| [GHSA-vrm6-8vpv-qv8q](https://github.com/advisories/GHSA-vrm6-8vpv-qv8q) | 🔴 HIGH | Unbounded memory via WebSocket `permessage-deflate` |
| [GHSA-v9p9-hfj2-hcw8](https://github.com/advisories/GHSA-v9p9-hfj2-hcw8) | 🔴 HIGH | Unhandled exception via invalid `server_max_window_bits` |
| [GHSA-2mjp-6q6p-2qxm](https://github.com/advisories/GHSA-2mjp-6q6p-2qxm) | 🟡 MODERATE | HTTP Request/Response Smuggling |
| [GHSA-4992-7rv2-5pvq](https://github.com/advisories/GHSA-4992-7rv2-5pvq) | 🟡 MODERATE | CRLF Injection via `upgrade` option |
| [GHSA-phc3-fgpg-7m6h](https://github.com/advisories/GHSA-phc3-fgpg-7m6h) | 🟡 MODERATE | Unbounded memory via Response Buffering DoS |

Although undici arrives only via a `devDependency` (`jsdom`), the 3 HIGH-severity entries are significant enough to act on immediately.

---

### 3.7 — `@hono/node-server < 1.19.10` — Authorization & Middleware Bypass

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 HIGH |
| **Affected packages** | `vite-web-example` (transitive via shadcn) |
| **Fix** | Update `shadcn` or add `overrides` for `@hono/node-server` to `>=1.19.10` |

| Advisory | Description |
|----------|-------------|
| [GHSA-wc8c-qw6v-h7f6](https://github.com/advisories/GHSA-wc8c-qw6v-h7f6) | Authorization bypass via encoded slashes |
| [GHSA-92pp-h63x-v22m](https://github.com/advisories/GHSA-92pp-h63x-v22m) | Middleware bypass via repeated slashes |

Authorization bypass vulnerabilities of this class are directly exploitable to access protected routes without valid credentials.

---

### 3.8 — `minimatch >= 5.0.0 < 5.1.8` — Two ReDoS

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 HIGH |
| **Affected packages** | `vite-web-example` (transitive via eslint, shadcn, exceljs) |
| **Fix** | Add transitive resolution via `bun overrides` in root `package.json` |

| Advisory | Description |
|----------|-------------|
| [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj) | ReDoS — catastrophic backtracking |
| [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74) | ReDoS — additional pattern |

---

### 3.9 — `flatted < 3.4.0` — Unbounded Recursion DoS + Prototype Pollution

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 HIGH |
| **Affected packages** | `vite-web-example` (transitive via eslint) |

| Advisory | Description |
|----------|-------------|
| [GHSA-25h7-pfq9-p65f](https://github.com/advisories/GHSA-25h7-pfq9-p65f) | Unbounded recursion causes process crash (DoS) |
| [GHSA-rf6f-7fwh-wjgh](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh) | Prototype Pollution via crafted serialized data |

---

### 3.10 — `express-rate-limit >= 8.2.0 < 8.2.2` — IPv4-Mapped IPv6 Rate Limit Bypass

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-46wh-pxpv-q5gq](https://github.com/advisories/GHSA-46wh-pxpv-q5gq) |
| **Severity** | 🔴 HIGH |
| **Affected packages** | `vite-web-example` (transitive via shadcn) |

An attacker using an IPv4-mapped IPv6 address (e.g., `::ffff:127.0.0.1`) can bypass rate limiting rules entirely. Any endpoint protected by `express-rate-limit` in this range is fully unprotected against brute-force or abuse.

---

### 3.11 — `next >= 16.0.0-beta.0 < 16.1.7` — DoS, HTTP Smuggling, CSRF Bypass

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 HIGH |
| **Affected packages** | `adapter-next` (peerDependency) |
| **Fix** | Update peerDep range to `>=14.0.0 <16 \|\| >=16.1.7`, or document that stable v15 is recommended |

| Advisory | Description |
|----------|-------------|
| [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) | DoS with Server Components |
| — | HTTP Smuggling |
| — | Null-origin CSRF bypass |

The current peerDep range `>=14.0.0` implicitly allows users to install vulnerable Next.js 16 beta/RC versions without any warning.

---

### 3.12 — `path-to-regexp >= 8.0.0 < 8.4.0` — Sequential Optional Groups DoS

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-j3q9-mxjg-w52f](https://github.com/advisories/GHSA-j3q9-mxjg-w52f) |
| **Severity** | 🔴 HIGH |
| **Affected packages** | `vite-web-example`, `sveltekit-example` (transitive via shadcn, vitest) |

Specially crafted route patterns with sequential optional groups cause catastrophic backtracking, making the process unresponsive.

---

### 3.13 — `picomatch` — ReDoS + Method Injection

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 HIGH |
| **Affected packages** | Multiple (transitive via toolchain) |

| Advisory | Description |
|----------|-------------|
| [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) | ReDoS via extglob quantifiers (`picomatch < 2.3.2`) |
| [GHSA-3v7f-55p6-f55p](https://github.com/advisories/GHSA-3v7f-55p6-f55p) | Method Injection via prototype chain manipulation |

---

## 4. Moderate Vulnerabilities

### 4.1 — `axios >= 1.0.0 < 1.15.0` — SSRF + Cloud Metadata Exfiltration

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 MODERATE |
| **Affected packages** | `vite-web-example` (`^1.7.0`), `@tablecraft/client` (peerDep `^1.13.0`) |
| **Fix** | Bump to `^1.15.0` |

| Advisory | Description |
|----------|-------------|
| [GHSA-3p68-rc4w-qgx5](https://github.com/advisories/GHSA-3p68-rc4w-qgx5) | SSRF via `NO_PROXY` bypass |
| [GHSA-fvcv-3m26-pcqx](https://github.com/advisories/GHSA-fvcv-3m26-pcqx) | Cloud metadata exfiltration via header injection |

In cloud environments (AWS, GCP, Azure), the metadata exfiltration advisory can expose instance credentials, making it effectively critical in hosted deployments.

---

### 4.2 — `postcss < 8.5.10` — XSS via Unescaped `</style>` in CSS Stringify

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) |
| **Severity** | 🟡 MODERATE |
| **Affected packages** | `web` (`^8.5.6`) |
| **Fix** | Bump to `^8.5.10` |

If any user-controlled input reaches PostCSS's CSS stringifier, the unescaped `</style>` tag can break out of inline styles and inject arbitrary HTML, leading to XSS.

---

### 4.3 — `esbuild <= 0.24.2` — Dev Server Cross-Origin Request Exposure

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) |
| **Severity** | 🟡 MODERATE |
| **Affected packages** | `hono-example` (via `drizzle-kit`), `codegen` (via `tsup`), `sveltekit-example` (via `vite`) |
| **Fix** | Bump `tsup` to `^8.5.0` in `codegen` (pulls in esbuild `>=0.25.0`) |

esbuild's development server responds to requests from any origin, allowing malicious web pages to extract source files and build artifacts.

---

### 4.4 — `cookie < 0.7.0` — Out-of-Bounds Characters in Cookie Fields

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) |
| **Severity** | 🟡 MODERATE |
| **Affected packages** | Transitive via elysia, express, sveltekit adapters |

Cookie names, paths, and domain values are accepted with out-of-bounds characters, potentially allowing cookie injection or session fixation attacks.

---

### 4.5 — `follow-redirects <= 1.15.11` — Auth Headers Leaked to Cross-Domain Redirects

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-r4q5-vmmm-2653](https://github.com/advisories/GHSA-r4q5-vmmm-2653) |
| **Severity** | 🟡 MODERATE |
| **Affected packages** | `vite-web-example` (transitive via axios) |
| **Fix** | Resolved automatically by bumping axios to `^1.15.0` |

When following HTTP redirects to a different domain, authorization headers are forwarded, potentially leaking credentials to a third-party server.

---

### 4.6 — `brace-expansion < 1.1.13` — Zero-Step Sequence DoS

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) |
| **Severity** | 🟡 MODERATE |
| **Affected packages** | `vite-web-example` (transitive via eslint, shadcn) |

A brace expression with a zero-step numeric sequence (e.g., `{0..0..0}`) causes an infinite loop in the expansion algorithm.

---

### 4.7 — `uuid < 14.0.0` — Missing Buffer Bounds Check in v3/v5/v6

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| **Severity** | 🟡 MODERATE |
| **Affected packages** | `vite-web-example` (transitive via exceljs) |

When a custom buffer is passed to `uuid.v3()`, `uuid.v5()`, or `uuid.v6()`, missing bounds checking can lead to out-of-bounds writes.

---

### 4.8 — `elysia < 1.4.26` — Cookie Value Prototype Pollution

| Field | Detail |
|-------|--------|
| **Advisory** | [GHSA-8hq9-phh3-p2wp](https://github.com/advisories/GHSA-8hq9-phh3-p2wp) |
| **Severity** | 🟡 MODERATE |
| **Affected packages** | `adapter-elysia` |
| **Fix** | Bump `elysia` to `^1.4.26` (also resolves §3.3) |

---

### 4.9 — `file-type >= 13.0.0 < 21.3.1` — Infinite Loop + ZIP Decompression Bomb

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 MODERATE |
| **Affected packages** | `adapter-elysia` (transitive via elysia) |
| **Fix** | Resolved by bumping elysia to `^1.4.26` |

| Advisory | Description |
|----------|-------------|
| [GHSA-5v7r-6r5c-r473](https://github.com/advisories/GHSA-5v7r-6r5c-r473) | Infinite loop in ASF file parser |
| [GHSA-j47w-4g3g-c36v](https://github.com/advisories/GHSA-j47w-4g3g-c36v) | ZIP Decompression Bomb DoS |

---

## 5. Low Severity Vulnerabilities

| Advisory | Package | Description |
|----------|---------|-------------|
| [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) | `cookie < 0.7.0` | Out-of-bounds characters accepted in cookie name/path/domain fields |

This is a duplicate entry from §4.4 at a lower contextual severity rating in some dependency paths.

---

## 6. Version Inconsistencies

The monorepo uses different versions of the same packages across workspaces, creating unpredictable behavior, harder debugging, and inconsistent security posture.

| Package | Versions Currently in Use | Recommended Version |
|---------|--------------------------|---------------------|
| `typescript` | `^5.3.3`, `^5.9.3`, `~5.9.3`, `^5.0.0` | Pin to `^5.9.3` everywhere |
| `vitest` | `^1.6.1`, `^1.2.0`, `^2.1.8` | Upgrade all to `^3.0.0` |
| `drizzle-orm` | `^0.45.1` (3 locations) | `^0.45.2` |
| `@types/node` | `^24.10.1`, `^25.2.2` | Consistent `^24.x` (LTS) or `^25.x` |
| `vite` | `^6.2.0`, `^6.0.0` | `^6.4.3` |
| `@types/react` | `^19.2.5`, `^19.2.7`, `^19.2.13` | `^19.2.13` |

### Key Notes

- **`typescript`** — Four different version specifiers across the monorepo introduce potential type-checking drift. The `~5.9.3` pin (patch-only) is unnecessarily restrictive compared to `^5.9.3` (minor-compatible).
- **`vitest`** — The gap between `^1.2.0` (oldest) and `^2.1.8` (newest installed) represents roughly 2 years of fixes, improvements, and security patches. Vitest 3 is the current stable release.
- **`@types/node`** — Mixing `^24.x` and `^25.x` types can lead to API mismatches if packages share type definitions at build time. Pick one major version per LTS cycle.
- **`vite`** — The `^6.0.0` range allows resolving to any 6.x release including the three CVEs described in §3.4. Pinning to `^6.4.3` closes all known file-access vulnerabilities.

---

## 7. Code Quality & Architectural Observations

### 7.1 — `adapter-next` peerDep Range Accepts Vulnerable Next.js Versions

The current `peerDependencies` entry of `>=14.0.0` silently allows users to install Next.js `16.0.0-beta.0` through `16.1.6`, all of which contain the DoS, HTTP Smuggling, and CSRF vulnerabilities described in §3.11.

**Recommended fix:**

```vision-workspace/TableCraft/packages/adapter-next/package.json#L1-3
"peerDependencies": {
  "next": ">=14.0.0 <16 || >=16.1.7"
}
```

A comment in the README noting that Next.js stable v15 is the recommended target would further reduce user confusion.

---

### 7.2 — `plugin-cache` peerDep Version Mismatch

`@tablecraft/plugin-cache` declares a peer dependency on `@tablecraft/engine: ^0.1.0-beta.4`, but the engine has since progressed to `0.1.7`. The `^0.1.0-beta.4` range may not resolve correctly with semver pre-release semantics and will produce warnings or failures for users installing the current engine version.

**Recommended fix:**

```vision-workspace/TableCraft/packages/plugin-cache/package.json#L1-3
"peerDependencies": {
  "@tablecraft/engine": ">=0.1.0"
}
```

---

### 7.3 — `codegen` is Missing a `"test"` Script

Every other package in the monorepo includes a `vitest`-powered `"test"` script. `packages/codegen/package.json` has no `"test"` entry. This means:

- Code generation logic has no automated test coverage.
- `bun test --filter codegen` silently does nothing.
- CI pipelines that rely on workspace-wide `bun test` will skip codegen entirely.

**Recommended fix:** Add `"test": "vitest run"` to `packages/codegen/package.json` and create at least a smoke test that validates generated output against a known fixture.

---

### 7.4 — `vitest ^1.x` Still Used in Most Packages

Vitest 3 is the current stable release. `vitest ^1.x` and `^2.x` represent 2+ years of accumulated fixes including:

- Improved browser mode support
- Better TypeScript ESM interop
- Memory leak fixes in watch mode
- Coverage provider improvements
- Snapshot serializer improvements

Continuing to use `^1.x` in most packages while `vite-web-example` uses `^2.1.8` creates a split testing environment that makes cross-package debugging harder. See §6 for the full version inconsistency table.

---

### 7.5 — `jsdom ^28.1.0` in `@tablecraft/table` Pulls In Vulnerable `undici`

`jsdom ^28.x` transitively depends on `undici >= 7.0.0`, which carries 6 advisories (3 HIGH) as detailed in §3.6. While `jsdom` is a devDependency used only in tests, the HIGH-severity WebSocket overflow and memory DoS vulnerabilities still affect developer machines and CI runners.

**Recommended fix:** Downgrade to `jsdom ^26.1.0`, which resolves against a safe undici version. Alternatively, add a root-level override:

```vision-workspace/TableCraft/package.json#L1-5
"overrides": {
  "undici": ">=7.24.0"
}
```

---

### 7.6 — `elysia ^1.2.0` as devDep in `adapter-elysia` is 80+ Versions Behind

The `adapter-elysia` package lists `elysia ^1.2.0` as a devDependency for local testing, but `^1.2.0` resolves to a version affected by both the ReDoS (§3.3) and Prototype Pollution (§4.8) advisories. Using a vulnerable version in testing means that any test that exercises elysia middleware is running against insecure code.

**Recommended fix:** Bump the `devDependency` to `^1.4.26` alongside the peer dependency update.

---

### 7.7 — `tsup ^8.0.1` in `codegen` Pulls In Vulnerable `esbuild`

`tsup ^8.0.1` resolves to an esbuild version `<=0.24.2`, which is affected by the cross-origin dev server CVE (§4.3). Bumping `tsup` to `^8.5.0` pulls in esbuild `>=0.25.0` which patches the vulnerability.

---

### 7.8 — `@dnd-kit` Major Version Mismatch in `table`

`@tablecraft/table` depends on:

| Package | Version |
|---------|---------|
| `@dnd-kit/core` | `^6.3.1` |
| `@dnd-kit/modifiers` | `^9.0.0` |
| `@dnd-kit/sortable` | `^10.0.0` |

`@dnd-kit/modifiers ^9.0.0` and `@dnd-kit/sortable ^10.0.0` are recent major bumps relative to `@dnd-kit/core ^6.3.1`. In the `@dnd-kit` ecosystem, `modifiers` and `sortable` have typically maintained minor-version parity with `core`. A major version skew of this magnitude warrants explicit API compatibility verification — particularly around `DragOverlay`, `useSortable` hooks, and modifier function signatures — to ensure drag-and-drop behavior is stable in production.

---

## 8. Priority Fix Matrix

| Priority | Package | Affected Location(s) | Change Required | Security Impact |
|----------|---------|----------------------|-----------------|-----------------|
| **P0 🚨** | `drizzle-orm` | `engine`, `hono-example`, `sveltekit-example` | `^0.45.1` → `^0.45.2` | SQL Injection |
| **P1 🔴** | `hono` | `adapter-hono`, `hono-example` | `^4.7.0` → `^4.12.4` | Arbitrary file access, CRLF, Prototype Pollution |
| **P1 🔴** | `elysia` | `adapter-elysia` | `^1.2.0` → `^1.4.26` | ReDoS + Prototype Pollution |
| **P1 🔴** | `vite` | `web`, `vite-web-example`, `sveltekit-example` | `^6.2.0` / `^6.0.0` → `^6.4.3` | Arbitrary File Read, Path Traversal |
| **P1 🔴** | `@sveltejs/kit` | `sveltekit-example`, `adapter-sveltekit` | `^2.16.0` → `^2.57.1` | BODY_SIZE_LIMIT bypass, Redirect DoS |
| **P2 🟡** | `axios` | `vite-web-example`, `client` peerDep | `^1.7.0` / `^1.13.0` → `^1.15.0` | SSRF, Cloud Metadata Exfiltration |
| **P2 🟡** | `postcss` | `web` | `^8.5.6` → `^8.5.10` | XSS in CSS output |
| **P2 🟡** | `tsup` | `codegen` | `^8.0.1` → `^8.5.0` | esbuild dev server cross-origin CVE |
| **P2 🟡** | `jsdom` | `table` (devDep) | `^28.1.0` → `^26.1.0` | undici: 3 HIGH + 3 MODERATE CVEs |
| **P3 🔵** | `typescript` | All packages | Normalize to `^5.9.3` | Consistency / type drift |
| **P3 🔵** | `vitest` | All packages | Upgrade all to `^3.0.0` | Consistency + accumulated fixes |

---

## 9. Recommended Actions

### Immediate (P0–P1)

1. **Bump `drizzle-orm` to `^0.45.2`** in `packages/engine/package.json`, `apps/hono-example/package.json`, and `apps/sveltekit-example/package.json`. This is the only P0 SQL Injection fix and must be shipped before any other work.

2. **Bump `hono` to `^4.12.4`** in `packages/adapter-hono/package.json` and `apps/hono-example/package.json`. Verify `serveStatic` usage and cookie handling after the upgrade.

3. **Bump `elysia` to `^1.4.26`** in both the `peerDependencies` and `devDependencies` of `packages/adapter-elysia/package.json`.

4. **Bump `vite` to `^6.4.3`** across all apps that use it. Run the full build and dev-server test suite to confirm no Vite plugin regressions.

5. **Bump `@sveltejs/kit` to `^2.57.1`** in `apps/sveltekit-example` and `packages/adapter-sveltekit`.

### Short-Term (P2)

6. **Bump `axios` to `^1.15.0`** in `apps/vite-web-example/package.json` and update the `peerDependencies` range in `packages/client/package.json` to `^1.15.0`.

7. **Bump `postcss` to `^8.5.10`** in `apps/web/package.json`.

8. **Bump `tsup` to `^8.5.0`** in `packages/codegen/package.json` to pull in a safe esbuild version.

9. **Downgrade `jsdom` to `^26.1.0`** in `packages/table/package.json` (devDependency) to eliminate the undici CVE chain.

### Medium-Term (P3 / Architectural)

10. **Run `bun update`** across the monorepo to apply all semver-compatible updates in a single pass, then review the diff before committing.

11. **Add `bun audit` to CI.** Create or update `.github/workflows/ci.yml` with a step such as:

    ```vision-workspace/TableCraft/.github/workflows/ci.yml#L1-8
    - name: Security audit
      run: bun audit
      # Fail the build on high or critical severity findings
    ```

12. **Add root-level `overrides`** in the root `package.json` to handle transitive vulnerabilities that cannot be fixed by bumping direct dependencies:

    ```vision-workspace/TableCraft/package.json#L1-8
    "overrides": {
      "minimatch": ">=5.1.8",
      "path-to-regexp": ">=8.4.0",
      "picomatch": ">=2.3.2",
      "flatted": ">=3.4.0",
      "cookie": ">=0.7.0",
      "brace-expansion": ">=1.1.13"
    }
    ```

13. **Pin `vitest` to `^3.0.0`** across all packages. Vitest 3 offers improved watch mode stability, better coverage support, and security fixes not present in the 1.x branch.

14. **Normalize `typescript` to `^5.9.3`** across all `package.json` files. Replace `~5.9.3` (patch-only pin) with `^5.9.3` for consistency and replace all `^5.3.3` / `^5.0.0` entries.

15. **Add a `"test"` script to `packages/codegen/package.json`** and write at minimum a smoke test that invokes the codegen against a sample Drizzle schema and validates the output structure.

16. **Fix the `adapter-next` peer dependency range** to exclude known-vulnerable Next.js versions:

    ```vision-workspace/TableCraft/packages/adapter-next/package.json#L1-3
    "peerDependencies": {
      "next": ">=14.0.0 <16 || >=16.1.7"
    }
    ```

17. **Fix the `plugin-cache` peer dependency** on `@tablecraft/engine` from `^0.1.0-beta.4` to `>=0.1.0` to correctly accommodate the current and all future `0.1.x` releases.

18. **Verify `@dnd-kit` API compatibility** between `@dnd-kit/core ^6.3.1`, `@dnd-kit/modifiers ^9.0.0`, and `@dnd-kit/sortable ^10.0.0`. Confirm modifier function signatures and sortable hook contracts remain compatible across the major version gap.

---

*This report was generated from live `bun audit` output and manual analysis of the monorepo `package.json` files. Re-run `bun audit` after applying fixes to confirm vulnerability counts drop to zero.*
