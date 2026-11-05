import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../../define";
import { noEncontrado, reglaDeNegocio } from "../../../errores";
import { requierePlataforma } from "../../comun";
import { uuidSchema } from "../../esquemas";
import { hoy } from "../../maestros/comun";
import { porLotes } from "../metricas";
import { aFechaPeriodo, periodoDe } from "./calculo";
import { generarCargosDeEmpresa } from "./generar";
import { aCargoVista, cargoSchema, periodoSchema } from "./esquemas";

const resultadoEmpresa = z.object({
  tenantId: z.string(),
  creados: z.number().int(),
  montoClp: z.number().int(),
  omitidos: z.array(z.object({ moduloId: z.string(), motivo: z.string() })),
});

export const platformCobrosCargosGenerar = defineCapability({
  id: "platform.cobros.cargos_generar",
  descripcion:
    "Plataforma: genera los cargos listos para facturar de un mes ya cerrado, por empresa y módulo, sin emitir facturas. Es idempotente: un módulo con cargo vigente del mes no se repite. Omite con su motivo lo que no se factura o no tiene la UF del último día publicada.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    periodo: periodoSchema.describe("Mes cerrado aaaa-mm (anterior al actual)."),
    tenantId: uuidSchema.optional().describe("Solo esta empresa; sin ella, todas."),
  }),
  output: z.object({
    periodo: periodoSchema,
    empresas: z.array(resultadoEmpresa),
    creados: z.number().int(),
    montoClp: z.number().int(),
    fallidas: z
      .array(z.object({ tenantId: z.string(), motivo: z.string() }))
      .describe("Empresas que fallaron en una generación global; las demás quedaron generadas."),
  }),
  efecto: "escritura",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  // En una generación global la auditoría de plataforma deja el resultado por empresa.
  cambio: (s) => ({
    antes: null,
    despues: {
      periodo: s.periodo,
      empresas: s.empresas.map((e) => ({
        tenantId: e.tenantId,
        creados: e.creados,
        montoClp: e.montoClp,
      })),
      fallidas: s.fallidas,
    },
  }),
  async handler(ctx, input, { dryRun }) {
    if (input.periodo >= periodoDe(hoy()))
      throw reglaDeNegocio("Solo se generan cargos de meses cerrados.");
    const p = requierePlataforma(ctx);
    const tenants = await p.globales.listarTenants(input.tenantId);
    if (input.tenantId && tenants.length === 0) throw noEncontrado("La empresa");
    const fallidas: { tenantId: string; motivo: string }[] = [];
    const resultados = await porLotes(tenants, async (t) => {
      try {
        const r = await generarCargosDeEmpresa(
          p.empresa(t.id),
          input.periodo,
          p.globales.ufAlDia,
          dryRun,
        );
        return { tenantId: t.id, ...r };
      } catch (e) {
        // Una empresa concreta falla de forma visible; en una global, las demás siguen.
        if (input.tenantId) throw e;
        fallidas.push({
          tenantId: t.id,
          motivo: "No se pudo generar; se reintenta en la próxima corrida.",
        });
        return null;
      }
    });
    const empresas = resultados.filter((r) => r !== null);
    return {
      periodo: input.periodo,
      empresas,
      fallidas,
      creados: empresas.reduce((s, e) => s + e.creados, 0),
      montoClp: empresas.reduce((s, e) => s + e.montoClp, 0),
    };
  },
});

export const platformCobrosCargosList = defineCapability({
  id: "platform.cobros.cargos_list",
  descripcion:
    "Plataforma: cargos mensuales por módulo de una empresa (listos para facturar o anulados), del más reciente al más antiguo; filtra por mes y estado.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    periodo: periodoSchema.optional(),
    estado: z.enum(["listo", "anulado"]).optional(),
    limite: z.number().int().min(1).max(200).default(60),
  }),
  output: z.array(cargoSchema),
  efecto: "lectura",
  dryRun: false,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const p = requierePlataforma(ctx);
    if (!(await p.globales.tenantPorId(input.tenantId))) throw noEncontrado("La empresa");
    const filas = await p.empresa(input.tenantId).cargosCobro(
      {
        ...(input.periodo ? { periodo: aFechaPeriodo(input.periodo) } : {}),
        ...(input.estado ? { estado: input.estado } : {}),
      },
      input.limite,
    );
    return filas.map(aCargoVista);
  },
});

export const platformCobrosCargoAnular = defineCapability({
  id: "platform.cobros.cargo_anular",
  descripcion:
    "Plataforma: anula un cargo listo para facturar con su motivo (por ejemplo, una condición mal cargada). Después se puede volver a generar el mes.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    cargoId: uuidSchema,
    motivo: z.string().trim().min(3).max(300),
  }),
  output: cargoSchema,
  efecto: "irreversible",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input, { dryRun }) {
    const e = requierePlataforma(ctx).empresa(input.tenantId);
    const cargo = await e.cargoCobro(input.cargoId);
    if (!cargo) throw noEncontrado("El cargo");
    if (cargo.estado !== "listo") throw reglaDeNegocio("El cargo ya está anulado.");
    const anulado = {
      ...aCargoVista(cargo),
      estado: "anulado" as const,
      motivoAnulacion: input.motivo,
    };
    if (dryRun) return anulado;
    if ((await e.anularCargoCobro(input.cargoId, input.motivo)) === 0)
      throw reglaDeNegocio("El cargo ya está anulado.");
    return anulado;
  },
});
