import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { consumoBase } from "../../integraciones/adaptadores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import {
  definidos,
  diaSchema,
  escribirConEvento,
  hoy,
  opcionalAFecha,
  textoOpcional,
} from "../maestros/comun";
import { documentosEnAlcance } from "./alcance-doc";
import { esDocCumplimiento, puedeVerCumplimiento } from "./sensibles";
import { documentoSchema, vistaDocumento } from "./vista";

export async function disponible(ctx: Contexto, id: string) {
  const d = await ctx.db.documento.findUnique({ where: { id } });
  if (!d || d.estado === "pendiente") throw noEncontrado("El documento");
  // Alcance por filas (ADR-022): un actor acotado solo accede a los documentos de sus entidades a
  // cargo. Vale para descargar, actualizar y archivar: el filtro va en la consulta, nunca en la UI.
  const permitidos = await documentosEnAlcance(ctx);
  if (permitidos && !permitidos.includes(d.id)) throw noEncontrado("El documento");
  const tipo = d.tipoId ? await ctx.db.documentoTipo.findUnique({ where: { id: d.tipoId } }) : null;
  return { d, tipo };
}

export const documentosUpdate = defineCapability({
  id: "core.documentos.update",
  descripcion:
    "Actualiza los datos de un documento (título, tipo, emisión, vencimiento, etiquetas y portales donde se ve). No cambia el archivo: para eso, sube una nueva versión.",
  permiso: PERMISOS_CORE.documentosManage,
  portales: ["erp", "supervisor"],
  input: z.object({
    id: uuidSchema,
    titulo: textoOpcional(200),
    tipoId: uuidSchema.nullable().optional(),
    emitidoEn: diaSchema.nullable().optional(),
    venceEn: diaSchema.nullable().optional(),
    etiquetas: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    visibleEn: z.array(z.enum(["cliente", "trabajador", "supervisor", "terreno"])).optional(),
  }),
  output: documentoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...c }, { dryRun }) {
    const { d, tipo } = await disponible(ctx, id);
    const data = definidos({
      ...c,
      emitidoEn: opcionalAFecha(c.emitidoEn),
      venceEn: opcionalAFecha(c.venceEn),
    });
    if (dryRun) return vistaDocumento({ ...d, ...data }, tipo, hoy());
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.documento.actualizado",
        entidadTipo: "documento",
        payload: () => ({ campos: Object.keys(data) }),
      },
      (tx) =>
        tx.documento.update({
          where: { id },
          data: { ...data, hitoNotificado: c.venceEn !== undefined ? null : d.hitoNotificado },
        }),
    );
    return vistaDocumento(r, tipo, hoy());
  },
});

export const documentosArchive = defineCapability({
  id: "core.documentos.archive",
  descripcion:
    "Archiva un documento: deja de contar como vigente y de aparecer por defecto. El archivo y su registro en la bitácora se conservan.",
  permiso: PERMISOS_CORE.documentosManage,
  input: z.object({ id: uuidSchema }),
  output: documentoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const { d, tipo } = await disponible(ctx, id);
    const data = { estado: "archivado", archivadoEn: d.archivadoEn ?? new Date() };
    if (dryRun) return vistaDocumento({ ...d, ...data }, tipo, hoy());
    const r = await escribirConEvento(
      ctx,
      { tipo: "core.documento.archivado", entidadTipo: "documento" },
      (tx) => tx.documento.update({ where: { id }, data }),
    );
    return vistaDocumento(r, tipo, hoy());
  },
});

export const documentosUrlDescarga = defineCapability({
  id: "core.documentos.url_descarga",
  descripcion:
    "URL firmada para ver o descargar un documento durante 5 minutos. No se guarda ni se comparte: pide otra cuando la necesites.",
  permiso: PERMISOS_CORE.documentosRead,
  input: z.object({ id: uuidSchema }),
  output: z.object({ url: z.string(), expiraEn: z.string(), nombre: z.string(), mime: z.string() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { id }) {
    const { d } = await disponible(ctx, id);
    // La exportación del titular (Ley 21.719) solo la descarga `cumplimiento.read`; con el
    // `documentos.read` general se responde «no encontrado», sin revelar que existe (sin enumeración).
    if (!puedeVerCumplimiento(ctx) && (await esDocCumplimiento(ctx, d.id)))
      throw noEncontrado("El documento");
    const url = await ctx.servicios.almacenamiento.urlDescarga(d.storageKey, d.nombre, 300);
    await ctx.medidor
      .registrar({
        ...consumoBase(ctx, "core"),
        recurso: "almacenamiento.descarga",
        unidad: "url",
        cantidad: 1,
        referenciaTipo: "documento",
        referenciaId: d.id,
      })
      .catch(() => undefined);
    return {
      url,
      expiraEn: new Date(Date.now() + 300_000).toISOString(),
      nombre: d.nombre,
      mime: d.mime,
    };
  },
});
