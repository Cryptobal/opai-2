import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { calcularPlanilla, semanasDesde, sumarSemanas } from "../domain";
import { celdaSchema, filaSchema, saldoSchema, semanaSchema, vistaFila } from "./esquemas";
import { PERMISO_VER } from "./permisos";
import { ajustesDe, aIso, cargarFlujo, selladasDe } from "./util";

const semanaCalculadaSchema = z.object({
  semana: semanaSchema,
  ingresos: saldoSchema,
  egresos: saldoSchema,
  saldoInicial: saldoSchema,
  neto: saldoSchema,
  saldoFinal: saldoSchema,
  tono: z.enum(["peligro", "alerta"]).nullable(),
  sellada: z.boolean(),
});

export const filasListar = defineCapability({
  id: "finanzas.filas.listar",
  descripcion:
    "Lista las filas de la planilla de flujo de caja (ingresos y egresos) con su origen, la regla de arrastre al reprogramar y si siguen activas.",
  permiso: PERMISO_VER,
  input: z.object({ incluirInactivas: z.boolean().default(false) }),
  output: z.array(filaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.flujoFila.findMany({
      where: input.incluirInactivas ? {} : { activa: true },
      orderBy: [{ orden: "asc" }, { etiqueta: "asc" }],
    });
    return filas.map(vistaFila);
  },
});

export const planillaObtener = defineCapability({
  id: "finanzas.planilla.obtener",
  descripcion:
    "Entrega la planilla del flujo de caja por semana: filas y celdas por capa (plan, comprometido, real), ingresos, egresos, saldo acumulado, semanas selladas y semanas bajo el umbral o bajo cero.",
  permiso: PERMISO_VER,
  input: z.object({
    desde: semanaSchema
      .optional()
      .describe("Lunes de la primera semana; por defecto el de los ajustes."),
    semanas: z.number().int().min(1).max(52).default(12),
  }),
  output: z.object({
    umbral: saldoSchema,
    filas: z.array(filaSchema),
    celdas: z.array(celdaSchema),
    semanas: z.array(semanaCalculadaSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const ajustes = await ajustesDe(ctx);
    const desde = input.desde ?? ajustes.desde;
    const lista = semanasDesde(desde, input.semanas);
    const { filas, celdas, dominio, celdasDom } = await cargarFlujo(
      ctx,
      desde,
      sumarSemanas(desde, input.semanas - 1),
    );
    // El saldo de las semanas anteriores al rango arrastra las celdas previas desde los ajustes.
    const previas =
      ajustes.desde < desde
        ? await ctx.db.flujoCelda.findMany({
            where: {
              semana: {
                lt: new Date(`${desde}T00:00:00Z`),
                gte: new Date(`${ajustes.desde}T00:00:00Z`),
              },
            },
          })
        : [];
    const saldoPrevio = previas.reduce((s, c) => {
      const f = dominio.find((x) => x.id === c.filaId);
      return f ? s + (f.seccion === "ingreso" ? c.monto : -c.monto) : s;
    }, ajustes.saldoInicial);
    const calculo = calcularPlanilla({
      saldoInicial: saldoPrevio,
      umbral: ajustes.umbral,
      semanas: lista,
      filas: dominio,
      celdas: celdasDom,
    });
    const selladas = await selladasDe(ctx);
    return {
      umbral: ajustes.umbral,
      filas: filas.map(vistaFila),
      celdas: celdas.map((c) => ({
        id: c.id,
        filaId: c.filaId,
        semana: aIso(c.semana),
        capa: c.capa as "plan",
        monto: c.monto,
        nota: c.nota,
      })),
      semanas: calculo.map((s) => ({ ...s, tono: s.tono, sellada: selladas.has(s.semana) })),
    };
  },
});
