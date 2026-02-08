import { TableConfig } from '../types/table';

export function exportData(data: any[], _format: 'csv' | 'json', _config: TableConfig): string {
  return JSON.stringify(data);
}
