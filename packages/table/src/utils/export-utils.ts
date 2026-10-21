import type { ExportableData, DataTransformFunction } from "../types";

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * Parse an ISO-8601 timestamp that carries an explicit offset (`Z` or `±hh:mm`).
 * Offsets without a colon (`+0530`) are normalized first because some engines
 * (Safari) reject them.
 */
function parseIsoTimestamp(value: string): Date | null {
  if (!ISO_TIMESTAMP_PATTERN.test(value)) return null;

  // Reject impossible calendar days (e.g. 2026-02-30) that engines would
  // otherwise silently roll over into the next month.
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const calendarDay = new Date(Date.UTC(year, month - 1, day));
  if (calendarDay.getUTCMonth() !== month - 1 || calendarDay.getUTCDate() !== day) {
    return null;
  }

  const normalized = value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Creates an export transform that formats timestamps in an IANA timezone.
 * ISO timestamps with an explicit offset and `Date` instances are formatted;
 * calendar-only dates are deliberately preserved to avoid shifting their day.
 * A supplied custom transform runs first and receives the original row.
 *
 * @throws {RangeError} When `timeZone` or `locale` is not supported.
 */
export function createTimezoneExportTransform<T extends ExportableData>(
  timeZone?: string,
  locale?: string,
  transformFunction?: DataTransformFunction<T>,
): DataTransformFunction<T> | undefined {
  if (!timeZone) return transformFunction;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "shortOffset",
    });
  } catch {
    throw new RangeError(
      `Invalid export timeZone or locale: timeZone=${timeZone}, locale=${locale ?? "default"}`,
    );
  }

  return (row) => {
    const transformedRow = transformFunction ? transformFunction(row) : row;

    return Object.fromEntries(
      Object.entries(transformedRow).map(([key, value]) => {
        if (value instanceof Date) {
          return [key, Number.isNaN(value.getTime()) ? value : formatter.format(value)];
        }
        if (typeof value !== "string") return [key, value];

        const date = parseIsoTimestamp(value);
        return [key, date ? formatter.format(date) : value];
      }),
    ) as Record<string, unknown>;
  };
}

/**
 * Neutralize CSV-formula-injection vectors. Spreadsheet apps (Excel, Sheets,
 * LibreOffice) evaluate any cell whose first character is `=`, `+`, `-`, `@`,
 * `\t` or `\r` as a formula — letting an attacker who controls cell values
 * exfiltrate data, fetch URLs, or run DDE commands when a victim opens the
 * exported file. Prefixing such values with a single quote forces the
 * spreadsheet to treat them as plain text. (OWASP CSV Injection guidance.)
 *
 * Leading whitespace is trimmed before the prefix check, so a value like
 * `" =SUM(1)"` (with a leading space) cannot bypass the check — some
 * spreadsheet apps ignore leading whitespace when evaluating formulas.
 * The original whitespace is preserved in the returned value.
 */
function sanitizeCsvCell(value: string): string {
  if (value.length === 0) return value;
  // Trim leading spaces (not tabs/CRs — those are themselves formula triggers
  // and must remain in the value so the prefix check can detect them).
  const trimmed = value.replace(/^ +/, "");
  if (trimmed.length === 0) return value;
  const first = trimmed.charCodeAt(0);
  // 0x3D '='  0x2B '+'  0x2D '-'  0x40 '@'  0x09 TAB  0x0D CR
  if (
    first === 0x3d ||
    first === 0x2b ||
    first === 0x2d ||
    first === 0x40 ||
    first === 0x09 ||
    first === 0x0d
  ) {
    return `'${value}`;  // preserve the original (including leading whitespace)
  }
  return value;
}

