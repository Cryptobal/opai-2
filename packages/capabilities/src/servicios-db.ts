// Implementaciones reales (base de datos) de los servicios del núcleo para el Contexto.
import {
  agregarAAuditoria,
  registrarConsumoSesion,
  agregarABitacora,
  consumirPresupuesto,
  esAgenteSinKey,
  enTransaccion,
  forTenant,
  preciosHasta,
  type Prisma,
  verificarAuditoria,
  verificarBitacora,
} from "@opai/db";

import type {
  Actor,
  Auditoria,
  BitacoraServicio,
  ConsumoNuevo,
  Contexto,
  Eventos,
  Medidor,
  Trabajos,
} from "./types";
import { ErrorCapacidad } from "./errores";

const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v ?? {}));

/** Auditoría encadenada en `core.audit_events` (auditoría del 26-oct-2026, ADR-052). */
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
    verificar: (signal) => verificarAuditoria(tenantId, signal),
  };
}

/** Precios vigentes (micro-USD por unidad) con caché de 10 minutos por proceso. */
let precios: { hasta: number; mapa: Map<string, number> } | null = null;

async function precioDe(recurso: string): Promise<number> {
  if (!precios || precios.hasta < Date.now()) {
    const filas = (await preciosHasta(new Date())).reverse();
    // Ordenado por vigencia: el último de cada recurso es el vigente.
    precios = {
      hasta: Date.now() + 600_000,
      mapa: new Map(filas.map((f) => [f.recurso, f.costoUnitarioMicro])),
    };
  }
  return precios.mapa.get(recurso) ?? 0;
}

/** Medidor en `core.consumos` (ADR-031). El borde lo envuelve para no retrasar respuestas. */
async function registrarConsumo({ sinCosto, yaIncurrido, ...c }: ConsumoNuevo) {
  if (c.actorTipo === "user" && !c.apiKeyId && c.recurso === "capacidad.ejecucion")
    return registrarConsumoSesion(c, sinCosto);
  const unitario = sinCosto ? 0 : await precioDe(c.recurso);
  const costoTotal = unitario * c.cantidad;
  // Agente interno y apps OAuth comparten el presupuesto del agente de la empresa (ADR-098).
  const interno = c.actorTipo === "agent" && !c.apiKeyId && esAgenteSinKey(c.actorId);
  return enTransaccion(c.tenantId, async (tx) => {
    if (
      (c.apiKeyId || interno) &&
      !(await consumirPresupuesto(tx, c.tenantId, c.apiKeyId ?? null, BigInt(costoTotal), {
        ...(yaIncurrido ? { yaIncurrido } : {}),
        ...(interno ? { agenteInterno: { viaUserId: c.viaUserId! } } : {}),
      }))
    )
      throw new ErrorCapacidad(
        "BUDGET_EXCEEDED",
        "El consumo supera el presupuesto mensual de la key.",
      );
    return tx.consumo.create({
      data: { ...c, costoUnitarioMicro: unitario, costoTotalMicro: costoTotal },
    });
  });
}

export const medidorEnDb: Medidor = {
  registrar: async (c) => {
    await registrarConsumo(c);
  },
  async preparar(c) {
    const fila = await registrarConsumo(c);
    return async (estado) => {
      await forTenant(c.tenantId).consumo.update({ where: { id: fila.id }, data: estado });
    };
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
