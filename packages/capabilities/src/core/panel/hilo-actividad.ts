import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { sinPlataformaAjena } from "../../agentes/plataforma";
import { idAutor } from "../../autor";
import { defineCapability } from "../../define";
import { obtenerCapacidad } from "../../registry";
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
  // Sin permiso de leer instalaciones, un actor acotado solo ve lo propio.
  if (instalaciones && ctx.autorizar(PERMISOS_CORE.instalacionesRead))
    return { modo: "instalaciones" as const, instalaciones };
  if (instalaciones) return { modo: "propia" as const, autor: idAutor(ctx.actor) };
  if (ctx.autorizar(PERMISOS_CORE.auditRead)) return { modo: "empresa" as const };
  return { modo: "propia" as const, autor: idAutor(ctx.actor) };
}

/**
 * Escrituras que un actor acotado ve en la actividad de sus instalaciones: las del núcleo (lo que ya
 * ve de esas fichas; lo salarial va redactado) y, de otros módulos, solo las que tiene permiso de
 * hacer (un supervisor sin `finanzas:*` no ve el detalle de un borrador de factura). Lo propio y la
 * vista de empresa (con auditoría) se ven enteros.
 */
function capacidadesVisibles(ctx: Contexto, modo: "empresa" | "instalaciones" | "propia") {
  const ids = capacidadesDeCambios(undefined);
  if (modo !== "instalaciones") return ids;
  return ids.filter((id) => {
    const c = obtenerCapacidad(id);
    if (!c) return false;
    if (c.modulo === "core") return true;
    return !!c.permiso && ctx.autorizar(c.permiso);
  });
}

function dondeAlcance(ctx: Contexto, a: ReturnType<typeof alcanceActividad>) {
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
    const a = alcanceActividad(ctx);
    const filas = await ctx.db.auditEvent.findMany({
      select: auditoriaSelect,
      where: {
        AND: [
          sinPlataformaAjena(),
          { capability: { in: capacidadesVisibles(ctx, a.modo) } },
          dondeAlcance(ctx, a),
        ],
      },
      orderBy: { id: "desc" },
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const pagina = await presentarActividad(ctx, filas, input.limite, "core.hilo.actividad");
    return { alcance: a.modo, ...pagina };
  },
});
