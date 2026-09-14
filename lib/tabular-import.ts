import { readSheet } from "read-excel-file/node";

import { parseCsvText } from "@/lib/csv";

export async function parseUploadedTabularFile(file: File): Promise<string[][]> {
  const filename = file.name.toLowerCase();

  if (filename.endsWith(".csv")) {
    const rawText = (await file.text()).replace(/^\ufeff/, "");
    return parseCsvText(rawText);
  }

  if (filename.endsWith(".xlsx")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await readSheet(buffer);
    return rows.map((row) => row.map((value) => String(value ?? "")));
  }

  return [] as string[][];
}
