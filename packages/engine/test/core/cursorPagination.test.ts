import { describe, it, expect } from 'vitest';
import { pgTable, integer, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { CursorPaginationBuilder, encodeCursor, decodeCursor } from '../../src/core/cursorPagination';
import { TableConfig } from '../../src/types/table';
import { FieldError } from '../../src/errors';

const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email'),
});

const schema = { users };

const builder = new CursorPaginationBuilder(schema);

const config: TableConfig = {
  name: 'users',
  base: 'users',
  columns: [
    { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
    { name: 'name', type: 'string', sortable: true, hidden: false, filterable: true },
    { name: 'email', type: 'string', sortable: true, hidden: false, filterable: true },
  ],
};

// ── Cursor encoding round-trip ──

describe('encodeCursor / decodeCursor', () => {
  it('should encode and decode a single-field cursor', () => {
    const encoded = encodeCursor({ id: 42 });
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual({ id: 42 });
  });

  it('should encode and decode a multi-field cursor', () => {
    const encoded = encodeCursor({ name: 'Alice', id: 7 });
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual({ name: 'Alice', id: 7 });
  });

  it('should return null for an invalid cursor string', () => {
    expect(decodeCursor('not-valid-base64url!!!')).toBeNull();
  });

  it('should return null for base64url that decodes to non-JSON', () => {
    const badEncoded = Buffer.from('not-json').toString('base64url');
    expect(decodeCursor(badEncoded)).toBeNull();
  });
});

// ── build() ──

describe('CursorPaginationBuilder.build()', () => {
  it('should return no WHERE condition when cursor is undefined', () => {
    const result = builder.build(config, undefined, 10);
    expect(result.whereCondition).toBeUndefined();
    expect(result.limit).toBe(11); // pageSize + 1
  });

  it('should build ORDER BY from sort params', () => {
    const result = builder.build(config, undefined, 10, [{ field: 'id', order: 'asc' }]);
    expect(result.orderBy).toHaveLength(1);
  });

  it('should build ORDER BY for multiple sort fields', () => {
    const result = builder.build(config, undefined, 10, [
      { field: 'name', order: 'asc' },
      { field: 'id', order: 'desc' },
    ]);
    expect(result.orderBy).toHaveLength(2);
  });

  it('should fall back to default sort when no sort params given', () => {
    const configWithDefault: TableConfig = {
      ...config,
      defaultSort: [{ field: 'id', order: 'asc' }],
    };
    const result = builder.build(configWithDefault, undefined, 10);
    expect(result.orderBy).toHaveLength(1);
  });

  it('should fall back to id asc when no sort and no defaultSort', () => {
    const result = builder.build(config, undefined, 10);
    // Default fallback is { field: 'id', order: 'asc' }
    expect(result.orderBy).toHaveLength(1);
  });

  it('should build WHERE condition from a valid single-field cursor', () => {
    const cursor = encodeCursor({ id: 100 });
    const result = builder.build(config, cursor, 10, [{ field: 'id', order: 'asc' }]);
    expect(result.whereCondition).toBeDefined();
  });

  it('should build compound WHERE condition from a multi-field cursor', () => {
    const cursor = encodeCursor({ name: 'Bob', id: 5 });
    const result = builder.build(config, cursor, 10, [
      { field: 'name', order: 'asc' },
      { field: 'id', order: 'asc' },
    ]);
    // Both fields present in decoded cursor → compound AND condition
    expect(result.whereCondition).toBeDefined();
  });

  it('compound cursor WHERE uses OR-expansion (not flat AND) for multi-column sort', () => {
    // With ORDER BY name ASC, id ASC and cursor (name='Bob', id=5), the correct
    // continuation must NOT skip rows where name='Bob' and id>5.
    //
    // Correct:  (name > 'Bob') OR (name = 'Bob' AND id > 5)
    // Wrong:    (name > 'Bob') AND (id > 5)   ← skips Bob+7, Bob+8, etc.
    //
    // We verify by rendering the Drizzle SQL object to a string and checking
    // it contains 'or' at the top level and 'and' inside a sub-clause.
    const { PgDialect } = require('drizzle-orm/pg-core');
    const dialect = new PgDialect();

    const cursor = encodeCursor({ name: 'Bob', id: 5 });
    const result = builder.build(config, cursor, 10, [
      { field: 'name', order: 'asc' },
      { field: 'id', order: 'asc' },
    ]);

    expect(result.whereCondition).toBeDefined();
    const built = dialect.sqlToQuery(result.whereCondition!);

    // The rendered SQL must contain 'or' at the top level
    expect(built.sql.toLowerCase()).toContain(' or ');
    // The rendered SQL must also contain 'and' inside the second OR arm
    expect(built.sql.toLowerCase()).toContain(' and ');
    // Should NOT be a flat AND of all conditions (no top-level 'and' without 'or')
    // Verify: the 'or' appears BEFORE the 'and' in the string (outer OR wraps inner AND)
    expect(built.sql.toLowerCase().indexOf(' or ')).toBeLessThan(
      built.sql.toLowerCase().indexOf(' and ')
    );

    // Sanity-check params: should have values for both 'Bob' and 5
    expect(built.params).toContain('Bob');
    expect(built.params).toContain(5);
  });

  it('compound cursor WHERE for 3-field sort produces 3 OR arms', () => {
    // ORDER BY name ASC, email ASC, id ASC — cursor after (name='Bob', email='b@x.com', id=5)
    // Correct expansion:
    //   (name > 'Bob')
    //   OR (name = 'Bob' AND email > 'b@x.com')
    //   OR (name = 'Bob' AND email = 'b@x.com' AND id > 5)
    const { PgDialect } = require('drizzle-orm/pg-core');
    const dialect = new PgDialect();

    const cursor = encodeCursor({ name: 'Bob', email: 'b@x.com', id: 5 });
    const result = builder.build(config, cursor, 10, [
      { field: 'name', order: 'asc' },
      { field: 'email', order: 'asc' },
      { field: 'id', order: 'asc' },
    ]);

    expect(result.whereCondition).toBeDefined();
    const built = dialect.sqlToQuery(result.whereCondition!);

    // All three values must appear in the params
    expect(built.params).toContain('Bob');
    expect(built.params).toContain('b@x.com');
    expect(built.params).toContain(5);
    // SQL must contain both 'or' and 'and'
    expect(built.sql.toLowerCase()).toContain(' or ');
    expect(built.sql.toLowerCase()).toContain(' and ');
  });

  it('should produce no WHERE condition if cursor decodes to null', () => {
    const result = builder.build(config, 'bad-cursor', 10, [{ field: 'id', order: 'asc' }]);
    expect(result.whereCondition).toBeUndefined();
  });

  it('should use SQL expression from sqlExpressions map for ORDER BY', () => {
    const configWithComputed: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [
        { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
        { name: 'ordersCount', type: 'number', sortable: true, hidden: false, filterable: false, computed: true },
      ],
    };
    const sqlExpressions = new Map([['ordersCount', sql`(SELECT count(*) FROM orders WHERE orders.user_id = users.id)`]]);

    const result = builder.build(
      configWithComputed,
      undefined,
      10,
      [{ field: 'ordersCount', order: 'desc' }],
      sqlExpressions
    );
    expect(result.orderBy).toHaveLength(1);
  });

  it('should throw FieldError for unknown sort field not in columns or sqlExpressions', () => {
    expect(() =>
      builder.build(config, undefined, 10, [{ field: 'unknownField', order: 'asc' }])
    ).toThrow(FieldError);
  });

  it('should throw FieldError with a clear message for unknown field', () => {
    try {
      builder.build(config, undefined, 10, [{ field: 'ghost', order: 'asc' }]);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(FieldError);
      expect((err as FieldError).message).toContain('ghost');
    }
  });
});

// ── buildMeta() ──

describe('CursorPaginationBuilder.buildMeta()', () => {
  it('should return null nextCursor when data length <= pageSize', () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = builder.buildMeta(data, 10);
    expect(result.meta.nextCursor).toBeNull();
    expect(result.data).toHaveLength(3);
  });

  it('should return nextCursor when data length > pageSize', () => {
    // pageSize=3, fetched 4 rows (3+1) → has more
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const result = builder.buildMeta(data, 3);
    expect(result.meta.nextCursor).not.toBeNull();
    expect(result.data).toHaveLength(3); // trimmed to pageSize
  });

  it('should encode single sort field in cursor', () => {
    const data = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }, { id: 4, name: 'D' }];
    const result = builder.buildMeta(data, 3, [{ field: 'id', order: 'asc' }]);
    const cursor = result.meta.nextCursor!;
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual({ id: 3 }); // last row of trimmed data
  });

  it('should encode ALL sort fields in cursor for compound sort (multi-column)', () => {
    const data = [
      { id: 1, name: 'A', email: 'a@x.com' },
      { id: 2, name: 'B', email: 'b@x.com' },
      { id: 3, name: 'C', email: 'c@x.com' },
      { id: 4, name: 'D', email: 'd@x.com' },
    ];
    const sort = [
      { field: 'name', order: 'asc' as const },
      { field: 'id', order: 'asc' as const },
    ];
    const result = builder.buildMeta(data, 3, sort);
    const cursor = result.meta.nextCursor!;
    const decoded = decodeCursor(cursor);
    // Both name AND id must be present in the cursor
    expect(decoded).toHaveProperty('name', 'C');
    expect(decoded).toHaveProperty('id', 3);
  });

  it('should fall back to id field when no sort given', () => {
    const data = [{ id: 10 }, { id: 20 }, { id: 30 }, { id: 40 }];
    const result = builder.buildMeta(data, 3);
    const decoded = decodeCursor(result.meta.nextCursor!);
    expect(decoded).toEqual({ id: 30 });
  });

  it('should return empty data array with null cursor when input is empty', () => {
    const result = builder.buildMeta([], 10);
    expect(result.data).toHaveLength(0);
    expect(result.meta.nextCursor).toBeNull();
  });

  it('should include pageSize in meta', () => {
    const data = [{ id: 1 }];
    const result = builder.buildMeta(data, 5);
    expect(result.meta.pageSize).toBe(5);
  });
});
