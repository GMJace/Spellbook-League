export function escapeCsvValue(value: boolean | number | null | string | undefined) {
  const normalized = String(value ?? "");

  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

export function buildCsv(rows: Array<Array<boolean | number | null | string | undefined>>) {
  return rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\r\n");
}

export function parseCsvText(input: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (inQuotes) {
      if (character === '"') {
        if (nextCharacter === '"') {
          currentValue += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += character;
      }

      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (character === "\r") {
      if (nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    if (character === "\n") {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  currentRow.push(currentValue);
  rows.push(currentRow);

  return rows.filter(
    (row, index) => index < rows.length - 1 || row.some((value) => value.trim() !== "")
  );
}
