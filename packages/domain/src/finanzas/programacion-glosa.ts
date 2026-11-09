// Glosas de una programación con marcadores (CAR-221 · B). Lógica pura.
// {{periodo}} período facturado · {{uf_valor}} UF usada para calcular el período (según la política de fecha de la UF) ·
// {{uf_al_dia}} UF del día de emisión · {{monto}} total del documento en pesos.

export const PLACEHOLDERS_GLOSA = ["periodo", "uf_valor", "uf_al_dia", "monto"] as const;
export type PlaceholderGlosa = (typeof PLACEHOLDERS_GLOSA)[number];

const MARCADOR = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Marcadores presentes en la plantilla, en orden de aparición y sin repetir (incluye los desconocidos). */
export function marcadoresDeGlosa(plantilla: string): string[] {
  return [...new Set([...plantilla.matchAll(MARCADOR)].map((m) => m[1] as string))];
}

/** Marcadores que no existen: se informan al guardar para que no salgan marcadores sin resolver en una factura. */
export const marcadoresDesconocidos = (plantilla: string): string[] =>
  marcadoresDeGlosa(plantilla).filter((m) => !(PLACEHOLDERS_GLOSA as readonly string[]).includes(m));

const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** UF en centavos → «38.123,45» (formato chileno); «sin UF» si no hay valor. */
export function ufCentavosATexto(centavos: number | bigint | null): string {
  if (centavos == null) return "sin UF";
  const c = Number(centavos);
  return `${miles(Math.floor(c / 100))},${String(c % 100).padStart(2, "0")}`;
}

export type ValoresGlosa = {
  periodo: string;
  ufCentavos: number | bigint | null;
  ufDiaCentavos: number | bigint | null;
  montoClp: number;
};

/** Reemplaza los marcadores conocidos; los desconocidos quedan tal cual (nunca se inventa un valor). */
export function renderGlosa(plantilla: string, v: ValoresGlosa): string {
  return plantilla.replace(MARCADOR, (completo, nombre: string) => {
    switch (nombre) {
      case "periodo":
        return v.periodo;
      case "uf_valor":
        return ufCentavosATexto(v.ufCentavos);
      case "uf_al_dia":
        return ufCentavosATexto(v.ufDiaCentavos);
      case "monto":
        return `$${miles(v.montoClp)}`;
      default:
        return completo;
    }
  });
}
