import { z } from "zod";

import { defineCapability, noEncontrado, prohibido } from "@opai/capabilities";

import { uuidSchema } from "./esquemas";
import { PERMISO_APROBAR, PERMISO_RENDIR, PERMISO_VER_TODAS, PORTALES_RENDIR } from "./permisos";
import { actorId, rendicionDe } from "./util";

export const respaldoDescargar = defineCapability({
  id: "rendiciones.respaldos.url_descarga",
  descripcion:
    "URL firmada, por 5 minutos, para ver la boleta o factura que respalda un gasto de una rendición. La pide quien rindió, el aprobador asignado o quien puede ver todas las rendiciones; para el resto la rendición o el respaldo no existen. No se guarda ni se comparte: pide otra cuando la necesites.",
  // El acceso lo da la rendición (solicitante, aprobador o ver_todas), no el permiso de documentos (ADR-022).
  permiso: null,
  portales: PORTALES_RENDIR,
  input: z.object({ rendicionId: uuidSchema, documentoId: uuidSchema }),
  output: z.object({ url: z.string(), expiraEn: z.string(), nombre: z.string(), mime: z.string() }),
  efecto: "lectura",
  dryRun: false,
  // Solo tras autorizar y firmar con éxito; la salida no trae el ID, así que sale del input ya validado.
  auditarLectura: (_s, entrada) => [entrada.documentoId],
  async handler(ctx, input) {
    actorId(ctx);
    if (![PERMISO_RENDIR, PERMISO_APROBAR, PERMISO_VER_TODAS].some((p) => ctx.autorizar(p)))
      throw prohibido("No tienes permiso para ver respaldos de rendiciones.");
    const r = await rendicionDe(ctx, input.rendicionId);
    // Solo un respaldo que pertenece a un gasto de esa rendición (nunca un documento suelto).
    if (!r.items.some((i) => i.documentoId === input.documentoId)) throw noEncontrado("El respaldo");
    // Solo un respaldo que subió el propio solicitante (o su agente): quien tiene ver_todas puede adjuntar el
    // documento de un colega al crear, y eso no abre por aquí un anexo de sueldo ni un documento de cumplimiento.
    const d = await ctx.db.documento.findFirst({
      where: {
        id: input.documentoId,
        estado: "disponible",
        OR: [{ creadoPorId: r.solicitanteId }, { viaUserId: r.solicitanteId }],
      },
      select: { storageKey: true, nombre: true, mime: true },
    });
    if (!d) throw noEncontrado("El respaldo");
    const url = await ctx.servicios.almacenamiento.urlDescarga(d.storageKey, d.nombre, 300);
    return { url, expiraEn: new Date(Date.now() + 300_000).toISOString(), nombre: d.nombre, mime: d.mime };
  },
});
