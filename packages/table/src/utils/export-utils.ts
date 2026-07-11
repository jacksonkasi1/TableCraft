import type { ExportableData, DataTransformFunction } from "../types";

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

    let success = false;
    if (type === "csv") {
      success = exportToCSV(
        exportRows,
        filename,
        options?.headers,
        options?.columnMapping,
        options?.transformFunction
      );
    } else {
      success = await exportToExcel(
        exportRows,
        filename,
        options?.columnMapping,
        options?.columnWidths,
        options?.headers,
        options?.transformFunction
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
