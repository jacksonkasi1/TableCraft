// ** import core packages
import { createTableEngine, defineTable } from '@tablecraft/engine';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// ** import database
import { eq } from 'drizzle-orm';
import { alias, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const users = pgTable('alias_test_users', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});
const surveys = pgTable('alias_test_surveys', {
  id: integer('id').primaryKey(),
  createdBy: integer('created_by').notNull(),
  updatedBy: integer('updated_by'),
});

const schema = { users, surveys };
const client = postgres(process.env.DATABASE_URL ?? '', { max: 1 });
const db = drizzle(client, { schema });

beforeAll(async () => {
  // The temporary tables are scoped to this client's single connection.
  await client.unsafe(`
    CREATE TEMP TABLE alias_test_users (id integer PRIMARY KEY, name text NOT NULL);
    CREATE TEMP TABLE alias_test_surveys (
      id integer PRIMARY KEY, created_by integer NOT NULL, updated_by integer
    );
    INSERT INTO alias_test_users VALUES (1, 'Alice'), (2, 'Bob');
    INSERT INTO alias_test_surveys VALUES (1, 1, 2), (2, 2, NULL);
  `);
});

afterAll(async () => {
  await client.end();
});

describe('joining the same table under different aliases', () => {
  it('loads both users and preserves surveys without an updater', async () => {
    const config = defineTable(surveys)
      .only('id')
      .join(users, { alias: 'created', on: 'alias_test_surveys.created_by = created.id' })
      .join(users, { alias: 'updated', on: 'alias_test_surveys.updated_by = updated.id' })
      .sort('id')
      .toConfig();
    config.search = { enabled: true, fields: ['updated.name'] };
    config.columns.push(
      { name: 'creatorName', type: 'string', field: 'created.name', filterable: true },
    );

    const updaterJoin = config.joins?.[1];
    if (!updaterJoin) throw new Error('Expected the updater join');
    updaterJoin.columns = [{ name: 'editorName', field: 'name', type: 'string' }];

    const engine = createTableEngine({ db, schema, config });
    const result = await engine.query();
    expect(result.data).toEqual([
      { id: 1, creatorName: 'Alice', editorName: 'Bob' },
      { id: 2, creatorName: 'Bob', editorName: null },
    ]);
    expect(result.meta.total).toBe(2);

    const filteredByCreator = await engine.query({
      filters: { creatorName: { operator: 'eq', value: 'Bob' } },
      select: ['id', 'creatorName'],
    });
    expect(filteredByCreator.data).toEqual([{ id: 2, creatorName: 'Bob' }]);
    expect(filteredByCreator.meta.total).toBe(1);

    const filteredByUpdater = await engine.query({
      filters: { editorName: { operator: 'eq', value: 'Bob' } },
      select: ['id', 'editorName'],
    });
    expect(filteredByUpdater.data).toEqual([{ id: 1, editorName: 'Bob' }]);
    expect(filteredByUpdater.meta.total).toBe(1);

    const searched = await engine.query({ search: 'bob', select: ['id', 'editorName'] });
    expect(searched.data).toEqual([{ id: 1, editorName: 'Bob' }]);

    const updaterSort = [{ field: 'editorName', order: 'desc' }] as const;
    const sortedByUpdater = await engine.query({ sort: [...updaterSort] });
    expect(sortedByUpdater.data.map(row => row.id)).toEqual([2, 1]);

    const sortedByCreator = await engine.query({ sort: [{ field: 'creatorName', order: 'desc' }] });
    expect(sortedByCreator.data.map(row => row.id)).toEqual([2, 1]);

    const { sql } = await engine.explain({ sort: [...updaterSort] });
    expect(sql).toContain('left join "alias_test_users" "created"');
    expect(sql).toContain('left join "alias_test_users" "updated"');
    expect(sql).toContain('order by "updated"."name" desc');
  });

  it('accepts shorthand and typed ON conditions with aliases', async () => {
    const updated = alias(users, 'updated');
    const config = defineTable(surveys)
      .only('id')
      .join(users, { alias: 'created', on: 'created_by', columns: ['name'] })
      .join(users, { alias: 'updated', type: 'inner', on: eq(surveys.updatedBy, updated.id) });
    const engine = createTableEngine({ db, schema, config });

    const result = await engine.query();
    expect(result.data).toEqual([{ id: 1, name: 'Alice' }]);
    expect(result.meta.total).toBe(1);
  });
});
