import type { ConfigSeccion, TipoCampo } from "./config-hojas-laboral";

/** Texto del formulario → valor del input de la capacidad. */
export function valorDeCampo(tipo: TipoCampo, texto: string): string | number | boolean | null {
  const v = texto.trim();
  if (tipo === "si_no") return v === "si";
  if (!v) return null;
  if (tipo === "decimal") return v.replace(",", ".");
  return tipo === "entero" ? Number(v) : v;
}

/** Campos a enviar: los cambiados (o todos, si la capacidad lo exige). */
export function cambiosDe(
  cfg: ConfigSeccion,
  inicial: Readonly<Record<string, string>>,
  actual: Readonly<Record<string, string>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of cfg.campos) {
    const nuevo = actual[c.clave] ?? "";
    if (!cfg.todos && nuevo === (inicial[c.clave] ?? "")) continue;
    out[c.clave] = valorDeCampo(c.tipo, nuevo);
  }
  return out;
}

/** Mensaje de error de un campo (vacío si está bien). */
export function errorDeCampo(c: ConfigSeccion["campos"][number], texto: string): string | null {
  const v = texto.trim();
  if (c.requerido && !v) return "Obligatorio";
  if (!v) return null;
  if (c.tipo === "opcion" && !c.opciones?.some((o) => o.valor === v))
    return "Elige una opción de la lista";
  if (c.tipo === "decimal" && !/^\d+([.,]\d+)?$/.test(v)) return "Usa solo números (ej. 12,5)";
  if (c.tipo === "entero") {
    if (!/^\d+$/.test(v)) return "Usa solo números";
    const n = Number(v);
    if ((c.min !== undefined && n < c.min) || (c.maxValor !== undefined && n > c.maxValor))
      return `Entre ${c.min ?? 0} y ${c.maxValor ?? "…"}`;
  }
  return null;
}

export const faltantes = (cfg: ConfigSeccion, actual: Readonly<Record<string, string>>): boolean =>
  cfg.campos.some((c) => errorDeCampo(c, actual[c.clave] ?? "") !== null);
