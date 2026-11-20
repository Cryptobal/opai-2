import type { TenantTx } from "@opai/db";

import type { Contexto } from "../types";

/** Registra en la base el documento ya subido a almacenamiento (misma transacción que la liquidación). */
export async function crearDocumentoLiquidacion(
  tx: TenantTx,
  ctx: Contexto,
  datos: {
    id: string;
    personaId: string;
    nombre: string;
    titulo: string;
    tamano: number;
    storageKey: string;
    sha256: string;
  },
): Promise<void> {
  await tx.documento.create({
    data: {
      id: datos.id,
      tenantId: ctx.tenantId,
      nombre: datos.nombre,
      titulo: datos.titulo,
      mime: "application/pdf",
      tamano: datos.tamano,
      storageKey: datos.storageKey,
      sha256: datos.sha256,
      estado: "disponible",
      origen: "generado",
      moduloOrigen: "nomina",
      visibleEn: ["trabajador"],
      creadoPorTipo: ctx.actor.tipo,
      creadoPorId: ctx.actor.id ?? null,
      viaUserId: ctx.actor.viaUserId ?? null,
      confirmadoEn: new Date(),
    },
  });
  await tx.documentoVinculo.create({
    data: { tenantId: ctx.tenantId, documentoId: datos.id, entidadTipo: "persona", entidadId: datos.personaId, rol: "propietario" },
  });
  await ctx.bitacora.registrar(tx, {
    tipo: "nomina.liquidacion.publicada",
    entidadTipo: "documento",
    entidadId: datos.id,
    payload: { sha256: datos.sha256, tamano: datos.tamano, personaId: datos.personaId },
  });
}