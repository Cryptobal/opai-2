import { z } from "zod";

import { CLAVE_PRENDA } from "@opai/domain";

import { diaSchema, telefonoSchema, textoOpcional } from "./comun";

export const actualizarLaboralInput = z.object({
  uniforme: z
    .object({
      /** Talla por prenda del uniforme de la empresa (clave de la prenda → talla; null la borra). CAR-408. */
      tallas: z
        .record(z.string().regex(CLAVE_PRENDA), z.string().trim().max(20).nullable())
        .refine((t) => Object.keys(t).length <= 30, "Demasiadas prendas.")
        .optional(),
      estaturaCm: z.number().int().min(100).max(230).nullable().optional(),
      pesoKg: z.number().int().min(30).max(250).nullable().optional(),
      notas: textoOpcional(500),
      entrega: z
        .object({
          entregadaEn: diaSchema,
          articulo: z.string().trim().min(2).max(120),
          talla: textoOpcional(20),
          cantidad: z.number().int().min(1).max(99).default(1),
          notas: textoOpcional(300),
        })
        .optional(),
    })
    .optional(),
  jornadaDt: z
    .object({
      resolucion: textoOpcional(200),
      resolucionVigenteDesde: diaSchema.nullable().optional(),
      resolucionVigenteHasta: diaSchema.nullable().optional(),
      horasSemanales: z.string().trim().max(10).nullable().optional(),
      distribucion: textoOpcional(200),
      articulo22: z.boolean().optional(),
      avisoTerminoDias: z.number().int().min(0).max(365).nullable().optional(),
    })
    .optional(),
  os10: z
    .object({
      credencial: textoOpcional(80),
      venceEn: diaSchema.nullable().optional(),
    })
    .optional(),
  contacto: z
    .object({
      estadoCivil: textoOpcional(40),
      telefonoSecundario: telefonoSchema.nullable().optional(),
      emergenciaNombre: textoOpcional(120),
      emergenciaRelacion: textoOpcional(80),
      emergenciaTelefono: telefonoSchema.nullable().optional(),
      codigoInterno: textoOpcional(40),
      movilizacion: textoOpcional(120),
    })
    .optional(),
});
