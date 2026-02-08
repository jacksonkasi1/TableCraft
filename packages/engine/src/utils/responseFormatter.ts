import { TableConfig } from '../types/table';
import { EngineResult, EngineMeta } from '../types/engine';

// ---- Built-in JS transforms ----

const builtInTransforms: Record<string, (val: unknown) => unknown> = {
  uppercase: (v: unknown) => (typeof v === 'string' ? v.toUpperCase() : v),
  lowercase: (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : v),
  trim: (v: unknown) => (typeof v === 'string' ? v.trim() : v),
  toString: (v: unknown) => (v == null ? '' : String(v)),
  toNumber: (v: unknown) => (v == null ? 0 : Number(v)),
  toBoolean: (v: unknown) => Boolean(v),
  formatDate: (v: unknown) => {
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'string' || typeof v === 'number') {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? v : d.toISOString();
    }
    return v;
  },
  formatCurrency: (v: unknown) => {
    if (typeof v === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(v);
    }
    return v;
  },
};

/**
 * A registry so consumers can add custom JS transforms.
 */
const customTransforms = new Map<string, (val: unknown) => unknown>();

export function registerTransform(
  name: string,
  fn: (val: unknown) => unknown
): void {
  customTransforms.set(name, fn);
}

/**
 * Applies all jsTransform functions defined on each column config to the data rows.
 */
export function applyJsTransforms(
  data: Record<string, unknown>[],
  config: TableConfig
): Record<string, unknown>[] {
  // Index columns that have jsTransform
  const transformMap = new Map<string, ((val: unknown) => unknown)[]>();

  for (const col of config.columns) {
    if (!col.jsTransform || col.jsTransform.length === 0) continue;

    const fns: ((val: unknown) => unknown)[] = [];
    for (const tName of col.jsTransform) {
      // Check for slice(start,end) style parameterised transforms
      const paramMatch = /^(\w+)\((.+)\)$/.exec(tName);
      if (paramMatch) {
        const fnName = paramMatch[1];
        const args = paramMatch[2].split(',').map((a) => a.trim());
        if (fnName === 'slice' && args.length === 2) {
          const start = parseInt(args[0], 10);
          const end = parseInt(args[1], 10);
          fns.push((v) =>
            typeof v === 'string' ? v.slice(start, end) : v
          );
          continue;
        }
      }

      const fn = customTransforms.get(tName) ?? builtInTransforms[tName];
      if (fn) fns.push(fn);
    }

    if (fns.length > 0) {
      transformMap.set(col.name, fns);
    }
  }

  if (transformMap.size === 0) return data;

  return data.map((row) => {
    const newRow = { ...row };
    for (const [field, fns] of transformMap) {
      if (field in newRow) {
        let val = newRow[field];
        for (const fn of fns) {
          val = fn(val);
        }
        newRow[field] = val;
      }
    }
    return newRow;
  });
}

/**
 * Builds a complete EngineResult, applying jsTransform and stripping hidden columns.
 */
export function formatResponse(
  data: Record<string, unknown>[],
  meta: EngineMeta,
  config: TableConfig,
  aggregations?: Record<string, number>
): EngineResult {
  // 1. Strip hidden columns from data (defense in depth — select should omit them)
  const hiddenFields = new Set(
    config.columns.filter((c) => c.hidden).map((c) => c.name)
  );

  let processed = data;
  if (hiddenFields.size > 0) {
    processed = processed.map((row) => {
      const r = { ...row };
      for (const h of hiddenFields) {
        delete r[h];
      }
      return r;
    });
  }

  // 2. Apply JS transforms
  processed = applyJsTransforms(processed, config);

  return {
    data: processed,
    meta,
    ...(aggregations && { aggregations }),
  };
}
