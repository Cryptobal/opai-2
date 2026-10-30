import { dondeInstalacion } from "../core/maestros/alcance";
import { noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { PERMISO_COSTOS, veCostos } from "./comun";

/** Negocio abierto del tenant (R18, §4); de otra empresa o inexistente responde NOT_FOUND. */
export async function negocioAbierto(ctx: Contexto, negocioId: string) {
  const n = await ctx.db.negocio.findUnique({
    where: { id: negocioId },
    select: { id: true, titulo: true, estado: true, archivadoEn: true },
  });
  if (!n) throw noEncontrado("El negocio");
  if (n.estado !== "abierto" || n.archivadoEn)
    throw reglaDeNegocio("Solo se cotiza un negocio abierto.");
  return n;
}

/**
 * Instalaciones que se pueden cotizar: vinculadas al negocio (R19) y en el alcance del actor
 * (ADR-022). Una fuera del negocio o del alcance responde igual que inexistente (sin enumeración).
 * Sin lista explícita, todas las del negocio que el actor ve.
 */
export async function instalacionesCotizables(
  ctx: Contexto,
  negocioId: string,
  pedidas?: readonly string[],
): Promise<{ id: string; nombre: string }[]> {
  const vinculos = await ctx.db.negocioInstalacion.findMany({
    where: { negocioId },
    select: { instalacionId: true },
  });
  const delNegocio = vinculos.map((v) => v.instalacionId);
  const ids = pedidas ? [...new Set(pedidas)] : delNegocio;
  if (ids.some((id) => !delNegocio.includes(id))) throw noEncontrado("La instalación");
  if (!ids.length) return [];
  const filas = await ctx.db.instalacion.findMany({
    where: { id: { in: ids }, AND: [dondeInstalacion(ctx)] },
    select: { id: true, nombre: true },
  });
  if (pedidas && filas.length !== ids.length) throw noEncontrado("La instalación");
  return ids.flatMap((id) => filas.filter((f) => f.id === id));
}

/**
 * Escribir costo, sueldo o margen exige poder verlos (R59): nadie fija ni deduce por la respuesta un
 * dato que su permiso no le muestra.
 */
export function exigirCostos(ctx: Contexto, campos: readonly string[]): void {
  if (campos.length && !veCostos(ctx))
    throw prohibido(`Cambiar ${campos.join(", ")} exige el permiso «${PERMISO_COSTOS}».`);
}
