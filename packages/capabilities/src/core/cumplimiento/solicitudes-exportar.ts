import { z } from "zod";

import {
  claveDocumento,
  PERMISOS_CORE,
  produceExportacion,
  sha256Hex,
  type TipoSolicitud,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { uuid7 } from "../documentos/uuid7";
import { cargarTitular, type TitularVista } from "./comunes";
import { armarExportacion } from "./exportacion-datos";
import { dondeSolicitud, enContextoArco } from "./solicitudes-alcance";
import { autorizarSolicitudRepetida } from "./solicitudes-repeticion";

/**
 * Sube el JSON y lo deja como documento del Núcleo (origen generado), con bitácora y vínculo a su
 * solicitud ARCO. El vínculo a `solicitud_arco` (no al tenant) hace que el documento sea de
 * cumplimiento: solo lo listan y descargan los permisos `cumplimiento.read` (§4.4), nunca el
 * `documentos.read` general (supervisor, viewer).
 */
async function materializar(
  ctx: Contexto,
  contenido: string,
  sha256: string,
  nombre: string,
  solicitudId: string,
) {
  const id = uuid7();
  const storageKey = claveDocumento(ctx.tenantId, id, 1, nombre);
  await ctx.servicios.almacenamiento.subir(storageKey, contenido, "application/json", sha256);
  return ctx.transaccion(async (tx) => {
    const doc = await tx.documento.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        nombre,
        titulo: "Exportación de datos del titular (Ley 21.719)",
        mime: "application/json",
        tamano: Buffer.byteLength(contenido),
        storageKey,
        sha256,
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
      data: {
        tenantId: ctx.tenantId,
        documentoId: doc.id,
        entidadTipo: "solicitud_arco",
        entidadId: solicitudId,
        rol: "propietario",
      },
    });
    const hecho = await ctx.bitacora.registrar(tx, {
      tipo: "core.documento.registrado",
      entidadTipo: "documento",
      entidadId: doc.id,
      payload: { sha256, tamano: doc.tamano, mime: doc.mime, origen: "generado" },
    });
    await tx.documento.update({ where: { id: doc.id }, data: { bitacoraSeq: hecho.seq } });
    return doc;
  });
}

export const solicitudExportar = defineCapability({
  autorizarRepeticion: (ctx, input) => autorizarSolicitudRepetida(ctx, input.solicitudId),
  id: "core.cumplimiento.solicitud_exportar",
  descripcion:
    "Genera la exportación de acceso o portabilidad del titular de una solicitud (Ley 21.719): reúne su identificación, contacto, vínculos y documentos en un JSON legible por máquina, lo guarda como documento del Núcleo con huella SHA-256 y lo vincula a la solicitud como evidencia.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({ solicitudId: uuidSchema }),
  output: z.object({
    documentoId: z.string(),
    sha256: z.string(),
    bytes: z.number(),
    titular: z.object({ tipo: z.string(), id: z.string() }),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    return enContextoArco(ctx, async (ctx) => {
      const s = await ctx.db.solicitudArco.findFirst({
        where: { id: input.solicitudId, ...(await dondeSolicitud(ctx)) },
      });
      if (!s) throw noEncontrado("La solicitud");
      if (!produceExportacion(s.tipo as TipoSolicitud))
        throw reglaDeNegocio(
          "Solo las solicitudes de acceso o portabilidad producen una exportación.",
        );
      if (s.estado === "rechazada") throw reglaDeNegocio("La solicitud está rechazada.");
      if (!s.titularTipo || !s.titularId)
        throw reglaDeNegocio("La solicitud no tiene un titular interno para exportar.");
      const titular: TitularVista = await cargarTitular(ctx, {
        tipo: s.titularTipo as "persona" | "contacto",
        id: s.titularId,
      });
      const datos = await armarExportacion(ctx, titular);
      const contenido = JSON.stringify(
        { generadoEn: new Date().toISOString(), solicitudId: s.id, tipo: s.tipo, titular: datos },
        null,
        2,
      );
      const sha256 = await sha256Hex(contenido);
      if (dryRun)
        return {
          documentoId: "",
          sha256,
          bytes: Buffer.byteLength(contenido),
          titular: { tipo: titular.tipo, id: titular.id },
        };
      if (!ctx.servicios.almacenamiento.disponible)
        throw reglaDeNegocio("El almacenamiento no está configurado en este entorno.");
      const nombre = `exportacion-${titular.tipo}-${s.id}.json`;
      const doc = await materializar(ctx, contenido, sha256, nombre, s.id);
      await ctx.transaccion(async (tx) => {
        await tx.solicitudArco.update({
          where: { id: s.id },
          data: { documentoEvidenciaId: doc.id },
        });
        await ctx.eventos.emitir(tx, {
          tipo: "core.cumplimiento.solicitud_exportada",
          entidadTipo: "solicitud_arco",
          entidadId: s.id,
          payload: { documentoId: doc.id, titular: { tipo: titular.tipo, id: titular.id } },
        });
      });
      return {
        documentoId: doc.id,
        sha256,
        bytes: Buffer.byteLength(contenido),
        titular: { tipo: titular.tipo, id: titular.id },
      };
    });
  },
});
