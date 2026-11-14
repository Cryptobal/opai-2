import { z } from "zod";

import { dia } from "./comun";
import { cargarContrato, contratoSchema } from "./contrato-periodos-vista";
import { respaldoOs10 } from "./os10-documento";
import { prendasDeLaEmpresa } from "./uniforme-prendas";
import type { Contexto } from "../../types";

export const laboralSchema = z.object({
  personaId: z.string(),
  uniforme: z
    .object({
      estaturaCm: z.number().nullable(),
      pesoKg: z.number().nullable(),
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
      resolucionVigenteHasta: z.string().nullable(),
      horasSemanales: z.string().nullable(),
      distribucion: z.string().nullable(),
      articulo22: z.boolean(),
      avisoTerminoDias: z.number().nullable(),
    })
    .nullable(),
  os10: z
    .object({
      credencial: z.string().nullable(),
      venceEn: z.string().nullable(),
    })
    .nullable(),
  /** Documento OS-10 vigente en Documentos (CAR-429): fuente del vencimiento cuando existe. */
  os10Respaldo: z
    .object({
      documentoId: z.string(),
      emitidoEn: z.string().nullable(),
      venceEn: z.string().nullable(),
    })
    .nullable(),
  /** Talla por prenda del uniforme de la empresa (CAR-408); `enKit: false` = prenda que la empresa ya no usa. */
  tallas: z.array(
    z.object({
      prenda: z.string(),
      nombre: z.string(),
      talla: z.string().nullable(),
      enKit: z.boolean(),
    }),
  ),
  /** Historia del contrato vigente (CAR-409): períodos de plazo fijo y paso a indefinido. */
  contrato: contratoSchema.nullable(),
  contacto: z
    .object({
      estadoCivil: z.string().nullable(),
      telefonoSecundario: z.string().nullable(),
      emergenciaNombre: z.string().nullable(),
      emergenciaRelacion: z.string().nullable(),
      emergenciaTelefono: z.string().nullable(),
      codigoInterno: z.string().nullable(),
      movilizacion: z.string().nullable(),
    })
    .nullable(),
});

export async function cargarLaboral(ctx: Contexto, personaId: string) {
  const [uniforme, jornada, os10, contacto, contrato, kit, guardadas, os10Respaldo] =
    await Promise.all([
      ctx.db.personaUniforme.findUnique({
        where: { personaId },
        include: { entregas: { orderBy: { entregadaEn: "desc" }, take: 20 } },
      }),
      ctx.db.personaJornadaDt.findUnique({ where: { personaId } }),
      ctx.db.personaOs10.findUnique({ where: { personaId } }),
      ctx.db.personaContactoLaboral.findUnique({ where: { personaId } }),
      cargarContrato(ctx.db, personaId),
      prendasDeLaEmpresa(ctx),
      ctx.db.personaTalla.findMany({ where: { personaId }, select: { prenda: true, talla: true } }),
      respaldoOs10(ctx, personaId),
    ]);
  const porPrenda = new Map(guardadas.map((t) => [t.prenda, t.talla]));
  const claves = new Set(kit.map((p) => p.clave));
  const tallas = [
    ...kit.map((p) => ({
      prenda: p.clave,
      nombre: p.nombre,
      talla: porPrenda.get(p.clave) ?? null,
      enKit: true,
    })),
    ...guardadas
      .filter((t) => !claves.has(t.prenda))
      .map((t) => ({ prenda: t.prenda, nombre: t.prenda, talla: t.talla, enKit: false })),
  ];
  return {
    personaId,
    uniforme: uniforme
      ? {
          estaturaCm: uniforme.estaturaCm ?? null,
          pesoKg: uniforme.pesoKg ?? null,
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
          resolucionVigenteHasta: dia(jornada.resolucionVigenteHasta ?? null),
          horasSemanales: jornada.horasSemanales?.toString() ?? null,
          distribucion: jornada.distribucion,
          articulo22: jornada.articulo22,
          avisoTerminoDias: jornada.avisoTerminoDias,
        }
      : null,
    tallas,
    contrato,
    os10: os10 ? { credencial: os10.credencial, venceEn: dia(os10.venceEn) } : null,
    os10Respaldo,
    contacto: contacto
      ? {
          estadoCivil: contacto.estadoCivil,
          telefonoSecundario: contacto.telefonoSecundario,
          emergenciaNombre: contacto.emergenciaNombre,
          emergenciaRelacion: contacto.emergenciaRelacion,
          emergenciaTelefono: contacto.emergenciaTelefono,
          codigoInterno: contacto.codigoInterno ?? null,
          movilizacion: contacto.movilizacion ?? null,
        }
      : null,
  };
}
