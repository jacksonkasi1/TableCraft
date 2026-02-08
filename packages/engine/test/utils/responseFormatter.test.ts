import { describe, it, expect } from 'vitest';
import {
  applyJsTransforms,
  formatResponse,
  registerTransform,
} from '../../src/utils/responseFormatter';
import { TableConfig } from '../../src/types/table';

const baseConfig: TableConfig = {
  name: 'test',
  base: 'test',
  columns: [
    { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
    { name: 'name', type: 'string', hidden: false, sortable: true, filterable: true, jsTransform: ['uppercase'] },
    { name: 'email', type: 'string', hidden: false, sortable: true, filterable: true, jsTransform: ['lowercase', 'trim'] },
    { name: 'secret', type: 'string', hidden: true, sortable: false, filterable: false },
    { name: 'code', type: 'string', hidden: false, sortable: true, filterable: true, jsTransform: ['slice(0,3)'] },
    { name: 'createdAt', type: 'date', hidden: false, sortable: true, filterable: true, jsTransform: ['formatDate'] },
  ],
};

describe('applyJsTransforms', () => {
  it('should apply uppercase transform', () => {
    const data = [{ id: '1', name: 'alice', email: 'test@test.com', code: 'ABCDEF', createdAt: '2024-01-01' }];
    const result = applyJsTransforms(data, baseConfig);
    expect(result[0].name).toBe('ALICE');
  });

  it('should chain lowercase + trim', () => {
    const data = [{ id: '1', name: 'Bob', email: '  TEST@TEST.COM  ', code: 'XYZ', createdAt: '2024-01-01' }];
    const result = applyJsTransforms(data, baseConfig);
    expect(result[0].email).toBe('test@test.com');
  });

  it('should apply slice(0,3)', () => {
    const data = [{ id: '1', name: 'x', email: 'x', code: 'ABCDEF', createdAt: '2024-01-01' }];
    const result = applyJsTransforms(data, baseConfig);
    expect(result[0].code).toBe('ABC');
  });

  it('should apply formatDate', () => {
    const d = new Date('2024-06-15T12:00:00Z');
    const data = [{ id: '1', name: 'x', email: 'x', code: 'x', createdAt: d }];
    const result = applyJsTransforms(data, baseConfig);
    expect(result[0].createdAt).toBe('2024-06-15T12:00:00.000Z');
  });

  it('should not mutate original data', () => {
    const original = [{ id: '1', name: 'alice', email: 'x', code: 'x', createdAt: 'x' }];
    const result = applyJsTransforms(original, baseConfig);
    expect(original[0].name).toBe('alice');
    expect(result[0].name).toBe('ALICE');
  });
});

describe('registerTransform', () => {
  it('should allow custom transforms', () => {
    registerTransform('reverse', (v) =>
      typeof v === 'string' ? v.split('').reverse().join('') : v
    );

    const cfg: TableConfig = {
      name: 'test',
      base: 'test',
      columns: [
        { name: 'val', type: 'string', hidden: false, sortable: true, filterable: true, jsTransform: ['reverse'] },
      ],
    };

    const data = [{ val: 'hello' }];
    const result = applyJsTransforms(data, cfg);
    expect(result[0].val).toBe('olleh');
  });
});

describe('formatResponse', () => {
  it('should strip hidden columns and apply transforms', () => {
    const data = [
      { id: '1', name: 'alice', email: '  BOB@X.COM  ', secret: 'hide_me', code: 'ABCDEF', createdAt: '2024-01-01' },
    ];
    const meta = { total: 1, page: 1, pageSize: 10, totalPages: 1 };

    const result = formatResponse(data, meta, baseConfig);

    expect(result.data[0].secret).toBeUndefined();
    expect(result.data[0].name).toBe('ALICE');
    expect(result.data[0].email).toBe('bob@x.com');
    expect(result.meta.total).toBe(1);
  });

  it('should include aggregations when provided', () => {
    const data: Record<string, unknown>[] = [];
    const meta = { total: 0, page: 1, pageSize: 10, totalPages: 0 };
    const aggs = { totalRevenue: 5000 };

    const result = formatResponse(data, meta, baseConfig, aggs);
    expect(result.aggregations).toEqual({ totalRevenue: 5000 });
  });
});
