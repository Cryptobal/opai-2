import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { agruparPorMes, atrasarCobros, indicadores } from "../domain/resumen";
import { saldoSchema } from "./esquemas";
import { FILA_COBROS_ESPERADOS } from "./filas-virtuales";
import { PERMISO_VER } from "./permisos";
import { serieSaldos } from "./serie-saldos";
import { ajustesDe, lunesHoy } from "./util";

const tonoSchema = z.enum(["peligro", "alerta"]).nullable();
const puntoSchema = z.object({ semana: z.string(), saldo: saldoSchema });

const periodoSchema = z.object({
  clave: z.string().describe("Lunes de la semana (aaaa-mm-dd) o mes (aaaa-mm)."),
  desde: z.string().describe("Primer lunes del período."),
  hasta: z.string().describe("Último lunes del período."),
  semanas: z.number().int(),
  ingresos: saldoSchema,
  egresos: saldoSchema,
  neto: saldoSchema,
  saldoInicial: saldoSchema,
  saldoFinal: saldoSchema,
  tono: tonoSchema.describe("Peor tono de sus semanas: «peligro» bajo 0, «alerta» bajo el umbral."),
});

/**
 * Resumen del flujo de caja (CAR-378): la misma serie de la planilla desde la semana en curso, por semana o por mes,
 * con indicadores de caja y un escenario de cobros atrasados que no escribe nada. Solo lectura.
 */
export const planillaResumen = defineCapability({
  id: "finanzas.planilla.resumen",
  descripcion:
    "Resume el flujo de caja desde la semana en curso, por semana o por mes, partiendo del saldo real del banco: ingresos, egresos, saldo de cada período y su tono contra el umbral de caja baja. Entrega además los indicadores de caja (primera semana bajo el umbral, primera semana negativa, saldo mínimo, semanas de caja y saldo al final del horizonte) y permite simular cobros atrasados N semanas sin guardar nada.",
  permiso: PERMISO_VER,
  input: z.object({
    agrupar: z.enum(["semana", "mes"]).default("mes"),
    semanas: z.number().int().min(1).max(52).optional().describe("Horizonte en semanas desde la actual. Por defecto, el de los ajustes del flujo."),
    atrasoCobrosSemanas: z.number().int().min(0).max(12).default(0).describe("Escenario: corre los cobros proyectados de facturas N semanas (0 = escenario base)."),
  }),
  output: z.object({
    escenario: z.object({ atrasoCobrosSemanas: z.number().int() }),
    umbral: saldoSchema,
    fuenteSaldo: z.enum(["banco", "sin_banco"]).describe("Si el saldo parte del banco de hoy o, sin saldo de ninguna cuenta, de $0 (no hay saldo de partida, CAR-391)."),
    periodos: z.array(periodoSchema),
    indicadores: z.object({
      primerQuiebre: puntoSchema.extend({ faltaParaUmbral: saldoSchema }).nullable(),
      primerNegativo: puntoSchema.nullable(),
      minimo: puntoSchema.nullable(),
      semanasDeCaja: z.number().int().describe("Semanas desde la actual antes de la primera con saldo negativo."),
      semanasBajoUmbral: z.number().int(),
      finHorizonte: puntoSchema.nullable(),
    }),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const ajustes = await ajustesDe(ctx);
    const serie = await serieSaldos(ctx, ajustes, lunesHoy(), input.semanas ?? ajustes.horizonteSemanas);
    // El lunes de la serie (no uno recalculado): a medianoche del domingo podrían diferir en una semana.
    const hoy = serie.hoy;
    const cobros = new Map<string, number>();
    // Solo los cobros de facturas del cliente; el depósito del factor (cesión) no se atrasa en el escenario.
    for (const c of serie.extraVista)
      if (c.filaId === FILA_COBROS_ESPERADOS && c.capa === "comprometido") cobros.set(c.semana, (cobros.get(c.semana) ?? 0) + c.monto);
    const semanas = atrasarCobros(serie.calculo, cobros, input.atrasoCobrosSemanas, hoy, ajustes.umbral);
    const periodos =
      input.agrupar === "mes"
        ? agruparPorMes(semanas)
        : semanas.map((s) => ({ clave: s.semana, desde: s.semana, hasta: s.semana, semanas: 1, ingresos: s.ingresos, egresos: s.egresos, neto: s.neto, saldoInicial: s.saldoInicial, saldoFinal: s.saldoFinal, tono: s.tono }));
    return {
      escenario: { atrasoCobrosSemanas: input.atrasoCobrosSemanas },
      umbral: ajustes.umbral,
      fuenteSaldo: serie.banco.fuente,
      periodos,
      indicadores: indicadores(semanas, hoy, ajustes.umbral),
    };
  },
});
