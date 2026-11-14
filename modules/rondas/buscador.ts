import type { Buscador, Contexto } from "@opai/capabilities";

const MAX = 5;
const contiene = (q: string) => ({ contains: q, mode: "insensitive" as const });

/** Alcance de filas (ADR-022) en la consulta: instalaciones a cargo del actor, o null si ve toda la empresa. */
const enAlcance = (ctx: Contexto) =>
  ctx.alcance ? { in: [...ctx.alcance.instalaciones] } : undefined;

/**
 * Aporte de Rondas a la búsqueda global (CAR-405, parte 2 de CAR-301): rondas (plantillas) activas por su nombre o
 * por el nombre de su instalación. Abre la pestaña Rondas de la ficha de la instalación.
 */
export const buscadoresRondas: readonly Buscador[] = [
  {
    modulo: "rondas",
    grupo: "rondas",
    titulo: "Rondas",
    permiso: "rondas:read",
    async buscar(ctx, q) {
      const alcance = enAlcance(ctx);
      const instalaciones = await ctx.db.instalacion.findMany({
        where: { nombre: contiene(q), ...(alcance ? { id: alcance } : {}) },
        select: { id: true },
        take: 50,
      });
      const filas = await ctx.db.plantillaRonda.findMany({
        where: {
          estado: "activo",
          ...(alcance ? { AND: [{ instalacionId: alcance }] } : {}),
          OR: [
            { nombre: contiene(q) },
            ...(instalaciones.length
              ? [{ instalacionId: { in: instalaciones.map((i) => i.id) } }]
              : []),
          ],
        },
        select: { id: true, nombre: true, instalacionId: true },
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
        take: MAX,
      });
      const nombres = new Map(
        (
          await ctx.db.instalacion.findMany({
            where: { id: { in: [...new Set(filas.map((f) => f.instalacionId))] } },
            select: { id: true, nombre: true },
          })
        ).map((i) => [i.id, i.nombre]),
      );
      return filas.map((f) => ({
        id: f.id,
        titulo: f.nombre,
        detalle: nombres.get(f.instalacionId) ?? null,
        href: `/instalaciones/${f.instalacionId}/rondas`,
      }));
    },
  },
];
