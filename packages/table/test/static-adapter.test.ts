import { describe, expect, it } from "vitest";
import { createStaticAdapter } from "../src/auto/static-adapter";
import type { QueryParams } from "../src/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

const BASE_PARAMS: QueryParams = {
	page: 1,
	pageSize: 10,
	search: "",
	sort: "",
	sortOrder: "asc",
	filters: {},
	dateRange: { from: "", to: "" },
};

interface Item extends Record<string, unknown> {
	id: number;
	name: string;
	price: number;
	category: string;
	active: boolean;
	createdAt: string;
}

const ITEMS: Item[] = [
	{
		id: 1,
		name: "Apple",
		price: 1.5,
		category: "fruit",
		active: true,
		createdAt: "2024-01-01",
	},
	{
		id: 2,
		name: "Banana",
		price: 0.75,
		category: "fruit",
		active: true,
		createdAt: "2024-01-02",
	},
	{
		id: 3,
		name: "Carrot",
		price: 0.9,
		category: "vegetable",
		active: false,
		createdAt: "2024-01-03",
	},
	{
		id: 4,
		name: "Date",
		price: 3.0,
		category: "fruit",
		active: true,
		createdAt: "2024-01-04",
	},
	{
		id: 5,
		name: "Eggplant",
		price: 2.2,
		category: "vegetable",
		active: true,
		createdAt: "2024-01-05",
	},
];

// ─── tests ───────────────────────────────────────────────────────────────────

describe("createStaticAdapter — structure", () => {
	it("returns an object with query and queryByIds methods", () => {
		const adapter = createStaticAdapter(ITEMS);
		expect(adapter).toBeDefined();
		expect(adapter.query).toBeTypeOf("function");
		expect(adapter.queryByIds).toBeTypeOf("function");
	});
});

describe("createStaticAdapter — pagination", () => {
	it("returns first page with correct meta", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			page: 1,
			pageSize: 3,
		});

		expect(result.data).toHaveLength(3);
		expect(result.meta.total).toBe(5);
		expect(result.meta.page).toBe(1);
		expect(result.meta.totalPages).toBe(2);
	});

	it("returns last page with remaining items", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			page: 2,
			pageSize: 3,
		});

		expect(result.data).toHaveLength(2);
		expect(result.meta.page).toBe(2);
	});

	it("clamps page to last valid page when page > totalPages", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			page: 99,
			pageSize: 2,
		});

		expect(result.data).toHaveLength(1);
		expect(result.meta.page).toBe(3);
	});

	it("respects defaultPageSize option", async () => {
		const adapter = createStaticAdapter(ITEMS, { defaultPageSize: 2 });
		const result = await adapter.query({ ...BASE_PARAMS, pageSize: 10 }); // pageSize ignored

		expect(result.data).toHaveLength(2);
		expect(result.meta.pageSize).toBe(2);
	});

	it("returns empty data with correct meta for empty dataset", async () => {
		const adapter = createStaticAdapter<Item>([]);
		const result = await adapter.query({ ...BASE_PARAMS });

		expect(result.data).toHaveLength(0);
		expect(result.meta.total).toBe(0);
		expect(result.meta.totalPages).toBe(0);
	});
});

describe("createStaticAdapter — search", () => {
	it("filters by partial case-insensitive match across all fields", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({ ...BASE_PARAMS, search: "apple" });

		expect(result.data).toHaveLength(1);
		expect((result.data[0] as Item).name).toBe("Apple");
	});

	it("matches multiple rows", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({ ...BASE_PARAMS, search: "fruit" });

		expect(result.data).toHaveLength(3);
	});

	it("returns all rows when search is empty string", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({ ...BASE_PARAMS, search: "" });

		expect(result.data).toHaveLength(5);
	});

	it("returns no rows when no match", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({ ...BASE_PARAMS, search: "zzz" });

		expect(result.data).toHaveLength(0);
	});
});

