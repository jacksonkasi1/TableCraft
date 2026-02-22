// @vitest-environment jsdom

/**
 * Tests for the defaultColumnOrder feature.
 *
 * These tests cover the column-order resolution logic used in data-table.tsx:
 *   - mount hydration: localStorage → defaultColumnOrder → []
 *   - resetColumnOrder: defaults to defaultColumnOrder when provided, else []
 *   - view-options: onResetColumnOrder callback is delegated when provided
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'tablecraft-column-order';

function buildStorageKey(tableId: string) {
  return `${STORAGE_KEY_PREFIX}-${tableId}`;
}

/**
 * Simulates the mount hydration logic from data-table.tsx:
 * 1. Try to read saved order from localStorage.
 * 2. If valid, return it.
 * 3. Otherwise fall back to defaultColumnOrder (if provided).
 * 4. Otherwise return [].
 */
function resolveInitialColumnOrder(
  tableId: string,
  defaultColumnOrder?: string[],
  storage: Storage = localStorage
): string[] {
  try {
    const saved = storage.getItem(buildStorageKey(tableId));
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.every((item: unknown) => typeof item === 'string')) {
        return parsed as string[];
      }
    }
  } catch {
    // ignore
  }
  if (defaultColumnOrder && defaultColumnOrder.length > 0) {
    return defaultColumnOrder;
  }
  return [];
}

/**
 * Simulates resetColumnOrder from data-table.tsx:
 * - Resets to defaultColumnOrder if provided, else to [].
 * - Persists the reset state to localStorage accordingly.
 */
function buildResetColumnOrder(
  tableId: string,
  defaultColumnOrder?: string[],
  storage: Storage = localStorage
) {
  return function resetColumnOrder(setColumnOrder: (order: string[]) => void) {
    const resetTo =
      defaultColumnOrder && defaultColumnOrder.length > 0 ? defaultColumnOrder : [];
    setColumnOrder(resetTo);
    try {
      if (resetTo.length > 0) {
        storage.setItem(buildStorageKey(tableId), JSON.stringify(resetTo));
      } else {
        storage.removeItem(buildStorageKey(tableId));
      }
    } catch {
      // ignore
    }
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('resolveInitialColumnOrder (mount hydration)', () => {
  const TABLE_ID = 'test-table';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns [] when localStorage is empty and no defaultColumnOrder', () => {
    const result = resolveInitialColumnOrder(TABLE_ID);
    expect(result).toEqual([]);
  });

  it('returns defaultColumnOrder when localStorage is empty and defaultColumnOrder is provided', () => {
    const defaultOrder = ['name', 'status', 'createdAt'];
    const result = resolveInitialColumnOrder(TABLE_ID, defaultOrder);
    expect(result).toEqual(defaultOrder);
  });

  it('returns saved localStorage order and ignores defaultColumnOrder', () => {
    const savedOrder = ['createdAt', 'name', 'status'];
    const defaultOrder = ['name', 'status', 'createdAt'];
    localStorage.setItem(buildStorageKey(TABLE_ID), JSON.stringify(savedOrder));

    const result = resolveInitialColumnOrder(TABLE_ID, defaultOrder);
    expect(result).toEqual(savedOrder);
  });

  it('returns saved localStorage order when no defaultColumnOrder is provided', () => {
    const savedOrder = ['id', 'email', 'role'];
    localStorage.setItem(buildStorageKey(TABLE_ID), JSON.stringify(savedOrder));

    const result = resolveInitialColumnOrder(TABLE_ID);
    expect(result).toEqual(savedOrder);
  });

  it('falls back to defaultColumnOrder when localStorage value is invalid JSON', () => {
    localStorage.setItem(buildStorageKey(TABLE_ID), 'NOT_VALID_JSON{{{');
    const defaultOrder = ['name', 'status'];
    const result = resolveInitialColumnOrder(TABLE_ID, defaultOrder);
    expect(result).toEqual(defaultOrder);
  });

  it('falls back to defaultColumnOrder when localStorage value is not a string array', () => {
    // An array of numbers — should be rejected
    localStorage.setItem(buildStorageKey(TABLE_ID), JSON.stringify([1, 2, 3]));
    const defaultOrder = ['name', 'status'];
    const result = resolveInitialColumnOrder(TABLE_ID, defaultOrder);
    expect(result).toEqual(defaultOrder);
  });

  it('falls back to [] when localStorage is invalid and no defaultColumnOrder', () => {
    localStorage.setItem(buildStorageKey(TABLE_ID), 'bad_json');
    const result = resolveInitialColumnOrder(TABLE_ID);
    expect(result).toEqual([]);
  });

  it('returns [] when defaultColumnOrder is an empty array', () => {
    const result = resolveInitialColumnOrder(TABLE_ID, []);
    expect(result).toEqual([]);
  });

  it('uses the correct storage key per tableId', () => {
    const savedOrder = ['a', 'b'];
    // Only 'table-a' has a saved order; 'table-b' does not
    localStorage.setItem(buildStorageKey('table-a'), JSON.stringify(savedOrder));

    expect(resolveInitialColumnOrder('table-a')).toEqual(savedOrder);
    expect(resolveInitialColumnOrder('table-b')).toEqual([]);
  });
});

