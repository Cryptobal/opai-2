import { createHash } from "node:crypto";

import type { Contexto } from "@opai/capabilities";
import { type AvisoFlujo, type DiferenciaFactoring, hoyChile, type IngresoEsperado, proyeccionDeIngresos } from "@opai/capabilities";

import type { CeldaFlujo } from "../domain";
import type { celdaSchema } from "./esquemas";
import { FILA_COBROS_ESPERADOS, FILA_DEPOSITO_FACTORING } from "./filas-virtuales";
import type { z } from "zod";

/** Id estable (UUID v5-like) para una celda proyectada que no tiene fila propia en la base. */
function idEstable(texto: string): string {
  const h = createHash("sha1").update(texto).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const ORIGEN: Record<string, string> = {
  manual: "fijada a mano",
  promedio: "promedio de pago del cliente",
  vencimiento: "vencimiento",
  emision: "emisión",
  programacion: "programación",
};

type OrigenEditable = "manual" | "promedio" | "vencimiento" | "emision";
/** Factura (o borrador) con fecha propia: su fecha esperada se puede fijar a mano. Programaciones y cesiones no. */
function cobroEditable(i: IngresoEsperado): i is IngresoEsperado & { documentoEmitidoId: string; origenFecha: OrigenEditable } {
  return !!i.documentoEmitidoId && (i.origenFecha === "manual" || i.origenFecha === "promedio" || i.origenFecha === "vencimiento" || i.origenFecha === "emision");
}

/** Nombres de clientes e instalaciones de los cobros, en dos lecturas (sin N+1). */
async function nombresDeClientes(ctx: Contexto, items: readonly IngresoEsperado[]) {
  const cuentaIds = [...new Set(items.map((i) => i.cuentaId))];
  const instIds = [...new Set(items.flatMap((i) => (i.instalacionId ? [i.instalacionId] : [])))];
  const [cuentas, insts] = await Promise.all([
    cuentaIds.length ? ctx.db.cuenta.findMany({ where: { id: { in: cuentaIds } }, select: { id: true, nombre: true } }) : [],
    instIds.length ? ctx.db.instalacion.findMany({ where: { id: { in: instIds } }, select: { id: true, nombre: true } }) : [],
  ]);
  return {
    cuentas: new Map(cuentas.map((c) => [c.id, c.nombre])),
    instalaciones: new Map(insts.map((x) => [x.id, x.nombre])),
  };
}

/**
 * Cobros esperados de las facturas por cobrar (ADR-073): un solo criterio de semana, la fecha esperada de cobro.
 * Solo semanas desde la actual dentro de `semanas`; el pasado lo cuenta la cartola. Solo lectura.
 */
export async function celdasCobrosEsperados(
  ctx: Contexto,
  semanas: readonly string[],
): Promise<{ dominio: CeldaFlujo[]; vista: z.infer<typeof celdaSchema>[]; avisos: AvisoFlujo[]; diferencias: DiferenciaFactoring[] }> {
  const enRango = new Set(semanas);
  const proy = await proyeccionDeIngresos(ctx, hoyChile(), semanas.at(-1));
  const items = proy.items.filter((i) => enRango.has(i.semanaCobro));
  const nombres = await nombresDeClientes(ctx, items);
  const dominio: CeldaFlujo[] = [];
  const vista: z.infer<typeof celdaSchema>[] = [];
  for (const i of items) {
    const filaId = i.origenFecha === "cesion" ? FILA_DEPOSITO_FACTORING : FILA_COBROS_ESPERADOS;
    dominio.push({ filaId, semana: i.semanaCobro, capa: "comprometido", monto: i.monto });
    const cuando = i.origenFecha === "cesion" ? " · depósito esperado del factor" : i.fechaEsperada ? ` · cobro esperado ${i.fechaEsperada} (${ORIGEN[i.origenFecha ?? "vencimiento"]})` : ` · ${ORIGEN.programacion}`;
    vista.push({
      id: i.documentoEmitidoId ?? idEstable(`${i.programacionId}|${i.semanaCobro}|${i.etiqueta}`),
      filaId,
      semana: i.semanaCobro,
      capa: "comprometido",
      monto: i.monto,
      nota: `${i.etiqueta}${cuando}`,
      ...(cobroEditable(i) ? { cobro: { documentoId: i.documentoEmitidoId, fechaEsperada: i.fechaEsperada, origen: i.origenFecha } } : {}),
      ...(nombres.cuentas.has(i.cuentaId)
        ? {
            cliente: {
              cuentaId: i.cuentaId,
              cuenta: nombres.cuentas.get(i.cuentaId)!,
              instalacionId: i.instalacionId,
              instalacion: i.instalacionId ? (nombres.instalaciones.get(i.instalacionId) ?? null) : null,
            },
          }
        : {}),
    });
  }
  return { dominio, vista, avisos: proy.avisos, diferencias: proy.diferenciasFactoring.filter((d) => enRango.has(d.semana)) };
}
