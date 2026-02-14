import { useState, useEffect, useCallback, useRef } from 'react';
import type { TableClient, QueryParams, QueryResult, TableMetadata } from './types';

/**
 * React hook for fetching table data.
 *
 * @example
 * ```tsx
 * const tc = createClient({ baseUrl: '/api/data' });
 * const users = tc.table('users');
 *
 * function UsersTable() {
 *   const { data, meta, loading, error, setParams } = useTableQuery(users, {
 *     page: 1,
 *     pageSize: 25,
 *     sort: ['-createdAt'],
 *   });
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <table>
 *       <tbody>
 *         {data.map(row => <tr key={row.id}><td>{row.name}</td></tr>)}
 *       </tbody>
 *     </table>
 *   );
 * }
 * ```
 */
export function useTableQuery<T = Record<string, unknown>>(
  client: TableClient<T>,
  initialParams?: QueryParams
) {
  const [params, setParams] = useState<QueryParams>(initialParams ?? {});
  const [result, setResult] = useState<QueryResult<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const data = await client.query(params);
      setResult(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [client, params]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  const setPage = useCallback((page: number) => {
    setParams((p: QueryParams) => ({ ...p, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setParams((p: QueryParams) => ({ ...p, pageSize, page: 1 }));
  }, []);

  const setSort = useCallback((sort: string | string[]) => {
    setParams((p: QueryParams) => ({ ...p, sort: Array.isArray(sort) ? sort : [sort], page: 1 }));
  }, []);

  const setFilter = useCallback((field: string, value: unknown) => {
    setParams((p: QueryParams) => ({
      ...p,
      filters: { ...p.filters, [field]: value },
      page: 1,
    }));
  }, []);

  const removeFilter = useCallback((field: string) => {
    setParams((p: QueryParams) => {
      const filters = { ...p.filters };
      if (filters) delete filters[field];
      return { ...p, filters, page: 1 };
    });
  }, []);

  const setSearch = useCallback((search: string) => {
    setParams((p: QueryParams) => ({ ...p, search: search || undefined, page: 1 }));
  }, []);

  const refresh = useCallback(() => fetchData(), [fetchData]);

  return {
    data: result?.data ?? [],
    meta: result?.meta ?? { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    aggregations: result?.aggregations,
    loading,
    error,
    params,
    setParams,
    setPage,
    setPageSize,
    setSort,
    setFilter,
    removeFilter,
    setSearch,
    refresh,
  };
}

/**
 * React hook for fetching table metadata.
 */
export function useTableMeta(client: TableClient) {
  const [metadata, setMetadata] = useState<TableMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    client.meta().then((meta) => {
      if (!cancelled) {
        setMetadata(meta);
        setLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(err);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [client]);

  return { metadata, loading, error };
}
