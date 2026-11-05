import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { ajustesSchema, aNumeroSeguro, celdaSchema, filaSchema, saldoSchema, semanaSchema, vistaFila } from "./esquemas";
import type { capaSchema } from "./esquemas";
import { avisoLeido } from "./aviso";
import { PERMISO_VER } from "./permisos";
import { FILAS_VIRTUALES_VISTA } from "./filas-virtuales";
import { desdeVentana, SEMANAS_HISTORIA, serieSaldos } from "./serie-saldos";
import { aIso, ajustesDe, lunesHoy } from "./util";

/** Etiqueta de lectura para planes en semana pasada (no entran al saldo real de cartola). */
export const PLAN_SIN_RESPALDO_CARTOLA = "Plan sin respaldo en cartola";

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

/** De dónde sale el saldo de la planilla y qué cuentas activas no tienen saldo (ADR-073). */
const saldoBancoSchema = z.object({
  fuente: z.enum(["banco", "ajustes"]),
  saldo: saldoSchema.nullable(),
  cuentasSinSaldo: z.array(z.object({ cuentaId: z.string(), banco: z.string() })),
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
    "Entrega la planilla del flujo de caja por semana: filas y celdas por capa, saldos, semanas pasadas según cartola (lo no conciliado en «Sin conciliar»), el saldo anclado al saldo del banco de hoy con las cuentas que no tienen saldo, y el aviso in-app de saldo bajo el umbral único.",
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
    saldoBanco: saldoBancoSchema,
    columnaHoy: semanaSchema.nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const ajustes = await ajustesDe(ctx);
    const hoy = lunesHoy();
    const cantidad = input.movil
      ? 4
      : (input.semanas ?? ajustes.horizonteSemanas + SEMANAS_HISTORIA);
    const desde = input.movil ? hoy : desdeVentana(ajustes, input.desde, hoy);
    const { lista, calculo, extraVista, filas, celdas, banco } = await serieSaldos(
      ctx,
      ajustes,
      desde,
      cantidad,
    );
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
    const planesPasadaVista = celdas
      .filter((c) => pasadas.has(aIso(c.semana)) && c.capa === "plan")
      .map((c) => ({
        id: c.id,
        filaId: c.filaId,
        semana: aIso(c.semana),
        capa: "plan" as CapaOut,
        monto: aNumeroSeguro(c.monto),
        nota: c.nota ? `${c.nota} · ${PLAN_SIN_RESPALDO_CARTOLA}` : PLAN_SIN_RESPALDO_CARTOLA,
      }));

    return {
      ajustes,
      filas: [
        ...filas.map(vistaFila),
        ...FILAS_VIRTUALES_VISTA.filter((f) => extraVista.some((c) => c.filaId === f.id)),
      ],
      celdas: [...celdasDbVista, ...extraVista, ...planesPasadaVista],
      semanas: semanasOut,
      aviso: { activo: ajustes.avisoActivo, umbral: ajustes.umbral, semanas: avisoSemanas },
      saldoBanco: { fuente: banco.fuente, saldo: banco.saldo, cuentasSinSaldo: banco.cuentasSinSaldo },
      columnaHoy: lista.includes(hoy) ? hoy : null,
    };
  },
});
