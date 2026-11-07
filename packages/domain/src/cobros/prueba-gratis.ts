/**
 * Prueba gratis por empresa (CAR-222, decisión de Carlos del 6-nov-2026): la empresa la activa UNA vez
 * desde su ERP, dura 10 días y se desactiva sola; Plataforma puede extenderla o reactivarla. No es un
 * cobro: no lleva precio ni genera cargos. Funciones puras sobre fechas aaaa-mm-dd.
 */
import { sumarDias } from "../calendario/fechas";
import { esParteFinanzas } from "./catalogo-modulos";

export const DIAS_PRUEBA_GRATIS = 10;

/** Último día de una prueba que empieza en `inicio`: el primer día cuenta (10 días = inicio + 9). */
export const finDePruebaGratis = (inicio: string, dias = DIAS_PRUEBA_GRATIS) =>
  sumarDias(inicio, dias - 1);

export type EstadoPruebaGratis = "vigente" | "vencida";

/** Vigente hasta su último día inclusive; al día siguiente está vencida. */
export const estadoPruebaGratis = (hasta: string, hoy: string): EstadoPruebaGratis =>
  hasta >= hoy ? "vigente" : "vencida";

/**
 * Nuevo último día al extender o reactivar: `dias` desde el último día actual si aún está vigente, o
 * desde hoy si ya venció (reactivarla no regala los días que pasaron).
 */
export function extenderPruebaGratis(hasta: string, hoy: string, dias: number): string {
  return sumarDias(hasta >= hoy ? hasta : hoy, dias);
}

const MOTIVOS: Record<string, string> = {
  activo: "ya está activo",
  trial: "ya está en prueba",
  solo_lectura: "está en solo lectura: pídele a OPAI que lo reactive",
  suspendido: "está suspendido: contacta a OPAI",
};

/**
 * Por qué una empresa NO puede activar la prueba gratis de un cobrable, o null si puede. Para un
 * módulo el estado es el suyo (solo vale no contratado). Para una parte de Finanzas es el del módulo
 * `finanzas`: sirve no contratado o ya en prueba (de otra parte); si Finanzas está activo ya incluye
 * todas sus partes.
 */
export function motivoSinPrueba(
  moduloId: string,
  nombre: string,
  estadoModulo: string | null,
  estadoFinanzas: string | null,
): string | null {
  if (esParteFinanzas(moduloId)) {
    if (estadoFinanzas === null || estadoFinanzas === "trial") return null;
    return estadoFinanzas === "activo"
      ? `${nombre}: Finanzas ya está activo e incluye todas sus partes.`
      : `${nombre}: Finanzas ${MOTIVOS[estadoFinanzas] ?? "no está disponible"}.`;
  }
  if (estadoModulo === null) return null;
  return `${nombre} ${MOTIVOS[estadoModulo] ?? "no está disponible"}.`;
}
