// Clases de ausencia de la empresa (CAR-393 parte 3; referente Rippling / BambooHR): el catálogo propio o el de su
// vertical, cada clase ligada a un tipo base. La ficha las ofrece al registrar y la escritura las valida.
import { z } from "zod";

import {
  claseDelCatalogo,
  clasesEfectivas,
  PERMISOS_CORE,
  TIPOS_AUSENCIA_BASE,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { ajuste } from "../config";

/** Catálogo efectivo de la empresa: el suyo si lo definió y es válido; si no, el de su vertical. */
async function clasesDeLaEmpresa(ctx: Contexto) {
  const [tenant, propio] = await Promise.all([
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { vertical: true } }),
    ajuste<unknown>(ctx, "core", "personas_clases_ausencia"),
  ]);
  return clasesEfectivas(propio, tenant?.vertical ?? "");
}

/** La clase con el nombre del catálogo, o un error si no existe para ese tipo. Sin clase, null. */
export async function claseValida(ctx: Contexto, tipo: string, clase: string | undefined) {
  if (!clase) return null;
  const c = claseDelCatalogo(await clasesDeLaEmpresa(ctx), tipo, clase);
  if (!c)
    throw reglaDeNegocio(
      `La clase «${clase}» no existe para ese tipo en el catálogo de la empresa.`,
    );
  return c.nombre;
}

export const ausenciasClases = defineCapability({
  id: "core.ausencias.clases",
  descripcion:
    "Lista las clases de permisos, licencias, vacaciones y ausencias que la empresa usa al registrar una ausencia (las suyas o, si no definió, las de su rubro), cada una con el tipo base que cuenta para la pauta y la nómina.",
  permiso: PERMISOS_CORE.personasLaboralRead,
  input: z.object({
    cursor: z.string().optional(),
    limite: z.number().int().min(1).max(100).default(100),
  }),
  output: z.object({
    items: z.array(z.object({ nombre: z.string(), tipo: z.enum(TIPOS_AUSENCIA_BASE) })),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { cursor, limite }) {
    const todas = await clasesDeLaEmpresa(ctx);
    // Cursor opaco: posición en el catálogo (el catálogo es corto y ordenado por la empresa).
    const desde = Math.max(0, cursor ? Number.parseInt(cursor, 10) || 0 : 0);
    const items = todas.slice(desde, desde + limite);
    const fin = desde + items.length;
    return { items, siguiente: fin < todas.length ? String(fin) : null };
  },
});
