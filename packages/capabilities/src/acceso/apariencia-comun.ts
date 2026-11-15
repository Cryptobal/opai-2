import { z } from "zod";

import { vistaMarca } from "../core/empresa/marca";
import { perfilDe } from "../core/empresa/empresa";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

export const MAX_MENSAJE = 200;

export const aparienciaSchema = z.object({
  mensaje: z.string().nullable().describe("Mensaje propio de la instalación; null usa la marca."),
  fondo: z
    .object({ id: z.string(), nombre: z.string() })
    .nullable()
    .describe("Imagen de fondo propia; null usa el acento de la marca."),
});

export async function aparienciaDe(ctx: Contexto, instalacionId: string) {
  const a = await ctx.db.aparienciaAcceso.findUnique({
    where: { tenantId_instalacionId: { tenantId: ctx.tenantId, instalacionId } },
    select: { mensaje: true, fondoDocumentoId: true },
  });
  const doc = a?.fondoDocumentoId
    ? await ctx.db.documento.findFirst({
        where: { id: a.fondoDocumentoId, estado: "disponible" },
        select: { id: true, nombre: true, storageKey: true },
      })
    : null;
  return { mensaje: a?.mensaje ?? null, doc };
}

/** El fondo se muestra en la portería sin más permiso: solo vale una imagen subida a la propia instalación. */
export async function validarFondo(ctx: Contexto, instalacionId: string, id: string) {
  const d = await ctx.db.documento.findUnique({ where: { id } });
  const propietario = d
    ? await ctx.db.documentoVinculo.findFirst({ where: { documentoId: id, rol: "propietario" } })
    : null;
  if (!d || propietario?.entidadTipo !== "instalacion" || propietario.entidadId !== instalacionId)
    throw reglaDeNegocio("El fondo debe ser un documento subido a esta instalación.");
  if (d.estado !== "disponible") throw reglaDeNegocio("El fondo todavía no termina de subirse.");
  if (!d.mime.startsWith("image/"))
    throw reglaDeNegocio("El fondo debe ser una imagen (PNG, JPG o WebP).");
  return { id: d.id, nombre: d.nombre };
}

/** Lo que ve la portería: lo propio de la instalación o, si falta, la marca de la empresa (logo y nombre). */
export async function bienvenidaPorteria(ctx: Contexto, instalacionId: string) {
  const [{ mensaje, doc }, marca] = await Promise.all([
    aparienciaDe(ctx, instalacionId),
    perfilDe(ctx).then((p) => vistaMarca(ctx, p)),
  ]);
  const almacen = ctx.servicios.almacenamiento;
  const nombre = marca.nombreComercial;
  return {
    mensaje: mensaje ?? (nombre ? `Bienvenido a ${nombre}` : null),
    fondoId: doc?.id ?? null,
    fondoUrl:
      doc && almacen.disponible
        ? await almacen.urlDescarga(doc.storageKey, doc.nombre, 3_600)
        : null,
    logoUrl: marca.urls["logoPrincipalId"] ?? null,
  };
}

export const bienvenidaSchema = z.object({
  mensaje: z.string().nullable(),
  fondoId: z.string().nullable(),
  fondoUrl: z.string().nullable(),
  logoUrl: z.string().nullable(),
});
