import { EngineParams, FilterParam, SortParam } from '../types/engine';
import { Operator, OperatorSchema } from '../types/table';

/**
 * Parses URL search-params / query-string into structured EngineParams.
 *
 * Supported syntax:
 *   ?page=1
 *   &pageSize=25
 *   &sort=-createdAt,name          → [{field:'createdAt',order:'desc'},{field:'name',order:'asc'}]
 *   &filter[status]=active          → {status:{operator:'eq',value:'active'}}
 *   &filter[amount][gte]=100        → {amount:{operator:'gte',value:100}}
 *   &search=hello
 *   &export=csv
 *   &includeDeleted=true
 */
export function parseRequest(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): EngineParams {
  const raw = normalise(params);

  return {
    page: parseIntSafe(raw['page']),
    pageSize: parseIntSafe(raw['pageSize']),
    sort: parseSort(raw['sort']),
    filters: parseFilters(raw),
    search: raw['search'] || undefined,
    export: parseExportFormat(raw['export']),
    includeDeleted: raw['includeDeleted'] === 'true',
  };
}

// ---- internal helpers ----

function normalise(
  input: URLSearchParams | Record<string, string | string[] | undefined>
): Record<string, string> {
  if (input instanceof URLSearchParams) {
    const obj: Record<string, string> = {};
    input.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }
  const obj: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) {
      obj[k] = Array.isArray(v) ? v[0] : v;
    }
  }
  return obj;
}

function parseIntSafe(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Sort syntax: "-createdAt,name" → desc createdAt, asc name
 */
function parseSort(val: string | undefined): SortParam[] | undefined {
  if (!val) return undefined;

  const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;

  return parts.map((part) => {
    if (part.startsWith('-')) {
      return { field: part.slice(1), order: 'desc' as const };
    }
    if (part.startsWith('+')) {
      return { field: part.slice(1), order: 'asc' as const };
    }
    return { field: part, order: 'asc' as const };
  });
}

/**
 * Extracts filter[field]=value and filter[field][op]=value from a flat key map.
 *
 * The bracket notation is already flattened into string keys by most frameworks:
 *   "filter[status]" → "active"
 *   "filter[amount][gte]" → "100"
 */
function parseFilters(raw: Record<string, string>): Record<string, FilterParam> | undefined {
  const filters: Record<string, FilterParam> = {};

  const filterRegexSimple = /^filter\[(\w+)]$/;
  const filterRegexOperator = /^filter\[(\w+)]\[(\w+)]$/;

  for (const [key, value] of Object.entries(raw)) {
    // filter[field][operator]=value
    const matchOp = filterRegexOperator.exec(key);
    if (matchOp) {
      const field = matchOp[1];
      const op = matchOp[2];
      if (isValidOperator(op)) {
        filters[field] = {
          operator: op as Operator,
          value: coerceValue(value),
        };
      }
      continue;
    }

    // filter[field]=value  (implicit eq)
    const matchSimple = filterRegexSimple.exec(key);
    if (matchSimple) {
      const field = matchSimple[1];
      filters[field] = {
        operator: 'eq',
        value: coerceValue(value),
      };
    }
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
}

function isValidOperator(op: string): boolean {
  return OperatorSchema.safeParse(op).success;
}

/**
 * Best-effort coercion of string values from query params.
 * Numbers stay numbers, booleans stay booleans, comma-separated become arrays.
 */
function coerceValue(val: string): unknown {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null') return null;

  // Comma-separated list → array
  if (val.includes(',')) {
    return val.split(',').map((v) => coerceValue(v.trim()));
  }

  const num = Number(val);
  if (val !== '' && Number.isFinite(num)) return num;

  return val;
}

function parseExportFormat(
  val: string | undefined
): 'csv' | 'json' | undefined {
  if (val === 'csv' || val === 'json') return val;
  return undefined;
}
