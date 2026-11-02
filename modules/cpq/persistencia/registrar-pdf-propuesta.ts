import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";
import { claveDocumento } from "@opai/domain";
import { createHash } from "node:crypto";

import { uuid7 } from "@opai/capabilities";

export type PdfPropuestaSubido = {
  id: string;
  nombre: string;
  storageKey: string;
  checksum: string;
  tamano: number;
};

export function checksumPdfPropuesta(pdf: Uint8Array) {
  return createHash("sha256").update(pdf).digest("hex");
}

/** Sube bytes del PDF a R2 (fuera de transacción). */
export async function subirPdfPropuestaAlmacenamiento(
  ctx: Contexto,
  opts: { codigo: string; pdf: Uint8Array },
): Promise<PdfPropuestaSubido> {
  const id = uuid7();
  const nombre = `propuesta-${opts.codigo.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`;
  const storageKey = claveDocumento(ctx.tenantId, id, 1, nombre);
  const checksum = checksumPdfPropuesta(opts.pdf);
  const cuerpo = Buffer.from(opts.pdf);
  if (ctx.servicios.almacenamiento.disponible) {
    await ctx.servicios.almacenamiento.subir(storageKey, cuerpo, "application/pdf", checksum);
  }
  return { id, nombre, storageKey, checksum, tamano: opts.pdf.byteLength };
}

export async function eliminarPdfPropuestaAlmacenamiento(ctx: Contexto, storageKey: string) {
  if (ctx.servicios.almacenamiento.disponible) {
    await ctx.servicios.almacenamiento.eliminar(storageKey);
  }
}

/** Registra metadatos del PDF ya subido y lo vincula a la cotización (R15). */
export async function registrarPdfPropuestaMetadatos(
  ctx: Contexto,
  tx: TenantTx,
  opts: PdfPropuestaSubido & { cotizacionId: string; codigo: string },
) {
  const doc = await tx.documento.create({
    data: {
      id: opts.id,
      tenantId: ctx.tenantId,
      nombre: opts.nombre,
      titulo: `Propuesta ${opts.codigo}`,
      mime: "application/pdf",
      tamano: opts.tamano,
      storageKey: opts.storageKey,
      sha256: opts.checksum,
      estado: "disponible",
      origen: "generado",
      moduloOrigen: "cpq",
      creadoPorTipo: ctx.actor.tipo,
      creadoPorId: ctx.actor.id ?? null,
      viaUserId: ctx.actor.tipo === "agent" ? ctx.actor.viaUserId : null,
      confirmadoEn: new Date(),
    },
  });
  await tx.documentoVinculo.create({
    data: {
      tenantId: ctx.tenantId,
      documentoId: doc.id,
      entidadTipo: "cotizacion",
      entidadId: opts.cotizacionId,
      rol: "propuesta",
    },
  });
  await ctx.bitacora.registrar(tx, {
    tipo: "core.documento.registrado",
    entidadTipo: "documento",
    entidadId: doc.id,
    payload: { cotizacionId: opts.cotizacionId, codigo: opts.codigo },
  });
  return doc.id;
}
