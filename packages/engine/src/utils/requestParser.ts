import { EngineParams, FilterParam, SortParam } from '../types/engine';
import { Operator, OperatorSchema } from '../types/table';

// ── Operator shape contracts ────────────────────────────────────────────────
// These sets are the single source of truth for which operators expect which
// value shapes.  Every layer (serializer, parser, validator) must agree on
// this contract — and they all derive from these sets.

/** Operators whose value MUST be an array. */
const ARRAY_OPERATORS: ReadonlySet<string> = new Set<Operator>(['in', 'notIn']);

/** Operators whose value MUST be a two-element tuple `[min, max]`. */
const TUPLE_OPERATORS: ReadonlySet<string> = new Set<Operator>(['between']);

/** Operators that take NO value at all. */
const NULLARY_OPERATORS: ReadonlySet<string> = new Set<Operator>(['isNull', 'isNotNull']);

/** Maximum number of elements allowed in an `in` / `notIn` array.  */
const MAX_ARRAY_LENGTH = 1000;

/**
 * Parses URL search-params into structured EngineParams.
 *
 * Supported:
 *   ?page=1&pageSize=25
 *   ?cursor=eyJpZCI6MTAwfQ
 *   ?sort=-createdAt,name
 *   ?filter[status]=active
 *   ?filter[amount][gte]=100
 *   ?filter[status][in]=processing          — single value, auto-wrapped to array
 *   ?filter[status][in]=processing,shipped   — comma-separated, split to array
 *   ?search=hello
 *   ?select=id,name,email
 *   ?distinct=true
 *   ?export=csv
 *   ?includeDeleted=true
 */
export function parseRequest(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): EngineParams {
  const raw = normalise(params);

  return {
    page: parseIntSafe(raw['page']),
    pageSize: parseIntSafe(raw['pageSize']),
    cursor: raw['cursor'] || undefined,
    sort: parseSort(raw['sort']),
    filters: parseFilters(raw),
    search: raw['search'] || undefined,
    select: parseSelect(raw['select']),
    distinct: raw['distinct'] === 'true',
    export: parseExportFormat(raw['export']),
    includeDeleted: raw['includeDeleted'] === 'true',
    dateRange: parseDateRange(raw),
  };
}

// ── Helpers ──

function normalise(
  input: URLSearchParams | Record<string, string | string[] | undefined>
): Record<string, string> {
  if (input instanceof URLSearchParams) {
    const obj: Record<string, string> = {};
    // URLSearchParams.forEach visits each entry; for duplicate keys, last value wins.
    // This is the correct behaviour for filter params (one value per field).
    input.forEach((v, k) => { obj[k] = v; });
    return obj;
  }
  const obj: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) {
      // For array values (e.g. from Hono's c.req.queries()), use the last entry
      // to be consistent with URLSearchParams behaviour above.
      obj[k] = Array.isArray(v) ? v[v.length - 1] : v;
    }
  }
  return obj;
}

function parseIntSafe(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseSort(val: string | undefined): SortParam[] | undefined {
  if (!val) return undefined;
  const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;

  return parts.map((part) => {
    if (part.startsWith('-')) return { field: part.slice(1), order: 'desc' as const };
    if (part.startsWith('+')) return { field: part.slice(1), order: 'asc' as const };
    return { field: part, order: 'asc' as const };
  });
}

function parseSelect(val: string | undefined): string[] | undefined {
  if (!val) return undefined;
  const fields = val.split(',').map((s) => s.trim()).filter(Boolean);
  return fields.length > 0 ? fields : undefined;
}

function parseFilters(raw: Record<string, string>): Record<string, FilterParam> | undefined {
  const filters: Record<string, FilterParam> = {};
  const filterRegexSimple = /^filter\[(\w+)]$/;
  const filterRegexOperator = /^filter\[(\w+)]\[(\w+)]$/;

  for (const [key, value] of Object.entries(raw)) {
    const matchOp = filterRegexOperator.exec(key);
    if (matchOp) {
      const field = matchOp[1];
      const op = matchOp[2];
      if (isValidOperator(op)) {
        const operator = op as Operator;
        filters[field] = {
          operator,
          value: normalizeFilterValue(coerceValue(value), operator),
        };
      }
      continue;
    }

    const matchSimple = filterRegexSimple.exec(key);
    if (matchSimple) {
      const field = matchSimple[1];
      filters[field] = { operator: 'eq', value: coerceValue(value) };
    }
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
}

function isValidOperator(op: string): boolean {
  return OperatorSchema.safeParse(op).success;
}

/**
 * Coerces a raw URL string into a typed runtime value.
 *
 * This function is intentionally type-agnostic — it converts the *string*
 * representation without knowing which operator will consume the result.
 * Operator-aware shaping is done by {@link normalizeFilterValue} afterwards.
 */
function coerceValue(val: string): unknown {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null') return null;
  if (val.includes(',')) return val.split(',').map((v) => coerceValue(v.trim()));
  const num = Number(val);
  if (val !== '' && Number.isFinite(num)) return num;
  return val;
}

/**
 * Normalizes a coerced value to match the shape expected by the operator.
 *
 * This is the core fix for the "array vs string" contract mismatch:
 *
 * - `in` / `notIn` → value MUST be an array.  A scalar is auto-wrapped.
 * - `between`      → value MUST be a 2-element array.
 * - `isNull` / `isNotNull` → value is discarded (nullary operators).
 * - everything else → value is passed through unchanged.
 *
 * By normalizing *after* coercion and *before* validation, we guarantee
 * that every downstream consumer (inputValidator, filterBuilder, operators)
 * always receives the correct shape — regardless of how the value was
 * serialized over the wire.
 */
function normalizeFilterValue(value: unknown, operator: Operator): unknown {
  // Nullary operators take no value
  if (NULLARY_OPERATORS.has(operator)) {
    return undefined;
  }

  // Array operators: auto-wrap scalar → [scalar], enforce max length
  if (ARRAY_OPERATORS.has(operator)) {
    if (Array.isArray(value)) {
      return value.slice(0, MAX_ARRAY_LENGTH);
    }
    // Single value (e.g. ?filter[status][in]=processing) — wrap to array
    if (value !== null && value !== undefined) {
      return [value];
    }
    return [];
  }

  // Tuple operator: `between` expects exactly [min, max]
  if (TUPLE_OPERATORS.has(operator)) {
    if (Array.isArray(value) && value.length === 2) {
      return value;
    }
    // If not a valid tuple, return as-is — validator will catch it
    return value;
  }

  // Scalar operators: if coercion produced an array (e.g. comma in value),
  // for non-array operators this is likely unintended — return as-is and
  // let the validator surface a clear error.
  return value;
}

function parseExportFormat(val: string | undefined): 'csv' | 'json' | undefined {
  if (val === 'csv' || val === 'json') return val;
  return undefined;
}

function parseDateRange(raw: Record<string, string>): { from?: string; to?: string } | undefined {
  const from = raw['dateRange[from]'];
  const to = raw['dateRange[to]'];
  if (from || to) {
    return { from, to };
  }
  return undefined;
}

// ── Exported constants for cross-layer contract enforcement ─────────────────
export { ARRAY_OPERATORS, TUPLE_OPERATORS, NULLARY_OPERATORS, MAX_ARRAY_LENGTH };
