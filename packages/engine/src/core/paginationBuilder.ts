import { TableConfig } from '../types/table';
import { EngineMeta } from '../types/engine';

export interface PaginationResult {
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
}

export class PaginationBuilder {
  /**
   * Computes LIMIT and OFFSET from page/pageSize params.
   * Enforces min/max boundaries from the config.
   */
  buildPagination(
    config: TableConfig,
    page?: number,
    pageSize?: number
  ): PaginationResult {
    const pCfg = config.pagination;
    const enabled = pCfg?.enabled ?? true;

    if (!enabled) {
      return {
        limit: Number.MAX_SAFE_INTEGER,
        offset: 0,
        page: 1,
        pageSize: Number.MAX_SAFE_INTEGER,
      };
    }

    const defaultSize = pCfg?.defaultPageSize ?? 10;
    const maxSize = pCfg?.maxPageSize ?? 100;

    const resolvedPage = Math.max(1, Math.floor(page ?? 1));
    const resolvedSize = Math.min(maxSize, Math.max(1, Math.floor(pageSize ?? defaultSize)));

    return {
      limit: resolvedSize,
      offset: (resolvedPage - 1) * resolvedSize,
      page: resolvedPage,
      pageSize: resolvedSize,
    };
  }

  /**
   * Produces pagination metadata from the total row count.
   */
  buildMeta(total: number, pagination: PaginationResult): EngineMeta {
    return {
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: pagination.pageSize > 0
        ? Math.ceil(total / pagination.pageSize)
        : 0,
    };
  }
}
