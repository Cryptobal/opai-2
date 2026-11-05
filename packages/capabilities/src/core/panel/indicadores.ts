import { z } from "zod";

import { defineCapability } from "../../define";
import { hoy } from "../../pauta/comun";
import { coberturaHoy } from "./indicadores/pauta";
import { cotizacionesPorAprobar, negociosAbiertos } from "./indicadores/comercial";
import { facturadoDelMes } from "./indicadores/facturacion";
import { ticketsInicio } from "./indicadores/tickets";

export const inicioIndicadores = defineCapability({
  id: "core.inicio.indicadores",
  descripcion:
    "Indicadores del Inicio: cobertura de la pauta de hoy, negocios abiertos en CLP y UF, cotizaciones por aprobar, facturado del mes contra el mismo tramo del mes anterior y tickets abiertos o asignados al usuario. Cada indicador viene null si el actor no tiene el permiso o el módulo no está activo.",
  permiso: null,
  input: z.object({}),
  output: z.object({
    cobertura: z
      .object({
        fecha: z.string(),
        programados: z.number().int(),
        cubiertos: z.number().int(),
        ppc: z.number().int(),
        cobertura: z.number().nullable(),
      })
      .nullable(),
    negocios: z
      .object({
        cantidad: z.number().int(),
        valorMensualClp: z.number().int(),
        valorMensualUf: z.number().int().nullable().describe("UF con 4 decimales como entero."),
      })
      .nullable(),
    cotizacionesPorAprobar: z.number().int().nullable(),
    facturado: z
      .object({
        periodo: z.string(),
        hastaDia: z.number().int(),
        netoClp: z.number().int(),
        netoMesAnteriorClp: z.number().int(),
      })
      .nullable(),
    tickets: z
      .object({ abiertos: z.number().int().nullable(), asignadosAMi: z.number().int() })
      .nullable(),
  }),
  // Son totales de la empresa: no revelan ninguna ficha, así que no hay IDs que auditar.
  auditarLectura: () => [],
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const [cobertura, negocios, porAprobar, facturado, tickets] = await Promise.all([
      coberturaHoy(ctx),
      negociosAbiertos(ctx),
      cotizacionesPorAprobar(ctx),
      facturadoDelMes(ctx, hoy()),
      ticketsInicio(ctx),
    ]);
    return { cobertura, negocios, cotizacionesPorAprobar: porAprobar, facturado, tickets };
  },
});
