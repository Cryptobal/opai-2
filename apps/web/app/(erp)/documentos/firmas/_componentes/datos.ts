import type { BadgeProps } from "@opai/ds";

import { acumularPaginas } from "@/lib/lista-completa";
import { ejecutarComoUsuario } from "@/lib/servidor";
import { leerParametros, type Parametros } from "@/lib/parametros";

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

export const filtrosDe = leerParametros;

export async function cargarFirmas(p: Parametros) {
  const base = { ...(p["estado"] ? { estado: p["estado"] } : {}) };
  const r = await acumularPaginas<Solicitud>((extra) =>
    ejecutarComoUsuario("erp", "core.firmas.list", { ...base, ...extra }),
  );
  return r.ok ? { ok: true as const, data: { solicitudes: r.data } } : r;
}
