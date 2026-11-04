import type { Vocabulario } from "@opai/domain";

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Etiqueta de cada tipo de entidad propietaria, con el vocabulario de la vertical del tenant. */
export function etiquetasEntidad(voc: Vocabulario): Record<string, string> {
  return {
    tenant: "Empresa",
    cuenta: "Cuenta",
    instalacion: mayuscula(voc.instalacion.singular),
    persona: mayuscula(voc.persona.singular),
    puesto: mayuscula(voc.puesto.singular),
  };
}

export const OPCIONES_ESTADO = [
  { valor: "vigente", etiqueta: "Vigente" },
  { valor: "por_vencer", etiqueta: "Por vencer" },
  { valor: "vencido", etiqueta: "Vencido" },
  { valor: "sin_fecha", etiqueta: "Sin vencimiento" },
];

export const OPCIONES_ORDEN = [
  { valor: "recientes", etiqueta: "Más recientes" },
  { valor: "nombre", etiqueta: "Nombre A–Z" },
  { valor: "vence", etiqueta: "Vencen primero" },
];

export const FIRMA: Record<string, { tono: "info" | "success"; etiqueta: string }> = {
  pendiente: { tono: "info", etiqueta: "Pendiente" },
  firmado: { tono: "success", etiqueta: "Firmado" },
};
