import type { DataAdapter, QueryParams, QueryResult } from "../types";

export interface StaticAdapterOptions {
  /** Page size override (default: uses params.pageSize) */
  defaultPageSize?: number;
}

/**
 * Creates a DataAdapter for static/in-memory data.
 * Handles client-side pagination, sorting, filtering, and search.
 * Great for small datasets and prototyping.
 *
 * @example
 * ```ts
 * const adapter = createStaticAdapter([
 *   { id: 1, name: 'Alice', email: 'alice@example.com' },
 *   { id: 2, name: 'Bob', email: 'bob@example.com' },
 * ]);
 * <DataTable adapter={adapter} columns={columns} />
 * ```
 */
export function createStaticAdapter<T extends Record<string, unknown>>(
  data: T[],
  options?: StaticAdapterOptions
): DataAdapter<T> {
  return {
    async query(params: QueryParams): Promise<QueryResult<T>> {
      let filtered = [...data];

      // Search
      if (params.search) {
        const searchLower = params.search.toLowerCase();
        filtered = filtered.filter((row) =>
          Object.values(row).some(
            (val) =>
              val !== null &&
              val !== undefined &&
              String(val).toLowerCase().includes(searchLower)
          )
        );
      }

      // Filters
      if (params.filters && Object.keys(params.filters).length > 0) {
        for (const [field, filterValue] of Object.entries(params.filters)) {
          if (filterValue === null || filterValue === undefined) continue;
          filtered = filtered.filter((row) => {
            const rowVal = row[field];
            if (typeof filterValue === "object" && !Array.isArray(filterValue)) {
              const filter = filterValue as { operator?: string; value?: unknown };
              const val = filter.value;
              switch (filter.operator) {
                case "gt": return Number(rowVal) > Number(val);
                case "gte": return Number(rowVal) >= Number(val);
                case "lt": return Number(rowVal) < Number(val);
                case "lte": return Number(rowVal) <= Number(val);
                case "contains": return String(rowVal).toLowerCase().includes(String(val).toLowerCase());
                case "neq": return rowVal !== val;
                default: return rowVal === val;
              }
            }
            return String(rowVal) === String(filterValue);
          });
        }
      }

      // Date range filter (searches all date-like fields)
      if (params.dateRange?.from || params.dateRange?.to) {
        const from = params.dateRange.from ? new Date(params.dateRange.from).getTime() : -Infinity;
        const to = params.dateRange.to ? new Date(params.dateRange.to).getTime() : Infinity;

        filtered = filtered.filter((row) => {
          // Check common date fields
          for (const key of Object.keys(row)) {
            const val = row[key];
            if (typeof val === "string" || val instanceof Date) {
              const d = new Date(val as string).getTime();
              if (!Number.isNaN(d) && d >= from && d <= to) return true;
            }
          }
          return false;
        });
      }

      // Sort
      if (params.sort) {
        const sortField = params.sort;
        const desc = params.sortOrder === "desc";
        filtered.sort((a, b) => {
          const aVal = a[sortField];
          const bVal = b[sortField];
          if (aVal === bVal) return 0;
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;

          let cmp = 0;
          if (typeof aVal === "string" && typeof bVal === "string") {
            cmp = aVal.localeCompare(bVal);
          } else {
            cmp = aVal > bVal ? 1 : -1;
          }
          return desc ? -cmp : cmp;
        });
      }

      // Pagination
      const total = filtered.length;
      const pageSize = options?.defaultPageSize ?? params.pageSize;
      const totalPages = Math.ceil(total / pageSize);
      const page = Math.min(params.page, totalPages || 1);
      const start = (page - 1) * pageSize;
      const pageData = filtered.slice(start, start + pageSize);

      return {
        data: pageData,
        meta: {
          total,
          page,
          pageSize,
          totalPages,
        },
      };
    },

    async queryByIds(ids: (string | number)[]): Promise<T[]> {
      const idStrings = new Set(ids.map(String));
      return data.filter((row) => {
        const id = row.id ?? row.ID ?? row._id;
        return id !== undefined && idStrings.has(String(id));
      });
    },
  };
}