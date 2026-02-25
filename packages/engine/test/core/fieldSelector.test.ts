import { describe, it, expect } from 'vitest';
import { FieldSelector } from '../../src/core/fieldSelector';
import { TableConfig } from '../../src/types/table';
import type { Column, SQL } from 'drizzle-orm';

// ── Minimal column stubs ──
// FieldSelector only checks presence in `selection` object keys —
// the actual Drizzle Column value doesn't matter for this unit test.
function makeCol(name: string): SQL {
    return { name } as unknown as SQL;
}

const selector = new FieldSelector();

// ── Base-only config ──
const baseConfig: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [
        { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
        { name: 'name', type: 'string', hidden: false, sortable: true, filterable: true },
        { name: 'secret', type: 'string', hidden: true, sortable: false, filterable: false },
    ],
};

// ── Config with a join ──
const joinConfig: TableConfig = {
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

// ── Full selection objects (simulates what queryBuilder.buildSelect returns) ──
const baseSelection = {
    id: makeCol('id'),
    name: makeCol('name'),
    secret: makeCol('secret'),
};

const joinSelection = {
    id: makeCol('id'),
    status: makeCol('status'),
    email: makeCol('email'),
    role: makeCol('role'),
    internalNote: makeCol('internalNote'),
};

// ═══════════════════════════════════════════════════════════
// applyFieldSelection — base table only
// ═══════════════════════════════════════════════════════════
describe('FieldSelector.applyFieldSelection — base columns', () => {
    it('returns full selection when no fields requested', () => {
        const result = selector.applyFieldSelection(baseSelection, undefined, baseConfig);
        expect(Object.keys(result)).toEqual(['id', 'name', 'secret']);
    });

    it('narrows selection to requested base columns', () => {
        const result = selector.applyFieldSelection(baseSelection, ['name'], baseConfig);
        expect(Object.keys(result)).toContain('name');
        // id is always kept (PK safeguard)
        expect(Object.keys(result)).toContain('id');
        expect(Object.keys(result)).not.toContain('secret');
    });

    it('excludes hidden base columns even when explicitly requested', () => {
        const result = selector.applyFieldSelection(baseSelection, ['secret'], baseConfig);
        // 'secret' is hidden — it should be excluded; falls back to full selection
        expect(Object.keys(result)).not.toContain('secret');
    });
});

// ═══════════════════════════════════════════════════════════
// applyFieldSelection — join columns (the previously-broken path)
// ═══════════════════════════════════════════════════════════
describe('FieldSelector.applyFieldSelection — join columns (bug fix)', () => {
    it('includes a valid join column in the narrowed selection', () => {
        const result = selector.applyFieldSelection(joinSelection, ['id', 'email'], joinConfig);
        expect(Object.keys(result)).toContain('email');
        expect(Object.keys(result)).toContain('id');
        expect(Object.keys(result)).not.toContain('status');
        expect(Object.keys(result)).not.toContain('role');
    });

    it('includes base and join columns together', () => {
        const result = selector.applyFieldSelection(joinSelection, ['status', 'email', 'role'], joinConfig);
        expect(Object.keys(result)).toContain('status');
        expect(Object.keys(result)).toContain('email');
        expect(Object.keys(result)).toContain('role');
        expect(Object.keys(result)).not.toContain('internalNote');
    });

    it('excludes a hidden join column even if requested', () => {
        const result = selector.applyFieldSelection(joinSelection, ['internalNote'], joinConfig);
        // Hidden — should be excluded; falls back to full selection
        expect(Object.keys(result)).not.toContain('internalNote');
    });

    it('includes join columns from a nested join', () => {
        const nestedConfig: TableConfig = {
            name: 'orders',
            base: 'orders',
            columns: [
                { name: 'id', type: 'number', hidden: false, sortable: true, filterable: true },
            ],
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

        const selection = {
            id: makeCol('id'),
            avatarUrl: makeCol('avatarUrl'),
        };

        const result = selector.applyFieldSelection(selection, ['id', 'avatarUrl'], nestedConfig);
        expect(Object.keys(result)).toContain('avatarUrl');
    });
});

// ═══════════════════════════════════════════════════════════
// filterResponseFields — post-fetch field filtering (unchanged by this fix)
// ═══════════════════════════════════════════════════════════
describe('FieldSelector.filterResponseFields', () => {
    const rows = [
        { id: 1, name: 'Alice', email: 'alice@example.com', secret: 'x' },
        { id: 2, name: 'Bob', email: 'bob@example.com', secret: 'y' },
    ];

    it('returns all rows unchanged when no fields requested', () => {
        const result = selector.filterResponseFields(rows, undefined);
        expect(result).toEqual(rows);
    });

    it('strips fields not in requested set', () => {
        const result = selector.filterResponseFields(rows, ['id', 'email']);
        expect(result[0]).toEqual({ id: 1, email: 'alice@example.com' });
        expect(result[1]).toEqual({ id: 2, email: 'bob@example.com' });
    });

    it('silently ignores requested fields not present in row', () => {
        const result = selector.filterResponseFields(rows, ['id', 'nonexistent']);
        expect(result[0]).toEqual({ id: 1 });
    });
});
