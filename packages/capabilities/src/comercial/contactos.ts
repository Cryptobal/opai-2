import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { prohibido } from "../errores";
import { dondeContacto } from "../core/maestros/alcance";
import { cursorDe, listaSchema, pagina } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { PERMISO_READ } from "./comun";

const fila = z.object({
  id: z.string(),
  nombre: z.string(),
  cuentaId: z.string(),
  cuentaNombre: z.string(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  cargo: z.string().nullable(),
  esPrincipal: z.boolean(),
  negociosAbiertos: z.number(),
});

async function cuentasYNegocios(ctx: Contexto, contactos: { id: string; cuentaId: string }[]) {
  const cuentaIds = [...new Set(contactos.map((c) => c.cuentaId))];
  const contactoIds = contactos.map((c) => c.id);
  const [cuentas, vinculos] = await Promise.all([
    ctx.db.cuenta.findMany({
      where: { id: { in: cuentaIds } },
      select: { id: true, nombre: true },
    }),
    ctx.db.negocioContacto.findMany({ where: { contactoId: { in: contactoIds } } }),
  ]);
  const negocioIds = [...new Set(vinculos.map((v) => v.negocioId))];
  const abiertos = negocioIds.length
    ? await ctx.db.negocio.findMany({
        where: { id: { in: negocioIds }, estado: "abierto" },
        select: { id: true },
      })
    : [];
  const abiertosSet = new Set(abiertos.map((n) => n.id));
  return (c: { id: string; cuentaId: string }) => ({
    cuentaNombre: cuentas.find((x) => x.id === c.cuentaId)?.nombre ?? "",
    negociosAbiertos: vinculos.filter((v) => v.contactoId === c.id && abiertosSet.has(v.negocioId))
      .length,
  });
}

/** Lista tenant-wide de contactos (personas) para la pantalla Clientes → Contactos. */
export const contactosList = defineCapability({
  auditarLectura: (s) => s.items.flatMap((c) => [c.id, c.cuentaId]),
  id: "comercial.contactos.list",
  descripcion:
    "Lista los contactos (personas) de la empresa con su cuenta, correo, teléfono, cargo y cuántos negocios abiertos tienen, paginada por cursor.",
  permiso: PERMISO_READ,
  input: listaSchema.extend({ soloPrincipales: z.boolean().default(false) }),
  output: z.object({ items: z.array(fila), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    // Correo y teléfono son datos personales del núcleo: además de Comercial exige ver Cuentas,
    // igual que core.contactos.list/get (un rol con Comercial y sin Cuentas no los lee por aquí).
    if (!ctx.autorizar(PERMISOS_CORE.cuentasRead))
      throw prohibido("Sin permiso para ver contactos.");
    const q = input.q;
    const filas = await ctx.db.contacto.findMany({
      where: {
        // Alcance de filas (ADR-022): un actor acotado (supervisor) ve solo los contactos de las
        // cuentas de sus instalaciones, igual que core.contactos.list.
        AND: [dondeContacto(ctx)],
        ...(input.incluirArchivadas ? {} : { archivadoEn: null }),
        ...(input.soloPrincipales ? { esPrincipal: true } : {}),
        ...(q
          ? {
              OR: [
                { nombres: { contains: q, mode: "insensitive" } },
                { apellidos: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ apellidos: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const p = pagina(filas, input.limite);
    const extra = await cuentasYNegocios(ctx, p.items);
    return {
      items: p.items.map((c) => ({
        id: c.id,
        nombre: `${c.nombres} ${c.apellidos}`.trim(),
        cuentaId: c.cuentaId,
        email: c.email ?? null,
        telefono: c.telefono ?? null,
        cargo: c.cargo ?? null,
        esPrincipal: c.esPrincipal,
        ...extra(c),
      })),
      siguiente: p.siguiente,
    };
  },
});
