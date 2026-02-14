// Type declarations for optional peer dependency: exceljs
declare module "exceljs" {
  export interface Column {
    header: string;
    key: string;
    width: number;
  }

  export interface Cell {
    value: unknown;
  }

  export interface Row {
    font: { bold?: boolean };
    fill: {
      type: string;
      pattern: string;
      fgColor: { argb: string };
    };
    getCell(col: number): Cell;
  }

  export interface Worksheet {
    columns: Partial<Column>[];
    addRow(data: Record<string, unknown>): Row;
    getRow(index: number): Row;
  }

  export interface Xlsx {
    writeBuffer(): Promise<ArrayBuffer>;
  }

  export class Workbook {
    xlsx: Xlsx;
    addWorksheet(name: string): Worksheet;
  }
}
