import { z } from "zod";

import type { TenantTx } from "@opai/db";

import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";

/**
 * Grupos o equipos de usuarios para autorización (CAR-251). CAR-252 los nombrará como aprobadores
 * junto con usuarios o un perfil; aquí solo viven el grupo y su membresía. No son `core.funciones`.
 */

export const nombreGrupoSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .describe("Nombre del grupo o equipo.");
export const descripcionGrupoSchema = z
  .string()
  .trim()
  .max(200)
  .nullable()
  .optional()
  .describe("Para qué existe el grupo (opcional).");

export const grupoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  archivado: z.boolean(),
  /** Usuarios que pertenecen al grupo. */
  miembros: z.number(),
});
export type GrupoVista = z.infer<typeof grupoSchema>;

export type GrupoFila = {
  id: string;
  nombre: string;
  descripcion: string | null;
  archivadoEn: Date | null;
};

export const vistaGrupo = (g: GrupoFila, miembros = 0): GrupoVista => ({
  id: g.id,
  nombre: g.nombre,
  descripcion: g.descripcion ?? null,
  archivado: g.archivadoEn != null,
  miembros,
});

/**
 * Crear, editar, archivar y cambiar la membresía es de owner y admin por rol base (mismo criterio que
 * los roles personalizados, §16.2): `core:users.manage` dentro de un rol personalizado no basta. Una
 * key de servicio no tiene rol base y queda fuera; una key de usuario hereda el de su responsable.
 */
export function exigeGestionDeGrupos(ctx: Contexto): void {
  if (ctx.rol !== "owner" && ctx.rol !== "admin") {
    throw prohibido("Solo un owner o un administrador gestiona los grupos de la empresa.");
  }
}

/** Un actor con alcance por filas (p. ej. supervisor) no ve el directorio de la empresa (ADR-022). */
export function exigeSinAlcance(ctx: Contexto): void {
  if (ctx.alcance) throw prohibido("No tienes acceso a los grupos de la empresa.");
}

/** Grupo de la empresa actual (la RLS ya acota al tenant). */
export async function grupoDe(ctx: Contexto, id: string): Promise<GrupoFila> {
  const g = await ctx.db.grupoUsuarios.findUnique({ where: { id } });
  if (!g) throw noEncontrado("El grupo");
  return g;
}

/** Un grupo archivado no se edita ni cambia de miembros. */
export async function grupoVigente(ctx: Contexto, id: string): Promise<GrupoFila> {
  const g = await grupoDe(ctx, id);
  if (g.archivadoEn)
    throw reglaDeNegocio("El grupo está archivado: no se edita ni cambia de miembros.");
  return g;
}

export const contarMiembros = (ctx: Contexto, grupoId: string) =>
  ctx.db.grupoUsuarioMiembro.count({ where: { grupoId } });

/** Mensaje sin el nombre ni comillas: la UI lo muestra tal cual (no parece texto técnico). */
export const MENSAJE_DUPLICADO = "Ya existe un grupo vigente con ese nombre.";

/**
 * Nombre libre entre los grupos vigentes de la empresa, sin distinguir mayúsculas. Se compara en JS
 * (no con `mode: "insensitive"`, que en Postgres usa ILIKE y trataría `%` o `_` como comodines); el
 * índice parcial único de la migración cubre la carrera (`sinDuplicado`).
 */
export async function exigeNombreLibre(ctx: Contexto, nombre: string, excepto?: string) {
  const vigentes = await ctx.db.grupoUsuarios.findMany({
    where: { archivadoEn: null, ...(excepto ? { id: { not: excepto } } : {}) },
    select: { nombre: true },
  });
  const buscado = nombre.toLowerCase();
  if (vigentes.some((g) => g.nombre.toLowerCase() === buscado)) {
    throw reglaDeNegocio(MENSAJE_DUPLICADO);
  }
}

/**
 * Dentro de la transacción de escritura, toma el lock de la fila del grupo y confirma que sigue
 * vigente: un archivado concurrente no deja editar ni cambiar miembros de un grupo ya archivado.
 */
export async function bloquearVigente(tx: TenantTx, id: string): Promise<void> {
  const r = await tx.grupoUsuarios.updateMany({
    where: { id, archivadoEn: null },
    data: { updatedAt: new Date() },
  });
  if (r.count !== 1) {
    throw reglaDeNegocio("El grupo está archivado: no se edita ni cambia de miembros.");
  }
}
