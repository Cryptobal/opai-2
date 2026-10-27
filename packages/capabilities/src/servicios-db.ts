// Implementaciones reales (base de datos) de los servicios del núcleo para el Contexto.
import {
  agregarABitacora,
  consumirPresupuesto,
  enTransaccion,
  forTenant,
  globales,
  type Prisma,
  verificarBitacora,
} from "@opai/db";

import type {
  Actor,
  BitacoraServicio,
  ConsumoNuevo,
  Contexto,
  Eventos,
  Medidor,
  Trabajos,
} from "./types";
import { ErrorCapacidad } from "./errores";

const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v ?? {}));

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
async function registrarConsumo({ sinCosto, yaIncurrido, ...c }: ConsumoNuevo) {
  const unitario = sinCosto ? 0 : await precioDe(c.recurso);
  const costoTotal = unitario * c.cantidad;
  const interno =
    c.actorTipo === "agent" && !c.apiKeyId && c.actorId?.startsWith("agente-interno:");
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
