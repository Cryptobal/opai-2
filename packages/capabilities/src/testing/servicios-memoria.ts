// Servicios del núcleo en memoria para tests: outbox, trabajos y bitácora sobre la base falsa.
import { HASH_GENESIS, hashEncadenado, jsonCanonico, primeraRotura } from "@opai/domain";
import type { TenantDb } from "@opai/db";

import type { Actor, BitacoraServicio, Eventos, Trabajos } from "../types";
import type { Fila } from "./db-memoria-util";

export function eventosEnMemoria(db: TenantDb, tenantId: string, actor: Actor): Eventos {
  return {
    async emitir(_tx, e) {
      const fila = await db.evento.create({
        data: {
          tenantId,
          tipo: e.tipo,
          entidadTipo: e.entidadTipo ?? null,
          entidadId: e.entidadId ?? null,
          payload: JSON.parse(JSON.stringify(e.payload ?? {})),
          actorTipo: actor.tipo,
          actorId: actor.id ?? null,
          viaUserId: actor.viaUserId ?? null,
          estado: "pendiente",
          intentos: 0,
        },
      });
      return fila.id;
    },
  };
}

export function trabajosEnMemoria(db: TenantDb, tenantId: string): Trabajos {
  return {
    async encolar(_tx, t) {
      const r = await db.trabajo.createMany({
        data: [
          {
            tenantId,
            tipo: t.tipo,
            payload: JSON.parse(JSON.stringify(t.payload ?? {})),
            estado: "pendiente",
            programadoPara: t.programadoPara ?? new Date(),
            claveUnica: t.claveUnica ?? null,
            intentos: 0,
            maxIntentos: t.maxIntentos ?? 5,
          },
        ],
        skipDuplicates: true,
      });
      return r.count === 1;
    },
  };
}

/** Bitácora con los mismos hashes que la real (dominio compartido). */
export function bitacoraEnMemoria(
  tabla: (n: string) => Fila[],
  tenantId: string,
): BitacoraServicio {
  return {
    async registrar(_tx, hecho) {
      const cadena = tabla("bitacora");
      const ultimo = cadena.at(-1);
      const previo = (ultimo?.["hash"] as string | undefined) ?? HASH_GENESIS;
      const seq = cadena.length + 1;
      const payloadCanon = jsonCanonico({ seq, ...hecho, en: new Date().toISOString() });
      const hash = await hashEncadenado(previo, payloadCanon);
      cadena.push({ tenantId, seq, ...hecho, payloadCanon, hashPrevio: previo, hash });
      return { seq, hash };
    },
    async verificar() {
      const cadena = tabla("bitacora").map((f) => ({
        seq: f["seq"] as number,
        payloadCanon: f["payloadCanon"] as string,
        hashPrevio: f["hashPrevio"] as string,
        hash: f["hash"] as string,
      }));
      const rota = await primeraRotura(cadena);
      return { ok: rota === null, ultimoSeq: cadena.length, primeraRota: rota };
    },
  };
}
