import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { textoOpcional } from "../maestros/comun";
import { perfilDe } from "./empresa";
import { guardarMarca } from "./marca-escritura";
import { marcaDocumentoDe, marcaDocumentoInputSchema, tipografiaDocumento } from "./marca-documento";

const LOGOS = ["logoPrincipalId", "logoClaroId", "logoOscuroId", "isotipoId", "faviconId"] as const;
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color "#RRGGBB".')
  .nullable()
  .optional();

const marcaSchema = z.object({
  nombreComercial: z.string().nullable(),
  eslogan: z.string().nullable(),
  colorPrimario: z.string().nullable(),
  colorSecundario: z.string().nullable(),
  documentoTipografia: tipografiaDocumento,
  documentoPiePagina: z.string().nullable(),
  documentoCondicionesDefault: z.string().nullable(),
  documentoVersion: z.number().int(),
  ...Object.fromEntries(LOGOS.map((k) => [k, z.string().nullable()])),
  urls: z.record(z.string(), z.string()).describe("URL pública estable de cada logo cargado."),
});

const vista = async (ctx: Contexto, p: Partial<Record<string, unknown>> | null) => {
  const [tenant, cpq] = await Promise.all([
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } }),
    ctx.db.cpqMarcaDocumento.findUnique({ where: { tenantId: ctx.tenantId }, select: { version: true } }),
  ]);
  const urls: Record<string, string> = {};
  for (const k of LOGOS) {
    if (p?.[k])
      urls[k] = `${ctx.servicios.urlBase}/api/marca/${tenant?.slug ?? ""}/${k.replace(/Id$/, "")}`;
  }
  const s = (k: string) => (p?.[k] as string | null | undefined) ?? null;
  const doc = marcaDocumentoDe(p as Parameters<typeof marcaDocumentoDe>[0]);
  return {
    nombreComercial: s("nombreComercial"),
    eslogan: s("eslogan"),
    colorPrimario: s("colorPrimario"),
    colorSecundario: s("colorSecundario"),
    ...doc,
    documentoVersion: cpq?.version ?? 0,
    ...Object.fromEntries(LOGOS.map((k) => [k, s(k)])),
    urls,
  };
};

/**
 * El logo se publica sin sesión: solo se acepta un documento de la empresa (vínculo propietario
 * "tenant") de un tipo de marca (`marca.*`), en imagen. Nunca un documento de una persona o cuenta.
 */
async function validarLogo(ctx: Contexto, id: string) {
  const d = await ctx.db.documento.findUnique({ where: { id } });
  if (!d || d.estado !== "disponible")
    throw reglaDeNegocio("El logo debe ser un documento ya subido y confirmado.");
  if (!d.mime.startsWith("image/"))
    throw reglaDeNegocio("El logo debe ser una imagen (PNG, JPG, WebP o SVG).");
  const tipo = d.tipoId ? await ctx.db.documentoTipo.findUnique({ where: { id: d.tipoId } }) : null;
  const propietario = await ctx.db.documentoVinculo.findFirst({
    where: { documentoId: id, rol: "propietario" },
  });
  if (!tipo?.codigo.startsWith("marca.") || propietario?.entidadTipo !== "tenant") {
    throw reglaDeNegocio(
      'El logo debe subirse como documento de la empresa del tipo "Logo de la marca".',
    );
  }
}

export const marcaGet = defineCapability({
  id: "core.marca.get",
  descripcion:
    "Marca de la empresa: nombre, eslogan, colores, logos y formato de documentos PDF (tipografía, pie y condiciones por defecto).",
  permiso: PERMISOS_CORE.tenantRead,
  input: z.object({}),
  output: marcaSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx) => vista(ctx, await perfilDe(ctx)),
});

export const marcaUpdate = defineCapability({
  id: "core.marca.update",
  descripcion:
    "Actualiza la marca: nombre, eslogan, colores #RRGGBB, logos (imágenes con core.documentos.*) y el formato de documentos PDF.",
  permiso: PERMISOS_CORE.marcaManage,
  input: z.object({
    nombreComercial: textoOpcional(120),
    eslogan: textoOpcional(200),
    colorPrimario: color,
    colorSecundario: color,
    ...marcaDocumentoInputSchema(),
    ...Object.fromEntries(LOGOS.map((k) => [k, z.uuid().nullable().optional()])),
  }),
  output: marcaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    return guardarMarca(
      ctx,
      input as Record<string, string | null | undefined>,
      (p) => vista(ctx, p),
      (id) => validarLogo(ctx, id),
      dryRun,
    );
  },
});
