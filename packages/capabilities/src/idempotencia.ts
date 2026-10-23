import { jsonCanonico, sha256Hex } from "@opai/domain";
import type { TenantDb } from "@opai/db";

import type { Actor } from "./types";

/** Una clave de idempotencia vale 24 horas (lo que dura un reintento razonable de un agente). */
export const VIGENCIA_IDEMPOTENCIA_MS = 24 * 3_600_000;
/** Una reserva "en_curso" más vieja que esto quedó huérfana (la función dura 60 s): se libera. */
const EN_CURSO_MAXIMO_MS = 10 * 60_000;
/** Marca de una escritura hecha cuyo resultado no validó: la repetición responde lo mismo. */
export const SALIDA_INVALIDA = "__salidaInvalida";

export type ReservaIdempotencia =
  | { estado: "nueva"; id: string }
  | { estado: "hecha"; resultado: unknown }
  | { estado: "en_curso" }
  | { estado: "distinta" };

export interface Idempotencia {
  /** Reserva la clave antes de ejecutar; si ya se usó, dice cómo terminó. */
  reservar(capability: string, clave: string, input: unknown): Promise<ReservaIdempotencia>;
  completar(id: string, resultado: unknown): Promise<void>;
  /** Libera la reserva si la ejecución falló: el cliente puede reintentar con la misma clave. */
  liberar(id: string): Promise<void>;
}

const actorClave = (a: Actor) => (a.tipo === "system" ? "system" : `${a.tipo}:${a.id ?? ""}`);

/** Implementación sobre `core.idempotencias` (sirve igual para la base real y la de memoria). */
export function idempotenciaSobre(db: TenantDb, tenantId: string, actor: Actor): Idempotencia {
  return {
    async reservar(capability, clave, input) {
      const huella = await sha256Hex(`${capability}\n${jsonCanonico(input)}`);
      const where = { tenantId_actor_clave: { tenantId, actor: actorClave(actor), clave } };
      const previa = await db.idempotencia.findUnique({ where });
      const edad = previa ? Date.now() - previa.createdAt.getTime() : 0;
      const vencida =
        previa &&
        (edad > VIGENCIA_IDEMPOTENCIA_MS ||
          (previa.estado === "en_curso" && edad > EN_CURSO_MAXIMO_MS));
      if (previa && !vencida) {
        if (previa.huella !== huella || previa.capability !== capability) {
          return { estado: "distinta" };
        }
        return previa.estado === "hecha"
          ? { estado: "hecha", resultado: previa.resultado }
          : { estado: "en_curso" };
      }
      if (previa) await db.idempotencia.delete({ where: { id: previa.id } });
      try {
        const fila = await db.idempotencia.create({
          data: { tenantId, actor: actorClave(actor), clave, capability, huella },
        });
        return { estado: "nueva", id: fila.id };
      } catch (error) {
        // Otro intento con la misma clave ganó la carrera (índice único). Otro error se propaga.
        if ((error as { code?: unknown } | null)?.code === "P2002") return { estado: "en_curso" };
        throw error;
      }
    },
    async completar(id, resultado) {
      await db.idempotencia.update({
        where: { id },
        data: { estado: "hecha", resultado: JSON.parse(JSON.stringify(resultado ?? null)) },
      });
    },
    async liberar(id) {
      await db.idempotencia.deleteMany({ where: { id } });
    },
  };
}
