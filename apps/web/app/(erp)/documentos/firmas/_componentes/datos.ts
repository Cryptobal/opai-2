import type { BadgeProps } from "@opai/ds";

import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Parametros, SearchParams } from "@/lib/parametros";

export type Firmante = {
  id: string;
  orden: number;
  rol: string;
  tipo: string;
  nombre: string;
  run: string | null;
  estado: string;
  vistoEn: string | null;
  firmadoEn: string | null;
  motivoRechazo: string | null;
};

export type Solicitud = {
  id: string;
  documentoId: string;
  clase: string;
  nivel: string;
  orden: string;
  estado: string;
  mensaje: string | null;
  plazoVence: string;
  motivo: string | null;
  documentoFirmadoId: string | null;
  sha256Firmado: string | null;
  completadaEn: string | null;
  creadaEn: string;
  firmantes: Firmante[];
};

/** Estados de la máquina (firma.md §7) con su tono de badge en pantalla. */
export const TONO_ESTADO: Record<string, NonNullable<BadgeProps["tono"]>> = {
  enviada: "info",
  en_curso: "warning",
  completada: "success",
  rechazada: "danger",
  vencida: "danger",
  cancelada: "neutro",
  espera_prestador: "warning",
};

export const ETIQUETA_ESTADO: Record<string, string> = {
  enviada: "Enviada",
  en_curso: "En curso",
  completada: "Completada",
  rechazada: "Rechazada",
  vencida: "Vencida",
  cancelada: "Cancelada",
  espera_prestador: "Esperando al prestador",
};

export const ETIQUETA_CLASE: Record<string, string> = {
  contrato_trabajo: "Contrato de trabajo",
  anexo_contrato: "Anexo de contrato",
  recepcion_laboral: "Recepción laboral",
  carta_trabajador: "Carta al trabajador",
  propuesta_comercial: "Propuesta comercial",
  contrato_servicio: "Contrato de servicio",
  acta: "Acta",
  acta_reunion: "Acta de reunión",
};

export async function filtrosDe(sp: SearchParams): Promise<Parametros> {
  const p = await sp;
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}

export async function cargarFirmas(p: Parametros) {
  return ejecutarComoUsuario<{ solicitudes: Solicitud[] }>("erp", "core.firmas.list", {
    ...(p["estado"] ? { estado: p["estado"] } : {}),
  });
}
