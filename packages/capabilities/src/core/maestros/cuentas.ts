import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondeCuenta, dondeInstalacion } from "./alcance";
import { cursorDe, listaSchema, pagina } from "./comun";
import { cuentaSchema, ESTADOS_CUENTA, vistaCuenta } from "./cuentas-vista";

export async function cuentaDe(ctx: Contexto, id: string) {
  // findFirst (no findUnique) para aplicar el alcance por filas: fuera de alcance = no encontrada.
  const c = await ctx.db.cuenta.findFirst({ where: { id, AND: [dondeCuenta(ctx)] } });
  if (!c) throw noEncontrado("La cuenta");
  return c;
}

export const cuentasList = defineCapability({
  id: "core.cuentas.list",
  descripcion:
    "Lista las cuentas (clientes y prospectos) de la empresa, con búsqueda por nombre, razón social o RUT y filtro por estado. Paginada por cursor.",
  permiso: PERMISOS_CORE.cuentasRead,
  input: listaSchema.extend({ estado: z.enum(ESTADOS_CUENTA).optional() }),
  output: z.object({
    items: z.array(
      cuentaSchema.extend({ instalaciones: z.number(), contactoPrincipal: z.string().nullable() }),
    ),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const q = input.q;
    // Instalaciones activas (conteo) y contacto principal van en la misma consulta (_count + include),
    // no en consultas por página aparte (ADR-045).
    const filas = await ctx.db.cuenta.findMany({
      where: {
        AND: [dondeCuenta(ctx)],
        ...(input.incluirArchivadas ? {} : { archivadaEn: null }),
        ...(input.estado ? { estado: input.estado } : {}),
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: "insensitive" as const } },
                { razonSocial: { contains: q, mode: "insensitive" as const } },
                { rut: { startsWith: q.replace(/[.\s]/g, "").toUpperCase() } },
              ],
            }
          : {}),
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
      include: {
        _count: {
          select: { instalaciones: { where: { archivadaEn: null, AND: [dondeInstalacion(ctx)] } } },
        },
        contactos: {
          where: { esPrincipal: true, archivadoEn: null },
          select: { nombres: true, apellidos: true },
          take: 1,
        },
      },
    });
    const p = pagina(filas, input.limite);
    return {
      items: p.items.map((c) => {
        const principal = c.contactos[0];
        return {
          ...vistaCuenta(c),
          instalaciones: c._count.instalaciones,
          contactoPrincipal: principal ? `${principal.nombres} ${principal.apellidos}` : null,
        };
      }),
      siguiente: p.siguiente,
    };
  },
});

export const cuentasGet = defineCapability({
  id: "core.cuentas.get",
  descripcion:
    "Ficha de una cuenta: datos legales y comerciales, representantes, contactos activos, instalaciones y cantidad de documentos.",
  permiso: PERMISOS_CORE.cuentasRead,
  input: z.object({ id: uuidSchema }),
  output: cuentaSchema.extend({
    representantes: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        rut: z.string(),
        email: z.string().nullable(),
      }),
    ),
    contactos: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        email: z.string().nullable(),
        esPrincipal: z.boolean(),
      }),
    ),
    instalaciones: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        estado: z.string(),
        comuna: z.string().nullable(),
      }),
    ),
    documentos: z.number(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const c = await cuentaDe(ctx, input.id);
    const [representantes, contactos, instalaciones, documentos] = await Promise.all([
      ctx.db.cuentaRepresentante.findMany({
        where: { cuentaId: c.id },
        orderBy: { nombre: "asc" },
      }),
      ctx.db.contacto.findMany({
        where: { cuentaId: c.id, archivadoEn: null },
        orderBy: [{ esPrincipal: "desc" }, { apellidos: "asc" }],
      }),
      ctx.db.instalacion.findMany({
        // Una cuenta puede entrar al alcance por una sola instalación: la ficha lista solo las que
        // están a cargo del actor, no todas las de la cuenta (ADR-022).
        where: { cuentaId: c.id, archivadaEn: null, AND: [dondeInstalacion(ctx)] },
        orderBy: { nombre: "asc" },
      }),
      ctx.db.documentoVinculo.count({ where: { entidadTipo: "cuenta", entidadId: c.id } }),
    ]);
    return {
      ...vistaCuenta(c),
      representantes: representantes.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        rut: r.rut,
        email: r.email,
      })),
      contactos: contactos.map((k) => ({
        id: k.id,
        nombre: `${k.nombres} ${k.apellidos}`,
        email: k.email,
        esPrincipal: k.esPrincipal,
      })),
      instalaciones: instalaciones.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        estado: i.estado,
        comuna: i.comuna,
      })),
      documentos,
    };
  },
});
