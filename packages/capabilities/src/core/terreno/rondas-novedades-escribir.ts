import type { Contexto } from "../../types";
import type { Equipo, Hecho, Tiempo } from "./acceso-tipos";
import { senalRonda } from "./rondas-senales";

type NovedadValida = {
  h: Hecho;
  p: {
    puntoId?: string;
    tipoIncidenteId?: string;
    ejecucionClave?: string;
    gravedad?: string;
    resumen: string;
    detalle?: string | null;
  };
};

export async function escribirNovedadesLibro(
  ctx: Contexto,
  equipo: Equipo,
  t: Tiempo,
  validas: readonly NovedadValida[],
  gravedadDe: ReadonlyMap<string, string>,
  tx: Contexto["db"],
  aceptadas: ReadonlySet<string>,
  ids: ReadonlyMap<string, string>,
): Promise<void> {
  const aceptables = validas.filter(({ h }) => aceptadas.has(h.clave));
  const faltan = [
    ...new Set(
      aceptables.flatMap(({ p }) =>
        p.ejecucionClave && !ids.has(p.ejecucionClave) ? [p.ejecucionClave] : [],
      ),
    ),
  ];
  const otras = faltan.length
    ? await tx.ejecucionRonda.findMany({
        where: { dispositivoId: equipo.id, clave: { in: faltan } },
        select: { id: true, clave: true },
      })
    : [];
  const rondaDe = new Map([...ids, ...otras.map((e) => [e.clave, e.id] as const)]);
  const data = aceptables.map(({ h, p }) => ({
    tenantId: ctx.tenantId,
    instalacionId: equipo.instalacionId,
    modulo: "rondas",
    origen: p.puntoId ? "punto" : p.ejecucionClave ? "ronda" : "manual",
    ejecucionId: p.ejecucionClave ? (rondaDe.get(p.ejecucionClave) ?? null) : null,
    puntoId: p.puntoId ?? null,
    tipoIncidenteId: p.tipoIncidenteId ?? null,
    gravedad:
      p.gravedad ?? (p.tipoIncidenteId ? gravedadDe.get(p.tipoIncidenteId) : undefined) ?? "media",
    resumen: p.resumen,
    detalle: p.detalle ?? null,
    dispositivoId: equipo.id,
    personaId: h.personaId ?? null,
    horaHecho: t.corregir(new Date(h.horaHecho)),
    idempotencyKey: h.clave,
  }));
  if (data.length === 0) return;
  const nuevas = await tx.libroNovedad.createManyAndReturn({
    skipDuplicates: true,
    data,
    select: { id: true, numero: true, gravedad: true, personaId: true },
  });
  for (const n of nuevas.filter((x) => x.gravedad === "alta")) {
    await ctx.eventos.emitir(tx, {
      tipo: "rondas.novedad.grave",
      entidadTipo: "libro_novedad",
      entidadId: n.id,
      payload: { ...senalRonda(equipo.instalacionId, n.personaId), numero: n.numero },
    });
  }
}