import { defineCapability } from "../define";
import { PERMISO_WRITE } from "./comun";
import { sincronizarTitular } from "./titular-sincronizar";
import { entradaSerieSchema, fijarSerieInterna, salidaSerieSchema } from "./series-nucleo";

/** Fija la serie de un puesto (patrón, inicio de ciclo y titular) desde una fecha. */
export const seriesFijar = defineCapability({
  id: "pauta.series.fijar",
  descripcion:
    "Fija la serie de un puesto en la pauta: el patrón de turno, el inicio de ciclo y el titular, desde una fecha. Cierra la serie anterior el día antes y no modifica los días pasados. Se replica sola mes a mes según el ciclo.",
  permiso: PERMISO_WRITE,
  input: entradaSerieSchema,
  output: salidaSerieSchema,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) =>
    fijarSerieInterna(ctx, input, {
      dryRun,
      // El vínculo y la cobertura del puesto acompañan siempre a la serie (ADR-081).
      enTransaccion: (tx, c, r) => sincronizarTitular(tx, c, r),
    }),
});
