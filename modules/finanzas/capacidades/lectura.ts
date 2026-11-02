import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { calcularPlanilla, lunesDe, semanasDesde, sumarSemanas } from "../domain";
import { celdasDominioConCartolaPasada } from "./cartola-planilla";
import { ajustesSchema, aNumeroSeguro, celdaSchema, filaSchema, saldoSchema, semanaSchema, vistaFila } from "./esquemas";
import type { capaSchema } from "./esquemas";
import { avisoLeido } from "./aviso";
import { PERMISO_VER } from "./permisos";
import { aIso, ajustesDe, cargarFlujo } from "./util";

const semanaCalculadaSchema = z.object({
  semana: semanaSchema,
  ingresos: saldoSchema,
  egresos: saldoSchema,
  saldoInicial: saldoSchema,
  neto: saldoSchema,
  saldoFinal: saldoSchema,
  tono: z.enum(["peligro", "alerta"]).nullable(),
  pasada: z.boolean(),
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
    "Entrega la planilla del flujo de caja por semana: filas y celdas por capa, saldos, semanas pasadas según cartola y aviso in-app de saldo bajo umbral.",
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
    let saldoPrevio = ajustes.saldoInicial;
    if (ajustes.desde < desde) {
      const previasHasta = sumarSemanas(desde, -1);
      const cantPrevias =
        Math.round((Date.parse(previasHasta) - Date.parse(ajustes.desde)) / (7 * 86_400_000)) + 1;
      const prevLista = semanasDesde(ajustes.desde, cantPrevias);
      const { dominio: prevDom, celdasDom: prevCeldas } = await cargarFlujo(
        ctx,
        ajustes.desde,
        previasHasta,
      );
      const { dominio: prevConCartola } = await celdasDominioConCartolaPasada(
        ctx,
        prevCeldas,
        hoy,
        prevLista,
      );
      const prevCalc = calcularPlanilla({
        saldoInicial: ajustes.saldoInicial,
        umbral: ajustes.umbral,
        semanas: prevLista,
        filas: prevDom,
        celdas: prevConCartola,
      });
      saldoPrevio = prevCalc.at(-1)?.saldoFinal ?? ajustes.saldoInicial;
    }

    const { dominio: celdasCalc, extraVista } = await celdasDominioConCartolaPasada(
      ctx,
      celdasDom,
      hoy,
      lista,
    );
    const calculo = calcularPlanilla({
      saldoInicial: saldoPrevio,
      umbral: ajustes.umbral,
      semanas: lista,
      filas: dominio,
      celdas: celdasCalc,
    });
    const semanasOut = calculo.map((s) => ({ ...s, pasada: s.semana < hoy }));
    const avisoSemanas = await avisoLeido(ctx, ajustes, semanasOut);
    type CapaOut = z.infer<typeof capaSchema>;

    const pasadas = new Set(lista.filter((s) => s < hoy));
    const celdasDbVista = celdas
      .filter((c) => !pasadas.has(aIso(c.semana)))
      .map((c) => ({
        id: c.id,
        filaId: c.filaId,
        semana: aIso(c.semana),
        capa: c.capa as CapaOut,
        monto: aNumeroSeguro(c.monto),
        nota: c.nota,
      }));

    return {
      ajustes,
      filas: filas.map(vistaFila),
      celdas: [...celdasDbVista, ...extraVista],
      semanas: semanasOut,
      aviso: { activo: ajustes.avisoActivo, umbral: ajustes.avisoUmbral, semanas: avisoSemanas },
      columnaHoy: lista.includes(hoy) ? hoy : null,
    };
  },
});
