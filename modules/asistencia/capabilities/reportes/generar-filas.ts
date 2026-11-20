import type { Contexto } from "@opai/capabilities";

import type { TipoReporteDt } from "../../domain/reportes";
import { filasDesdeDias } from "./filas-dias";
import {
  filasDomingosFestivos,
  filasIncidentes,
  filasModificaciones,
  filasReporteDiario,
} from "./filas-otros";
import { type FiltroFilas, zonaTenant } from "./filas-comun";

export async function generarFilasReporte(
  ctx: Contexto,
  tipo: TipoReporteDt,
  filtro: FiltroFilas,
  alcance: { instalacionId?: { in: string[] } },
) {
  const zona = await zonaTenant(ctx);
  if (tipo === "asistencia") return filasDesdeDias(ctx, filtro, alcance, zona, false);
  if (tipo === "jornada_diaria") return filasDesdeDias(ctx, filtro, alcance, zona, true);
  if (tipo === "domingos_festivos") return filasDomingosFestivos(ctx, filtro, alcance);
  if (tipo === "modificaciones_turnos") return filasModificaciones(ctx, filtro, alcance);
  if (tipo === "reporte_diario") return filasReporteDiario(ctx, filtro, alcance, zona);
  return filasIncidentes(ctx, filtro);
}