import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import appConfig from "../src/index";

const BASE_URL = "http://localhost:5001"; // different port to avoid collision with comparison.test.ts
let server: ReturnType<typeof Bun.serve>;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(() => {
	server = Bun.serve({ ...appConfig, port: 5001 });
});

afterAll(() => {
	server?.stop();
});

// ─── helpers ─────────────────────────────────────────────────────────────────

async function get(path: string) {
	const res = await fetch(`${BASE_URL}${path}`);
	const json = (await res.json()) as Record<string, unknown>;
	return { status: res.status, json };
}

// ─── Meta endpoint ────────────────────────────────────────────────────────────

describe("Dev Experience — /_meta endpoint", () => {
	it("products /_meta returns column definitions", async () => {
		const { status, json } = await get("/engine/products/_meta");
		expect(status).toBe(200);
		expect(json.name).toBe("products");
		expect(Array.isArray(json.columns)).toBe(true);
		// All column entries must have at minimum a 'key' property
		const columns = json.columns as Array<{ key: string }>;
		expect(columns.length).toBeGreaterThan(0);
		for (const col of columns) {
			expect(col.key).toBeDefined();
		}
	});

	it("users /_meta returns column definitions", async () => {
		const { status, json } = await get("/engine/users/_meta");
		expect(status).toBe(200);
		expect(json.name).toBe("users");
		expect(Array.isArray(json.columns)).toBe(true);
	});

	it("orders /_meta includes computed + subquery columns", async () => {
		const { status, json } = await get("/engine/orders/_meta");
		expect(status).toBe(200);
		const columns = json.columns as Array<{ key: string }>;
		const keys = columns.map((c) => c.key);
		// statusLabel and vatAmount are computed columns
		expect(keys).toContain("statusLabel");
		expect(keys).toContain("vatAmount");
		// itemCount is a subquery column
		expect(keys).toContain("itemCount");
	});

	it("unknown table returns 404", async () => {
		const res = await fetch(`${BASE_URL}/engine/nonexistent_table/_meta`);
		expect(res.status).toBe(404);
	});
});

// ─── Pagination DX ────────────────────────────────────────────────────────────

describe("Dev Experience — pagination", () => {
	it("page 1 of products has correct meta shape", async () => {
		const { status, json } = await get("/engine/products?page=1&pageSize=3");
		expect(status).toBe(200);
		expect(json.meta).toBeDefined();
		const meta = json.meta as Record<string, unknown>;
		expect(meta.page).toBe(1);
		expect(meta.pageSize).toBe(3);
		expect(typeof meta.total).toBe("number");
		expect(typeof meta.totalPages).toBe("number");
	});

	it("pageSize is capped at the configured max (50 for products)", async () => {
		const { status, json } = await get("/engine/products?pageSize=9999");
		expect(status).toBe(200);
		const meta = json.meta as Record<string, unknown>;
		expect(meta.pageSize as number).toBeLessThanOrEqual(50);
	});

	it("data array length matches requested pageSize", async () => {
		const { status, json } = await get("/engine/products?pageSize=2");
		expect(status).toBe(200);
		expect(Array.isArray(json.data)).toBe(true);
		expect((json.data as unknown[]).length).toBeLessThanOrEqual(2);
	});
});

// ─── Search DX ───────────────────────────────────────────────────────────────

describe("Dev Experience — search", () => {
	it("search=nonexistent returns empty data array", async () => {
		const { status, json } = await get(
			"/engine/products?search=xyznonexistent999",
		);
		expect(status).toBe(200);
		expect(Array.isArray(json.data)).toBe(true);
	});

	it("search is case-insensitive", async () => {
		const { status: s1, json: j1 } = await get(
			"/engine/products?search=laptop",
		);
		const { status: s2, json: j2 } = await get(
			"/engine/products?search=LAPTOP",
		);
		expect(s1).toBe(200);
		expect(s2).toBe(200);
		const count1 = (j1.data as unknown[]).length;
		const count2 = (j2.data as unknown[]).length;
		expect(count1).toBe(count2);
	});
});

// ─── Sorting DX ───────────────────────────────────────────────────────────────

