// Corte de acceso programado (CAR-385, Estándares H-2b; referente Rippling: la fecha de término y la del
// corte de acceso son dos cosas distintas, y por defecto el acceso se corta al cierre del último día
// trabajado). Si `core.vinculos.terminar` deja a la persona sin vínculos vigentes con un término posterior
// a hoy (o con otro vínculo terminado que aún no llega a su fecha), no corta en el acto: encola este
// trabajo para el cierre del día de término más lejano. Al correr comprueba que nada cambió (el vínculo
// sigue terminado con el mismo término, sin otro vigente ni otro término pendiente) y aplica
// `cortarAccesos` con los resguardos de quien terminó; el hecho queda en `core.vinculo.accesos_cortados`.
import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { TenantTx } from "@opai/db";
import { instanteEnZona } from "@opai/domain";

import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { hoyEn, zonaDelTenant } from "../turnos/comun";
import { type QuienCorta, cortarAccesos } from "./vinculos-corte";

export const TIPO_CORTE_PROGRAMADO = "core.vinculos.cortar_accesos";
const dia = (d: Date) => d.toISOString().slice(0, 10);

const payloadSchema = z.object({
  vinculoId: z.string().uuid(),
  termino: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gestionaUsuarios: z.boolean(),
  usuarioId: z.string().uuid().nullable(),
});

/**
 * Instante del corte si el término es posterior a hoy en la zona; `null` si corresponde cortar ya.
 * Es el minuto siguiente a las 23:59 locales: así el cambio de hora de septiembre (las 00:00 no
 * existen) no adelanta el corte.
 */
export function instanteDeCorte(termino: string, zona: string, ahora: Date = new Date()): Date | null {
  if (termino <= hoyEn(zona, ahora)) return null;
  return new Date(Date.parse(instanteEnZona(termino, "23:59", zona)) + 60_000);
}

/** El término más lejano entre este y los demás vínculos terminados de la persona que aún no llegan. */
export async function terminoDeCorte(
  db: Pick<TenantTx, "vinculoLaboral">,
  v: { id: string; personaId: string },
  termino: string,
  hoy: string,
): Promise<string> {
  const otros = await db.vinculoLaboral.findMany({
    where: { personaId: v.personaId, estado: "terminado", id: { not: v.id }, termino: { gt: new Date(`${hoy}T00:00:00Z`) } },
    select: { termino: true },
  });
  return otros.reduce((max, o) => (o.termino && dia(o.termino) > max ? dia(o.termino) : max), termino);
}

/** Encola el corte dentro de la transacción del término. */
export async function programarCorte(
  ctx: Contexto,
  tx: TenantTx,
  p: { vinculoId: string; termino: string },
  quien: QuienCorta,
  cuando: Date,
): Promise<void> {
  await ctx.trabajos.encolar(tx, {
    tipo: TIPO_CORTE_PROGRAMADO,
    payload: { ...p, gestionaUsuarios: quien.gestionaUsuarios, usuarioId: quien.usuarioId },
    programadoPara: cuando,
    // Cada término programa su propio corte; uno viejo se descarta solo al no coincidir el término.
    claveUnica: `${TIPO_CORTE_PROGRAMADO}:${p.vinculoId}:${randomUUID()}`,
  });
}

export const trabajoCortarAccesosProgramado = defineTrabajo({
  tipo: TIPO_CORTE_PROGRAMADO,
  descripcion:
    "Al cierre del último día trabajado corta el acceso de quien terminó su vínculo con fecha futura: la persona queda inactiva y su usuario suspendido, con los mismos resguardos que el término inmediato.",
  payload: payloadSchema,
  async handler(ctx, p) {
    const hoy = hoyEn(await zonaDelTenant(ctx));
    return ctx.transaccion(async (tx) => {
      const v = await tx.vinculoLaboral.findUnique({
        where: { id: p.vinculoId },
        select: { id: true, personaId: true, estado: true, termino: true },
      });
      if (!v || v.estado !== "terminado" || !v.termino || dia(v.termino) !== p.termino) return { omitido: true };
      // Otro vínculo terminado que aún no llega a su fecha: su propio corte (o este, reprogramado) decide.
      if ((await terminoDeCorte(tx, v, hoy, hoy)) !== hoy) return { omitido: true };
      const antes = await tx.persona.findUnique({ where: { id: v.personaId }, select: { estado: true } });
      const quien = { tenantId: ctx.tenantId, gestionaUsuarios: p.gestionaUsuarios, usuarioId: p.usuarioId };
      const accesos = await cortarAccesos(tx, v, quien, true);
      if (accesos.personaInactiva && antes?.estado === "activa") {
        await ctx.eventos.emitir(tx, {
          tipo: "core.vinculo.accesos_cortados",
          entidadTipo: "vinculo",
          entidadId: v.id,
          payload: { personaId: v.personaId, accesos },
        });
      }
      return accesos;
    });
  },
});
