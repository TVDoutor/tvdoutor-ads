import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type SheetColumn = {
  header: string;
  key: string;
  width?: number;
};

type SheetConfig = {
  name: string;
  columns: SheetColumn[];
  rows: Array<Record<string, unknown>>;
};

type WorkbookConfig = {
  fileBaseName: string;
  sheets: SheetConfig[];
};

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/*?:[\]]/g, "_").slice(0, 31) || "Sheet1";
}

export async function exportWorkbook(config: WorkbookConfig): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of config.sheets) {
    const ws = workbook.addWorksheet(sanitizeSheetName(sheet.name));
    ws.columns = sheet.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 18,
    }));

    if (sheet.rows.length > 0) {
      ws.addRows(sheet.rows);
    }

    const header = ws.getRow(1);
    header.font = { bold: true };
    header.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const datePart = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${config.fileBaseName}_${datePart}.xlsx`);
}

