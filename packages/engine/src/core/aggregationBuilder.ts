import { TableConfig } from '../types/table';
import { SQL } from 'drizzle-orm';

export class AggregationBuilder {
  constructor(_schema: Record<string, unknown>) {}
  buildAggregations(_config: TableConfig): Record<string, SQL> | undefined {
    return undefined;
  }
}
