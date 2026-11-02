import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";
import { claveDocumento } from "@opai/domain";
import { createHash } from "node:crypto";

import { uuid7 } from "@opai/capabilities";

/** Guarda el PDF de propuesta en Documentos y lo vincula a la cotización (R15). */
export async function registrarPdfPropuesta(
  ctx: Contexto,
  tx: TenantTx,
  opts: {
    cotizacionId: string;
    codigo: string;
    pdf: Uint8Array;
  },
) {
  const id = uuid7();
  const nombre = `propuesta-${opts.codigo.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`;
  const storageKey = claveDocumento(ctx.tenantId, id, 1, nombre);
  const checksum = createHash("sha256").update(opts.pdf).digest("hex");
  await ctx.servicios.almacenamiento.subir(
    storageKey,
    Buffer.from(opts.pdf).toString("latin1"),
    "application/pdf",
    checksum,
  );
  const doc = await tx.documento.create({
    data: {
      id,
      tenantId: ctx.tenantId,
      nombre,
      titulo: `Propuesta ${opts.codigo}`,
      mime: "application/pdf",
      tamano: opts.pdf.byteLength,
      storageKey,
      sha256: checksum,
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
