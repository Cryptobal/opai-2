import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { sinPlataformaAjena } from "../../agentes/plataforma";
import { idAutor } from "../../autor";
import { defineCapability } from "../../define";
import type { Contexto } from "../../types";
import { instalacionesEnAlcance } from "../maestros/alcance";
import { itemActividadSchema, presentarActividad } from "./actividad-presentar";
import { capacidadesDeCambios } from "./actividad-texto";
import { auditoriaSelect } from "./auditoria-select";

/** Hasta cuántas instalaciones a cargo se miran (un supervisor real tiene unas pocas). */
const MAX_INSTALACIONES = 200;

/**
 * Qué parte de la actividad ve el actor en el hilo (ADR-022, BRIEF-base-hilo H3):
 * - «empresa»: quien tiene auditoría y no está acotado ve toda la actividad de la empresa;
 * - «instalaciones»: un actor acotado ve lo ocurrido en las instalaciones a su cargo;
 * - «propia»: el resto ve solo lo que hizo él (y lo que sus agentes hicieron a su nombre).
 */
export function alcanceActividad(ctx: Contexto) {
  const instalaciones = instalacionesEnAlcance(ctx);
  if (instalaciones) return { modo: "instalaciones" as const, instalaciones };
  if (ctx.autorizar(PERMISOS_CORE.auditRead)) return { modo: "empresa" as const };
  return { modo: "propia" as const, autor: idAutor(ctx.actor) };
}

function dondeAlcance(ctx: Contexto) {
  const a = alcanceActividad(ctx);
  if (a.modo === "empresa") return {};
  if (a.modo === "instalaciones") {
    const ids = a.instalaciones.slice(0, MAX_INSTALACIONES);
    // Sin instalaciones a cargo no se ve nada (denegar por defecto).
    if (!ids.length) return { id: { in: [] as string[] } };
    return {
      OR: ids.flatMap((id) => [
        { entityType: "instalacion", entityId: id },
        { payload: { path: ["input", "instalacionId"], equals: id } },
      ]),
    };
  }
  if (!a.autor) return { id: { in: [] as string[] } };
  return { OR: [{ actorId: a.autor }, { viaUserId: a.autor }] };
}

export const hiloActividad = defineCapability({
  auditarLectura: (s) => s.items.map((e) => e.id),
  id: "core.hilo.actividad",
  descripcion:
    "Actividad reciente para el hilo: quién hizo qué y cuándo, personas y agentes. Toda la empresa si el actor tiene auditoría, sus instalaciones si está acotado, o solo lo propio en otro caso.",
  permiso: null,
  input: z.object({
    limite: z.number().int().min(1).max(50).default(20),
    cursor: z.uuid().optional(),
  }),
  output: z.object({
    alcance: z.enum(["empresa", "instalaciones", "propia"]),
    items: z.array(itemActividadSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.auditEvent.findMany({
      select: auditoriaSelect,
      where: {
        AND: [
          sinPlataformaAjena(),
          { capability: { in: capacidadesDeCambios(undefined) } },
          dondeAlcance(ctx),
        ],
      },
      orderBy: { id: "desc" },
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const pagina = await presentarActividad(ctx, filas, input.limite, "core.hilo.actividad");
    return { alcance: alcanceActividad(ctx).modo, ...pagina };
  },
});
