import { z } from "zod";

import { lunesDe, sumarDiasCobro } from "@opai/domain";

import { defineCapability } from "../define";
import { PERMISO_READ } from "./comun";
import { hoyChile, ingresosEsperados } from "./cobro-esperado-datos";

const ingresoSchema = z.object({
  documentoEmitidoId: z.string().nullable(),
  programacionId: z.string().nullable().optional(),
  cuentaId: z.string(),
  instalacionId: z.string().nullable(),
  semanaCobro: z.string(),
  monto: z.number().int(),
  etiqueta: z.string(),
  capa: z.enum(["real", "comprometido"]),
  fechaEsperada: z.string().nullable().describe("Día esperado del cobro; null en las programaciones sin borrador."),
  origenFecha: z
    .enum(["manual", "promedio", "vencimiento", "emision", "programacion"])
    .nullable()
    .describe("De dónde sale la fecha: fijada a mano, promedio real de pago del cliente, vencimiento o emisión."),
});

export const ventasProyeccionFlujo = defineCapability({
  id: "finanzas.ventas.proyeccion_flujo",
  descripcion:
    "Proyecta los ingresos de cobro hacia el flujo de caja con un solo criterio: la fecha esperada de cobro de cada factura (la fijada a mano, el promedio real de pago del cliente con 3 o más facturas pagadas, o el vencimiento). Lo vencido va a la semana en curso; cuenta lo pendiente (monto menos notas de crédito parciales y cobrado) y no las cedidas ni las notas de débito.",
  permiso: PERMISO_READ,
  input: z.object({
    semanas: z
      .number()
      .int()
      .min(1)
      .max(52)
      .default(13)
      .describe("Horizonte en semanas desde el lunes actual."),
  }),
  output: z.object({ items: z.array(ingresoSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const hoy = hoyChile();
    const desde = lunesDe(hoy);
    const hasta = sumarDiasCobro(desde, 7 * (input.semanas - 1));
    const todos = await ingresosEsperados(ctx, hoy, hasta);
    return { items: todos.filter((i) => i.semanaCobro >= desde && i.semanaCobro <= hasta) };
  },
});
