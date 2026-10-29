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

/**
 * Estado de una pantalla según sus cargas: «sin permisos» si alguna respondió FORBIDDEN, «error» si
 * alguna otra falló y «listo» solo si todas salieron bien. Nunca convierte un fallo en vacío (CAR-50).
 */
export function estadoPantalla(...rs: { ok: boolean; error?: { code: string } }[]) {
  const fallidas = rs.filter((r) => !r.ok);
  if (fallidas.length === 0) return "ready" as const;
  return fallidas.some((r) => r.error?.code === "FORBIDDEN")
    ? ("forbidden" as const)
    : ("error" as const);
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
