import { TableConfig } from '../types/table';

/**
 * Converts an array of data rows to a CSV string.
 * Uses visible columns from config for header ordering and labels.
 */
export function toCSV(
  data: Record<string, unknown>[],
  config: TableConfig
): string {
  if (data.length === 0) return '';

  const visible = config.columns.filter((c) => !c.hidden);
  const headers = visible.map((c) => escapeCSVField(c.label ?? c.name));
  const fields = visible.map((c) => c.name);

  const rows = data.map((row) =>
    fields.map((f) => escapeCSVField(String(row[f] ?? ''))).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Converts an array of data rows to a pretty-printed JSON string.
 */
export function toJSON(
  data: Record<string, unknown>[],
  _config: TableConfig
): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Selects the right exporter by format key.
 */
export function exportData(
  data: Record<string, unknown>[],
  format: 'csv' | 'json',
  config: TableConfig
): string {
  switch (format) {
    case 'csv':
      return toCSV(data, config);
    case 'json':
      return toJSON(data, config);
    default:
      return toJSON(data, config);
  }
}

function escapeCSVField(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
