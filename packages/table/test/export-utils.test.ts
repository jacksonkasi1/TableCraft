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

	it("uses default headers from first row keys", async () => {
		const cap = captureDownload();
		const data = [{ id: 1, name: "Alice" }];
		exportToCSV(data, "auto-headers");

		// Read the blob text to verify CSV content
		const blob = cap.blobs[0];
		expect(blob).toBeDefined();
		const text = await blob.text();
		expect(text.split("\n")[0].trim()).toBe("id,name");

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

	it("neutralizes CSV-formula-injection prefixes (=, +, -, @, tab, CR)", async () => {
		const cap = captureDownload();
		const data = [
			{ a: "=cmd|' /C calc'!A1", b: "+SUM(1)", c: "-2+3", d: "@SUM(1)", e: "\thidden", f: "\rsneaky" },
		];
		exportToCSV(data, "injection", ["a", "b", "c", "d", "e", "f"]);
		const text = await cap.blobs[0].text();
		// Each dangerous value must be prefixed with a single quote so
		// spreadsheet apps treat it as plain text rather than a formula.
		expect(text).toContain("'=cmd|' /C calc'!A1");
		expect(text).toContain("'+SUM(1)");
		expect(text).toContain("'-2+3");
		expect(text).toContain("'@SUM(1)");
		expect(text).toContain("'\thidden");
		expect(text).toContain("'\rsneaky");
		// And benign values are *not* prefixed:
		const benign = [{ a: "hello", b: "world" }];
		const cap2 = captureDownload();
		exportToCSV(benign, "benign", ["a", "b"]);
		const text2 = await cap2.blobs[0].text();
		expect(text2).toContain("hello,world");
		expect(text2).not.toContain("'hello");
		cap.restore();
		cap2.restore();
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

	it("escapes LF (\\n) in cell values with double-quotes", async () => {
		const cap = captureDownload();
		const data = [{ id: 1, note: "line1\nline2" }];
		exportToCSV(data, "lf", ["id", "note"]);

		const text = await cap.blobs[0].text();
		expect(text).toContain('"line1\nline2"');
		cap.restore();
	});

	it("escapes CR (\\r) in cell values with double-quotes", async () => {
		const cap = captureDownload();
		const data = [{ id: 1, note: "line1\rline2" }];
		exportToCSV(data, "cr", ["id", "note"]);

		const text = await cap.blobs[0].text();
		expect(text).toContain('"line1\rline2"');
		cap.restore();
	});

	it("escapes CRLF (\\r\\n) in cell values with double-quotes", async () => {
		const cap = captureDownload();
		const data = [{ id: 1, note: "line1\r\nline2" }];
		exportToCSV(data, "crlf", ["id", "note"]);

		const text = await cap.blobs[0].text();
		expect(text).toContain('"line1\r\nline2"');
		cap.restore();
	});

	it("escapes newlines in column-mapping header names", async () => {
		const cap = captureDownload();
		const data = [{ id: 1, label: "x" }];
		exportToCSV(
			data,
			"header-newline",
			["id", "label"],
			{ id: "id", label: "label\nwith\nnewline" },
		);

		const text = await cap.blobs[0].text();
		expect(text.startsWith("id,\"label\nwith\nnewline\"\n")).toBe(true);
		cap.restore();
	});

	it("neutralizes formula-injection prefix that bypasses via leading space", async () => {
		const cap = captureDownload();
		const data = [{ formula: " =SUM(1)" }];
		exportToCSV(data, "leading-space", ["formula"]);

		const text = await cap.blobs[0].text();
		// After sanitization, the value must start with a single quote so
		// spreadsheet apps treat it as plain text, not a formula. The original
		// leading whitespace is preserved in the written cell.
		expect(text).toContain("' =SUM(1)");
		cap.restore();
	});

	it("preserves tab characters within cell values", async () => {
		const cap = captureDownload();
		const data = [{ id: 1, note: "hello\tworld" }];
		exportToCSV(data, "tab", ["id", "note"]);

		const text = await cap.blobs[0].text();
		// The first char is 'h' (not a formula trigger), and tab is not in
		// the RFC 4180 escape rule (only CR/LF/quote/comma are). The tab is
		// preserved verbatim. Sanitize only acts on the leading char.
		expect(text).toContain("hello\tworld");
		// And the row is written as-is (no double-quote wrap):
		expect(text).toContain("1,hello\tworld\n");
		cap.restore();
	});

	it("keeps a multi-line cell as one logical CSV row", async () => {
		const cap = captureDownload();
		const data = [{ id: 1, body: "para one\n\npara two" }];
		exportToCSV(data, "multiline", ["id", "body"]);

		const text = await cap.blobs[0].text();
		// The cell contains embedded \n, so the escape rule wraps the cell
		// in double-quotes. The embedded newlines are preserved verbatim
		// inside the quoted cell — the parser sees ONE logical row.
		expect(text).toContain('"para one\n\npara two"');
		// The header row is followed by a single data row, terminated by a
		// single trailing \n (the only unquoted row separator at the end).
		expect(text).toBe('id,body\n1,"para one\n\npara two"\n');
		cap.restore();
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
