import type { SeccionPortal } from "@opai/domain";

import { ajuste } from "../core/config/valores";
import { hoyEn } from "../core/turnos/comun";
import type { Contexto } from "../types";
import { coberturaPorInstalacion } from "./cobertura";
import { novedadesPorInstalacion } from "./novedades";
import { rondasPorInstalacion } from "./rondas";

type SeccionResumen = Extract<SeccionPortal, "cobertura" | "rondas" | "novedades">;

/** Módulo del que sale cada sección del resumen y su ajuste de empresa (CAR-491, CAR-492, CAR-493). */
const FUENTE = {
  cobertura: { modulo: "pauta", ajuste: "seccion_cobertura" },
  rondas: { modulo: "rondas", ajuste: "seccion_rondas" },
  novedades: { modulo: "rondas", ajuste: "seccion_novedades" },
} as const;

/**
 * ¿La sección tiene datos para esta empresa y esta cuenta? Requiere el módulo de origen activo, el ajuste de la
 * empresa encendido y la sección visible en la configuración de la cuenta.
 */
async function activa(ctx: Contexto, s: SeccionResumen, visibles: readonly string[]): Promise<boolean> {
  if (!ctx.modulosActivos.includes(FUENTE[s].modulo) || !visibles.includes(s)) return false;
  return (await ajuste<boolean>(ctx, "portal_cliente", FUENTE[s].ajuste)) !== false;
}

/**
 * Secciones del resumen del mes y sus cifras por instalación. Las que no están activas quedan «pendiente» y sin
 * cifras; nunca se inventa un número.
 */
export async function seccionesDelResumen(
  ctx: Contexto,
  instalaciones: readonly { id: string; region: string | null }[],
  visibles: readonly string[],
  mes: string,
  zona: string,
) {
  const ids = instalaciones.map((i) => i.id);
  const [conCobertura, conRondas, conNovedades] = await Promise.all(
    (["cobertura", "rondas", "novedades"] as const).map((s) => activa(ctx, s, visibles)),
  );
  const [cobertura, rondas, novedades] = await Promise.all([
    conCobertura ? coberturaPorInstalacion(ctx, instalaciones, mes, hoyEn(zona)) : null,
    conRondas ? rondasPorInstalacion(ctx, ids, mes, zona) : null,
    conNovedades ? novedadesPorInstalacion(ctx, ids, mes, zona) : null,
  ]);
  const activas = { cobertura: conCobertura, rondas: conRondas, novedades: conNovedades };
  const secciones = visibles.filter((s): s is SeccionResumen => s in FUENTE);
  return (id: string) => ({
    secciones: secciones.map((s) => ({ seccion: s, disponibilidad: activas[s] ? ("disponible" as const) : ("pendiente" as const) })),
    cobertura: cobertura?.get(id) ?? null,
    rondas: rondas?.get(id) ?? null,
    novedades: novedades?.get(id) ?? null,
  });
}
