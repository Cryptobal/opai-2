import { noEncontrado, reglaDeNegocio } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";

import { esEditable, type EstadoCotizacion } from "../domain";
import { cotizacionDe } from "../capabilities/util";

type FilaVersion = Awaited<ReturnType<typeof versionDeCotizacion>>;

/** Versión editable (borrador) o, si no hay, la más reciente (solo lectura). */
export async function versionParaFicha(ctx: Contexto, cotizacionId: string, numero?: number) {
  await cotizacionDe(ctx, cotizacionId);
  const versiones = await ctx.db.cpqVersion.findMany({
    where: { cotizacionId },
    orderBy: [{ numero: "desc" }],
  });
  if (numero) {
    const v = versiones.find((x) => x.numero === numero);
    if (!v) throw noEncontrado("La versión");
    return v;
  }
  return versiones.find((v) => v.estado === "borrador") ?? versiones[0] ?? null;
}

export async function versionDeCotizacion(ctx: Contexto, versionId: string) {
  const v = await ctx.db.cpqVersion.findFirst({ where: { id: versionId } });
  if (!v) throw noEncontrado("La versión");
  return v;
}

const MENSAJE_NO_BORRADOR: Record<string, string> = {
  en_aprobacion: "La cotización está en aprobación: espera la decisión o retira el pedido para editarla.",
  lista: "La cotización está lista: usa «Reabrir para editar» si necesitas cambiarla.",
  enviada: "La cotización ya fue enviada: crea una versión nueva para cambiarla.",
};

export function exigirBorrador(v: { estado: string }) {
  if (v.estado !== "borrador")
    throw reglaDeNegocio(
      MENSAJE_NO_BORRADOR[v.estado] ?? "Solo se editan versiones en borrador; esta ya no se puede editar.",
      { codigo: "no_es_borrador" },
    );
}

export function exigirEditable(v: { estado: string }) {
  if (!esEditable(v.estado as EstadoCotizacion))
    throw reglaDeNegocio("Esta versión ya no se puede editar.");
}

/** Enviar desde borrador (margen ok) o lista (aprobada). */
export function exigirEnviable(v: { estado: string }) {
  if (v.estado === "en_aprobacion")
    throw reglaDeNegocio("La cotización está en aprobación: espera la decisión o retira el pedido.");
  if (v.estado !== "borrador" && v.estado !== "lista")
    throw reglaDeNegocio("Solo se envían versiones en borrador o en lista.");
}

export function mesesContrato(validaHasta: Date | null, fecha = new Date()): number {
  if (!validaHasta) return 12;
  const hoy = fecha.toISOString().slice(0, 10);
  const fin = validaHasta.toISOString().slice(0, 10);
  const m =
    (Number(fin.slice(0, 4)) - Number(hoy.slice(0, 4))) * 12 +
    (Number(fin.slice(5, 7)) - Number(hoy.slice(5, 7))) +
    1;
  return Math.min(120, Math.max(1, m));
}

export type VersionCtx = FilaVersion;
