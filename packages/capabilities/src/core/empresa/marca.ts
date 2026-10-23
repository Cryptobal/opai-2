import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { definidos, escribirConEvento, textoOpcional } from "../maestros/comun";
import { perfilDe } from "./empresa";

const LOGOS = ["logoPrincipalId", "logoClaroId", "logoOscuroId", "isotipoId", "faviconId"] as const;
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color "#RRGGBB".')
  .nullable()
  .optional();

export const marcaSchema = z.object({
  nombreComercial: z.string().nullable(),
  eslogan: z.string().nullable(),
  colorPrimario: z.string().nullable(),
  colorSecundario: z.string().nullable(),
  ...Object.fromEntries(LOGOS.map((k) => [k, z.string().nullable()])),
  urls: z.record(z.string(), z.string()).describe("URL pública estable de cada logo cargado."),
});

const vista = async (ctx: Contexto, p: Partial<Record<string, unknown>> | null) => {
  const tenant = await ctx.db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { slug: true },
  });
  const urls: Record<string, string> = {};
  for (const k of LOGOS) {
    if (p?.[k])
      urls[k] = `${ctx.servicios.urlBase}/api/marca/${tenant?.slug ?? ""}/${k.replace(/Id$/, "")}`;
  }
  const s = (k: string) => (p?.[k] as string | null | undefined) ?? null;
  return {
    nombreComercial: s("nombreComercial"),
    eslogan: s("eslogan"),
    colorPrimario: s("colorPrimario"),
    colorSecundario: s("colorSecundario"),
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
    "Marca de la empresa: nombre comercial, eslogan, colores (como dato) y logos con su URL pública para correos, PDF y portales.",
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
    "Actualiza la marca: nombre comercial, eslogan, colores #RRGGBB y logos (ids de documentos de imagen ya subidos con core.documentos.*).",
  permiso: PERMISOS_CORE.marcaManage,
  input: z.object({
    nombreComercial: textoOpcional(120),
    eslogan: textoOpcional(200),
    colorPrimario: color,
    colorSecundario: color,
    ...Object.fromEntries(LOGOS.map((k) => [k, z.uuid().nullable().optional()])),
  }),
  output: marcaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    for (const k of LOGOS) {
      const id = (input as Record<string, string | null | undefined>)[k];
      if (id) await validarLogo(ctx, id);
    }
    const data = definidos(input as Record<string, string | null | undefined>);
    const actual = await perfilDe(ctx);
    if (dryRun) return vista(ctx, { ...actual, ...data });
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.marca.actualizada",
        entidadTipo: "perfil_empresa",
        payload: () => ({ campos: Object.keys(data) }),
      },
      (tx) =>
        tx.perfilEmpresa.upsert({
          where: { tenantId: ctx.tenantId },
          create: { ...data, tenantId: ctx.tenantId },
          update: data,
        }),
    );
    return vista(ctx, r);
  },
});
