import { disponibilidadSeccion, type SeccionPortal } from "@opai/domain";

import { ajuste } from "../core/config/valores";
import { hoyEn } from "../core/turnos/comun";
import type { Contexto } from "../types";
import { coberturaPorInstalacion } from "./cobertura";
import { rondasPorInstalacion } from "./rondas";

type SeccionResumen = Extract<SeccionPortal, "cobertura" | "rondas" | "novedades">;

/** Módulo del que sale cada sección con datos y su ajuste de empresa (CAR-491, CAR-492). */
const FUENTE = {
  cobertura: { modulo: "pauta", ajuste: "seccion_cobertura" },
  rondas: { modulo: "rondas", ajuste: "seccion_rondas" },
} as const;

/**
 * ¿La sección tiene datos para esta empresa y esta cuenta? Requiere el módulo de origen activo, el ajuste de la
 * empresa encendido y la sección visible en la configuración de la cuenta.
 */
async function activa(ctx: Contexto, s: keyof typeof FUENTE, visibles: readonly string[]): Promise<boolean> {
  if (!ctx.modulosActivos.includes(FUENTE[s].modulo) || !visibles.includes(s)) return false;
  return (await ajuste<boolean>(ctx, "portal_cliente", FUENTE[s].ajuste)) !== false;
}

/**
 * Secciones del resumen del mes y sus cifras por instalación. Las que no tienen datos (o están apagadas) quedan
 * «pendiente» y sin cifras; nunca se inventa un número.
 */
export async function seccionesDelResumen(
  ctx: Contexto,
  instalaciones: readonly { id: string; region: string | null }[],
  visibles: readonly string[],
  mes: string,
  zona: string,
) {
  const [conCobertura, conRondas] = await Promise.all([activa(ctx, "cobertura", visibles), activa(ctx, "rondas", visibles)]);
  const ids = instalaciones.map((i) => i.id);
  const [cobertura, rondas] = await Promise.all([
    conCobertura ? coberturaPorInstalacion(ctx, instalaciones, mes, hoyEn(zona)) : null,
    conRondas ? rondasPorInstalacion(ctx, ids, mes, zona) : null,
  ]);
  const secciones = visibles.filter((s): s is SeccionResumen => s === "cobertura" || s === "rondas" || s === "novedades");
  const disponibilidad = (s: SeccionResumen) =>
    (s === "cobertura" && conCobertura) || (s === "rondas" && conRondas) ? ("disponible" as const) : disponibilidadSeccion(s);
  return (id: string) => ({
    secciones: secciones.map((s) => ({ seccion: s, disponibilidad: disponibilidad(s) })),
    cobertura: cobertura?.get(id) ?? null,
    rondas: rondas?.get(id) ?? null,
  });
}
