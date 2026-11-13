import { z } from "zod";

import { diaSchema, telefonoSchema, textoOpcional } from "./comun";

export const actualizarLaboralInput = z.object({
  uniforme: z
    .object({
      tallaCamisa: textoOpcional(20),
      tallaPantalon: textoOpcional(20),
      tallaChaqueta: textoOpcional(20),
      tallaZapato: textoOpcional(20),
      tallaPolera: textoOpcional(20),
      tallaGeologo: textoOpcional(20),
      tallaPolar: textoOpcional(20),
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
      plazoFijoPeriodo: z.number().int().min(1).max(3).nullable().optional(),
      terminoPlazoFijo: diaSchema.nullable().optional(),
      /** Término de cada período de plazo fijo, en orden (hasta 3). */
      terminosPlazoFijo: z
        .array(diaSchema)
        .max(3)
        .refine((l) => new Set(l).size === l.length, "Hay términos de plazo fijo repetidos.")
        .optional(),
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
