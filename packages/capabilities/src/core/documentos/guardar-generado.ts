// Guarda un PDF generado desde una plantilla (CAR-127 / CAR-315): sube el archivo, crea el documento con
// su vínculo de propietario y lo registra en la bitácora. Compartido por generar (persona) y
// generar_entidad (cuenta o instalación).
import { createHash } from "node:crypto";

import { claveDocumento } from "@opai/domain";

import type { Contexto } from "../../types";
import { hoy } from "../maestros/comun";
import { uuid7 } from "./uuid7";
import { vistaDocumento } from "./vista";

type Entrada = {
  bytes: Uint8Array;
  nombre: string;
  titulo: string;
  plantilla: { id: string };
  version: { numero: number };
  propietario: { tipo: "persona" | "cuenta" | "instalacion"; id: string };
};

export async function guardarPdfGenerado(ctx: Contexto, e: Entrada) {
  const id = uuid7();
  const huella = createHash("sha256").update(e.bytes).digest("hex");
  const storageKey = claveDocumento(ctx.tenantId, id, 1, e.nombre);
  await ctx.servicios.almacenamiento.subir(storageKey, Buffer.from(e.bytes), "application/pdf", huella);
  const doc = await ctx.transaccion(async (tx) => {
    const creado = await tx.documento.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        nombre: e.nombre,
        titulo: e.titulo,
        mime: "application/pdf",
        tamano: e.bytes.byteLength,
        storageKey,
        sha256: huella,
        estado: "disponible",
        origen: "generado",
        moduloOrigen: "core",
        creadoPorTipo: ctx.actor.tipo,
        creadoPorId: ctx.actor.id ?? null,
        viaUserId: ctx.actor.viaUserId ?? null,
        confirmadoEn: new Date(),
      },
    });
    await tx.documentoVinculo.create({
      data: { tenantId: ctx.tenantId, documentoId: id, entidadTipo: e.propietario.tipo, entidadId: e.propietario.id, rol: "propietario" },
    });
    const hecho = await ctx.bitacora.registrar(tx, {
      tipo: "core.documento.registrado",
      entidadTipo: "documento",
      entidadId: id,
      payload: { sha256: huella, tamano: creado.tamano, mime: creado.mime, origen: "generado", plantillaId: e.plantilla.id, plantillaVersion: e.version.numero },
    });
    return tx.documento.update({ where: { id }, data: { bitacoraSeq: hecho.seq } });
  });
  return vistaDocumento(doc, null, hoy());
}
