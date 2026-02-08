import { 
  Table, 
  SQL, 
  asc, 
  desc, 
  getTableColumns
} from 'drizzle-orm';
import { TableConfig, SortConfig } from '../types/table';

export class PaginationBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds the ORDER BY clause.
   */
  buildSort(config: TableConfig, params: Record<string, any>): SQL[] {
    const sortParams = params.sort as string; // e.g. "-createdAt,name"
    const sorts: SQL[] = [];
    const table = this.schema[config.base] as Table;
    const columns = getTableColumns(table);

    // 1. URL Sort Params take precedence
    if (sortParams) {
      const fields = sortParams.split(',');
      for (const field of fields) {
        const isDesc = field.startsWith('-');
        const fieldName = isDesc ? field.substring(1) : field;
        
        // Find column config to check sortable flag
        const colConfig = config.columns.find(c => c.name === fieldName);
        if (!colConfig || colConfig.sortable === false) continue;

        const col = columns[fieldName];
        if (col) {
          sorts.push(isDesc ? desc(col) : asc(col));
        }
      }
    } 
    
    // 2. Default Sort if no URL sort provided
    else if (config.defaultSort) {
      for (const sortConfig of config.defaultSort) {
        const col = columns[sortConfig.field];
        if (col) {
          sorts.push(sortConfig.order === 'desc' ? desc(col) : asc(col));
        }
      }
    }

    return sorts;
  }

  /**
   * Builds limit and offset for pagination.
   */
  buildPagination(config: TableConfig, params: Record<string, any>): { limit: number, offset: number } {
    if (config.pagination?.enabled === false) {
       return { limit: -1, offset: 0 }; // Handle "no pagination" logic in engine
    }

    const defaultSize = config.pagination?.defaultPageSize ?? 10;
    const maxSize = config.pagination?.maxPageSize ?? 100;
    
    let page = Number(params.page);
    let pageSize = Number(params.pageSize);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(pageSize) || pageSize < 1) pageSize = defaultSize;
    if (pageSize > maxSize) pageSize = maxSize;

    return {
      limit: pageSize,
      offset: (page - 1) * pageSize
    };
  }
}
