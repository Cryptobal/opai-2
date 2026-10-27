// Implementaciones reales (base de datos) de los servicios del núcleo para el Contexto.
import {
  agregarAAuditoria,
  agregarABitacora,
  enTransaccion,
  forTenant,
  globales,
  type Prisma,
  verificarAuditoria,
  verificarBitacora,
} from "@opai/db";

import type {
  Actor,
  Auditoria,
  BitacoraServicio,
  Contexto,
  Eventos,
  Medidor,
  Trabajos,
} from "./types";

const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v ?? {}));

/** Auditoría encadenada en `core.audit_events` (auditoría del 26-oct-2026, ADR-051). */
export function auditoriaEnDb(tenantId: string): Auditoria {
  return {
    registrar(tx, evento) {
      return agregarAAuditoria(tx, evento.tenantId, {
        actorTipo: evento.actor.tipo,
        actorId: evento.actor.id ?? null,
        viaUserId: evento.actor.viaUserId ?? null,
        capability: evento.capability,
        entityType: evento.entityType ?? null,
        entityId: evento.entityId ?? null,
        payload: evento.payload ?? null,
      });
    },
    verificar: () => verificarAuditoria(tenantId),
  };
}

/** Precios vigentes (micro-USD por unidad) con caché de 10 minutos por proceso. */
let precios: { hasta: number; mapa: Map<string, number> } | null = null;

async function precioDe(recurso: string): Promise<number> {
  if (!precios || precios.hasta < Date.now()) {
    const filas = await globales().precioRecurso.findMany({
      where: { vigenteDesde: { lte: new Date() } },
      orderBy: { vigenteDesde: "asc" },
    });
    // Ordenado por vigencia: el último de cada recurso es el vigente.
    precios = {
      hasta: Date.now() + 600_000,
      mapa: new Map(filas.map((f) => [f.recurso, f.costoUnitarioMicro])),
    };
  }
  return precios.mapa.get(recurso) ?? 0;
}

/** Medidor en `core.consumos` (ADR-031). El borde lo envuelve para no retrasar respuestas. */
export const medidorEnDb: Medidor = {
  async registrar({ sinCosto, ...c }) {
    const unitario = sinCosto ? 0 : await precioDe(c.recurso);
    await forTenant(c.tenantId).consumo.create({
      data: { ...c, costoUnitarioMicro: unitario, costoTotalMicro: unitario * c.cantidad },
    });
  },
};

export function eventosEnDb(tenantId: string, actor: Actor): Eventos {
  return {
    async emitir(tx, e) {
      const fila = await tx.evento.create({
        data: {
          tenantId,
          tipo: e.tipo,
          entidadTipo: e.entidadTipo ?? null,
          entidadId: e.entidadId ?? null,
          payload: json(e.payload),
          actorTipo: actor.tipo,
          actorId: actor.id ?? null,
          viaUserId: actor.viaUserId ?? null,
        },
      });
      return fila.id;
    },
  };
}

export function trabajosEnDb(tenantId: string): Trabajos {
  return {
    async encolar(tx, t) {
      const r = await tx.trabajo.createMany({
        data: [
          {
            tenantId,
            tipo: t.tipo,
            payload: json(t.payload),
            programadoPara: t.programadoPara ?? new Date(),
            claveUnica: t.claveUnica ?? null,
            maxIntentos: t.maxIntentos ?? 5,
          },
        ],
        // ON CONFLICT DO NOTHING: una clave única repetida no aborta la transacción.
        skipDuplicates: true,
      });
      return r.count === 1;
    },
  };
}

export function bitacoraEnDb(tenantId: string): BitacoraServicio {
  return {
    registrar: (tx, hecho) => agregarABitacora(tx, tenantId, hecho),
    verificar: () => verificarBitacora(tenantId),
  };
}

export const transaccionEnDb =
  (tenantId: string): Contexto["transaccion"] =>
  (fn) =>
    enTransaccion(tenantId, fn);