describe('resetColumnOrder', () => {
  const TABLE_ID = 'reset-table';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('resets to [] and removes localStorage key when no defaultColumnOrder', () => {
    localStorage.setItem(buildStorageKey(TABLE_ID), JSON.stringify(['a', 'b']));
    const setColumnOrder = vi.fn();
    const reset = buildResetColumnOrder(TABLE_ID);
    reset(setColumnOrder);

    expect(setColumnOrder).toHaveBeenCalledWith([]);
    expect(localStorage.getItem(buildStorageKey(TABLE_ID))).toBeNull();
  });

  it('resets to defaultColumnOrder and persists it to localStorage', () => {
    const defaultOrder = ['name', 'status', 'createdAt'];
    localStorage.setItem(buildStorageKey(TABLE_ID), JSON.stringify(['x', 'y']));
    const setColumnOrder = vi.fn();
    const reset = buildResetColumnOrder(TABLE_ID, defaultOrder);
    reset(setColumnOrder);

    expect(setColumnOrder).toHaveBeenCalledWith(defaultOrder);
    const saved = JSON.parse(localStorage.getItem(buildStorageKey(TABLE_ID)) ?? 'null');
    expect(saved).toEqual(defaultOrder);
  });

  it('removes localStorage key when defaultColumnOrder is empty []', () => {
    localStorage.setItem(buildStorageKey(TABLE_ID), JSON.stringify(['a', 'b']));
    const setColumnOrder = vi.fn();
    const reset = buildResetColumnOrder(TABLE_ID, []);
    reset(setColumnOrder);

    expect(setColumnOrder).toHaveBeenCalledWith([]);
    expect(localStorage.getItem(buildStorageKey(TABLE_ID))).toBeNull();
  });

  it('resets to [] when defaultColumnOrder is undefined', () => {
    const setColumnOrder = vi.fn();
    const reset = buildResetColumnOrder(TABLE_ID, undefined);
    reset(setColumnOrder);

    expect(setColumnOrder).toHaveBeenCalledWith([]);
  });
});

