import { TableConfig } from '../types/table';
import { SQL } from 'drizzle-orm';

export class SoftDeleteHandler {
  constructor(_schema: Record<string, unknown>) {}
  buildSoftDeleteCondition(_config: TableConfig, _includeDeleted: boolean = false): SQL | undefined {
    return undefined;
  }
}
