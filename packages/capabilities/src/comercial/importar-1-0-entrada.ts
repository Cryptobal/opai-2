// Entrada de `comercial.importar_1_0`.
import { z } from "zod";

import { datosOpai1 } from "@opai/db/importar-opai1";

const accionImport = z.enum(["simular", "aplicar", "conciliar", "revertir"]);

export const inputImportar10 = z.object({
  accion: accionImport.default("simular"),
  origen: datosOpai1.optional(),
  importacionId: z.string().uuid().optional(),
  permitirReimportacion: z.boolean().default(false),
  usuarios: z
    .array(z.object({ origen1Id: z.string().min(1), email: z.string().email() }))
    .default([]),
  desdeOpai1: z.boolean().default(false).describe("En vez de `origen`: trae el export desde OPAI 1 con la llave guardada en la integración «opai1» de la empresa."),
  soloComercial: z.boolean().default(false).describe("Importa solo cuentas, contactos, instalaciones y negocios; deja fuera las programaciones de Finanzas."),
});

/** La entrada pide leer OPAI 1 (no trae `origen` y la acción lo necesita). */
export const pideOpai1 = (i: z.infer<typeof inputImportar10>) => i.desdeOpai1 && !i.origen && i.accion !== "revertir";
