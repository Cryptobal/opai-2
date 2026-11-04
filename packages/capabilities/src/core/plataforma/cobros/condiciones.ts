import { z } from "zod";

import { PCT_ESCALA, PERMISOS_PLATAFORMA, ufDesdeTexto } from "@opai/domain";

import { defineCapability } from "../../../define";
import { noEncontrado, reglaDeNegocio } from "../../../errores";
import { requierePlataforma } from "../../comun";
import { uuidSchema } from "../../esquemas";
import { aFecha, diaSchema, hoy } from "../../maestros/comun";
import { modulosCobrables, periodoDe } from "./calculo";
import { cobroDeEmpresa } from "./datos";
import { calculoSchema, condicionSchema, monedaSchema } from "./esquemas";

const montoTexto = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .describe("CLP en pesos enteros («250000») o UF con hasta 4 decimales («2,5»).");

const condicionInput = z.object({
  moneda: monedaSchema,
  precioMensual: montoTexto,
  cobroDesde: diaSchema.nullable().optional().describe("Día aaaa-mm-dd desde el que se cobra."),
  pruebaHasta: diaSchema.nullable().optional().describe("Último día de prueba (aaaa-mm-dd)."),
  descuentoPorcentaje: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe("0 a 100, hasta 4 decimales."),
  nota: z.string().trim().max(500).nullable().optional(),
});

/** Precio escrito por una persona a entero: pesos o UF × 10.000. */
function precioEntero(moneda: "CLP" | "UF", texto: string): number {
  const n =
    moneda === "UF"
      ? ufDesdeTexto(texto)
      : /^\d+$/.test(texto.replace(/\./g, ""))
        ? Number(texto.replace(/\./g, ""))
        : null;
  if (n === null || !Number.isSafeInteger(n) || n > 2_000_000_000)
    throw reglaDeNegocio(
      moneda === "UF"
        ? "Precio en UF inválido: usa hasta 4 decimales."
        : "Precio en CLP inválido: usa pesos enteros.",
    );
  return n;
}

export const platformCobrosCondicionesSet = defineCapability({
  id: "platform.cobros.condiciones_set",
  descripcion:
    "Plataforma: fija la condición comercial de un módulo en una empresa (precio mensual en CLP o UF, inicio del cobro, fin de la prueba y descuento) o la quita con `condicion: null`. La vista previa devuelve cómo queda el cobro del mes en curso.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    moduloId: z.string().min(1).max(60),
    condicion: condicionInput.nullable(),
  }),
  output: z.object({
    moduloId: z.string(),
    antes: condicionSchema.nullable(),
    despues: condicionSchema.nullable(),
    mesEnCurso: calculoSchema.describe("Cobro del mes en curso con la condición nueva."),
  }),
  // Irreversible para agentes (aprobación humana): cambia lo que se le cobra a un cliente.
  efecto: "irreversible",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  cambio: (s) => ({ antes: s.antes, despues: s.despues }),
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    if (!(await p.globales.tenantPorId(input.tenantId))) throw noEncontrado("La empresa");
    if (!modulosCobrables().some((m) => m.id === input.moduloId))
      throw noEncontrado(`El módulo "${input.moduloId}"`);
    const e = p.empresa(input.tenantId);
    const actual = await e.condicionCobro(input.moduloId);
    const c = input.condicion;
    const datos = c
      ? {
          moneda: c.moneda,
          precioMensual: precioEntero(c.moneda, c.precioMensual),
          cobroDesde: c.cobroDesde ? aFecha(c.cobroDesde) : null,
          pruebaHasta: c.pruebaHasta ? aFecha(c.pruebaHasta) : null,
          descuentoPct: Math.round((c.descuentoPorcentaje * PCT_ESCALA) / 100),
          nota: c.nota || null,
        }
      : null;
    if (datos && !datos.cobroDesde && !datos.pruebaHasta)
      throw reglaDeNegocio("Indica desde cuándo se cobra o hasta cuándo dura la prueba.");
    if (!dryRun) {
      if (datos) await e.fijarCondicionCobro(input.moduloId, datos);
      else await e.quitarCondicionCobro(input.moduloId);
    }
    const vista = (d: typeof datos) =>
      d
        ? {
            ...d,
            moneda: d.moneda,
            cobroDesde: d.cobroDesde?.toISOString().slice(0, 10) ?? null,
            pruebaHasta: d.pruebaHasta?.toISOString().slice(0, 10) ?? null,
          }
        : null;
    const despues = vista(datos);
    // Lo que verá el resumen: se calcula sobre lo guardado, o sobre lo propuesto en la vista previa.
    const periodo = periodoDe(hoy());
    const r = await cobroDeEmpresa(
      {
        ...e,
        condicionesCobro: async () =>
          datos ? [{ id: "", moduloId: input.moduloId, ...datos, updatedAt: new Date() }] : [],
      },
      periodo,
      p.globales.ufAlDia,
    );
    const fila = r.filas.find((f) => f.moduloId === input.moduloId);
    if (!fila) throw noEncontrado(`El módulo "${input.moduloId}"`);
    return {
      moduloId: input.moduloId,
      antes: actual ? vista({ ...actual, moneda: actual.moneda === "UF" ? "UF" : "CLP" }) : null,
      despues,
      mesEnCurso: fila.calculo,
    };
  },
});
