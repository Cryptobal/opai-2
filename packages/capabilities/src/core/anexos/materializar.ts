import { createHash } from "node:crypto";

import { claveDocumento } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import type { Contexto } from "../../types";
import { sha256 } from "../comun";
import { marcaDe } from "../comunicaciones/resolver";
import { uuid7 } from "../documentos/uuid7";
import { hoy } from "../maestros/comun";
import { filasParaDocumento } from "./documento";
import { renderizarAnexoHtml } from "./plantilla";
import { pdfDeAnexo, plantillaAnexoPublicada } from "./plantilla-laboral";
import type { FilaAnexo } from "./vista";

/** Documento final del anexo en `core.documentos` (R15, ADR-039): plantilla base + marca del
 *  tenant, subido a R2 con su huella SHA-256 y registrado en la bitácora encadenada. */
type PersonaDoc = { id: string; nombres: string; apellidos: string; rut: string; calle: string | null; comuna: string | null };
export type ArchivoAnexo = { contenido: string | Buffer; mime: string; nombre: string };

/** Arma el archivo del anexo (PDF desde la plantilla publicada o el HTML de ejemplo). Va FUERA de la
 *  transacción de aprobación: lee con `ctx.db`. */
export async function prepararArchivoAnexo(ctx: Contexto, anexo: FilaAnexo, persona: PersonaDoc): Promise<ArchivoAnexo> {
  const filas = await filasParaDocumento(ctx, anexo);
  const plantilla = await plantillaAnexoPublicada(ctx);
  const fecha = hoy();
  const rut = persona.rut.replace(/[^0-9a-zA-Z]/g, "");
  if (plantilla)
    return {
      contenido: Buffer.from(await pdfDeAnexo(ctx, plantilla, persona, anexo, filas, fecha)),
      mime: "application/pdf",
      nombre: `anexo-contrato-${rut}.pdf`,
    };
  const marca = await marcaDe(ctx.db, ctx.tenantId, ctx.servicios.urlBase);
  return {
    contenido: renderizarAnexoHtml(marca, {
      persona: { nombres: persona.nombres, apellidos: persona.apellidos, rut: persona.rut },
      motivoCambio: anexo.motivoCambio,
      fecha,
      filas,
    }),
    mime: "text/html",
    nombre: `anexo-contrato-${rut}.html`,
  };
}

export async function materializarDocumento(ctx: Contexto, tx: TenantTx, anexo: FilaAnexo, persona: PersonaDoc, archivo: ArchivoAnexo) {
  const { contenido, mime, nombre } = archivo;
  const id = uuid7();
  const storageKey = claveDocumento(ctx.tenantId, id, 1, nombre);
  const checksum = typeof contenido === "string" ? sha256(contenido) : createHash("sha256").update(contenido).digest("hex");
  await ctx.servicios.almacenamiento.subir(storageKey, contenido, mime, checksum);
  const doc = await tx.documento.create({
    data: {
      id,
      tenantId: ctx.tenantId,
      nombre,
      titulo: "Anexo de contrato de trabajo",
      mime,
      tamano: Buffer.byteLength(contenido),
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
    payload: {
      sha256: checksum,
      tamano: doc.tamano,
      mime: doc.mime,
      origen: "generado",
      anexoId: anexo.id,
    },
  });
  return tx.documento.update({ where: { id: doc.id }, data: { bitacoraSeq: hecho.seq } });
}

