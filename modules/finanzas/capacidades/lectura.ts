import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { calcularPlanilla, lunesDe, semanasDesde, sumarSemanas } from "../domain";
import { ajustesSchema, capaSchema, celdaSchema, filaSchema, saldoSchema, semanaSchema, vistaFila } from "./esquemas";
import { sincronizarAvisos } from "./aviso";
import { PERMISO_VER } from "./permisos";
import { aFecha, aIso, ajustesDe, cargarFlujo, selladasDe } from "./util";

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

const avisoSchema = z.object({
  activo: z.boolean(),
  umbral: saldoSchema,
  semanas: z.array(
    z.object({ semana: semanaSchema, saldoFinal: saldoSchema, emitido: z.boolean() }),
  ),
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
    "Entrega la planilla del flujo de caja por semana: filas y celdas por capa, saldos, semanas selladas, metas y aviso in-app de saldo bajo umbral.",
  permiso: PERMISO_VER,
  input: z.object({
    desde: semanaSchema.optional(),
    semanas: z.number().int().min(1).max(52).optional(),
    movil: z.boolean().default(false),
  }),
  output: z.object({
    ajustes: ajustesSchema,
    filas: z.array(filaSchema),
    celdas: z.array(celdaSchema),
    semanas: z.array(semanaCalculadaSchema),
    aviso: avisoSchema,
    columnaHoy: semanaSchema.nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const ajustes = await ajustesDe(ctx);
    const hoy = lunesDe(new Date().toISOString().slice(0, 10));
    const cantidad = input.movil ? 4 : (input.semanas ?? ajustes.horizonteSemanas);
    const desde = input.desde ?? (input.movil ? hoy : ajustes.desde);
    const lista = semanasDesde(desde, cantidad);
    const { filas, celdas, dominio, celdasDom } = await cargarFlujo(
      ctx,
      desde,
      sumarSemanas(desde, cantidad - 1),
    );
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
    const semanasOut = calculo.map((s) => ({ ...s, tono: s.tono, sellada: selladas.has(s.semana) }));
    const avisoSemanas = await sincronizarAvisos(ctx, ajustes, semanasOut);
    type CapaOut = z.infer<typeof capaSchema>;
    return {
      ajustes,
      filas: filas.map(vistaFila),
      celdas: celdas.map((c) => ({
        id: c.id,
        filaId: c.filaId,
        semana: aIso(c.semana),
        capa: c.capa as CapaOut,
        monto: c.monto,
        nota: c.nota,
      })),
      semanas: semanasOut,
      aviso: { activo: ajustes.avisoActivo, umbral: ajustes.avisoUmbral, semanas: avisoSemanas },
      columnaHoy: lista.includes(hoy) ? hoy : null,
    };
  },
});
