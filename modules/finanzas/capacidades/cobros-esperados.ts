import { createHash } from "node:crypto";

import type { Contexto } from "@opai/capabilities";
import { hoyChile, ingresosEsperados } from "@opai/capabilities";

import type { CeldaFlujo } from "../domain";
import type { celdaSchema } from "./esquemas";
import { FILA_COBROS_ESPERADOS } from "./filas-virtuales";
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

/**
 * Cobros esperados de las facturas por cobrar (ADR-073): un solo criterio de semana, la fecha esperada de cobro.
 * Solo semanas desde la actual dentro de `semanas`; el pasado lo cuenta la cartola. Solo lectura.
 */
export async function celdasCobrosEsperados(
  ctx: Contexto,
  semanas: readonly string[],
): Promise<{ dominio: CeldaFlujo[]; vista: z.infer<typeof celdaSchema>[] }> {
  const enRango = new Set(semanas);
  const items = (await ingresosEsperados(ctx, hoyChile())).filter((i) => enRango.has(i.semanaCobro));
  const dominio: CeldaFlujo[] = [];
  const vista: z.infer<typeof celdaSchema>[] = [];
  for (const i of items) {
    dominio.push({ filaId: FILA_COBROS_ESPERADOS, semana: i.semanaCobro, capa: "comprometido", monto: i.monto });
    const cuando = i.fechaEsperada ? ` · cobro esperado ${i.fechaEsperada} (${ORIGEN[i.origenFecha ?? "vencimiento"]})` : ` · ${ORIGEN.programacion}`;
    vista.push({
      id: i.documentoEmitidoId ?? idEstable(`${i.programacionId}|${i.semanaCobro}|${i.etiqueta}`),
      filaId: FILA_COBROS_ESPERADOS,
      semana: i.semanaCobro,
      capa: "comprometido",
      monto: i.monto,
      nota: `${i.etiqueta}${cuando}`,
    });
  }
  return { dominio, vista };
}
