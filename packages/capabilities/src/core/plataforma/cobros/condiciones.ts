import { z } from "zod";

import { PCT_ESCALA, PERMISOS_PLATAFORMA, PLAN_BASE } from "@opai/domain";

import { defineCapability } from "../../../define";
import { noEncontrado, reglaDeNegocio } from "../../../errores";
import { requierePlataforma } from "../../comun";
import { uuidSchema } from "../../esquemas";
import { aFecha, hoy } from "../../maestros/comun";
import { modulosCobrables, periodoDe } from "./calculo";
import { cobroDeEmpresa } from "./datos";
import { aCondicionVista, calculoSchema, condicionSchema } from "./esquemas";
import { condicionInput, montoEntero } from "./precio";

export const platformCobrosCondicionesSet = defineCapability({
  id: "platform.cobros.condiciones_set",
  descripcion:
    'Plataforma: fija la condición comercial de un módulo (o del plan base, `moduloId: "base"`) en una empresa: precio fijo mensual o por unidad × cantidad del mes, mínimo, inicio del cobro, fin de la prueba con «pasa a cobro» y descuento; o la quita con `condicion: null`. La vista previa devuelve cómo queda el cobro del mes en curso, con la cantidad contada hoy.',
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
    if (input.moduloId !== PLAN_BASE && !modulosCobrables().some((m) => m.id === input.moduloId))
      throw noEncontrado(`El módulo "${input.moduloId}"`);
    const e = p.empresa(input.tenantId);
    const actual = await e.condicionCobro(input.moduloId);
    const c = input.condicion;
    if (c?.forma === "por_unidad" && !c.unidad)
      throw reglaDeNegocio("El cobro por unidad necesita la unidad que se cuenta.");
    const datos = c
      ? {
          moneda: c.moneda,
          forma: c.forma,
          unidad: c.forma === "por_unidad" ? (c.unidad ?? null) : null,
          precioMensual: montoEntero(c.moneda, c.precio),
          minimoMensual: c.minimoMensual ? montoEntero(c.moneda, c.minimoMensual) : null,
          pasaACobro: c.pasaACobro,
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
    const despues = datos ? aCondicionVista(datos) : null;
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
      antes: actual ? aCondicionVista(actual) : null,
      despues,
      mesEnCurso: fila.calculo,
    };
  },
});
