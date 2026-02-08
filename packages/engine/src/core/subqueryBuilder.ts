import { TableConfig } from '../types/table';
import { SQL } from 'drizzle-orm';

export class SubqueryBuilder {
  constructor(_schema: Record<string, unknown>) {}
  buildSubqueries(_config: TableConfig): Record<string, SQL> | undefined {
    return undefined;
  }
}
