import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDeepEqual } from "../utils/deep-utils";
import { TABLECRAFT_URL_STATE_EVENT } from "../utils/url-events";
import { ensureUrlStateHistoryPatched } from "../utils/history-sync";

function canUseDOM(): boolean {
  return (
    typeof window !== "undefined" && typeof window.location !== "undefined"
  );
}

function getCurrentSearchParams(): URLSearchParams {
  if (!canUseDOM()) return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function replaceCurrentUrlSearchParams(params: URLSearchParams): void {
  if (!canUseDOM()) return;

  ensureUrlStateHistoryPatched();

  const newParamsString = params.toString();
  const pathname = window.location.pathname;
  const hash = window.location.hash;
  const nextUrl = `${pathname}${newParamsString ? `?${newParamsString}` : ""}${hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl === currentUrl) return;

  window.history.replaceState(window.history.state, "", nextUrl);
}

// Batch update state
interface PendingUpdateEntry<T = unknown> {
  value: T;
  defaultValue: T;
  serialize: (value: T) => string;
  areEqual: (a: T, b: T) => boolean;
}

const batchState = {
  isInBatchUpdate: false,
  batchId: 0,
  pendingUpdates: new Map<string, PendingUpdateEntry>(),
};

let batchTimeoutId: ReturnType<typeof setTimeout> | null = null;
const BATCH_TIMEOUT = 100;

/**
 * Framework-agnostic URL state hook.
 * Uses pure browser APIs — no Next.js dependency.
 */
export function useUrlState<T>(
  key: string,
  defaultValue: T,
  options: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    enabled?: boolean;
  } = {}
) {
  const enabled = options.enabled ?? true;

  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    return enabled ? getCurrentSearchParams() : new URLSearchParams();
  });

  // Sync with URL changes (popstate, our own events)
  useEffect(() => {
    if (!enabled || !canUseDOM()) return;

    ensureUrlStateHistoryPatched();

    const handleUrlChange = () => {
      const nextParams = getCurrentSearchParams();
      const nextString = nextParams.toString();
      setSearchParams((prev) =>
        prev.toString() === nextString ? prev : nextParams
      );
    };

    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener(TABLECRAFT_URL_STATE_EVENT, handleUrlChange);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener(TABLECRAFT_URL_STATE_EVENT, handleUrlChange);
    };
  }, [enabled]);

  const isUpdatingUrl = useRef(false);
  const lastSetValue = useRef<T>(defaultValue);

  const serialize =
    options.serialize ||
    ((value: T) =>
      typeof value === "object" ? JSON.stringify(value) : String(value));

  const deserialize =
    options.deserialize ||
    ((value: string) => {
      try {
        if (typeof defaultValue === "number") {
          const num = Number(value);
          if (Number.isNaN(num)) return defaultValue;
          return num as unknown as T;
        }
        if (typeof defaultValue === "boolean") {
          return (value === "true") as unknown as T;
        }
        if (typeof defaultValue === "object") {
          try {
            const parsed = JSON.parse(value) as T;
            if (parsed && typeof parsed === "object") return parsed;
            return defaultValue;
          } catch {
            return defaultValue;
          }
        }
        return value as unknown as T;
      } catch {
        return defaultValue;
      }
    });

  const getValueFromUrl = useCallback(() => {
    if (!enabled) return defaultValue;

    if (batchState.pendingUpdates.has(key)) {
      const pending = batchState.pendingUpdates.get(key);
      if (pending && typeof pending.value !== "undefined") {
        return pending.value as T;
      }
    }

    const paramValue = searchParams.get(key);
    if (paramValue === null) return defaultValue;

    if (key === "search" && typeof defaultValue === "string") {
      return decodeURIComponent(paramValue) as unknown as T;
    }

    return deserialize(paramValue);
  }, [enabled, searchParams, key, deserialize, defaultValue]);

  const [value, setValue] = useState<T>(getValueFromUrl);

  const prevSearchParamsRef = useRef<URLSearchParams | null>(null);

  const areEqual = useMemo(() => {
    return (a: T, b: T): boolean => {
      if (typeof a === "object" && typeof b === "object") {
        return isDeepEqual(a as object, b as object);
      }
      return a === b;
    };
  }, []);

  const currentValueRef = useRef<T>(value);
  useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  // Sync state from URL changes
  useEffect(() => {
    if (isUpdatingUrl.current) {
      isUpdatingUrl.current = false;
      return;
    }

    const searchParamsString = searchParams.toString();
    if (
      prevSearchParamsRef.current &&
      prevSearchParamsRef.current.toString() === searchParamsString
    ) {
      return;
    }

    prevSearchParamsRef.current = new URLSearchParams(searchParamsString);
    const newValue = getValueFromUrl();

    if (
      !areEqual(lastSetValue.current, newValue) &&
      !areEqual(currentValueRef.current, newValue)
    ) {
      lastSetValue.current = newValue;
      setValue(newValue);
    }
  }, [searchParams, getValueFromUrl, key, areEqual]);

  const updateUrlNow = useCallback(
    (params: URLSearchParams) => {
      if (!enabled) {
        isUpdatingUrl.current = false;
        return Promise.resolve(params);
      }
      replaceCurrentUrlSearchParams(params);
      isUpdatingUrl.current = false;
      return Promise.resolve(params);
    },
    [enabled]
  );

  const updateValue = useCallback(
    (newValue: T | ((prevValue: T) => T)) => {
      const resolvedValue =
        typeof newValue === "function"
          ? (newValue as (prev: T) => T)(value)
          : newValue;

      if (!enabled) {
        setValue(resolvedValue);
        return Promise.resolve(new URLSearchParams());
      }

      if (areEqual(value, resolvedValue)) {
        return Promise.resolve(new URLSearchParams(searchParams.toString()));
      }

      lastSetValue.current = resolvedValue;

      batchState.pendingUpdates.set(key, {
        value: resolvedValue,
        defaultValue,
        serialize: serialize as (value: unknown) => string,
        areEqual: areEqual as (a: unknown, b: unknown) => boolean,
      });

      setValue(resolvedValue);
      isUpdatingUrl.current = true;

      // Reset page to 1 when pageSize changes
      if (key === "pageSize") {
        const pageEntry: PendingUpdateEntry<number> =
          (batchState.pendingUpdates.get("page") as PendingUpdateEntry<number>) || {
            value: 1,
            defaultValue: 1,
            serialize: (v: number) => String(v),
            areEqual: (a: number, b: number) => a === b,
          };
        batchState.pendingUpdates.set("page", {
          ...pageEntry,
          value: 1,
        } as PendingUpdateEntry<unknown>);
      }

      if (batchState.isInBatchUpdate) {
        return Promise.resolve(new URLSearchParams(searchParams.toString()));
      }

      batchState.isInBatchUpdate = true;
      batchState.batchId++;
      const currentBatchId = batchState.batchId;

      if (batchTimeoutId) {
        clearTimeout(batchTimeoutId);
      }

      return new Promise<URLSearchParams>((resolve) => {
        const processBatch = () => {
          if (currentBatchId !== batchState.batchId) return;

          const currentParams = getCurrentSearchParams();
          const params = new URLSearchParams(currentParams.toString());
          let pageSizeChangedInBatch = false;
          let sortByInBatch = false;
          let sortOrderInBatch = false;
          const sortByInURL = params.has("sortBy");
          const defaultSortOrder = "desc";

          for (const [updateKey] of batchState.pendingUpdates.entries()) {
            if (updateKey === "sortBy") sortByInBatch = true;
            if (updateKey === "sortOrder") sortOrderInBatch = true;
          }

          for (const [updateKey, entry] of batchState.pendingUpdates.entries()) {
            const { value: updateValue, defaultValue: entryDefaultValue, serialize: entrySerialize, areEqual: entryAreEqual } = entry;

            if (updateKey === "sortBy") {
              params.set(updateKey, entrySerialize(updateValue));
              if (!sortOrderInBatch) {
                const currentSortOrder = params.get("sortOrder") || defaultSortOrder;
                params.set("sortOrder", currentSortOrder);
              }
            } else if (updateKey === "sortOrder") {
              if (sortByInURL || sortByInBatch) {
                params.set(updateKey, entrySerialize(updateValue));
              } else if (entryAreEqual(updateValue, entryDefaultValue)) {
                params.delete(updateKey);
              } else {
                params.set(updateKey, entrySerialize(updateValue));
              }
            } else if (entryAreEqual(updateValue, entryDefaultValue)) {
              params.delete(updateKey);
            } else {
              if (updateKey === "search" && typeof updateValue === "string") {
                params.set(updateKey, encodeURIComponent(updateValue));
              } else {
                params.set(updateKey, entrySerialize(updateValue));
              }
            }

            if (updateKey === "pageSize") pageSizeChangedInBatch = true;
          }

          if (pageSizeChangedInBatch) {
            params.set("page", "1");
          }

          batchState.pendingUpdates.clear();
          batchState.isInBatchUpdate = false;

          if (batchTimeoutId) {
            clearTimeout(batchTimeoutId);
            batchTimeoutId = null;
          }

          updateUrlNow(params).then(resolve);
        };

        queueMicrotask(processBatch);
        batchTimeoutId = setTimeout(processBatch, BATCH_TIMEOUT);
      });
    },
    [enabled, searchParams, key, serialize, value, defaultValue, updateUrlNow, areEqual]
  );

  return [value, updateValue] as const;
}

/**
 * Format a Date to a URL-safe YYYY-MM-DD string.
 */
export function formatDateForUrl(date: Date | undefined): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}