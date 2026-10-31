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