/** Quote one sanitized CSV field according to RFC 4180. */
function escapeCsvField(value: string): string {
  const sanitized = sanitizeCsvCell(value);
  return /[",\n\r]/.test(sanitized)
    ? `"${sanitized.replace(/"/g, '""')}"`
    : sanitized;
}

/**
 * Convert array of objects to CSV string.
 */
function convertToCSV<T extends ExportableData>(
  data: T[],
  headers: string[],
  columnMapping?: Record<string, string>
): string {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  let csvContent = "";

  const headerRow = headers.map((header) =>
    escapeCsvField(columnMapping?.[header] ?? header)
  );
  csvContent = `${headerRow.join(",")}\n`;

  for (const item of data) {
    const row = headers.map((header) => {
      const value = item[header];
      const rawCell = value === null || value === undefined ? "" : String(value);
      return escapeCsvField(rawCell);
    });
    csvContent += `${row.join(",")}\n`;
  }

  return csvContent;
}

/**
 * Download blob as file.
 */
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file.
 */
export function exportToCSV<T extends ExportableData>(
  data: T[],
  filename: string,
  headers: string[] = Object.keys(data[0] || {}),
  columnMapping?: Record<string, string>,
  transformFunction?: DataTransformFunction<T>
): boolean {
  if (data.length === 0) {
    console.error("No data to export");
    return false;
  }

  try {
    const processedData = data.map((item) => {
      const transformedItem = transformFunction ? transformFunction(item) : item;
      const filteredItem: ExportableData = {};
      for (const header of headers) {
        if (header in transformedItem) {
          filteredItem[header] = transformedItem[header] as ExportableData[string];
        }
      }
      return filteredItem;
    });

    const csvContent = convertToCSV(processedData, headers, columnMapping);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, `${filename}.csv`);
    return true;
  } catch (error) {
    console.error("Error creating CSV:", error);
    return false;
  }
}

/**
 * Export data to Excel file using ExcelJS (optional peer dependency).
 * Falls back gracefully if exceljs is not installed.
 */
export async function exportToExcel<T extends ExportableData>(
  data: T[],
  filename: string,
  columnMapping?: Record<string, string>,
  columnWidths?: Array<{ wch: number }>,
  headers?: string[],
  transformFunction?: DataTransformFunction<T>
): Promise<boolean> {
  if (data.length === 0) {
    console.error("No data to export");
    return false;
  }

  try {
    // Dynamic import — exceljs is an optional peer dependency
    let ExcelJS: typeof import("exceljs");
    try {
      ExcelJS = await import("exceljs");
    } catch {
      console.error(
        "Excel export requires 'exceljs' package. Install it with: npm install exceljs"
      );
      return false;
    }

    const mapping =
      columnMapping ||
      Object.keys(data[0] || {}).reduce(
        (acc, key) => {
          acc[key] = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
          return acc;
        },
        {} as Record<string, string>
      );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    const columnsToExport = headers || Object.keys(mapping);

    worksheet.columns = columnsToExport.map((key, index) => ({
      header: mapping[key] || key,
      key: key,
      width: columnWidths?.[index]?.wch || 15,
    }));

    data.forEach((item) => {
      const transformedItem = transformFunction ? transformFunction(item) : item;
      const row: Record<string, unknown> = {};
      for (const key of columnsToExport) {
        if (key in transformedItem) {
          row[key] = transformedItem[key];
        }
      }
      worksheet.addRow(row);
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadFile(blob, `${filename}.xlsx`);
    return true;
  } catch (error) {
    console.error("Error creating Excel file:", error);
    return false;
  }
}

/**
 * Unified export function that handles loading states and error handling.
 */
export async function exportData<T extends ExportableData>(
  type: "csv" | "excel",
  getData: () => Promise<T[]>,
  onLoadingStart?: () => void,
  onLoadingEnd?: () => void,
  options?: {
    headers?: string[];
    columnMapping?: Record<string, string>;
    columnWidths?: Array<{ wch: number }>;
    entityName?: string;
    transformFunction?: DataTransformFunction<T>;
    /** IANA timezone used to format timestamps (see `createTimezoneExportTransform`). */
    timeZone?: string;
    /** Locale used with `timeZone` when formatting timestamps. */
    locale?: string;
  }
): Promise<boolean> {
  try {
    if (onLoadingStart) onLoadingStart();

    const exportRows = await getData();

    if (exportRows.length === 0) {
      return false;
    }

    const entityName = options?.entityName || "items";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${entityName}-export-${timestamp}`;
    const transformFunction = createTimezoneExportTransform(
      options?.timeZone,
      options?.locale,
      options?.transformFunction,
    );

    let success = false;
    if (type === "csv") {
      success = exportToCSV(
        exportRows,
        filename,
        options?.headers,
        options?.columnMapping,
        transformFunction
      );
    } else {
      success = await exportToExcel(
        exportRows,
        filename,
        options?.columnMapping,
        options?.columnWidths,
        options?.headers,
        transformFunction
      );
    }

    return success;
  } catch (error) {
    console.error("Error exporting data:", error);
    return false;
  } finally {
    if (onLoadingEnd) onLoadingEnd();
  }
}
