/** Normaliza celdas ExcelJS (Date, rich text, fórmulas, hipervínculos) a primitivos. */
export function valorCeldaExcel(raw: unknown): string | number | null {
  if (raw == null) return null;
  if (raw instanceof Date) {
    const d = raw.getUTCDate();
    const m = raw.getUTCMonth() + 1;
    const y = raw.getUTCFullYear();
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.result === "number" && Number.isFinite(o.result)) return o.result;
    if (typeof o.result === "string") return o.result;
    if (typeof o.text === "string") return o.text;
    if (Array.isArray(o.richText)) {
      return o.richText
        .map((p) => (typeof p === "object" && p && "text" in p ? String((p as { text: unknown }).text) : ""))
        .join("");
    }
    if (typeof o.hyperlink === "string") return o.hyperlink;
    if (typeof o.formula === "string" && o.result != null) return valorCeldaExcel(o.result);
  }
  return String(raw);
}
