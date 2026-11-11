// Historial de correos del cliente (CAR-233): forma que devuelven `core.correos.historial` y `…sin_asignar`.
export type CorreoVista = {
  id: string;
  fuente: "historial" | "seguimiento";
  sentido: "enviado" | "recibido";
  origen: "cotizacion" | "factura" | "seguimiento" | "buzon" | "respuesta_seguimiento";
  ocurridoEn: string;
  remitente: string;
  destinatarios: string[];
  asunto: string | null;
  texto: string;
  cuentaId: string | null;
  contactoId: string | null;
  negocioId: string | null;
  asociacion: "origen" | "contacto" | "dominio" | "manual" | null;
};
export type PaginaCorreos = { items: CorreoVista[]; siguiente: string | null };

/** Cómo llegó al historial, en palabras del vendedor. */
export function etiquetaOrigen(c: Pick<CorreoVista, "origen" | "sentido">): string {
  if (c.origen === "cotizacion") return "Cotización enviada desde OPAI";
  if (c.origen === "factura") return "Documento tributario enviado desde OPAI";
  if (c.origen === "seguimiento") return "Seguimiento enviado desde OPAI";
  if (c.origen === "respuesta_seguimiento") return "Respuesta a un seguimiento";
  return c.sentido === "enviado"
    ? "Enviado desde una casilla con CCO a OPAI"
    : "Respuesta recibida en OPAI";
}
