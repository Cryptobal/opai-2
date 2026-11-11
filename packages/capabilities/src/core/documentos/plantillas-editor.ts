import { z } from "zod";

import { PERMISOS_CORE, variablesDocumentoDesconocidas } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { contenidoSchema, editorSchema, vistaEditor } from "./plantillas-comun";

// CAR-127 · 06 Editor de plantillas. El texto se edita en un borrador (una columna de la plantilla) y
// al publicarlo pasa a ser la versión siguiente, inmutable. Solo owner y admin, como el resto.

async function cargar(ctx: Contexto, id: string) {
  const p = await ctx.db.documentoPlantilla.findUnique({ where: { id } });
  if (!p) throw noEncontrado("La plantilla");
  const v = await ctx.db.documentoPlantillaVersion.findFirst({
    where: { plantillaId: id, numero: p.versionVigente },
  });
  if (!v) throw noEncontrado("La versión vigente de la plantilla");
  if (!p.activa) throw reglaDeNegocio("La plantilla está archivada: no se edita.");
  return { p, v };
}

export const documentoPlantillasGuardarBorrador = defineCapability({
  id: "core.documento_plantillas.guardar_borrador",
  descripcion:
    "Guarda el texto de una plantilla laboral como borrador, sin publicarlo. El borrador puede tener variables que no existen (se avisan); guardar el mismo texto vigente descarta el borrador.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({ id: uuidSchema, contenido: contenidoSchema }),
  output: editorSchema,
  efecto: "escritura",
  dryRun: true,
  // El texto completo no va a la auditoría en cada guardado (hasta 100 KB): queda su largo. El texto
  // que rige sí queda entero al publicar (`publicar` lo audita y la versión es inmutable).
  sensibles: ["contenido"],
  auditoriaPayload: (_ctx, entrada) => ({ caracteres: entrada.contenido.length }),
  async handler(ctx, { id, contenido }, { dryRun }) {
    const { p, v } = await cargar(ctx, id);
    const descarta = contenido === v.contenido;
    const data = {
      borradorContenido: descarta ? null : contenido,
      borradorActualizadoEn: descarta ? null : new Date(),
      borradorPorNombre: descarta ? null : (ctx.usuario?.nombre ?? null),
    };
    if (dryRun) return vistaEditor({ ...p, ...data }, v);
    const nueva = await ctx.db.documentoPlantilla.update({ where: { id }, data });
    return vistaEditor(nueva, v);
  },
});

export const documentoPlantillasPublicar = defineCapability({
  id: "core.documento_plantillas.publicar",
  descripcion:
    "Publica el texto de una plantilla laboral como su versión siguiente: queda vigente para los documentos nuevos, no se puede modificar y limpia el borrador. Solo con variables del catálogo. Un agente la publica con aprobación humana.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({
    id: uuidSchema,
    contenido: contenidoSchema,
    versionEsperada: z
      .number()
      .int()
      .min(1)
      .describe(
        "Versión vigente sobre la que se editó; si otra persona publicó antes, se rechaza.",
      ),
  }),
  output: editorSchema,
  efecto: "irreversible",
  dryRun: true,
  describirAprobacion: async (ctx, input) => {
    const p = await ctx.db.documentoPlantilla.findUnique({
      where: { id: input.id },
      select: { nombre: true },
    });
    return p
      ? `publicar la versión ${input.versionEsperada + 1} de la plantilla «${p.nombre}»`
      : null;
  },
  async handler(ctx, { id, contenido, versionEsperada }, { dryRun }) {
    const { p, v } = await cargar(ctx, id);
    if (p.versionVigente !== versionEsperada)
      throw conflicto(
        `Mientras editabas se publicó la versión ${p.versionVigente}. Recarga la plantilla y vuelve a aplicar tus cambios.`,
      );
    if (!contenido.trim()) throw reglaDeNegocio("La plantilla está en blanco: escribe el texto.");
    const desconocidas = variablesDocumentoDesconocidas(contenido);
    if (desconocidas.length > 0)
      throw reglaDeNegocio(`Variables que no existen: ${desconocidas.join(", ")}.`, {
        desconocidas,
      });
    if (contenido === v.contenido)
      throw reglaDeNegocio("El texto es igual a la versión vigente: no hay nada que publicar.");
    const numero = versionEsperada + 1;
    const autor = { creadoPorNombre: ctx.usuario?.nombre ?? null, createdAt: new Date() };
    const limpio = {
      borradorContenido: null,
      borradorActualizadoEn: null,
      borradorPorNombre: null,
    };
    if (dryRun)
      return vistaEditor({ ...p, ...limpio, versionVigente: numero }, { ...autor, contenido });
    const choque = () => conflicto("Otra persona publicó esta plantilla al mismo tiempo.");
    return ctx.transaccion(async (tx) => {
      // Dos publicaciones a la vez: la segunda choca con el índice único (plantilla, número).
      const nueva = await tx.documentoPlantillaVersion
        .create({
          data: {
            tenantId: ctx.tenantId,
            plantillaId: id,
            numero,
            contenido,
            creadoPorId: ctx.usuario?.id ?? null,
            creadoPorNombre: autor.creadoPorNombre,
          },
        })
        .catch((e: unknown) => {
          throw (e as { code?: unknown } | null)?.code === "P2002" ? choque() : e;
        });
      // Condicionado a la versión leída: dos publicaciones simultáneas no se pisan (la otra revierte).
      const r = await tx.documentoPlantilla.updateMany({
        where: { id, versionVigente: versionEsperada },
        data: { ...limpio, versionVigente: numero },
      });
      if (r.count !== 1) throw choque();
      return vistaEditor({ ...p, ...limpio, versionVigente: numero }, nueva);
    });
  },
});
