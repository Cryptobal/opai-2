// Corte de acceso al terminar el último vínculo de una persona (CAR-355 parte 2, referente Rippling:
// la salida corta el acceso en el mismo acto). Corre dentro de la transacción de `core.vinculos.terminar`:
//   · la persona queda inactiva → su PIN de terreno deja de servir y sale de «¿Quién eres?»;
//   · su usuario (si tiene) queda con la membresía de esta empresa suspendida, salvo si es owner:
//     el último dueño nunca se bloquea solo; se avisa para que lo haga una persona. Tampoco se suspende
//     a un admin si quien termina no puede gestionar usuarios (rol personalizado), ni el propio usuario
//     de quien termina: quedan informados en `sinSuspender`.
// Las llaves y credenciales del módulo Acceso quedan para ese módulo (`core.vinculo.terminado` lleva
// el corte como prueba); hoy ningún consumidor de Acceso lo escucha (pendiente en ESTADO.md).
import { z } from "zod";

import type { TenantTx } from "@opai/db";

export const corteAccesoSchema = z.object({
  /** La persona quedó inactiva (el PIN de terreno ya no sirve). */
  personaInactiva: z.boolean(),
  /** Membresías de su usuario en esta empresa que se suspendieron. */
  membresiasSuspendidas: z.number().int(),
  /** Su usuario es owner: no se suspende solo; lo decide una persona en Usuarios y permisos. */
  ownerConservado: z.boolean(),
  /** Membresías activas que quedaron sin suspender (owner, admin sin permiso de usuarios o el propio usuario). */
  sinSuspender: z.number().int(),
});
export type CorteAcceso = z.infer<typeof corteAccesoSchema>;

const SIN_CORTE: CorteAcceso = {
  personaInactiva: false,
  membresiasSuspendidas: 0,
  ownerConservado: false,
  sinSuspender: 0,
};

/** Quién corta: su empresa, si puede gestionar usuarios y su propio usuario. */
export type QuienCorta = { tenantId: string; gestionaUsuarios: boolean; usuarioId: string | null };

/** Qué se cortaría (vista previa) o qué se cortó (`aplicar`). Sin vínculos vigentes, nada más. */
export async function cortarAccesos(
  db: Pick<TenantTx, "vinculoLaboral" | "persona" | "membership">,
  v: { id: string; personaId: string },
  quien: QuienCorta,
  aplicar: boolean,
): Promise<CorteAcceso> {
  const personaId = v.personaId;
  // En la vista previa el vínculo aún está vigente: se cuentan los demás.
  const quedan = await db.vinculoLaboral.count({ where: { personaId, estado: "vigente", id: { not: v.id } } });
  if (quedan) return SIN_CORTE;
  const persona = await db.persona.findUnique({ where: { id: personaId }, select: { usuarioId: true } });
  const membresias = persona?.usuarioId
    ? await db.membership.findMany({
        where: { tenantId: quien.tenantId, userId: persona.usuarioId, estado: "activa" },
        select: { id: true, rol: true, userId: true },
      })
    : [];
  const suspender = membresias.filter(
    (m) =>
      m.rol !== "owner" &&
      (m.rol !== "admin" || quien.gestionaUsuarios) &&
      m.userId !== quien.usuarioId,
  );
  if (aplicar) {
    await db.persona.update({ where: { id: personaId }, data: { estado: "inactiva" } });
    if (suspender.length)
      await db.membership.updateMany({
        where: { tenantId: quien.tenantId, id: { in: suspender.map((m) => m.id) }, estado: "activa" },
        data: { estado: "suspendida" },
      });
  }
  return {
    personaInactiva: true,
    membresiasSuspendidas: suspender.length,
    ownerConservado: membresias.some((m) => m.rol === "owner"),
    sinSuspender: membresias.length - suspender.length,
  };
}
