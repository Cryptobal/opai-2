import type { Contexto } from "../../types";
import type { Equipo, Hecho, Rechazos } from "./acceso-tipos";
import {
  cierresDe,
  comoPlantilla,
  dependenciasDe,
  iniciosDe,
  marcasConRondaDe,
  type Plantilla,
} from "./rondas-ejecucion-hechos";

const conPuntos = { select: { puntoId: true, obligatorio: true } } as const;

export type ContextoEjecucion = {
  iniciosOk: ReturnType<typeof iniciosDe>;
  cierresOk: { h: Hecho; ejecucionClave: string }[];
  conocidas: Map<string, { plantilla: Plantilla; cerrada: boolean }>;
  claves: string[];
  dependen: Map<string, string>;
};

export async function armarContextoEjecucion(
  ctx: Contexto,
  equipo: Equipo,
  hechos: readonly Hecho[],
  rechazos: Rechazos,
): Promise<ContextoEjecucion | null> {
  const ini = iniciosDe(hechos);
  const cie = cierresDe(hechos);
  const mar = marcasConRondaDe(hechos);
  if (ini.length + cie.length + mar.length === 0) return null;

  const plantillaIds = [...new Set(ini.map((i) => i.plantillaId))];
  const claves = [
    ...new Set([...cie.map((c) => c.ejecucionClave), ...mar.map((m) => m.ejecucionClave)]),
  ];
  const [plantillas, previas] = await Promise.all([
    plantillaIds.length
      ? ctx.db.plantillaRonda.findMany({
          where: {
            id: { in: plantillaIds },
            instalacionId: equipo.instalacionId,
            estado: "activo",
          },
          select: { id: true, permiteAdhoc: true, umbralIncompletaPct: true, puntos: conPuntos },
        })
      : [],
    claves.length
      ? ctx.db.ejecucionRonda.findMany({
          where: { dispositivoId: equipo.id, clave: { in: claves } },
          select: {
            id: true,
            clave: true,
            cierre: { select: { id: true } },
            plantilla: { select: { id: true, umbralIncompletaPct: true, puntos: conPuntos } },
          },
        })
      : [],
  ]);
  const porId = new Map(plantillas.map((p) => [p.id, p]));
  const conocidas = new Map<string, { plantilla: Plantilla; cerrada: boolean }>();
  for (const e of previas)
    conocidas.set(e.clave, { plantilla: comoPlantilla(e.plantilla), cerrada: e.cierre !== null });

  const iniciosOk: typeof ini = [];
  for (const i of ini) {
    const p = porId.get(i.plantillaId);
    if (!p) rechazos.set(i.h.clave, "plantilla_invalida");
    else if (!p.permiteAdhoc) rechazos.set(i.h.clave, "ronda_no_permitida");
    else {
      iniciosOk.push(i);
      conocidas.set(i.h.clave, { plantilla: comoPlantilla(p), cerrada: false });
    }
  }
  for (const m of mar)
    if (!conocidas.has(m.ejecucionClave)) rechazos.set(m.h.clave, "ejecucion_desconocida");

  const cierresOk: { h: Hecho; ejecucionClave: string }[] = [];
  const cerradasEnLote = new Set<string>();
  for (const c of cie) {
    const e = conocidas.get(c.ejecucionClave);
    if (!e) rechazos.set(c.h.clave, "ejecucion_desconocida");
    else if (e.cerrada || cerradasEnLote.has(c.ejecucionClave))
      rechazos.set(c.h.clave, "ronda_ya_cerrada");
    else {
      cerradasEnLote.add(c.ejecucionClave);
      cierresOk.push(c);
    }
  }

  return {
    iniciosOk,
    cierresOk,
    conocidas,
    claves,
    dependen: dependenciasDe(iniciosOk, previas, [...mar, ...cie]),
  };
}