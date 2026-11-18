import { estadoDeCierre } from "@opai/domain";

import type { Contexto } from "../../types";
import type { Hecho } from "./acceso-tipos";
import type { Plantilla } from "./rondas-ejecucion-hechos";
import { senalRonda } from "./rondas-senales";

/**
 * Inserta los cierres aceptados, calculando con las marcas ya guardadas si la ronda quedó completa o incompleta.
 * Un cierre incompleto nuevo emite `rondas.ejecucion.incompleta` (CAR-501); un reenvío no lo repite.
 */
export async function escribirCierres(
  tx: Contexto["db"],
  eventos: Contexto["eventos"],
  p: {
    base: { tenantId: string; instalacionId: string; dispositivoId: string };
    conocidas: ReadonlyMap<string, { plantilla: Plantilla; cerrada: boolean }>;
    cierres: readonly { h: Hecho; ejecucionClave: string }[];
    aceptadas: ReadonlySet<string>;
    ids: ReadonlyMap<string, string>;
    corregir: (h: Date) => Date;
  },
): Promise<void> {
  for (const c of p.cierres.filter((x) => p.aceptadas.has(x.h.clave))) {
    const ejecucionId = p.ids.get(c.ejecucionClave);
    const e = p.conocidas.get(c.ejecucionClave);
    if (!ejecucionId || !e) continue;
    const marcas = await tx.marcaRonda.findMany({
      where: { ejecucionId },
      select: { puntoId: true },
    });
    const marcados = new Set(
      marcas.map((m) => m.puntoId).filter((x) => e.plantilla.obligatorios.has(x)),
    ).size;
    const obligatorios = e.plantilla.obligatorios.size;
    const [nuevo] = await tx.cierreRonda.createManyAndReturn({
      skipDuplicates: true,
      select: { estado: true },
      data: [
        {
          ...p.base,
          clave: c.h.clave,
          ejecucionId,
          personaId: c.h.personaId ?? null,
          estado: estadoDeCierre({
            obligatorios,
            marcados,
            umbralIncompletaPct: e.plantilla.umbralIncompletaPct,
          }),
          puntosObligatorios: obligatorios,
          puntosMarcados: marcados,
          horaCierre: p.corregir(new Date(c.h.horaHecho)),
        },
      ],
    });
    if (nuevo?.estado !== "incompleta") continue;
    await eventos.emitir(tx, {
      tipo: "rondas.ejecucion.incompleta",
      entidadTipo: "ejecucion_ronda",
      entidadId: ejecucionId,
      payload: {
        ...senalRonda(p.base.instalacionId, c.h.personaId),
        plantillaId: e.plantilla.id,
        puntosObligatorios: obligatorios,
        puntosMarcados: marcados,
      },
    });
  }
}
