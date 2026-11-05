import { resumirCobertura } from "@opai/domain";

import { enScope } from "../../../autorizacion";
import { cargarMes } from "../../../pauta/cargar";
import { hoy as hoyPauta } from "../../../pauta/comun";
import type { Contexto } from "../../../types";
import { dondeInstalacion, dondePuesto } from "../../maestros/alcance";

export type CoberturaHoy = {
  fecha: string;
  programados: number;
  cubiertos: number;
  ppc: number;
  cobertura: number | null;
};

/** Cobertura de la pauta del día de hoy en las instalaciones a cargo del actor. */
export async function coberturaHoy(ctx: Contexto): Promise<CoberturaHoy | null> {
  if (
    !enScope(ctx, "pauta") ||
    !ctx.modulosActivos.includes("pauta") ||
    !ctx.autorizar("pauta:read")
  )
    return null;
  const fecha = await hoyPauta(ctx);
  const [anio, mes] = fecha.split("-").map(Number) as [number, number];
  const instalaciones = await ctx.db.instalacion.findMany({
    where: { archivadaEn: null, ...dondeInstalacion(ctx) },
    select: { id: true, nombre: true, region: true, cuenta: { select: { nombre: true } } },
  });
  const puestos = await ctx.db.puesto.findMany({
    where: {
      estado: "activo",
      instalacionId: { in: instalaciones.map((i) => i.id) },
      AND: [dondePuesto(ctx)],
    },
    select: { id: true, instalacionId: true },
  });
  const m = await cargarMes(ctx, puestos, instalaciones, anio, mes);
  const delDia = puestos.flatMap((p) =>
    (m.celdas.get(p.id) ?? []).filter((c) => c.fecha === fecha),
  );
  const { programados, cubiertos, ppc, cobertura } = resumirCobertura(delDia);
  return { fecha, programados, cubiertos, ppc, cobertura };
}
