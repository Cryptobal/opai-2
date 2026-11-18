import type { Contexto } from "../../types";
import type { Equipo, Hecho, Rechazos, Tiempo } from "./acceso-tipos";
import { TIPOS_HECHO_TERRENO } from "./hechos-tipos";
import { escribirNovedadesLibro } from "./rondas-novedades-escribir";

export type NovedadesResueltas = {
  rechazos: Rechazos;
  escribir: (
    tx: Contexto["db"],
    aceptadas: ReadonlySet<string>,
    ids: ReadonlyMap<string, string>,
  ) => Promise<void>;
};

/**
 * Novedades de ronda por la cola (CAR-78 · E5a) hacia el libro de novedades del núcleo (CAR-77,
 * `core.libro_novedades`), con el equipo, la persona declarada y la hora del hecho corregida.
 */
export async function resolverNovedades(
  ctx: Contexto,
  equipo: Equipo,
  hechos: readonly Hecho[],
  t: Tiempo,
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
  const gravedadDe = new Map(tipos.map((ti) => [ti.id, ti.gravedadDefecto]));
  const validas = nov.filter(({ h, p }) => {
    if (p.puntoId && !puntoOk.has(p.puntoId)) rechazos.set(h.clave, "punto_invalido");
    else if (p.tipoIncidenteId && !gravedadDe.has(p.tipoIncidenteId))
      rechazos.set(h.clave, "tipo_incidente_invalido");
    else return true;
    return false;
  });

  return {
    rechazos,
    escribir: (tx, aceptadas, ids) =>
      escribirNovedadesLibro(ctx, equipo, t, validas, gravedadDe, tx, aceptadas, ids),
  };
}