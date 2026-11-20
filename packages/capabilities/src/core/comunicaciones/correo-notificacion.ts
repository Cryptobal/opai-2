import type { Contexto } from "../../types";
import { ajuste } from "../config/valores";

const CLAVE_MODULO = {
  comercial: "notificaciones_correo_comercial",
  finanzas: "notificaciones_correo_finanzas",
  operaciones: "notificaciones_correo_operaciones",
} as const;

type AreaNotificacion = keyof typeof CLAVE_MODULO;

/** Primer segmento del evento → área de copia oculta en avisos (no aplica a correos transaccionales). */
const EVENTO_A_AREA: Record<string, AreaNotificacion> = {
  comercial: "comercial",
  cpq: "comercial",
  finanzas: "finanzas",
  asistencia: "operaciones",
  rondas: "operaciones",
  rendiciones: "operaciones",
  pauta: "operaciones",
  desempeno: "operaciones",
  nomina: "operaciones",
  portal_cliente: "operaciones",
};

function textoCorreo(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

/** Copia oculta de avisos por evento: override del área, si no el defecto del tenant. */
export async function correoNotificacionBcc(ctx: Contexto, evento: string): Promise<string | null> {
  const prefijo = evento.split(".")[0] ?? "";
  const area = EVENTO_A_AREA[prefijo];
  if (area) {
    const mod = textoCorreo(await ajuste(ctx, "core", CLAVE_MODULO[area]));
    if (mod) return mod;
  }
  return textoCorreo(await ajuste(ctx, "core", "notificaciones_correo_defecto"));
}