describe("createStaticAdapter — sorting", () => {
	it("sorts ascending by string field", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			sort: "name",
			sortOrder: "asc",
		});

		const names = result.data.map((r) => (r as Item).name);
		expect(names).toEqual([...names].sort());
	});

	it("sorts descending by string field", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			sort: "name",
			sortOrder: "desc",
		});

		const names = result.data.map((r) => (r as Item).name);
		expect(names).toEqual([...names].sort().reverse());
	});

	it("sorts ascending by numeric field", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			sort: "price",
			sortOrder: "asc",
		});

		const prices = result.data.map((r) => (r as Item).price);
		for (let i = 1; i < prices.length; i++) {
			expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
		}
	});

	it("sorts descending by numeric field", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			sort: "price",
			sortOrder: "desc",
		});

		const prices = result.data.map((r) => (r as Item).price);
		for (let i = 1; i < prices.length; i++) {
			expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
		}
	});

	it("returns data unchanged when sort is empty string", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			sort: "",
			sortOrder: "asc",
		});

		expect(result.data).toHaveLength(5);
	});
});

describe("createStaticAdapter — filters", () => {
	it("filters by exact string match (default operator)", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			filters: { category: "fruit" },
		});

		expect(result.data).toHaveLength(3);
		for (const r of result.data) {
			expect((r as Item).category).toBe("fruit");
		}
	});

	it("filters by gt numeric operator", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			filters: { price: { operator: "gt", value: 1.0 } },
		});

		expect(result.data.length).toBeGreaterThan(0);
		for (const r of result.data) {
			expect((r as Item).price).toBeGreaterThan(1.0);
		}
	});

	it("filters by gte numeric operator", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			filters: { price: { operator: "gte", value: 1.5 } },
		});

		for (const r of result.data) {
			expect((r as Item).price).toBeGreaterThanOrEqual(1.5);
		}
	});

	it("filters by lt numeric operator", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			filters: { price: { operator: "lt", value: 1.0 } },
		});

		for (const r of result.data) {
			expect((r as Item).price).toBeLessThan(1.0);
		}
	});

	it("filters by lte numeric operator", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			filters: { price: { operator: "lte", value: 1.5 } },
		});

		for (const r of result.data) {
			expect((r as Item).price).toBeLessThanOrEqual(1.5);
		}
	});

	it("filters by contains string operator (case-insensitive)", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			filters: { name: { operator: "contains", value: "a" } },
		});

		for (const r of result.data) {
			expect((r as Item).name.toLowerCase()).toContain("a");
		}
	});

	it("filters by neq operator", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			filters: { active: { operator: "neq", value: false } },
		});

		for (const r of result.data) {
			expect((r as Item).active).toBe(true);
		}
	});

	it("skips null/undefined filter values", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			filters: { category: null as unknown as string },
		});

		expect(result.data).toHaveLength(5);
	});

	it("combines multiple filters (AND semantics)", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			filters: {
				category: "fruit",
				active: { operator: "neq", value: false },
			},
		});

		for (const r of result.data) {
			expect((r as Item).category).toBe("fruit");
			expect((r as Item).active).toBe(true);
		}
	});
});

describe("createStaticAdapter — date range", () => {
	it("filters rows within date range", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			dateRange: { from: "2024-01-02", to: "2024-01-03" },
		});

		expect(result.data.length).toBeGreaterThan(0);
		for (const r of result.data) {
			const d = new Date((r as Item).createdAt).getTime();
			expect(d).toBeGreaterThanOrEqual(new Date("2024-01-02").getTime());
			expect(d).toBeLessThanOrEqual(new Date("2024-01-03").getTime());
		}
	});

	it("returns all when dateRange is empty strings", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const result = await adapter.query({
			...BASE_PARAMS,
			dateRange: { from: "", to: "" },
		});

		expect(result.data).toHaveLength(5);
	});
});

describe("createStaticAdapter — queryByIds", () => {
	it("returns rows matching given ids", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const rows = await adapter.queryByIds!([1, 3]);

		expect(rows).toHaveLength(2);
		const ids = rows.map((r) => (r as Item).id);
		expect(ids).toContain(1);
		expect(ids).toContain(3);
	});

	it("returns empty array when no ids match", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const rows = await adapter.queryByIds!([999]);

		expect(rows).toHaveLength(0);
	});

	it("handles string ids coerced from numeric ids", async () => {
		const adapter = createStaticAdapter(ITEMS);
		const rows = await adapter.queryByIds!(["2", "4"]);

		expect(rows).toHaveLength(2);
	});
});
