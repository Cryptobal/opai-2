import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../../define";
import { noEncontrado } from "../../../errores";
import { requierePlataforma } from "../../comun";
import { uuidSchema } from "../../esquemas";
import { hoy } from "../../maestros/comun";
import { porLotes } from "../metricas";
import { periodoDe } from "./calculo";
import { cobroDeEmpresa } from "./datos";
import {
  calculoSchema,
  cargoSchema,
  condicionSchema,
  monedaSchema,
  periodoSchema,
} from "./esquemas";

const moduloSchema = z.object({
  moduloId: z.string(),
  nombre: z.string(),
  estado: z.string().nullable().describe("Estado del módulo en la empresa; null: no contratado."),
  condicion: condicionSchema.nullable(),
  calculo: calculoSchema,
  cargo: cargoSchema.nullable().describe("Cargo vigente del mes, si ya se generó."),
});

/** El plan base cuenta como contratado mientras la empresa no esté suspendida. */
const esContratado = (m: { estado: string | null }) =>
  m.estado === "activo" || m.estado === "trial";

const empresaSchema = z.object({
  tenantId: z.string(),
  nombre: z.string(),
  slug: z.string(),
  estado: z.string(),
  modulos: z.array(moduloSchema),
  totalClp: z.number().int(),
  facturables: z.number().int(),
  noFacturables: z.number().int().describe("Contratados que este mes no se facturan."),
});

export const platformCobrosResumen = defineCapability({
  id: "platform.cobros.resumen",
  descripcion:
    "Plataforma: qué factura cada empresa por el plan base y cada módulo (forma, unidad, cantidad del mes, mensual y monto) en un mes (por defecto el actual): condición comercial, si se factura y por qué, monto en CLP (UF del último día del mes) y el cargo si ya se generó, con totales.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({
    periodo: periodoSchema.optional().describe("Mes aaaa-mm; por defecto, el actual."),
    tenantId: uuidSchema.optional().describe("Solo esta empresa."),
  }),
  output: z.object({
    periodo: periodoSchema,
    uf: z
      .object({ centavos: z.number().int(), exacta: z.boolean() })
      .nullable()
      .describe("UF del último día del mes; exacta=false si es la última publicada (estimación)."),
    empresas: z.array(empresaSchema),
    totales: z.object({
      totalClp: z.number().int(),
      facturables: z.number().int(),
      noFacturables: z.number().int().describe("Módulos contratados que este mes no se facturan."),
      porMoneda: z.array(z.object({ moneda: monedaSchema, monto: z.number().int() })),
    }),
  }),
  efecto: "lectura",
  dryRun: false,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const p = requierePlataforma(ctx);
    const periodo = input.periodo ?? periodoDe(hoy());
    const tenants = await p.globales.listarTenants(input.tenantId);
    if (input.tenantId && tenants.length === 0) throw noEncontrado("La empresa");
    let uf: { centavos: number; exacta: boolean } | null = null;
    const empresas = await porLotes(tenants, async (t) => {
      const r = await cobroDeEmpresa(p.empresa(t.id), periodo, p.globales.ufAlDia);
      uf ??= r.uf;
      const modulos = r.filas.map((f) => ({ ...f, cargo: r.vigentes.get(f.moduloId) ?? null }));
      const cobra = modulos.filter((m) => m.calculo.facturable);
      const noCobra = modulos.filter(esContratado).filter((m) => !m.calculo.facturable);
      return {
        tenantId: t.id,
        nombre: t.nombre,
        slug: t.slug,
        estado: t.estado,
        modulos,
        facturables: cobra.length,
        noFacturables: noCobra.length,
        totalClp: cobra.reduce((s, m) => s + (m.cargo?.montoClp ?? m.calculo.montoClp ?? 0), 0),
      };
    });
    const todos = empresas.flatMap((e) => e.modulos);
    const contratados = todos.filter(esContratado);
    const porMoneda = (["CLP", "UF"] as const).map((moneda) => ({
      moneda,
      monto: todos
        .filter((m) => m.calculo.facturable && m.condicion?.moneda === moneda)
        .reduce((s, m) => s + m.calculo.monto, 0),
    }));
    return {
      periodo,
      uf,
      empresas,
      totales: {
        totalClp: empresas.reduce((s, e) => s + e.totalClp, 0),
        facturables: todos.filter((m) => m.calculo.facturable).length,
        noFacturables: contratados.filter((m) => !m.calculo.facturable).length,
        porMoneda,
      },
    };
  },
});
