import { z } from "zod";

import { defineTrabajo } from "@opai/capabilities";
import { HASH_GENESIS } from "@opai/domain";

import { marcaIntegra } from "../domain";
import { registroDeFila } from "./registro-fila";

const LOTE = 1000;

/** Recorre la cadena de marcas de la empresa y devuelve el primer eslabón roto, si lo hay. */
export const trabajoVerificarCadenaMarcas = defineTrabajo({
  tipo: "asistencia.marcas.verificar_cadena",
  descripcion: "Verifica a diario la cadena de hash de las marcas de asistencia; si se rompe, alerta a Plataforma.",
  payload: z.object({ dia: z.string().optional() }),
  periodicidad: "diaria",
  async handler(ctx) {
    let previo = HASH_GENESIS;
    let esperado = 1;
    let rota: number | null = null;
    for (;;) {
      const lote = await ctx.db.marca.findMany({ where: { seq: { gte: esperado } }, orderBy: { seq: "asc" }, take: LOTE });
      for (const f of lote) {
        const roto = f.seq !== esperado || f.hashAnterior !== previo || !(await marcaIntegra(f.hash, previo, registroDeFila(f)));
        if (roto) { rota = esperado; break; }
        previo = f.hash;
        esperado += 1;
      }
      if (rota !== null || lote.length < LOTE) break;
    }
    // La cabeza dice dónde termina la cadena: si falta el final (alguien lo cortó), también se rompe.
    if (rota === null) {
      const cabeza = await ctx.db.cadenaCabeza.findUnique({
        where: { tenantId_cadena: { tenantId: ctx.tenantId, cadena: "marcas" } },
      });
      if (cabeza && (cabeza.ultimoSeq !== esperado - 1 || cabeza.ultimoHash !== previo)) rota = esperado;
    }
    const ok = rota === null;
    await ctx.transaccion(async (tx) => {
      await tx.cadenaCabeza.updateMany({
        where: { tenantId: ctx.tenantId, cadena: "marcas" },
        data: { verificadaEn: new Date(), verificacionOk: ok },
      });
      if (ok) return;
      await tx.incidenteTecnico.create({
        data: {
          tenantId: ctx.tenantId, tipo: "cadena_rota", severidad: "alta", inicio: new Date(),
          origen: "automatico", detalle: `La cadena de marcas se rompe en el eslabón ${rota}.`,
        },
      });
      await ctx.eventos.emitir(tx, { tipo: "asistencia.cadena.rota", payload: { cadena: "marcas", primeraRota: rota } });
    });
    return { ok, ultimoSeq: esperado - 1, primeraRota: rota };
  },
});
