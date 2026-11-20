import type { Contexto } from "@opai/capabilities";
import type { z } from "zod";

import { METADATOS_REPORTE } from "../../domain/reportes";
import { alcanceReportes } from "./alcance";
import { cabeceraReporte } from "./cabecera";
import type { filtroReporte } from "./esquema";
import { generarFilasReporte } from "./generar-filas";

type FiltroReporte = z.infer<typeof filtroReporte>;

export async function prepararReporteDt(ctx: Contexto, i: FiltroReporte) {
  const alcance = alcanceReportes(ctx);
  const meta = METADATOS_REPORTE[i.tipo];
  const filtro = {
    desde: i.desde,
    hasta: i.hasta,
    ...(i.personaId ? { personaId: i.personaId } : {}),
    ...(i.instalacionId ? { instalacionId: i.instalacionId } : {}),
  };
  const cabecera = await cabeceraReporte(ctx, filtro);
  const generado = await generarFilasReporte(ctx, i.tipo, filtro, alcance);
  return { meta, cabecera, filtro, tipo: i.tipo, ...generado };
}