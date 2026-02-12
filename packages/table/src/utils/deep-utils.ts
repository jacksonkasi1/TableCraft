import { ensureUrlStateHistoryPatched } from "./history-sync";

type Comparable = string | number | boolean | object | null | undefined | Date | RegExp | Set<unknown> | Map<unknown, unknown>;

/**
 * Optimized deep equality check for objects and arrays.
 */
export function isDeepEqual(a: Comparable, b: Comparable): boolean {
  const visited = new WeakMap<object, object>();

  return compare(a, b);

  function compare(a: Comparable, b: Comparable): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;

    const typeA = typeof a;
    const typeB = typeof b;
    if (typeA !== typeB) return false;

    if (typeA !== "object") return false;

    if (a instanceof Date) {
      return b instanceof Date && a.getTime() === b.getTime();
    }

    if (a instanceof RegExp) {
      return b instanceof RegExp && a.toString() === b.toString();
    }

    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!compare(a[i] as Comparable, b[i] as Comparable)) return false;
      }
      return true;
    }

    if (a instanceof Set) {
      if (!(b instanceof Set) || a.size !== b.size) return false;
      return compare([...a] as Comparable, [...b] as Comparable);
    }

    if (a instanceof Map) {
      if (!(b instanceof Map) || a.size !== b.size) return false;
      for (const [key, val] of a.entries()) {
        if (!b.has(key) || !compare(val as Comparable, b.get(key) as Comparable)) return false;
      }
      return true;
    }

    if (a.constructor === Object && b.constructor === Object) {
      if (visited.has(a as object)) {
        return visited.get(a as object) === b;
      }
      visited.set(a as object, b as object);

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;

      keysA.sort();
      keysB.sort();
      for (let i = 0; i < keysA.length; i++) {
        if (keysA[i] !== keysB[i]) return false;
      }
      for (const key of keysA) {
        if (!compare((a as Record<string, unknown>)[key] as Comparable, (b as Record<string, unknown>)[key] as Comparable)) return false;
      }
      return true;
    }

    if (a.constructor !== b.constructor) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!compare((a as Record<string, unknown>)[key] as Comparable, (b as Record<string, unknown>)[key] as Comparable)) return false;
    }
    return true;
  }
}

/**
 * Creates a debounced function that delays invoking func until after wait ms.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Reset URL parameters by removing all query parameters.
 */
export function resetUrlState(pathname?: string): void {
  if (typeof window === "undefined") return;

  ensureUrlStateHistoryPatched();

  const nextPathname = pathname ?? window.location.pathname;
  const hash = window.location.hash;
  const nextUrl = `${nextPathname}${hash}`;

  window.history.replaceState(window.history.state, "", nextUrl);
}