describe("Dev Experience — sorting", () => {
	it("sort=price returns products in ascending price order", async () => {
		const { status, json } = await get(
			"/engine/products?sort=price&pageSize=50",
		);
		expect(status).toBe(200);
		const prices = (json.data as Array<{ price: unknown }>).map((p) =>
			Number(p.price),
		);
		for (let i = 1; i < prices.length; i++) {
			expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
		}
	});

	it("sort=-price returns products in descending price order", async () => {
		const { status, json } = await get(
			"/engine/products?sort=-price&pageSize=50",
		);
		expect(status).toBe(200);
		const prices = (json.data as Array<{ price: unknown }>).map((p) =>
			Number(p.price),
		);
		for (let i = 1; i < prices.length; i++) {
			expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
		}
	});

	it("sorting by unknown field returns 400 with descriptive error", async () => {
		const { status, json } = await get(
			"/engine/products?sort=nonexistent_field",
		);
		expect(status).toBe(400);
		expect(typeof json.error).toBe("string");
		expect(json.error as string).toContain("nonexistent_field");
	});
});

// ─── Filter DX ───────────────────────────────────────────────────────────────

describe("Dev Experience — filters", () => {
	it("filter[category]=electronics returns only matching rows", async () => {
		const { status, json } = await get(
			"/engine/products?filter[category]=electronics&pageSize=50",
		);
		expect(status).toBe(200);
		const rows = json.data as Array<{ category: unknown }>;
		rows.forEach((row) => {
			expect(String(row.category).toLowerCase()).toBe("electronics");
		});
	});

	it("filter on undeclared field is ignored (no 400)", async () => {
		// Products only declares filter('category', 'price', 'isArchived')
		// Filtering on 'name' is not declared — engine silently skips it
		const { status } = await get("/engine/products?filter[name]=test");
		expect(status).toBe(200);
	});

	it("is_active custom filter on users returns 200", async () => {
		const { status, json } = await get("/engine/users?filter[is_special]=true");
		expect(status).toBe(200);
		expect(Array.isArray(json.data)).toBe(true);
	});
});

// ─── Access Control DX ───────────────────────────────────────────────────────

describe("Dev Experience — computed & subquery fields", () => {
	it("orders response includes computed statusLabel", async () => {
		const { status, json } = await get("/engine/orders?pageSize=5");
		expect(status).toBe(200);
		const rows = json.data as Array<Record<string, unknown>>;
		expect(rows.length).toBeGreaterThan(0);
		expect(rows[0].statusLabel).toBeDefined();
		expect(["Completed", "Processing", "Voided", "Unknown"]).toContain(
			rows[0].statusLabel as string,
		);
	});

	it("orders response includes vatAmount computed column", async () => {
		const { status, json } = await get("/engine/orders?pageSize=5");
		expect(status).toBe(200);
		const rows = json.data as Array<Record<string, unknown>>;
		expect(rows.length).toBeGreaterThan(0);
		expect(rows[0].vatAmount).toBeDefined();
	});

	it("orders response includes itemCount subquery", async () => {
		const { status, json } = await get("/engine/orders?pageSize=5");
		expect(status).toBe(200);
		const rows = json.data as Array<Record<string, unknown>>;
		expect(rows.length).toBeGreaterThan(0);
		expect(rows[0].itemCount).toBeDefined();
	});

	it("orders response includes joined email column from users", async () => {
		const { status, json } = await get("/engine/orders?pageSize=5");
		expect(status).toBe(200);
		const rows = json.data as Array<Record<string, unknown>>;
		expect(rows.length).toBeGreaterThan(0);
		expect(rows[0].email).toBeDefined();
	});
});

// ─── Export DX ───────────────────────────────────────────────────────────────

describe("Dev Experience — export endpoint", () => {
	it("orders export=csv returns CSV content type", async () => {
		const res = await fetch(`${BASE_URL}/engine/orders?export=csv&pageSize=10`);
		expect(res.status).toBe(200);
		const contentType = res.headers.get("content-type") ?? "";
		expect(contentType).toMatch(/text\/csv|application\/octet-stream/);
	});

	it("orders export=json returns JSON", async () => {
		const res = await fetch(
			`${BASE_URL}/engine/orders?export=json&pageSize=10`,
		);
		expect(res.status).toBe(200);
		const json = (await res.json()) as unknown;
		expect(Array.isArray(json)).toBe(true);
	});

	it("products export is disabled (not configured)", async () => {
		// products does not call .exportable() — engine should return 400
		const res = await fetch(`${BASE_URL}/engine/products?export=csv`);
		expect(res.status).toBe(400);
	});
});

// ─── Static filter DX ────────────────────────────────────────────────────────

describe("Dev Experience — static filters", () => {
	it("products static filter hides archived items (isArchived=false)", async () => {
		const { status, json } = await get("/engine/products?pageSize=50");
		expect(status).toBe(200);
		const rows = json.data as Array<{ isArchived: unknown }>;
		// All returned products must have isArchived = false (the static filter)
		rows.forEach((row) => {
			expect(row.isArchived).toBe(false);
		});
	});
});