describe('DataTableViewOptions — onResetColumnOrder delegation', () => {
  it('calls onResetColumnOrder when provided instead of internal reset', () => {
    // Simulate the logic inside view-options.tsx resetColumnOrder callback
    const storageKey = buildStorageKey('view-options-table');
    localStorage.setItem(storageKey, JSON.stringify(['a', 'b']));

    const tableSetColumnOrder = vi.fn();
    const onResetColumnOrder = vi.fn();

    // The conditional in view-options.tsx resetColumnOrder:
    function resetColumnOrder() {
      if (onResetColumnOrder) {
        onResetColumnOrder();
        return;
      }
      tableSetColumnOrder([]);
      localStorage.removeItem(storageKey);
    }

    resetColumnOrder();

    expect(onResetColumnOrder).toHaveBeenCalledTimes(1);
    // Internal reset path should NOT have been taken
    expect(tableSetColumnOrder).not.toHaveBeenCalled();
    // localStorage should NOT have been cleared by the internal path
    expect(localStorage.getItem(storageKey)).not.toBeNull();
  });

  it('falls back to internal reset when onResetColumnOrder is not provided', () => {
    const storageKey = buildStorageKey('view-options-table-2');
    localStorage.setItem(storageKey, JSON.stringify(['a', 'b']));

    const tableSetColumnOrder = vi.fn();
    const onResetColumnOrder: (() => void) | undefined = undefined;

    function resetColumnOrder() {
      if (onResetColumnOrder) {
        onResetColumnOrder();
        return;
      }
      tableSetColumnOrder([]);
      localStorage.removeItem(storageKey);
    }

    resetColumnOrder();

    expect(tableSetColumnOrder).toHaveBeenCalledWith([]);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });
});

describe('end-to-end column order flow', () => {
  const TABLE_ID = 'e2e-table';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('full cycle: no saved → use default → user drags → reset → back to default', () => {
    const defaultOrder = ['name', 'status', 'createdAt'];

    // 1. Mount — no saved order, use defaultColumnOrder
    const initialOrder = resolveInitialColumnOrder(TABLE_ID, defaultOrder);
    expect(initialOrder).toEqual(defaultOrder);

    // 2. User drags columns — simulate writing new order to localStorage
    const draggedOrder = ['createdAt', 'name', 'status'];
    localStorage.setItem(buildStorageKey(TABLE_ID), JSON.stringify(draggedOrder));

    // 3. Simulate a page reload — localStorage now has the dragged order
    const orderAfterReload = resolveInitialColumnOrder(TABLE_ID, defaultOrder);
    expect(orderAfterReload).toEqual(draggedOrder);

    // 4. User clicks "Reset Column Order" — should go back to defaultColumnOrder
    const setColumnOrder = vi.fn();
    const reset = buildResetColumnOrder(TABLE_ID, defaultOrder);
    reset(setColumnOrder);
    expect(setColumnOrder).toHaveBeenCalledWith(defaultOrder);

    // 5. After reset, localStorage is updated to defaultColumnOrder (not removed)
    const savedAfterReset = JSON.parse(
      localStorage.getItem(buildStorageKey(TABLE_ID)) ?? 'null'
    );
    expect(savedAfterReset).toEqual(defaultOrder);

    // 6. Another reload after reset — still loads defaultColumnOrder
    const orderAfterReset = resolveInitialColumnOrder(TABLE_ID, defaultOrder);
    expect(orderAfterReset).toEqual(defaultOrder);
  });

  it('full cycle: no default — user drags → reset → back to []', () => {
    // 1. Mount with no saved order, no defaultColumnOrder
    const initialOrder = resolveInitialColumnOrder(TABLE_ID);
    expect(initialOrder).toEqual([]);

    // 2. User drags columns
    const draggedOrder = ['z', 'y', 'x'];
    localStorage.setItem(buildStorageKey(TABLE_ID), JSON.stringify(draggedOrder));

    // 3. Page reload
    const orderAfterReload = resolveInitialColumnOrder(TABLE_ID);
    expect(orderAfterReload).toEqual(draggedOrder);

    // 4. Reset
    const setColumnOrder = vi.fn();
    const reset = buildResetColumnOrder(TABLE_ID);
    reset(setColumnOrder);
    expect(setColumnOrder).toHaveBeenCalledWith([]);

    // 5. localStorage key is removed
    expect(localStorage.getItem(buildStorageKey(TABLE_ID))).toBeNull();
  });
});
