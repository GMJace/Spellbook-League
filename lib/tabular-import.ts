import { parseCsvText } from "@/lib/csv";

export async function parseUploadedTabularFile(file: File) {
  const filename = file.name.toLowerCase();

  if (filename.endsWith(".csv")) {
    const rawText = (await file.text()).replace(/^\ufeff/, "");
    return parseCsvText(rawText);
  }

  return [] as string[][];
}
