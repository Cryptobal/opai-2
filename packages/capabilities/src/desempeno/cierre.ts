import { esPeriodoMensual } from "@opai/domain";
import { z } from "zod";

import { valoresEfectivos } from "../core/config";
import { campoAjuste } from "../core/config/catalogo";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, ErrorCapacidad, reglaDeNegocio } from "../errores";
import { defineTrabajo } from "../trabajos/registro";
import type { Contexto } from "../types";
import { DIA_CIERRE_DEFECTO } from "./ajustes";
import { calcularCierre, filaParaGuardar } from "./cierre-calculo";
import { estaCerrado } from "./cierre-lectura";
import { mesesDe, PERMISOS_DESEMPENO } from "./comun";

const resumen = z.object({
  periodo: z.string(),
  personas: z.number().int().describe("Personas con resultado guardado."),
  cargos: z.number().int().describe("Cargos con scorecard ese mes."),
});

/** Mes anterior al dado: "2027-01" → "2026-12". */
export function mesAnterior(periodo: string): string {
  const [a, m] = [Number(periodo.slice(0, 4)), Number(periodo.slice(5, 7))];
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/** Cierra `periodo`: guarda el resultado de cada persona y deja el mes fijo. Un mes cerrado no se reabre. */
export async function cerrarPeriodo(
  ctx: Contexto,
  periodo: string,
  origen: "manual" | "automatico",
  dryRun: boolean,
): Promise<z.infer<typeof resumen>> {
  const meses = await mesesDe(ctx);
  if (periodo >= meses.actual) throw reglaDeNegocio("Solo se cierra un mes que ya terminó.");
  if (await estaCerrado(ctx, periodo)) throw conflicto("Ese mes ya está cerrado.");
  const filas = await calcularCierre(ctx, periodo, meses.zona);
  const salida = { periodo, personas: filas.length, cargos: new Set(filas.map((f) => f.cargoId)).size };
  if (dryRun) return salida;
  const cerradoPor = origen === "manual" && ctx.actor.tipo === "user" ? ctx.actor.id : null;
  await ctx.transaccion(async (tx) => {
    await sinDuplicado(
      tx.desempenoPeriodoCerrado.create({
        data: { tenantId: ctx.tenantId, periodo, origen, cerradoPor, personas: filas.length },
      }),
      "Ese mes ya está cerrado.",
    );
    if (filas.length > 0) {
      await tx.desempenoResultadoCerrado.createMany({
        data: filas.map((f) => filaParaGuardar(ctx.tenantId, periodo, f)),
      });
    }
    // Cerrado por el trabajo diario no pasa por executeCapability: se audita aquí, en la misma
    // transacción (ADR-052). El cierre a mano lo audita executeCapability.
    if (origen === "automatico") {
      await ctx.auditoria.registrar(tx, {
        tenantId: ctx.tenantId,
        capability: "desempeno.periodos.cerrar",
        actor: ctx.actor,
        entityType: "periodo_desempeno",
        payload: { ...salida, origen },
      });
    }
    await ctx.eventos.emitir(tx, {
      tipo: "desempeno.periodo.cerrado",
      entidadTipo: "periodo_desempeno",
      payload: { ...salida, origen },
    });
  });
  return salida;
}

export const periodosCerrar = defineCapability({
  id: "desempeno.periodos.cerrar",
  descripcion:
    "Cierra un mes que ya terminó: guarda el resultado de cada persona con el cargo, la jefatura y el scorecard de ese mes. Desde ahí el mes no cambia aunque se corrija un hecho o la persona cambie de cargo. No se puede reabrir. Si nadie lo cierra, OPAI lo cierra solo el día de cierre configurado.",
  permiso: PERMISOS_DESEMPENO.scorecardsManage,
  input: z.object({
    periodo: z.string().refine(esPeriodoMensual, "Usa aaaa-mm.").describe("Mes a cerrar (aaaa-mm)."),
  }),
  output: resumen,
  efecto: "escritura",
  dryRun: true,
  // Cerrar no tiene vuelta atrás: a un agente siempre le pide aprobación humana.
  exigeAprobacion: () => true,
  describirAprobacion: async (_ctx, input) => `Cerrar el mes ${input.periodo} (no se puede reabrir)`,
  handler: (ctx, input, { dryRun }) => cerrarPeriodo(ctx, input.periodo, "manual", dryRun),
});

export const periodosList = defineCapability({
  id: "desempeno.periodos.list",
  descripcion:
    "Meses cerrados de Desempeño, del más reciente al más antiguo: cuándo y cómo se cerró cada uno (a mano o automático) y cuántas personas quedaron con resultado guardado.",
  permiso: PERMISOS_DESEMPENO.scorecardsRead,
  input: z.object({}),
  output: z.array(
    z.object({
      periodo: z.string(),
      origen: z.enum(["manual", "automatico"]),
      cerradoEn: z.string(),
      personas: z.number().int(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const filas = await ctx.db.desempenoPeriodoCerrado.findMany({ orderBy: { periodo: "desc" }, take: 60 });
    return filas.map((f) => ({
      periodo: f.periodo,
      origen: f.origen === "manual" ? ("manual" as const) : ("automatico" as const),
      cerradoEn: f.createdAt.toISOString(),
      personas: f.personas,
    }));
  },
});

/** Estados de un módulo contratado que cuentan como activo (igual que `apps/web/lib/fuentes.ts`). */
const ACTIVOS = ["activo", "trial", "solo_lectura"];

/** Día de cierre de la empresa; si el ajuste no está declarado (registro sin cargar), el de fábrica. */
async function diaDeCierre(ctx: Contexto): Promise<number> {
  const campo = campoAjuste("desempeno", "dia_cierre");
  if (!campo) return DIA_CIERRE_DEFECTO;
  // Un error al leer se propaga: el trabajo reintenta en vez de cerrar en un día equivocado.
  const v = await valoresEfectivos(ctx, [campo]);
  return (v.get("desempeno.dia_cierre")?.valor as number | undefined) ?? DIA_CIERRE_DEFECTO;
}

export const trabajoCierreAutomatico = defineTrabajo({
  tipo: "desempeno.periodos.cerrar_automatico",
  descripcion:
    "Revisa a diario si llegó el día de cierre de la empresa y, si nadie cerró el mes anterior, lo cierra y guarda su resultado.",
  payload: z.object({ dia: z.string() }),
  periodicidad: "diaria",
  async handler(ctx, { dia }) {
    // El contexto de sistema del cron no trae los módulos de la empresa: se leen de la base, porque
    // el resultado guardado depende de qué indicadores están disponibles.
    const modulos = await ctx.db.tenantModule.findMany({
      where: { estado: { in: ACTIVOS } },
      select: { moduloId: true, estado: true },
    });
    const desempeno = modulos.find((m) => m.moduloId === "desempeno");
    // Cerrar es una escritura: con el módulo apagado o en solo lectura no se cierra.
    if (!desempeno || desempeno.estado === "solo_lectura") return { cerrado: null };
    const conModulos: Contexto = { ...ctx, modulosActivos: modulos.map((m) => m.moduloId) };
    if (Number(dia.slice(8, 10)) < (await diaDeCierre(conModulos))) return { cerrado: null };
    const periodo = mesAnterior(dia.slice(0, 7));
    if (await estaCerrado(conModulos, periodo)) return { cerrado: null };
    try {
      const r = await cerrarPeriodo(conModulos, periodo, "automatico", false);
      return { cerrado: r.periodo, personas: r.personas };
    } catch (e) {
      // Una persona lo cerró a mano en paralelo: no hay nada que hacer.
      if (e instanceof ErrorCapacidad && e.code === "CONFLICT") return { cerrado: null };
      throw e;
    }
  },
});
