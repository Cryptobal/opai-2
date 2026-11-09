import type { Contexto } from "../../types";
import type { Equipo, Hecho, Rechazos } from "./acceso-tipos";
import { TIPOS_HECHO_TERRENO } from "./hechos-tipos";

export type NovedadesResueltas = {
  rechazos: Rechazos;
  /** Escribe en el libro de novedades las aceptadas; `ids` es clave de ronda → id (para enlazarlas). */
  escribir: (
    tx: Contexto["db"],
    aceptadas: ReadonlySet<string>,
    ids: ReadonlyMap<string, string>,
  ) => Promise<void>;
};

/**
 * Novedades de ronda por la cola (CAR-78 · E5a). El punto debe ser de la instalación del equipo y el tipo de
 * incidente del tenant y activo; la gravedad por defecto es la del tipo. La clave del hecho es la clave de
 * idempotencia de la novedad, así que reenviar no duplica. Si la ronda a la que apunta no existe, la novedad se
 * guarda igual sin ronda: una novedad nunca se pierde. No marca presencia laboral.
 */
export async function resolverNovedades(
  ctx: Contexto,
  equipo: Equipo,
  hechos: readonly Hecho[],
): Promise<NovedadesResueltas> {
  const rechazos: Rechazos = new Map();
  const nov = hechos.flatMap((h) => {
    const r =
      h.tipo === "rondas.novedad"
        ? TIPOS_HECHO_TERRENO["rondas.novedad"].safeParse(h.payload)
        : null;
    return r?.success ? [{ h, p: r.data }] : [];
  });
  if (nov.length === 0) return { rechazos, escribir: async () => undefined };
  if (!ctx.modulosActivos.includes("rondas")) {
    for (const { h } of nov) rechazos.set(h.clave, "modulo_inactivo");
    return { rechazos, escribir: async () => undefined };
  }
  const puntoIds = [...new Set(nov.flatMap((n) => (n.p.puntoId ? [n.p.puntoId] : [])))];
  const tipoIds = [
    ...new Set(nov.flatMap((n) => (n.p.tipoIncidenteId ? [n.p.tipoIncidenteId] : []))),
  ];
  const [puntos, tipos] = await Promise.all([
    puntoIds.length
      ? ctx.db.puntoControl.findMany({
          where: { id: { in: puntoIds }, instalacionId: equipo.instalacionId },
          select: { id: true },
        })
      : [],
    tipoIds.length
      ? ctx.db.tipoIncidente.findMany({
          where: { id: { in: tipoIds }, activo: true },
          select: { id: true, gravedadDefecto: true },
        })
      : [],
  ]);
  const puntoOk = new Set(puntos.map((p) => p.id));
  const gravedadDe = new Map(tipos.map((t) => [t.id, t.gravedadDefecto]));
  const validas = nov.filter(({ h, p }) => {
    if (p.puntoId && !puntoOk.has(p.puntoId)) rechazos.set(h.clave, "punto_invalido");
    else if (p.tipoIncidenteId && !gravedadDe.has(p.tipoIncidenteId))
      rechazos.set(h.clave, "tipo_incidente_invalido");
    else return true;
    return false;
  });
  return {
    rechazos,
    async escribir(tx, aceptadas, ids) {
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
        origen: p.puntoId ? "punto" : p.ejecucionClave ? "ronda" : "manual",
        ejecucionId: p.ejecucionClave ? (rondaDe.get(p.ejecucionClave) ?? null) : null,
        puntoId: p.puntoId ?? null,
        tipoIncidenteId: p.tipoIncidenteId ?? null,
        gravedad:
          p.gravedad ??
          (p.tipoIncidenteId ? gravedadDe.get(p.tipoIncidenteId) : undefined) ??
          "media",
        resumen: p.resumen,
        detalle: p.detalle ?? null,
        idempotencyKey: h.clave,
      }));
      if (data.length > 0) await tx.novedad.createMany({ skipDuplicates: true, data });
    },
  };
}
