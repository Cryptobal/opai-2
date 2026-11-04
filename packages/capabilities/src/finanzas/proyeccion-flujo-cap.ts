import { z } from "zod";

import {
  type IngresoProyectadoDesdeDte,
  ingresosEnHorizonte,
  notasCreditoConReferenciaVigente,
} from "@opai/domain";

import { defineCapability } from "../define";
import { hoy } from "../core/maestros/comun";
import { PERMISO_READ } from "./comun";
import { ingresosDeProgramaciones } from "./ventas-programacion-proyeccion";

const DIA_MS = 86_400_000;

function lunesDe(iso: string): string {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  const dia = (new Date(ms).getUTCDay() + 6) % 7;
  return new Date(ms - dia * DIA_MS).toISOString().slice(0, 10);
}

function sumarSemanas(lunes: string, n: number): string {
  return new Date(Date.parse(`${lunes}T00:00:00Z`) + n * 7 * DIA_MS).toISOString().slice(0, 10);
}

const ingresoSchema = z.object({
  documentoEmitidoId: z.string().nullable(),
  programacionId: z.string().nullable().optional(),
  cuentaId: z.string(),
  instalacionId: z.string().nullable(),
  semanaCobro: z.string(),
  monto: z.number().int(),
  etiqueta: z.string(),
  capa: z.enum(["real", "comprometido"]),
});

export const ventasProyeccionFlujo = defineCapability({
  id: "finanzas.ventas.proyeccion_flujo",
  descripcion:
    "Proyecta ingresos de cobro hacia el flujo de caja: borradores y programaciones recurrentes activas como comprometido, documentos enviados o aceptados como real, por semana de vencimiento. Una NC total deja la factura en cero.",
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
    const desde = lunesDe(hoy());
    const hasta = sumarSemanas(desde, input.semanas - 1);
    const filas = await ctx.db.documentoEmitido.findMany({
      where: {
        estadoDte: { in: ["borrador", "enviado", "aceptado"] },
        fechaVencimiento: { not: null },
        AND: [{ OR: [{ cesionEstado: null }, { cesionEstado: { not: "cedido" } }] }],
      },
      select: {
        id: true,
        cuentaId: true,
        instalacionId: true,
        tipoDte: true,
        folio: true,
        fechaVencimiento: true,
        montoTotal: true,
        estadoDte: true,
        glosa: true,
        documentoReferenciaId: true,
      },
    });
    const items: IngresoProyectadoDesdeDte[] = notasCreditoConReferenciaVigente(filas).map((d) => {
      const vence = d.fechaVencimiento!.toISOString().slice(0, 10);
      const capa = d.estadoDte === "borrador" ? "comprometido" : "real";
      const folio = d.folio != null ? ` folio ${d.folio}` : "";
      return {
        documentoEmitidoId: d.id,
        cuentaId: d.cuentaId,
        instalacionId: d.instalacionId,
        semanaCobro: lunesDe(vence),
        monto: d.tipoDte === 61 ? -d.montoTotal : d.montoTotal,
        etiqueta: `DTE ${d.tipoDte}${folio}${d.glosa ? ` · ${d.glosa}` : ""}`,
        capa,
      };
    });
    const programadas = await ingresosDeProgramaciones(ctx, sumarSemanas(hasta, 1), lunesDe);
    return { items: ingresosEnHorizonte([...items, ...programadas], desde, hasta) };
  },
});
