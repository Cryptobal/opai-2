import { z } from "zod";

import { dia } from "./comun";
import type { Contexto } from "../../types";

export const laboralSchema = z.object({
  personaId: z.string(),
  uniforme: z
    .object({
      tallaCamisa: z.string().nullable(),
      tallaPantalon: z.string().nullable(),
      tallaChaqueta: z.string().nullable(),
      tallaZapato: z.string().nullable(),
      notas: z.string().nullable(),
      entregas: z.array(
        z.object({
          id: z.string(),
          entregadaEn: z.string(),
          articulo: z.string(),
          talla: z.string().nullable(),
          cantidad: z.number(),
          notas: z.string().nullable(),
        }),
      ),
    })
    .nullable(),
  jornadaDt: z
    .object({
      resolucion: z.string().nullable(),
      resolucionVigenteDesde: z.string().nullable(),
      horasSemanales: z.string().nullable(),
      distribucion: z.string().nullable(),
      articulo22: z.boolean(),
      plazoFijoPeriodo: z.number().nullable(),
      terminoPlazoFijo: z.string().nullable(),
      avisoTerminoDias: z.number().nullable(),
    })
    .nullable(),
  os10: z
    .object({
      credencial: z.string().nullable(),
      venceEn: z.string().nullable(),
    })
    .nullable(),
  contacto: z
    .object({
      estadoCivil: z.string().nullable(),
      telefonoSecundario: z.string().nullable(),
      emergenciaNombre: z.string().nullable(),
      emergenciaRelacion: z.string().nullable(),
      emergenciaTelefono: z.string().nullable(),
    })
    .nullable(),
});

export async function cargarLaboral(ctx: Contexto, personaId: string) {
  const [uniforme, jornada, os10, contacto] = await Promise.all([
    ctx.db.personaUniforme.findUnique({
      where: { personaId },
      include: { entregas: { orderBy: { entregadaEn: "desc" }, take: 20 } },
    }),
    ctx.db.personaJornadaDt.findUnique({ where: { personaId } }),
    ctx.db.personaOs10.findUnique({ where: { personaId } }),
    ctx.db.personaContactoLaboral.findUnique({ where: { personaId } }),
  ]);
  return {
    personaId,
    uniforme: uniforme
      ? {
          tallaCamisa: uniforme.tallaCamisa,
          tallaPantalon: uniforme.tallaPantalon,
          tallaChaqueta: uniforme.tallaChaqueta,
          tallaZapato: uniforme.tallaZapato,
          notas: uniforme.notas,
          entregas: uniforme.entregas.map((e) => ({
            id: e.id,
            entregadaEn: dia(e.entregadaEn)!,
            articulo: e.articulo,
            talla: e.talla,
            cantidad: e.cantidad,
            notas: e.notas,
          })),
        }
      : null,
    jornadaDt: jornada
      ? {
          resolucion: jornada.resolucion,
          resolucionVigenteDesde: dia(jornada.resolucionVigenteDesde),
          horasSemanales: jornada.horasSemanales?.toString() ?? null,
          distribucion: jornada.distribucion,
          articulo22: jornada.articulo22,
          plazoFijoPeriodo: jornada.plazoFijoPeriodo,
          terminoPlazoFijo: dia(jornada.terminoPlazoFijo),
          avisoTerminoDias: jornada.avisoTerminoDias,
        }
      : null,
    os10: os10 ? { credencial: os10.credencial, venceEn: dia(os10.venceEn) } : null,
    contacto: contacto
      ? {
          estadoCivil: contacto.estadoCivil,
          telefonoSecundario: contacto.telefonoSecundario,
          emergenciaNombre: contacto.emergenciaNombre,
          emergenciaRelacion: contacto.emergenciaRelacion,
          emergenciaTelefono: contacto.emergenciaTelefono,
        }
      : null,
  };
}
