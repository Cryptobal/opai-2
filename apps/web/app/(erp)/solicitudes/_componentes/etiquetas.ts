import { Bot, Globe, Mail, PenLine, type LucideIcon } from "lucide-react";

export type Canal = "formulario_web" | "correo" | "agente" | "manual";
export type EstadoSolicitud = "nueva" | "en_revision" | "convertida" | "descartada";

export const CANAL: Record<Canal, { etiqueta: string; icono: LucideIcon }> = {
  formulario_web: { etiqueta: "Web", icono: Globe },
  correo: { etiqueta: "Correo", icono: Mail },
  agente: { etiqueta: "Agente", icono: Bot },
  manual: { etiqueta: "Manual", icono: PenLine },
};

export const ESTADO: Record<
  EstadoSolicitud,
  { etiqueta: string; tono: "info" | "warning" | "success" | "neutro" }
> = {
  nueva: { etiqueta: "Nueva", tono: "info" },
  en_revision: { etiqueta: "En revisión", tono: "warning" },
  convertida: { etiqueta: "Convertida", tono: "success" },
  descartada: { etiqueta: "Descartada", tono: "neutro" },
};

export type PlazoSolicitud = "sin_plazo" | "dentro" | "fuera" | "a_tiempo" | "tarde" | "sin_dato";

/** Marca de primera respuesta (CAR-299). Solo se muestra la que importa: pendiente dentro o fuera de plazo. */
export const PLAZO: Partial<Record<PlazoSolicitud, { etiqueta: string; tono: "warning" | "danger" | "neutro" }>> = {
  dentro: { etiqueta: "En plazo", tono: "neutro" },
  fuera: { etiqueta: "Fuera de plazo", tono: "danger" },
};

/** Quién revisa una solicitud «en revisión» (CAR-211); null en los demás estados. */
export function quienRevisa(s: { estado: string; responsableNombre?: string | null }): string | null {
  if (s.estado !== "en_revision") return null;
  return s.responsableNombre ? `Revisa: ${s.responsableNombre}` : "Sin responsable";
}
