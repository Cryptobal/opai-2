import { reglaDeNegocio } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";

import {
  BASES_PLANTILLA,
  type BasePlantilla,
  type BloqueConfig,
  BLOQUES_POR_BASE,
  parseBloquesJson,
} from "../domain/documento/bloques";

export type PlantillaDocumentoVista = {
  id: string;
  tipo: "cotizacion";
  base: BasePlantilla;
  version: number;
  activa: boolean;
  bloques: BloqueConfig[];
};

export async function plantillaActivaCotizacion(ctx: Contexto) {
  let row = await ctx.db.cpqPlantillaDocumento.findFirst({
    where: { tenantId: ctx.tenantId, tipo: "cotizacion", activa: true },
  });
  if (!row) {
    row = await ctx.db.cpqPlantillaDocumento.create({
      data: {
        tenantId: ctx.tenantId,
        tipo: "cotizacion",
        base: "clasica",
        bloquesJson: JSON.stringify(BLOQUES_POR_BASE.clasica),
        version: 1,
        activa: true,
      },
    });
  }
  return row;
}

export function vistaPlantilla(row: {
  id: string;
  tipo: string;
  base: string;
  version: number;
  activa: boolean;
  bloquesJson: string;
}): PlantillaDocumentoVista {
  const base = (BASES_PLANTILLA.includes(row.base as BasePlantilla) ? row.base : "clasica") as BasePlantilla;
  return {
    id: row.id,
    tipo: "cotizacion",
    base,
    version: row.version,
    activa: row.activa,
    bloques: parseBloquesJson(row.bloquesJson, base),
  };
}

export async function plantillaEnVersion(
  ctx: Contexto,
  id: string,
  version: number,
): Promise<PlantillaDocumentoVista | null> {
  const row = await ctx.db.cpqPlantillaDocumento.findFirst({ where: { id } });
  if (!row) return null;
  if (row.version === version) return vistaPlantilla(row);
  const rev = await ctx.db.cpqPlantillaDocumentoRevision.findFirst({
    where: { plantillaDocumentoId: id, version },
  });
  if (!rev) return null;
  return vistaPlantilla({ ...row, base: rev.base, version: rev.version, bloquesJson: rev.bloquesJson });
}

export async function actualizarPlantillaCotizacion(
  ctx: Contexto,
  input: { base?: BasePlantilla; bloques?: BloqueConfig[] },
  escribir: boolean,
) {
  const actual = await plantillaActivaCotizacion(ctx);
  const base = input.base ?? (actual.base as BasePlantilla);
  if (input.base && !BASES_PLANTILLA.includes(input.base))
    throw reglaDeNegocio("Plantilla base no reconocida.");
  const bloques = input.bloques ?? parseBloquesJson(actual.bloquesJson, base);
  const bloquesJson = JSON.stringify(bloques);
  if (!escribir) return { ...actual, base, bloquesJson };
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
      data: { base, bloquesJson, version: { increment: 1 } },
    });
  });
}
