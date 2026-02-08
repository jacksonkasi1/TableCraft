import { describe, it, expect } from 'vitest';
import { toCSV, toJSON, exportData } from '../../src/utils/export';
import { TableConfig } from '../../src/types/table';

const config: TableConfig = {
  name: 'orders',
  base: 'orders',
  columns: [
    { name: 'id', type: 'uuid', label: 'ID', hidden: false, sortable: true, filterable: true },
    { name: 'total', type: 'number', label: 'Total Amount', hidden: false, sortable: true, filterable: true },
    { name: 'status', type: 'string', hidden: false, sortable: true, filterable: true },
    { name: 'secret', type: 'string', hidden: true, sortable: false, filterable: false },
  ],
};

const data = [
  { id: '1', total: 100, status: 'active', secret: 'x' },
  { id: '2', total: 200, status: 'pending', secret: 'y' },
];

describe('toCSV', () => {
  it('should generate CSV with headers from visible columns', () => {
    const csv = toCSV(data, config);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('ID,Total Amount,status');
    expect(lines[1]).toBe('1,100,active');
    expect(lines[2]).toBe('2,200,pending');
    // hidden column should not appear
    expect(csv).not.toContain('secret');
  });

  it('should escape fields with commas', () => {
    const d = [{ id: '1', total: 100, status: 'active, pending', secret: '' }];
    const csv = toCSV(d, config);
    expect(csv).toContain('"active, pending"');
  });

  it('should return empty string for empty data', () => {
    expect(toCSV([], config)).toBe('');
  });
});

describe('toJSON', () => {
  it('should return pretty-printed JSON', () => {
    const json = toJSON(data, config);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('1');
  });
});

describe('exportData', () => {
  it('should select csv exporter', () => {
    const result = exportData(data, 'csv', config);
    expect(result).toContain('ID,Total Amount');
  });

  it('should select json exporter', () => {
    const result = exportData(data, 'json', config);
    expect(JSON.parse(result)).toHaveLength(2);
  });
});
