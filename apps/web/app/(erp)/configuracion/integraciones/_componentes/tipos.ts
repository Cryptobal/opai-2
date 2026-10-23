import {
  Bot,
  FileText,
  Landmark,
  type LucideIcon,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  ScanFace,
  Wallet,
  Workflow,
} from "lucide-react";

/** Salida de core.integraciones.list/get (nunca trae credenciales: solo máscaras). */
export type Integracion = {
  proveedor: string;
  nombre: string;
  categoria: string;
  modalidad: string;
  modalidades: string[];
  estado: "configurada" | "no_configurada" | "no_disponible" | "error" | "proximamente" | string;
  config: unknown;
  secretos: { nombre: string; etiqueta: string; mascara: string | null }[];
  ultimoTestEn: string | null;
  ultimoError: string | null;
};

/** Título, subtítulo e icono de cada categoría en la grilla (28). */
export const CATEGORIA: Record<string, { titulo: string; icono: LucideIcon }> = {
  correo: { titulo: "Correo", icono: Mail },
  geo: { titulo: "Geolocalización", icono: MapPin },
  ia: { titulo: "Inteligencia artificial", icono: Bot },
  whatsapp: { titulo: "WhatsApp", icono: MessageCircle },
  dte: { titulo: "Facturación electrónica", icono: FileText },
  banco: { titulo: "Banco", icono: Landmark },
  factoring: { titulo: "Factoring", icono: Wallet },
  biometria: { titulo: "Biometría", icono: ScanFace },
  slack: { titulo: "Slack", icono: MessageSquare },
  webhooks: { titulo: "Webhooks", icono: Workflow },
};

export const SUBTITULO: Record<string, string> = {
  resend: "Resend",
  google_maps: "Google Maps",
  whatsapp: "API de WhatsApp Business",
  dte: "DTE · SII",
  fintoc: "Fintoc",
  factoring: "Cesión de facturas",
  biometria: "Marcación con rostro",
  slack: "Avisos en canales",
  webhooks: "Eventos hacia tus sistemas",
};

export const ESTADO: Record<
  string,
  { texto: string; tono: "success" | "danger" | "neutro" | "warning" }
> = {
  configurada: { texto: "Configurada", tono: "success" },
  error: { texto: "Con error", tono: "danger" },
  no_configurada: { texto: "No configurada", tono: "neutro" },
  no_disponible: { texto: "Sin credencial", tono: "warning" },
  proximamente: { texto: "Próximamente", tono: "neutro" },
};

export const MODALIDAD: Record<string, string> = { plataforma: "De plataforma", propia: "Propia" };

/** Ruta del detalle: las tres de IA comparten una página. */
export const rutaDe = (i: Integracion) =>
  `/configuracion/integraciones/${i.categoria === "ia" ? "ia" : i.proveedor}`;
