const FORMULA_PREFIX = /^[=+\-@]/;

function encodeCell(value: string | number | null): string {
  if (value === null) return "";
  const raw = String(value);
  const formula = FORMULA_PREFIX.test(raw);
  const safe = formula ? `'${raw}` : raw;
  return formula || /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function encodeCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const lines = [headers, ...rows].map((row) => row.map(encodeCell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
