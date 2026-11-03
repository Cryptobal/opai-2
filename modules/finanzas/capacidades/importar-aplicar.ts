// Escritura por lote de la importación CSV del flujo (CAR-161 · R3): una sola transacción y un
// número de consultas que no crece con las filas (crear filas nuevas y celdas con createMany).
import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { sincronizarAvisosEnTx } from "./aviso";
import type { filaImportSchema } from "./importar-parse";
import { aFecha, bloquearSemanaFlujo } from "./util";
import type { z } from "zod";

export type FilaValida = z.infer<typeof filaImportSchema>;
export type CeldaExistente = { id: string; filaId: string; semana: Date; capa: string };

const clave = (etiqueta: string, semana: string) => `${etiqueta.toLowerCase()}|${semana}`;

/** Si una misma celda viene repetida en el CSV, gana la última fila (igual que aplicar en orden). */
export function ultimaPorCelda(filas: readonly FilaValida[]): FilaValida[] {
  const m = new Map<string, FilaValida>();
  for (const f of filas) m.set(clave(f.etiqueta, f.semana), f);
  return [...m.values()];
}

export async function aplicarFilasImportadas(
  ctx: Contexto,
  filas: readonly FilaValida[],
  filasExistentes: readonly { id: string; etiqueta: string }[],
  celdasExistentes: readonly CeldaExistente[],
  /** Se ejecuta en la misma transacción: si falla, no queda nada aplicado. */
  adicional?: (tx: TenantTx) => Promise<void>,
): Promise<void> {
  const finales = ultimaPorCelda(filas);
  await ctx.transaccion(async (tx) => {
    for (const semana of [...new Set(finales.map((f) => f.semana))].sort()) await bloquearSemanaFlujo(tx, ctx, semana);

    const porEtiqueta = new Map(filasExistentes.map((f) => [f.etiqueta.toLowerCase(), f.id]));
    const nuevas = new Map<string, FilaValida>();
    for (const f of finales) if (!porEtiqueta.has(f.etiqueta.toLowerCase())) nuevas.set(f.etiqueta.toLowerCase(), f);
    if (nuevas.size > 0) {
      await tx.flujoFila.createMany({
        data: [...nuevas.values()].map((f, i) => ({
          tenantId: ctx.tenantId, seccion: f.seccion, etiqueta: f.etiqueta, vinculo: f.vinculo ?? null,
          arrastre: false, orden: filasExistentes.length + i, activa: true,
        })),
      });
      const creadas = await tx.flujoFila.findMany({ where: { etiqueta: { in: [...nuevas.values()].map((f) => f.etiqueta) } } });
      for (const c of creadas) porEtiqueta.set(c.etiqueta.toLowerCase(), c.id);
    }

    const existentes = new Map(celdasExistentes.map((c) => [`${c.filaId}|${c.semana.toISOString().slice(0, 10)}`, c.id]));
    const crear: { tenantId: string; filaId: string; semana: Date; capa: "plan"; monto: bigint; nota: string | null }[] = [];
    const actualizar = new Map<string, { ids: string[]; monto: bigint; nota: string | null }>();
    for (const f of finales) {
      const filaId = porEtiqueta.get(f.etiqueta.toLowerCase());
      if (!filaId) throw new Error("fila no resuelta");
      const celdaId = existentes.get(`${filaId}|${f.semana}`);
      if (!celdaId) {
        crear.push({ tenantId: ctx.tenantId, filaId, semana: aFecha(f.semana), capa: "plan", monto: BigInt(f.monto), nota: f.nota ?? null });
        continue;
      }
      // Una nota vacía en el CSV conserva la que ya tenía la celda.
      const k = `${f.monto}|${f.nota ?? "\u0000"}`;
      const g = actualizar.get(k) ?? { ids: [], monto: BigInt(f.monto), nota: f.nota ?? null };
      g.ids.push(celdaId);
      actualizar.set(k, g);
    }
    if (crear.length > 0) await tx.flujoCelda.createMany({ data: crear });
    for (const g of actualizar.values())
      await tx.flujoCelda.updateMany({
        where: { id: { in: g.ids } },
        data: g.nota === null ? { monto: g.monto } : { monto: g.monto, nota: g.nota },
      });
    if (adicional) await adicional(tx);
    await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
  });
}
