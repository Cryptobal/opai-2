import {
  feriadosLegalesComoEntradas,
  resolverFeriados,
  fechasDelMesPauta,
  type DiaCalendarioEntrada,
} from "@opai/domain";

import type { Contexto } from "../types";
import { aFechaDb, fechaIso } from "./comun";

export type InstalacionBase = { id: string; region: string | null };

/** Feriados del mes para cada instalación: legales + regionales de su región + días del tenant. */
export async function feriadosDelMes(
  ctx: Contexto,
  anio: number,
  mes: number,
  instalaciones: readonly InstalacionBase[],
): Promise<Map<string, Map<string, string>>> {
  const dias = fechasDelMesPauta(anio, mes);
  const filas = await ctx.db.diaCalendario.findMany({
    where: {
      archivadaEn: null,
      fecha: { gte: aFechaDb(dias[0]!), lte: aFechaDb(dias[dias.length - 1]!) },
      OR: [{ tenantId: null }, { tenantId: ctx.tenantId }],
    },
  });
  const legales = feriadosLegalesComoEntradas(anio);
  const salida = new Map<string, Map<string, string>>();
  for (const inst of instalaciones) {
    const entradas: DiaCalendarioEntrada[] = [...legales];
    for (const f of filas) {
      const aplica = f.tenantId
        ? f.instalacionId === null || f.instalacionId === inst.id
        : f.fuente === "nacional" || (f.fuente === "regional" && f.region === inst.region);
      if (!aplica) continue;
      entradas.push({
        fecha: fechaIso(f.fecha),
        nombre: f.nombre,
        irrenunciable: f.irrenunciable,
        fuente: f.fuente as DiaCalendarioEntrada["fuente"],
        region: f.region,
        esTenant: f.tenantId !== null,
      });
    }
    const delMes = resolverFeriados(entradas).filter((f) => f.fecha.startsWith(`${anio}-${String(mes).padStart(2, "0")}`));
    salida.set(inst.id, new Map(delMes.map((f) => [f.fecha, f.nombre])));
  }
  return salida;
}
