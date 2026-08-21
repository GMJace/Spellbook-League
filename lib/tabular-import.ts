import * as XLSX from "xlsx";

import { parseCsvText } from "@/lib/csv";

export async function parseUploadedTabularFile(file: File) {
  const filename = file.name.toLowerCase();

  if (filename.endsWith(".csv")) {
    const rawText = (await file.text()).replace(/^\ufeff/, "");
    return parseCsvText(rawText);
  }

  if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return [] as string[][];
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
      header: 1,
      raw: false,
      blankrows: false,
      defval: "",
    });

    return rows.map((row) => row.map((value) => String(value ?? "")));
  }

  return [] as string[][];
}
