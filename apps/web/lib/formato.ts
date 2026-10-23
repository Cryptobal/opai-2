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

export function estadoPantalla(r: { ok: boolean; error?: { code: string } }) {
  if (r.ok) return "ready" as const;
  return r.error?.code === "FORBIDDEN" ? ("forbidden" as const) : ("error" as const);
}
