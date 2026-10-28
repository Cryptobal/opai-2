import { z } from "zod";

import { claveDocumento, PERMISOS_CORE } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { sha256 } from "../comun";
import { marcaDe } from "../comunicaciones/resolver";
import { uuid7 } from "../documentos/uuid7";
import { hoy } from "../maestros/comun";
import { anexoDe } from "./comun";
import { filasParaDocumento } from "./documento";
import { renderizarAnexoHtml } from "./plantilla";
import { anexoSchema, vistaAnexo } from "./vista";
import type { FilaAnexo } from "./vista";

/** Serializa la aprobación/rechazo de un mismo anexo, dentro de la transacción de ejecución. */
async function bloquearAnexo(ctx: Contexto, id: string) {
  await ctx.transaccion(
    (tx) => tx.$queryRaw`
    /* 07b:bloqueo-anexo */
    SELECT id FROM core.anexos_contrato WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${id}::uuid FOR UPDATE
  `,
  );
}

/** Documento final del anexo en `core.documentos` (R15, ADR-039): plantilla base + marca del
 *  tenant, subido a R2 con su huella SHA-256 y registrado en la bitácora encadenada. */
async function materializarDocumento(
  ctx: Contexto,
  tx: TenantTx,
  anexo: FilaAnexo,
  persona: { id: string; nombres: string; apellidos: string; rut: string },
) {
  const marca = await marcaDe(tx, ctx.tenantId, ctx.servicios.urlBase);
  const filas = await filasParaDocumento(ctx, anexo);
  const html = renderizarAnexoHtml(marca, {
    persona: { nombres: persona.nombres, apellidos: persona.apellidos, rut: persona.rut },
    motivoCambio: anexo.motivoCambio,
    fecha: hoy(),
    filas,
  });
  const id = uuid7();
  const nombre = `anexo-contrato-${persona.rut.replace(/[^0-9a-zA-Z]/g, "")}.html`;
  const storageKey = claveDocumento(ctx.tenantId, id, 1, nombre);
  const checksum = sha256(html);
  await ctx.servicios.almacenamiento.subir(storageKey, html, "text/html", checksum);
  const doc = await tx.documento.create({
    data: {
      id,
      tenantId: ctx.tenantId,
      nombre,
      titulo: "Anexo de contrato de trabajo",
      mime: "text/html",
      tamano: Buffer.byteLength(html),
      storageKey,
      sha256: checksum,
      estado: "disponible",
      origen: "generado",
      moduloOrigen: "core",
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
      entidadTipo: "persona",
      entidadId: persona.id,
      rol: "propietario",
    },
  });
  const hecho = await ctx.bitacora.registrar(tx, {
    tipo: "core.documento.registrado",
    entidadTipo: "documento",
    entidadId: doc.id,
    payload: { sha256: checksum, tamano: doc.tamano, mime: doc.mime, origen: "generado", anexoId: anexo.id },
  });
  return tx.documento.update({ where: { id: doc.id }, data: { bitacoraSeq: hecho.seq } });
}

export const anexosAprobar = defineCapability({
  id: "core.anexos.aprobar",
  // Solo personas: aprobar materializa un documento irreversible (ADR-032); un agente no lo aprueba.
  soloPersonas: true,
  descripcion:
    "IRREVERSIBLE: aprueba el anexo de contrato en borrador, genera el documento final con la plantilla base y la marca del tenant y lo deja en Documentos con su huella SHA-256 (R15). Solo personas, nunca API keys.",
  permiso: PERMISOS_CORE.anexosManage,
  input: z.object({ id: z.uuid() }),
  output: anexoSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (dryRun) {
      const a = await anexoDe(ctx, input.id);
      if (a.estado !== "borrador") throw conflicto("El anexo ya fue resuelto.");
      return vistaAnexo({
        ...a,
        estado: "aprobado",
        aprobadoPorId: ctx.actor.id ?? null,
        aprobadoEn: new Date(),
        documentoId: "(se crea al aprobar)",
      });
    }
    await bloquearAnexo(ctx, input.id);
    const a = await anexoDe(ctx, input.id);
    if (a.estado !== "borrador") throw conflicto("El anexo ya fue resuelto.");
    const persona = await ctx.db.persona.findUnique({ where: { id: a.personaId } });
    if (!persona) throw noEncontrado("La persona");
    const r = await ctx.transaccion(async (tx) => {
      const doc = await materializarDocumento(ctx, tx, a, persona);
      const actualizado = await tx.anexoContrato.update({
        where: { id: a.id },
        data: {
          estado: "aprobado",
          aprobadoPorId: ctx.actor.id ?? null,
          aprobadoEn: new Date(),
          documentoId: doc.id,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.anexo.aprobado",
        entidadTipo: "anexo",
        entidadId: a.id,
        payload: { personaId: a.personaId, documentoId: doc.id },
      });
      return actualizado;
    });
    return vistaAnexo(r);
  },
});
