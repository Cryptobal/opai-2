// Servicios del núcleo en memoria para tests: outbox, trabajos, bitácora y auditoría sobre la base
// falsa.
import { canonDeAuditoria, canonDeHecho, HASH_GENESIS, hashEncadenado, primeraRotura } from "@opai/domain";

import type { Actor, Auditoria, BitacoraServicio, Eventos, Trabajos } from "../types";
import type { Fila } from "./db-memoria-util";

/** Como en la real, el evento se escribe con la `tx` del hecho (y se revierte con ella). */
export function eventosEnMemoria(tenantId: string, actor: Actor): Eventos {
  return {
    async emitir(tx, e) {
      const fila = await tx.evento.create({
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

export function trabajosEnMemoria(tenantId: string): Trabajos {
  return {
    async encolar(tx, t) {
      const r = await tx.trabajo.createMany({
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

/** Auditoría encadenada con los mismos hashes que la real (dominio compartido, ADR-023-bis). */
export function auditoriaEnMemoria(tabla: (n: string) => Fila[], tenantId: string): Auditoria {
  return {
    async registrar(tx, evento) {
      const previas = tabla("auditEvent").filter((f) => f["tenantId"] === evento.tenantId);
      const ultima = previas.at(-1);
      const hashAnterior = (ultima?.["hash"] as string | undefined) ?? HASH_GENESIS;
      const seq = previas.length + 1;
      const createdAt = new Date();
      const hashCanon = await canonDeAuditoria({
        tenantId: evento.tenantId,
        seq,
        actorTipo: evento.actor.tipo,
        actorId: evento.actor.id ?? null,
        viaUserId: evento.actor.viaUserId ?? null,
        capability: evento.capability,
        entityType: evento.entityType ?? null,
        entityId: evento.entityId ?? null,
        createdAt,
        payload: evento.payload ?? null,
      });
      const hash = await hashEncadenado(hashAnterior, hashCanon);
      await tx.auditEvent.create({
        data: {
          tenantId: evento.tenantId,
          actorType: evento.actor.tipo,
          actorId: evento.actor.id ?? null,
          viaUserId: evento.actor.viaUserId ?? null,
          capability: evento.capability,
          entityType: evento.entityType ?? null,
          entityId: evento.entityId ?? null,
          payload: JSON.parse(JSON.stringify(evento.payload ?? null)),
          createdAt,
          seq,
          hashAnterior,
          hash,
          hashCanon,
        },
      });
      return { seq, hash };
    },
    async verificar() {
      const cadena = tabla("auditEvent")
        .filter((f) => f["tenantId"] === tenantId)
        .map((f) => ({
          seq: f["seq"] as number,
          payloadCanon: f["hashCanon"] as string,
          hashPrevio: f["hashAnterior"] as string,
          hash: f["hash"] as string,
        }));
      const rota = await primeraRotura(cadena);
      return { ok: rota === null, ultimoSeq: cadena.length, primeraRota: rota };
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
      const payloadCanon = canonDeHecho({ seq, ...hecho }, new Date());
      const hash = await hashEncadenado(previo, payloadCanon);
      cadena.push({
        tenantId,
        seq,
        tipo: hecho.tipo,
        entidadTipo: hecho.entidadTipo ?? null,
        entidadId: hecho.entidadId ?? null,
        payloadCanon,
        hashPrevio: previo,
        hash,
      });
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
