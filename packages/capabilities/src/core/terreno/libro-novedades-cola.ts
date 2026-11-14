import type { Contexto } from "../../types";
import type { Equipo, Hecho, Tiempo } from "./acceso-tipos";
import { TIPOS_HECHO_TERRENO } from "./hechos-tipos";

/**
 * Novedades del libro que llegan por la cola del equipo de terreno (`terreno.novedad`, CAR-77 parte 3). No
 * dependen de ningún módulo: el libro es del núcleo. La clave del hecho es la clave de idempotencia, así que
 * reenviar no duplica, y solo lo insertado emite `core.libro_novedades.registrada`.
 */
export function novedadesDelLibro(
  ctx: Contexto,
  equipo: Equipo,
  hechos: readonly Hecho[],
  t: Tiempo,
) {
  const nov = hechos.flatMap((h) => {
    const r =
      h.tipo === "terreno.novedad"
        ? TIPOS_HECHO_TERRENO["terreno.novedad"].safeParse(h.payload)
        : null;
    return r?.success ? [{ h, p: r.data }] : [];
  });
  return async (tx: Contexto["db"], aceptadas: ReadonlySet<string>) => {
    const data = nov
      .filter(({ h }) => aceptadas.has(h.clave))
      .map(({ h, p }) => ({
        tenantId: ctx.tenantId,
        instalacionId: equipo.instalacionId,
        modulo: "terreno",
        origen: "manual",
        gravedad: p.gravedad ?? "media",
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
      select: { id: true, numero: true, gravedad: true },
    });
    for (const n of nuevas)
      await ctx.eventos.emitir(tx, {
        tipo: "core.libro_novedades.registrada",
        entidadTipo: "libro_novedad",
        entidadId: n.id,
        payload: { instalacionId: equipo.instalacionId, numero: n.numero, gravedad: n.gravedad },
      });
  };
}
