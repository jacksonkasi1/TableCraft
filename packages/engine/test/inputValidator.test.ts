import { describe, it, expect } from 'vitest';
import { validateInput } from '../src/core/inputValidator';
import { TableConfig } from '../src/types/table';
import { FieldError, ValidationError } from '../src/errors';

const config: TableConfig = {
  name: 'test',
  base: 'test',
  columns: [
    { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
    { name: 'name', type: 'string', hidden: false, sortable: true, filterable: true },
    { name: 'age', type: 'number', hidden: false, sortable: true, filterable: true },
    { name: 'active', type: 'boolean', hidden: false, sortable: false, filterable: true },
    { name: 'secret', type: 'string', hidden: true, sortable: false, filterable: false },
    { name: 'createdAt', type: 'date', hidden: false, sortable: true, filterable: true },
  ],
};

describe('validateInput', () => {
  it('should pass with valid params', () => {
    expect(() => validateInput({
      select: ['id', 'name'],
      filters: { name: { operator: 'eq', value: 'test' } },
      sort: [{ field: 'name', order: 'asc' }],
    }, config)).not.toThrow();
  });

  it('should throw FieldError for invalid select field', () => {
    expect(() => validateInput({
      select: ['nonexistent'],
    }, config)).toThrow(FieldError);
  });

  it('should throw FieldError for hidden select field', () => {
    expect(() => validateInput({
      select: ['secret'],
    }, config)).toThrow(FieldError);
  });

  it('should throw FieldError for non-filterable field', () => {
    expect(() => validateInput({
      filters: { secret: { operator: 'eq', value: 'x' } },
    }, config)).toThrow(FieldError);
  });

  it('should throw ValidationError for wrong type on number field', () => {
    expect(() => validateInput({
      filters: { age: { operator: 'eq', value: 'not-a-number' } },
    }, config)).toThrow(ValidationError);
  });

  it('should throw ValidationError for wrong type on boolean field', () => {
    expect(() => validateInput({
      filters: { active: { operator: 'eq', value: 'yes' } },
    }, config)).toThrow(ValidationError);
  });

  it('should throw ValidationError for wrong type on date field', () => {
    expect(() => validateInput({
      filters: { createdAt: { operator: 'gt', value: 'invalid-date' } },
    }, config)).toThrow(ValidationError);
  });

  it('should throw FieldError for non-sortable field', () => {
    expect(() => validateInput({
      sort: [{ field: 'active', order: 'asc' }],
    }, config)).toThrow(FieldError);
  });

  describe('sort validation with join columns', () => {
    const configWithJoin: TableConfig = {
      name: 'orders',
      base: 'orders',
      columns: [
        { name: 'id', type: 'number', hidden: false, sortable: true, filterable: true },
        { name: 'status', type: 'string', hidden: false, sortable: true, filterable: true },
      ],
      joins: [{
        table: 'users',
        type: 'left',
        on: 'orders.user_id = users.id',
        columns: [
          { name: 'email', type: 'string', hidden: false, sortable: true, filterable: true },
          { name: 'role', type: 'string', hidden: false, sortable: false, filterable: true },
        ],
      }],
    };

    it('should allow sorting by a join column marked sortable', () => {
      expect(() => validateInput({
        sort: [{ field: 'email', order: 'asc' }],
      }, configWithJoin)).not.toThrow();
    });

    it('should reject sorting by a join column not marked sortable', () => {
      expect(() => validateInput({
        sort: [{ field: 'role', order: 'asc' }],
      }, configWithJoin)).toThrow(FieldError);
    });

    it('should allow sorting by a mix of base and join columns', () => {
      expect(() => validateInput({
        sort: [
          { field: 'status', order: 'asc' },
          { field: 'email', order: 'desc' },
        ],
      }, configWithJoin)).not.toThrow();
    });

    it('should allow sorting by nested join columns', () => {
      const configNested: TableConfig = {
        ...configWithJoin,
        joins: [{
          table: 'users',
          type: 'left',
          on: 'orders.user_id = users.id',
          columns: [],
          joins: [{
            table: 'profiles',
            type: 'left',
            on: 'users.id = profiles.user_id',
            columns: [
              { name: 'avatar', type: 'string', hidden: false, sortable: true, filterable: false },
            ],
          }],
        }],
      };
      expect(() => validateInput({
        sort: [{ field: 'avatar', order: 'asc' }],
      }, configNested)).not.toThrow();
    });
  });

  describe('sort validation with subquery columns', () => {
    const configWithSubquery: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [
        { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
        { name: 'name', type: 'string', hidden: false, sortable: true, filterable: true },
        // Subquery column registered by define.ts subquery() method
        { name: 'ordersCount', type: 'number', hidden: false, sortable: true, filterable: false, computed: true },
      ],
      subqueries: [
        { alias: 'ordersCount', table: 'orders', type: 'count', filter: 'orders.user_id = users.id' },
      ],
    };

    it('should allow sorting by a subquery column registered in config.columns', () => {
      expect(() => validateInput({
        sort: [{ field: 'ordersCount', order: 'asc' }],
      }, configWithSubquery)).not.toThrow();
    });

    it('should allow sorting by a mix of base and subquery columns', () => {
      expect(() => validateInput({
        sort: [
          { field: 'name', order: 'asc' },
          { field: 'ordersCount', order: 'desc' },
        ],
      }, configWithSubquery)).not.toThrow();
    });
  });

  describe("sort validation with 'first' mode subquery columns", () => {
    // define.ts .subquery() sets sortable: false for 'first' type
    // because row_to_json() is non-scalar and cannot be used in ORDER BY.
    const configWithFirstSubquery: TableConfig = {
      name: 'orders',
      base: 'orders',
      columns: [
        { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
        // 'first' subquery — sortable: false set by define.ts
        { name: 'firstItem', type: 'json', hidden: false, sortable: false, filterable: false, computed: true },
        // 'count' and 'exists' subqueries — sortable: true (scalar)
        { name: 'itemCount', type: 'number', hidden: false, sortable: true, filterable: false, computed: true },
        { name: 'hasItems', type: 'boolean', hidden: false, sortable: true, filterable: false, computed: true },
      ],
      subqueries: [
        { alias: 'firstItem', table: 'orderItems', type: 'first', filter: 'orderItems.orderId = orders.id' },
        { alias: 'itemCount', table: 'orderItems', type: 'count', filter: 'orderItems.orderId = orders.id' },
        { alias: 'hasItems', table: 'orderItems', type: 'exists', filter: 'orderItems.orderId = orders.id' },
      ],
    };

    it("should reject sorting by a 'first' mode subquery column (sortable: false)", () => {
      expect(() => validateInput({
        sort: [{ field: 'firstItem', order: 'asc' }],
      }, configWithFirstSubquery)).toThrow(FieldError);
    });

    it("should allow sorting by a 'count' subquery column (scalar)", () => {
      expect(() => validateInput({
        sort: [{ field: 'itemCount', order: 'asc' }],
      }, configWithFirstSubquery)).not.toThrow();
    });

    it("should allow sorting by an 'exists' subquery column (scalar)", () => {
      expect(() => validateInput({
        sort: [{ field: 'hasItems', order: 'asc' }],
      }, configWithFirstSubquery)).not.toThrow();
    });

    it("should reject mixing 'first' mode with other sort fields — entire sort is rejected", () => {
      // The 'first' mode field causes a FieldError even if mixed with valid fields
      expect(() => validateInput({
        sort: [
          { field: 'id', order: 'asc' },
          { field: 'firstItem', order: 'asc' },
        ],
      }, configWithFirstSubquery)).toThrow(FieldError);
    });

    it("should reject sort by subquery alias that exists in subqueries but not in columns", () => {
      // Edge case: developer defines subquery but forgets to add column entry
      const configWithMissingColumn: TableConfig = {
        name: 'orders',
        base: 'orders',
        columns: [
          { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
          // NOTE: 'orphanSubquery' is NOT in columns — only in subqueries
        ],
        subqueries: [
          { alias: 'orphanSubquery', table: 'orderItems', type: 'count', filter: 'orderItems.orderId = orders.id' },
        ],
      };

      // validateInput only checks config.columns, so orphanSubquery is unknown
      expect(() => validateInput({
        sort: [{ field: 'orphanSubquery', order: 'asc' }],
      }, configWithMissingColumn)).toThrow(FieldError);
    });
  });

  // ─────────────────────────────────────────────────────
  // NEW: select validation with join columns
  // ─────────────────────────────────────────────────────
  describe('select validation with join columns', () => {
    const configWithJoin: TableConfig = {
      name: 'orders',
      base: 'orders',
      columns: [
        { name: 'id', type: 'number', hidden: false, sortable: true, filterable: true },
        { name: 'status', type: 'string', hidden: false, sortable: true, filterable: true },
      ],
      joins: [{
        table: 'users',
        type: 'left',
        on: 'orders.user_id = users.id',
        columns: [
          { name: 'email', type: 'string', hidden: false, sortable: true, filterable: true },
          { name: 'role', type: 'string', hidden: false, sortable: false, filterable: true },
          { name: 'internalNote', type: 'string', hidden: true, sortable: false, filterable: false },
        ],
      }],
    };

    it('should allow ?select= with only base columns', () => {
      expect(() => validateInput({ select: ['id', 'status'] }, configWithJoin)).not.toThrow();
    });

    it('should allow ?select= with a valid join column', () => {
      expect(() => validateInput({ select: ['id', 'email'] }, configWithJoin)).not.toThrow();
    });

    it('should allow ?select= mixing base and join columns', () => {
      expect(() => validateInput({ select: ['status', 'email', 'role'] }, configWithJoin)).not.toThrow();
    });

    it('should reject ?select= with a hidden join column', () => {
      expect(() => validateInput({ select: ['internalNote'] }, configWithJoin)).toThrow(FieldError);
    });

    it('should reject ?select= with a completely unknown field', () => {
      expect(() => validateInput({ select: ['nonexistent'] }, configWithJoin)).toThrow(FieldError);
    });

    it('should allow ?select= with a join column from a nested join', () => {
      const configNested: TableConfig = {
        ...configWithJoin,
        joins: [{
          table: 'users',
          type: 'left',
          on: 'orders.user_id = users.id',
          columns: [],
          joins: [{
            table: 'profiles',
            type: 'left',
            on: 'users.id = profiles.user_id',
            columns: [
              { name: 'avatarUrl', type: 'string', hidden: false, sortable: false, filterable: false },
            ],
          }],
        }],
      };
      expect(() => validateInput({ select: ['id', 'avatarUrl'] }, configNested)).not.toThrow();
    });
  });
});
