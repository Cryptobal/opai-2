import { z } from "zod";

import { NOMBRE_TIPO_DTE, type EstadoRecepcion } from "@opai/domain";
import type { AccionAcuseSii } from "@opai/integrations";

import { compraSchema } from "./vistas-compra";

export const ACCIONES_RECEPCION_UI = [
  "aceptar",
  "aceptar_contenido",
  "reclamar_contenido",
  "reclamar_parcial",
  "reclamar_total",
] as const;
export type AccionRecepcionUi = (typeof ACCIONES_RECEPCION_UI)[number];

const MAPA_SII: Record<AccionRecepcionUi, AccionAcuseSii[] | "doble"> = {
  aceptar: "doble",
  aceptar_contenido: ["ACD"],
  reclamar_contenido: ["RCD"],
  reclamar_parcial: ["RFP"],
  reclamar_total: ["RFT"],
};

export const estadoTrasAccion = (accion: AccionRecepcionUi): EstadoRecepcion =>
  accion === "aceptar" || accion === "aceptar_contenido" ? "aceptado" : "reclamado";

const rotuloAccionRecepcion = (accion: AccionRecepcionUi): string =>
  ({
    aceptar: "Aceptar con acuse de mercaderías (ACD + ERM)",
    aceptar_contenido: "Aceptar solo el contenido (ACD)",
    reclamar_contenido: "Reclamar el contenido (RCD)",
    reclamar_parcial: "Reclamar falta parcial (RFP)",
    reclamar_total: "Reclamar falta total (RFT)",
  })[accion];

export const accionesSiiDe = (accion: AccionRecepcionUi): AccionAcuseSii[] => {
  const mapa = MAPA_SII[accion];
  return mapa === "doble" ? ["ACD", "ERM"] : [...mapa];
};

export const salidaRecepcionSii = z.object({
  compra: compraSchema,
  accion: z.enum(ACCIONES_RECEPCION_UI),
  accionesSii: z.array(z.enum(["ACD", "RCD", "ERM", "RFP", "RFT"])),
  estadoNuevo: z.enum(["pendiente_revision", "aceptado", "reclamado"]),
  fueraDePlazo: z.boolean(),
  trackId: z.string().optional(),
  aviso: z.string().optional(),
});

/** Texto de aprobación humana: tipo, folio y proveedor, sin más datos personales. */
export function textoAprobacionRecepcion(accion: AccionRecepcionUi, tipoDte: number, folio: number, proveedor: string): string {
  const tipo = (NOMBRE_TIPO_DTE[tipoDte as keyof typeof NOMBRE_TIPO_DTE] ?? "documento").toLowerCase();
  return `${rotuloAccionRecepcion(accion)} del ${tipo} ${folio} de ${proveedor}`;
}