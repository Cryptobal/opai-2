// Corte de acceso programado (CAR-385, Estándares H-2b; referente Rippling: la fecha de término y la del
// corte de acceso son dos cosas distintas, y por defecto el acceso se corta al cierre del último día
// trabajado). Si `core.vinculos.terminar` recibe un término posterior a hoy en la zona de la empresa, no
// corta en el acto: encola este trabajo para las 00:00 del día siguiente al término. Al correr aplica
// `cortarAccesos` con los mismos resguardos de quien terminó (owner, admin sin permiso de usuarios y su
// propio usuario nunca se suspenden) y deja el hecho en `core.vinculo.accesos_cortados`. Si para entonces
// la persona tiene otro vínculo vigente (recontratación), no corta nada.
import { z } from "zod";

import { instanteEnZona, sumarDias } from "@opai/domain";

import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { hoyEn } from "../turnos/comun";
import { type QuienCorta, cortarAccesos } from "./vinculos-corte";

export const TIPO_CORTE_PROGRAMADO = "core.vinculos.cortar_accesos";

const payloadSchema = z.object({
  vinculoId: z.string().uuid(),
  gestionaUsuarios: z.boolean(),
  usuarioId: z.string().nullable(),
});

/** Instante del corte si el término es posterior a hoy en la zona; `null` si corresponde cortar ya. */
export function instanteDeCorte(termino: string, zona: string, ahora: Date = new Date()): Date | null {
  if (termino <= hoyEn(zona, ahora)) return null;
  return new Date(instanteEnZona(sumarDias(termino, 1), "00:00", zona));
}

/** Encola el corte dentro de la transacción del término (una sola vez por vínculo). */
export async function programarCorte(
  ctx: Contexto,
  tx: Parameters<Contexto["trabajos"]["encolar"]>[0],
  vinculoId: string,
  quien: QuienCorta,
  cuando: Date,
): Promise<void> {
  await ctx.trabajos.encolar(tx, {
    tipo: TIPO_CORTE_PROGRAMADO,
    payload: { vinculoId, gestionaUsuarios: quien.gestionaUsuarios, usuarioId: quien.usuarioId },
    programadoPara: cuando,
    claveUnica: `${TIPO_CORTE_PROGRAMADO}:${vinculoId}`,
  });
}

export const trabajoCortarAccesosProgramado = defineTrabajo({
  tipo: TIPO_CORTE_PROGRAMADO,
  descripcion:
    "Al cierre del último día trabajado corta el acceso de quien terminó su vínculo con fecha futura: la persona queda inactiva y su usuario suspendido, con los mismos resguardos que el término inmediato.",
  payload: payloadSchema,
  async handler(ctx, p) {
    return ctx.transaccion(async (tx) => {
      const v = await tx.vinculoLaboral.findUnique({
        where: { id: p.vinculoId },
        select: { id: true, personaId: true, estado: true },
      });
      if (!v || v.estado !== "terminado") return { omitido: true };
      const quien = { tenantId: ctx.tenantId, gestionaUsuarios: p.gestionaUsuarios, usuarioId: p.usuarioId };
      const accesos = await cortarAccesos(tx, v, quien, true);
      if (accesos.personaInactiva) {
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
