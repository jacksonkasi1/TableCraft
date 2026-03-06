// @vitest-environment jsdom

/**
 * Tests for export-utils.ts
 *
 * The CSV conversion logic is pure/synchronous and fully testable.
 * The DOM download path is verified via mocking document.createElement.
 * exportToExcel is not tested here since it requires the optional exceljs peer dep.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportData, exportToCSV } from "../src/utils/export-utils";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Capture the CSV blob that would have been downloaded. */
function captureDownload() {
	const blobs: Blob[] = [];
	const filenames: string[] = [];

	const origCreate = document.createElement.bind(document);
	const createSpy = vi
		.spyOn(document, "createElement")
		.mockImplementation((tag: string) => {
			if (tag === "a") {
				const a = origCreate("a");
				// Override click to prevent actual navigation
				a.click = vi.fn();
				return a;
			}
			return origCreate(tag);
		});

	const origCreateObjectURL = URL.createObjectURL;
	URL.createObjectURL = (blob: Blob) => {
		blobs.push(blob);
		return "blob:mock-url";
	};

	const origRevokeObjectURL = URL.revokeObjectURL;
	URL.revokeObjectURL = vi.fn();

	const origAppendChild = document.body.appendChild.bind(document.body);
	document.body.appendChild = (node: Node) => {
		if (node instanceof HTMLAnchorElement) {
			filenames.push(node.getAttribute("download") ?? "");
		}
		return origAppendChild(node);
	};

	const origRemoveChild = document.body.removeChild.bind(document.body);
	document.body.removeChild = (node: Node) => {
		try {
			return origRemoveChild(node);
		} catch {
			return node;
		}
	};

	return {
		blobs,
		filenames,
		restore() {
			createSpy.mockRestore();
			URL.createObjectURL = origCreateObjectURL;
			URL.revokeObjectURL = origRevokeObjectURL;
			document.body.appendChild = origAppendChild;
			document.body.removeChild = origRemoveChild;
		},
	};
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("exportToCSV — basic", () => {
	let restore: () => void;

	beforeEach(() => {
		const cap = captureDownload();
		restore = cap.restore;
	});

	afterEach(() => restore());

	it("returns true and initiates download for valid data", () => {
		const data = [
			{ id: 1, name: "Alice" },
			{ id: 2, name: "Bob" },
		];
		const ok = exportToCSV(data, "test-export");
		expect(ok).toBe(true);
	});

	it("returns false for empty data", () => {
		const ok = exportToCSV([], "empty");
		expect(ok).toBe(false);
	});

	it("uses default headers from first row keys", () => {
		const cap = captureDownload();
		const data = [{ id: 1, name: "Alice" }];
		exportToCSV(data, "auto-headers");

		// Read the blob text to verify CSV content
		const blob = cap.blobs[0];
		expect(blob).toBeDefined();

		cap.restore();
	});

	it("respects explicit headers — only those columns appear", async () => {
		const cap2 = captureDownload();
		const data = [{ id: 1, name: "Alice", secret: "x" }];
		exportToCSV(data, "partial", ["id", "name"]);

		const blob = cap2.blobs[0];
		expect(blob).toBeDefined();
		const text = await blob.text();
		expect(text).toContain("id");
		expect(text).toContain("name");
		expect(text).not.toContain("secret");
		cap2.restore();
	});

	it("applies columnMapping to headers", async () => {
		const cap3 = captureDownload();
		const data = [{ id: 1, name: "Alice" }];
		exportToCSV(data, "mapped", ["id", "name"], {
			id: "ID",
			name: "Full Name",
		});

		const blob = cap3.blobs[0];
		const text = await blob.text();
		expect(text.startsWith("ID,Full Name")).toBe(true);
		cap3.restore();
	});

	it("applies transformFunction before writing rows", async () => {
		const cap4 = captureDownload();
		const data = [{ id: 1, name: "alice" }];
		exportToCSV(data, "transform", ["id", "name"], undefined, (row) => ({
			...row,
			name: row.name.toUpperCase(),
		}));

		const blob = cap4.blobs[0];
		const text = await blob.text();
		expect(text).toContain("ALICE");
		cap4.restore();
	});

	it("escapes commas in cell values with double-quotes", async () => {
		const cap5 = captureDownload();
		const data = [{ id: 1, note: "hello, world" }];
		exportToCSV(data, "escaping", ["id", "note"]);

		const blob = cap5.blobs[0];
		const text = await blob.text();
		expect(text).toContain('"hello, world"');
		cap5.restore();
	});

	it("escapes double-quotes in cell values", async () => {
		const cap6 = captureDownload();
		const data = [{ id: 1, note: 'say "hello"' }];
		exportToCSV(data, "quote-escape", ["id", "note"]);

		const blob = cap6.blobs[0];
		const text = await blob.text();
		expect(text).toContain('"say ""hello"""');
		cap6.restore();
	});

	it("renders null/undefined cells as empty strings", async () => {
		const cap7 = captureDownload();
		const data = [{ id: 1, name: null, extra: undefined }] as unknown as Array<
			Record<string, unknown>
		>;
		exportToCSV(data as never, "nulls", ["id", "name", "extra"]);

		const blob = cap7.blobs[0];
		const text = await blob.text();
		// Row should be "1,,"
		expect(text).toContain("1,,");
		cap7.restore();
	});
});

describe("exportData — csv wrapper", () => {
	let restore: () => void;

	beforeEach(() => {
		const cap = captureDownload();
		restore = cap.restore;
	});

	afterEach(() => restore());

	it("calls onLoadingStart and onLoadingEnd", async () => {
		const data = [{ id: 1, value: "x" }];
		const onStart = vi.fn();
		const onEnd = vi.fn();

		await exportData("csv", async () => data, onStart, onEnd);

		expect(onStart).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledOnce();
	});

	it("returns false when getData returns empty array", async () => {
		const result = await exportData("csv", async () => []);
		expect(result).toBe(false);
	});

	it("returns true when getData returns non-empty array", async () => {
		const result = await exportData("csv", async () => [{ id: 1, val: "a" }]);
		expect(result).toBe(true);
	});

	it("calls onLoadingEnd even when getData throws", async () => {
		const onEnd = vi.fn();
		const result = await exportData(
			"csv",
			async () => {
				throw new Error("fetch failed");
			},
			undefined,
			onEnd,
		);
		expect(result).toBe(false);
		expect(onEnd).toHaveBeenCalledOnce();
	});

	it("passes entityName to filename (via blob being created)", async () => {
		const cap8 = captureDownload();
		await exportData("csv", async () => [{ id: 1 }], undefined, undefined, {
			entityName: "orders",
		});
		expect(cap8.filenames[0]).toMatch(/^orders-export-/);
		cap8.restore();
	});

	it('uses "items" as default entityName when not provided', async () => {
		const cap9 = captureDownload();
		await exportData("csv", async () => [{ id: 1 }]);
		expect(cap9.filenames[0]).toMatch(/^items-export-/);
		cap9.restore();
	});
});

describe("exportData — excel fallback", () => {
	afterEach(() => {
		vi.resetModules();
		vi.doUnmock("exceljs");
	});

	it("returns false when exceljs is not available", async () => {
		vi.resetModules();
		vi.doMock("exceljs", () => {
			throw new Error("exceljs not found");
		});

		// Re-import the module under test so it picks up the mocked exceljs
		const { exportData: exportDataMocked } = await import(
			"../src/utils/export-utils"
		);

		await expect(
			exportDataMocked("excel", async () => [{ id: 1 }]),
		).resolves.toBe(false);
	});
});
