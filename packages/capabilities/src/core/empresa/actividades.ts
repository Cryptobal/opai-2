// CAR-243 · Actividad económica del SII (ACTECO, CIIU4.CL) de la empresa: varios códigos y uno principal, en la
// configuración principal de la empresa (`core.perfil_empresa`). La emisión DTE informa el principal en <Acteco>.
import { z } from "zod";

import { ACTECO_MAX_CODIGOS, formatearActeco, normalizarActividades, PERMISOS_CORE } from "@opai/domain";
import { actecoDelCatalogo, buscarActecos } from "@opai/domain/acteco-catalogo";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { escribirConEvento } from "../maestros/comun";

const codigoSchema = z.number().int().min(1).max(999_999);

const actividadSchema = z.object({
  codigo: z.number().int(),
  codigoSii: z.string().describe("Código con sus 6 dígitos, como lo publica el SII."),
  glosa: z.string().nullable().describe("Glosa del catálogo del SII; null si el código se escribió a mano y no está."),
  rubro: z.string().nullable(),
  principal: z.boolean(),
});

export const actividadesSchema = z.object({
  principal: z.number().int().nullable().describe("ACTECO principal: el que va en cada DTE. null si aún no se informa."),
  actividades: z.array(actividadSchema),
});

type Actividades = z.infer<typeof actividadesSchema>;

function vista(codigos: readonly number[], principal: number | null): Actividades {
  return {
    principal,
    actividades: codigos.map((codigo) => {
      const c = actecoDelCatalogo(codigo);
      return { codigo, codigoSii: formatearActeco(codigo), glosa: c?.glosa ?? null, rubro: c?.rubro ?? null, principal: codigo === principal };
    }),
  };
}

/** ACTECO de la empresa (lista y principal). Lo usan la pantalla, la MCP y la emisión DTE. */
export async function actividadesEmpresaDe(ctx: Contexto): Promise<{ codigos: number[]; principal: number | null }> {
  const p = await ctx.db.perfilEmpresa.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { actecos: true, actecoPrincipal: true },
  });
  return { codigos: p?.actecos ?? [], principal: p?.actecoPrincipal ?? null };
}

export const empresaActividadesGet = defineCapability({
  id: "core.empresa.acteco_get",
  descripcion:
    "Actividades económicas de la empresa ante el SII (ACTECO): los códigos con su glosa del catálogo y cuál es el principal, que va en cada factura.",
  permiso: PERMISOS_CORE.tenantRead,
  input: z.object({}),
  output: actividadesSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const a = await actividadesEmpresaDe(ctx);
    return vista(a.codigos, a.principal);
  },
});

export const empresaActividadesSet = defineCapability({
  id: "core.empresa.acteco_set",
  descripcion:
    "Fija las actividades económicas de la empresa ante el SII (ACTECO): la lista completa de códigos y cuál es el principal. Reemplaza la lista anterior; una lista vacía las quita.",
  permiso: PERMISOS_CORE.tenantManage,
  input: z.object({
    codigos: z
      .array(codigoSchema)
      .max(ACTECO_MAX_CODIGOS)
      .describe("Todos los códigos ACTECO de la empresa (6 dígitos del SII, como número). Pueden no estar en el catálogo."),
    principal: codigoSchema.nullable().describe("El ACTECO principal; debe estar en `codigos`. null solo con la lista vacía."),
  }),
  output: actividadesSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const n = normalizarActividades(input);
    if (!n.ok) throw reglaDeNegocio(n.motivo);
    const { codigos, principal } = n.valor;
    if (dryRun) return vista(codigos, principal);
    const data = { actecos: codigos, actecoPrincipal: principal };
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.empresa.actualizada",
        entidadTipo: "perfil_empresa",
        payload: () => ({ campos: ["actecos", "actecoPrincipal"] }),
      },
      (tx) =>
        tx.perfilEmpresa.upsert({
          where: { tenantId: ctx.tenantId },
          create: { ...data, tenantId: ctx.tenantId },
          update: data,
          select: { id: true, actecos: true, actecoPrincipal: true },
        }),
    );
    return vista(r.actecos, r.actecoPrincipal);
  },
});

export const empresaActividadesCatalogo = defineCapability({
  id: "core.empresa.acteco_buscar",
  descripcion:
    "Busca en el catálogo oficial de actividades económicas del SII (ACTECO, CIIU4.CL) por código o por palabras de la glosa, para elegir los de la empresa.",
  permiso: PERMISOS_CORE.tenantRead,
  input: z.object({
    q: z.string().trim().max(100).optional().describe("Código (con o sin cero inicial) o palabras, sin importar tildes."),
    limite: z.number().int().min(1).max(50).optional(),
  }),
  output: z.object({
    items: z.array(z.object({ codigo: z.number().int(), codigoSii: z.string(), glosa: z.string(), rubro: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  // Catálogo público en memoria: no consulta la base ni datos de la empresa.
  sinDb: true,
  handler: async (_ctx, input) => ({
    items: buscarActecos(input.q ?? "", input.limite ?? 20).map((e) => ({ ...e, codigoSii: formatearActeco(e.codigo) })),
  }),
});
