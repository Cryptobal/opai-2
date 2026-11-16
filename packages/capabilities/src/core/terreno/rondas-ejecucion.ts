import type { Contexto } from "../../types";
import type { Equipo, Hecho, Rechazos, Tiempo } from "./acceso-tipos";
import type { MotivoRechazo } from "./hechos-evaluar";
import { armarContextoEjecucion } from "./rondas-ejecucion-contexto";
import { escribirCierres } from "./rondas-cierre";
import { cierresDe, iniciosDe, marcasConRondaDe } from "./rondas-ejecucion-hechos";

export type EjecucionesResueltas = {
  rechazos: Rechazos;
  dependientesDe: (caidas: ReadonlySet<string>) => Map<string, MotivoRechazo>;
  iniciar: (tx: Contexto["db"], aceptadas: ReadonlySet<string>) => Promise<Map<string, string>>;
  cerrar: (
    tx: Contexto["db"],
    aceptadas: ReadonlySet<string>,
    ids: ReadonlyMap<string, string>,
  ) => Promise<void>;
};

const vacio = (rechazos: Rechazos): EjecucionesResueltas => ({
  rechazos,
  dependientesDe: () => new Map(),
  iniciar: async () => new Map(),
  cerrar: async () => undefined,
});

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
  if (ini.length + cie.length + mar.length === 0) return vacio(rechazos);

  if (!ctx.modulosActivos.includes("rondas")) {
    for (const { h } of [...ini, ...cie, ...mar]) rechazos.set(h.clave, "modulo_inactivo");
    return vacio(rechazos);
  }

  const contexto = await armarContextoEjecucion(ctx, equipo, hechos, rechazos);
  if (!contexto) return vacio(rechazos);

  const base = {
    tenantId: ctx.tenantId,
    instalacionId: equipo.instalacionId,
    dispositivoId: equipo.id,
  };
  const { iniciosOk, cierresOk, conocidas, claves, dependen } = contexto;

  return {
    rechazos,
    dependientesDe(caidas) {
      const r = new Map<string, MotivoRechazo>();
      for (const [dependiente, inicio] of dependen)
        if (caidas.has(inicio)) r.set(dependiente, "ejecucion_desconocida");
      return r;
    },
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
      escribirCierres(tx, ctx.eventos, {
        base,
        conocidas,
        cierres: cierresOk,
        aceptadas,
        ids,
        corregir: t.corregir,
      }),
  };
}