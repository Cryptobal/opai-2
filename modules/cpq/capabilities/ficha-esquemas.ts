import { z } from "zod";

import { instrumentosSchema } from "../persistencia/instrumentos-version";
import { uuidSchema } from "./esquemas";

const estadoFichaSchema = z.object({
  estado: z.string(),
  etiqueta: z.string(),
  siguiente: z.object({ accion: z.string(), etiqueta: z.string() }),
  bloqueos: z.array(z.object({ codigo: z.string(), mensaje: z.string() })),
});

export const metaSchema = z.object({
  fechaCalculo: z.string(),
  estadoFicha: estadoFichaSchema,
  puedeReabrir: z.boolean(),
  puedeCrearVersion: z.boolean(),
  validaHastaContrato: z.string().nullable(),
  editable: z.boolean(),
  avisoRecalculo: z
    .object({ mensaje: z.string(), huellaActual: z.string().nullable() })
    .nullable(),
  aprobacion: z
    .object({
      id: uuidSchema,
      bandejaId: z.string(),
      estado: z.string(),
      solicitadaPorId: uuidSchema,
    })
    .nullable(),
  puedeEnviar: z.boolean(),
  puedeAprobarMargen: z.boolean(),
  motivoNoAprobarMargen: z.string().nullable(),
  autoaprobacionMargen: z.boolean().nullable(),
  requiereConfirmacionValoresViejos: z.boolean(),
  requiereConfirmarMutual: z.boolean(),
  costosLinea: z.record(z.string(), z.unknown()).optional(),
});

export const parametrosSchema = z.object({
  mesesContrato: z.number().int(),
  mesesPactados: z.boolean(),
  margenModo: z.string(),
  margenObjetivoPct: z.number().int().nullable(),
  sobrescrito: z.boolean(),
  instrumentos: instrumentosSchema,
});

