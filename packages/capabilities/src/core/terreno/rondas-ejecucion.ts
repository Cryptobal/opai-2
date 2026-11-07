import type { Contexto } from "../../types";
import type { Equipo, Hecho, Rechazos, Tiempo } from "./acceso-tipos";
import { escribirCierres } from "./rondas-cierre";
import {
  cierresDe,
  comoPlantilla,
  iniciosDe,
  marcasConRondaDe,
  type Plantilla,
} from "./rondas-ejecucion-hechos";

export type EjecucionesResueltas = {
  rechazos: Rechazos;
  /** Inserta los inicios aceptados y devuelve clave de la ronda → id. */
  iniciar: (tx: Contexto["db"], aceptadas: ReadonlySet<string>) => Promise<Map<string, string>>;
  /** Inserta los cierres aceptados (después de las marcas de la misma transacción). */
  cerrar: (
    tx: Contexto["db"],
    aceptadas: ReadonlySet<string>,
    ids: ReadonlyMap<string, string>,
  ) => Promise<void>;
};

/**
 * Ejecución de rondas por la cola (CAR-78 · E3d). El inicio exige una plantilla activa de la instalación del equipo
 * que permita rondas no programadas; las marcas y el cierre deben apuntar a una ronda conocida (ya guardada o
 * iniciada en el mismo lote); el cierre calcula completa o incompleta con los puntos obligatorios marcados y el
 * umbral de la plantilla. Todo es solo inserción: sin cierre, la ronda está «en curso». No marca presencia laboral.
 */
export async function resolverEjecuciones(
  ctx: Contexto,
  equipo: Equipo,
  hechos: readonly Hecho[],
  t: Tiempo,
): Promise<EjecucionesResueltas> {
  const rechazos: Rechazos = new Map();
  const ini = iniciosDe(hechos);
  const cie = cierresDe(hechos);
  const mar = marcasConRondaDe(hechos);
  const ninguno: EjecucionesResueltas = {
    rechazos,
    iniciar: async () => new Map(),
    cerrar: async () => undefined,
  };
  if (ini.length + cie.length + mar.length === 0) return ninguno;
  if (!ctx.modulosActivos.includes("rondas")) {
    for (const { h } of [...ini, ...cie, ...mar]) rechazos.set(h.clave, "modulo_inactivo");
    return ninguno;
  }

  const conPuntos = { select: { puntoId: true, obligatorio: true } } as const;
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

  const base = {
    tenantId: ctx.tenantId,
    instalacionId: equipo.instalacionId,
    dispositivoId: equipo.id,
  };
  return {
    rechazos,
    async iniciar(tx, aceptadas) {
      const nuevos = iniciosOk.filter((i) => aceptadas.has(i.h.clave));
      if (nuevos.length > 0) {
        await tx.ejecucionRonda.createMany({
          skipDuplicates: true,
          data: nuevos.map((i) => ({
            ...base,
            clave: i.h.clave,
            plantillaId: i.plantillaId,
            personaId: i.h.personaId ?? null,
            adhoc: true,
            horaInicio: t.corregir(new Date(i.h.horaHecho)),
          })),
        });
      }
      const todas = await tx.ejecucionRonda.findMany({
        where: {
          dispositivoId: equipo.id,
          clave: { in: claves.concat(nuevos.map((i) => i.h.clave)) },
        },
        select: { id: true, clave: true },
      });
      return new Map(todas.map((e) => [e.clave, e.id]));
    },
    cerrar: (tx, aceptadas, ids) =>
      escribirCierres(tx, {
        base,
        conocidas,
        cierres: cierresOk,
        aceptadas,
        ids,
        corregir: t.corregir,
      }),
  };
}
