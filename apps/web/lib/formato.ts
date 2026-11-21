import type { TextosEstado } from "@opai/ds";

/** Formatos de presentación (zona del tenant; por defecto America/Santiago). */
export function fechaHora(
  valor: string | Date | null | undefined,
  zona = "America/Santiago",
): string {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: zona,
  }).format(new Date(valor));
}

export const ETIQUETA_PORTAL: Record<string, string> = {
  erp: "ERP",
  supervisor: "Supervisor",
  trabajador: "Trabajador",
  terreno: "Terreno",
  cliente: "Cliente",
};

type ResultadoCarga = { ok: boolean; error?: { code: string; message?: string } };

const MENSAJE_COMPLEMENTO_INACTIVO =
  "El complemento Cumplimiento DT no está activo para tu empresa.";

/** UNPROCESSABLE por complemento vendible no activo (nomina.cumplimiento_dt, ADR-057). */
function esComplementoInactivo(r: ResultadoCarga): boolean {
  return (
    !r.ok &&
    r.error?.code === "UNPROCESSABLE" &&
    Boolean(r.error.message?.includes("complemento") && r.error.message?.includes("no está activo"))
  );
}

/** Aviso de pantalla cuando falta un complemento; va con `state` «empty» (CAR-741). */
export function textosComplementoInactivo(...rs: ResultadoCarga[]): TextosEstado | undefined {
  if (!rs.some(esComplementoInactivo)) return undefined;
  return { vacio: { titulo: MENSAJE_COMPLEMENTO_INACTIVO } };
}

/**
 * Estado de una pantalla según sus cargas: «sin permisos» si alguna respondió FORBIDDEN, «error» si
 * alguna otra falló y «listo» solo si todas salieron bien. Nunca convierte un fallo en vacío (CAR-50),
 * salvo complemento inactivo (CAR-741).
 */
export function estadoPantalla(...rs: ResultadoCarga[]) {
  const fallidas = rs.filter((r) => !r.ok);
  if (fallidas.length === 0) return "ready" as const;
  if (fallidas.some((r) => r.error?.code === "FORBIDDEN")) return "forbidden" as const;
  if (fallidas.some(esComplementoInactivo)) return "empty" as const;
  return "error" as const;
}

/** dd-mm-aaaa (formato chileno de las pantallas de acceso). */
export function fechaCorta(
  valor: string | Date | null | undefined,
  zona = "America/Santiago",
): string {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: zona,
  })
    .format(new Date(valor))
    .replace(/\//g, "-");
}