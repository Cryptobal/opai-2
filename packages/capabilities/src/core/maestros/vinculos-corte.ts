// Corte de acceso al terminar el último vínculo de una persona (CAR-355 parte 2, referente Rippling:
// la salida corta el acceso en el mismo acto). Corre dentro de la transacción de `core.vinculos.terminar`:
//   · la persona queda inactiva → su PIN de terreno deja de servir y sale de «¿Quién eres?»;
//   · su usuario (si tiene) queda con la membresía de esta empresa suspendida, salvo si es owner:
//     el último dueño nunca se bloquea solo; se avisa para que lo haga una persona.
// Las llaves y credenciales del módulo Acceso las corta ese módulo con `core.vinculo.terminado`.
import { z } from "zod";

import type { TenantTx } from "@opai/db";

export const corteAccesoSchema = z.object({
  /** La persona quedó inactiva (el PIN de terreno ya no sirve). */
  personaInactiva: z.boolean(),
  /** Membresías de su usuario en esta empresa que se suspendieron. */
  membresiasSuspendidas: z.number().int(),
  /** Su usuario es owner: no se suspende solo; lo decide una persona en Usuarios y permisos. */
  ownerConservado: z.boolean(),
});
export type CorteAcceso = z.infer<typeof corteAccesoSchema>;

const SIN_CORTE: CorteAcceso = { personaInactiva: false, membresiasSuspendidas: 0, ownerConservado: false };

/** Qué se cortaría (vista previa) o qué se cortó (`aplicar`). Sin vínculos vigentes, nada más. */
export async function cortarAccesos(
  db: Pick<TenantTx, "vinculoLaboral" | "persona" | "membership">,
  v: { id: string; personaId: string },
  aplicar: boolean,
): Promise<CorteAcceso> {
  const personaId = v.personaId;
  // En la vista previa el vínculo aún está vigente: se cuentan los demás.
  const quedan = await db.vinculoLaboral.count({ where: { personaId, estado: "vigente", id: { not: v.id } } });
  if (quedan) return SIN_CORTE;
  const persona = await db.persona.findUnique({ where: { id: personaId }, select: { usuarioId: true } });
  const membresias = persona?.usuarioId
    ? await db.membership.findMany({
        where: { userId: persona.usuarioId, estado: "activa" },
        select: { id: true, rol: true },
      })
    : [];
  const suspender = membresias.filter((m) => m.rol !== "owner");
  if (aplicar) {
    await db.persona.update({ where: { id: personaId }, data: { estado: "inactiva" } });
    if (suspender.length)
      await db.membership.updateMany({
        where: { id: { in: suspender.map((m) => m.id) }, estado: "activa" },
        data: { estado: "suspendida" },
      });
  }
  return {
    personaInactiva: true,
    membresiasSuspendidas: suspender.length,
    ownerConservado: suspender.length < membresias.length,
  };
}
