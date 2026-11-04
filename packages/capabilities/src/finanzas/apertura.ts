import { z } from "zod";

import { defineCapability } from "../define";
import { PERMISO_VENTAS_CONFIGURE } from "./ventas-comun";
import { inputAperturaImportar, inputAperturaRevertir, resultadoApertura } from "./apertura-datos";
import { aplicarApertura } from "./apertura-aplicar";
import { revertirApertura } from "./apertura-revertir";

export const aperturaImportar = defineCapability({
  id: "finanzas.apertura.importar",
  soloPersonas: true,
  descripcion:
    "Carga la apertura de Finanzas desde OPAI 1.0: saldos de banco, facturas por cobrar con su saldo y último folio usado, comparando las sumas de control. Idempotente y reversible; solo owner o admin.",
  permiso: PERMISO_VENTAS_CONFIGURE,
  input: inputAperturaImportar,
  output: resultadoApertura,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) => aplicarApertura(ctx, input.fechaCorte, input.entrada, dryRun, input.aceptarRechazos),
});

export const aperturaRevertir = defineCapability({
  id: "finanzas.apertura.revertir",
  soloPersonas: true,
  descripcion:
    "Deshace una carga de apertura desde OPAI 1.0: borra los documentos y saldos que creó y devuelve el folio. Se niega entera si algo ya tiene cobros, gestiones o conciliaciones.",
  permiso: PERMISO_VENTAS_CONFIGURE,
  input: inputAperturaRevertir,
  output: z.object({
    revertida: z.boolean(),
    filas: z.number(),
    bloqueos: z.array(z.object({ entidad: z.string(), id10: z.string(), motivo: z.string() })),
  }),
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) => revertirApertura(ctx, input.importacionId, dryRun),
});
