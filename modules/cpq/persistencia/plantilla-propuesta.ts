import type { Contexto } from "@opai/capabilities";

import {
  PLANTILLA_PROPUESTA_DEFECTO,
  parseBloquesPlantillaPropuesta,
  type AperturaPropuesta,
  type BloquePlantillaPropuesta,
} from "../domain/documento/propuesta-tecnica";

export type PlantillaPropuestaVista = {
  id: string;
  tipo: "propuesta_tecnica";
  base: "clasica" | "ejecutiva" | "compacta";
  version: number;
  activa: boolean;
  nombreVisible: string;
  aperturaMaxima: AperturaPropuesta;
  bloques: BloquePlantillaPropuesta[];
};

export async function plantillaActivaPropuesta(ctx: Contexto) {
  let row = await ctx.db.cpqPlantillaDocumento.findFirst({
    where: { tenantId: ctx.tenantId, tipo: "propuesta_tecnica", activa: true },
  });
  if (!row) {
    row = await ctx.db.cpqPlantillaDocumento.create({
      data: {
        tenantId: ctx.tenantId,
        tipo: "propuesta_tecnica",
        base: "clasica",
        bloquesJson: JSON.stringify(PLANTILLA_PROPUESTA_DEFECTO),
        nombreVisible: "Oferta de servicio",
        aperturaMaxima: "por_instalacion",
        version: 1,
        activa: true,
      },
    });
  }
  return row;
}

export function vistaPlantillaPropuesta(row: {
  id: string;
  base: string;
  version: number;
  activa: boolean;
  bloquesJson: string;
  nombreVisible: string | null;
  aperturaMaxima: string | null;
}): PlantillaPropuestaVista {
  const base = (row.base === "ejecutiva" || row.base === "compacta" ? row.base : "clasica") as PlantillaPropuestaVista["base"];
  const apertura = (row.aperturaMaxima ?? "por_instalacion") as AperturaPropuesta;
  return {
    id: row.id,
    tipo: "propuesta_tecnica",
    base,
    version: row.version,
    activa: row.activa,
    nombreVisible: row.nombreVisible ?? "Oferta de servicio",
    aperturaMaxima: apertura,
    bloques: parseBloquesPlantillaPropuesta(row.bloquesJson),
  };
}

export async function actualizarPlantillaPropuesta(
  ctx: Contexto,
  input: {
    base?: string;
    bloques?: BloquePlantillaPropuesta[];
    nombreVisible?: string;
    aperturaMaxima?: AperturaPropuesta;
  },
  escribir: boolean,
) {
  const actual = await plantillaActivaPropuesta(ctx);
  const bloquesJson = JSON.stringify(input.bloques ?? parseBloquesPlantillaPropuesta(actual.bloquesJson));
  if (!escribir) return actual;
  return ctx.transaccion(async (tx) => {
    await tx.cpqPlantillaDocumentoRevision.create({
      data: {
        tenantId: ctx.tenantId,
        plantillaDocumentoId: actual.id,
        version: actual.version,
        base: actual.base,
        bloquesJson: actual.bloquesJson,
      },
    });
    return tx.cpqPlantillaDocumento.update({
      where: { id: actual.id },
      data: {
        ...(input.base ? { base: input.base } : {}),
        bloquesJson,
        ...(input.nombreVisible !== undefined ? { nombreVisible: input.nombreVisible } : {}),
        ...(input.aperturaMaxima !== undefined ? { aperturaMaxima: input.aperturaMaxima } : {}),
        version: { increment: 1 },
      },
    });
  });
}

