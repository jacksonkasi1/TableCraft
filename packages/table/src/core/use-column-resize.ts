import { useState, useEffect, useCallback, useRef } from "react";
import type { ColumnSizingState } from "@tanstack/react-table";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook to manage table column sizing with localStorage persistence.
 */
export function useTableColumnResize(
  tableId: string,
  enableResizing: boolean = false
) {
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const initialLoadComplete = useRef(false);
  const userChangedSizes = useRef(false);
  const prevSizingRef = useRef<ColumnSizingState>({});
  const debouncedColumnSizing = useDebounce(columnSizing, 300);

  const handleSetColumnSizing = useCallback(
    (
      newSizing:
        | ColumnSizingState
        | ((prev: ColumnSizingState) => ColumnSizingState)
    ) => {
      setColumnSizing((prev) => {
        const nextState =
          typeof newSizing === "function" ? newSizing(prev) : newSizing;

        if (
          initialLoadComplete.current &&
          JSON.stringify(nextState) !== JSON.stringify(prevSizingRef.current)
        ) {
          userChangedSizes.current = true;
          prevSizingRef.current = nextState;
        }

        return nextState;
      });
    },
    []
  );

  // Load saved sizes from localStorage on mount
  useEffect(() => {
    if (enableResizing && !initialLoadComplete.current) {
      try {
        const savedSizing = localStorage.getItem(
          `table-column-sizing-${tableId}`
        );
        if (savedSizing) {
          const parsed = JSON.parse(savedSizing);
          setColumnSizing(parsed);
          prevSizingRef.current = parsed;
        }
      } catch (error) {
        console.warn("Failed to load saved column sizing:", error);
      } finally {
        initialLoadComplete.current = true;
      }
    }
  }, [tableId, enableResizing]);

  // Save to localStorage on change (debounced)
  useEffect(() => {
    if (
      enableResizing &&
      initialLoadComplete.current &&
      userChangedSizes.current
    ) {
      try {
        localStorage.setItem(
          `table-column-sizing-${tableId}`,
          JSON.stringify(debouncedColumnSizing)
        );
      } catch (error) {
        console.warn("Failed to save column sizing:", error);
      }
    }
  }, [debouncedColumnSizing, tableId, enableResizing]);

  const resetColumnSizing = useCallback(() => {
    setColumnSizing({});
    userChangedSizes.current = true;
    prevSizingRef.current = {};

    if (enableResizing) {
      try {
        localStorage.removeItem(`table-column-sizing-${tableId}`);
      } catch (error) {
        console.warn("Failed to remove column sizing:", error);
      }
    }
  }, [enableResizing, tableId]);

  return {
    columnSizing,
    setColumnSizing: handleSetColumnSizing,
    resetColumnSizing,
  };
}