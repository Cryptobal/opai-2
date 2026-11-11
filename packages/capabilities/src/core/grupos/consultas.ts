import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { exigeSinAlcance, grupoDe, grupoSchema, vistaGrupo } from "./comun";

export const gruposList = defineCapability({
  id: "core.grupos.list",
  descripcion:
    "Grupos o equipos de usuarios de la empresa (para nombrarlos luego como aprobadores), con cuántos miembros tiene cada uno.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({
    incluirArchivados: z
      .boolean()
      .default(false)
      .describe("Incluye también los grupos archivados."),
  }),
  output: z.array(grupoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    exigeSinAlcance(ctx);
    const grupos = await ctx.db.grupoUsuarios.findMany({
      where: input.incluirArchivados ? {} : { archivadoEn: null },
      orderBy: { nombre: "asc" },
      include: { _count: { select: { miembros: true } } },
    });
    return grupos.map((g) => vistaGrupo(g, g._count.miembros));
  },
});

const miembroGrupoSchema = z.object({
  userId: z.string(),
  nombre: z.string(),
  email: z.string(),
  /** Rol base de su membresía en la empresa. */
  rol: z.string(),
  /** "activa" | "suspendida". */
  estado: z.string(),
  agregadoEn: z.date(),
});

export const gruposGet = defineCapability({
  // Revela nombre y correo de los miembros: lectura auditada (NÚCLEO-H) con sus IDs, sin copiar datos.
  auditarLectura: (g) => [g.id, ...g.miembros.map((m) => m.userId)],
  id: "core.grupos.get",
  descripcion:
    "Detalle de un grupo o equipo de usuarios: nombre, descripción, si está archivado y sus miembros con rol y estado en la empresa.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({ id: uuidSchema.describe("Id del grupo.") }),
  output: grupoSchema.omit({ miembros: true }).extend({ miembros: z.array(miembroGrupoSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    exigeSinAlcance(ctx);
    const g = await grupoDe(ctx, input.id);
    const filas = await ctx.db.grupoUsuarioMiembro.findMany({
      where: { grupoId: g.id },
      orderBy: { createdAt: "asc" },
      select: {
        userId: true,
        createdAt: true,
        membership: {
          select: { rol: true, estado: true, user: { select: { name: true, email: true } } },
        },
      },
    });
    const miembros = filas
      .map((m) => ({
        userId: m.userId,
        nombre: m.membership.user.name,
        email: m.membership.user.email,
        rol: m.membership.rol,
        estado: m.membership.estado,
        agregadoEn: m.createdAt,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return { ...vistaGrupo(g), miembros };
  },
});
