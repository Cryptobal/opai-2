import { z } from "zod";

import { esRol, PERMISOS_CORE, type Rol } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { portalSchema, rolSchema, uuidSchema } from "./esquemas";
import { validarConcedeRol } from "./permisos/comun";

export const miembroSchema = z.object({
  id: z.string(),
  userId: z.string(),
  nombre: z.string(),
  email: z.string(),
  rol: z.string(),
  portales: z.array(z.string()),
  estado: z.string(),
});

type Miembro = z.infer<typeof miembroSchema>;

async function buscar(ctx: Contexto, id: string): Promise<Miembro> {
  const m = await ctx.db.membership.findUnique({ where: { id }, include: { user: true } });
  if (!m) throw noEncontrado("El usuario");
  return { ...m, nombre: m.user.name, email: m.user.email };
}

/** Owners activos además del indicado. El último owner nunca se degrada, suspende ni elimina. */
async function quedanOtrosOwners(ctx: Contexto, excepto: string): Promise<boolean> {
  const n = await ctx.db.membership.count({
    where: { rol: "owner", estado: "activa", id: { not: excepto } },
  });
  return n > 0;
}

/** Quien no es owner no puede tocar owners ni asignar un rol con permisos que él no tenga de hecho. */
function verificarJerarquia(ctx: Contexto, objetivo: Miembro, nuevoRol?: Rol): void {
  if (!ctx.rol) throw prohibido("Sin rol en esta empresa.");
  if (objetivo.rol === "owner" && !ctx.autorizar(PERMISOS_CORE.ownersManage)) {
    throw prohibido("Solo un owner puede modificar a otro owner.");
  }
  // Qué rol puede asignar se mide por su acceso REAL (rol personalizado + excepciones), no por el rol
  // base: un rol base alto con un rol personalizado restringido no asigna por encima de su acceso.
  if (nuevoRol) validarConcedeRol(ctx, nuevoRol);
}

export const usersList = defineCapability({
  id: "core.users.list",
  descripcion: "Usuarios de la empresa actual con rol, portales y estado.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({}),
  output: z.array(miembroSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const filas = await ctx.db.membership.findMany({
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    return filas.map((m) => ({ ...m, nombre: m.user.name, email: m.user.email }));
  },
});

export const usersUpdate = defineCapability({
  id: "core.users.update",
  descripcion:
    "Cambia rol, portales o estado (activa/suspendida) de un usuario. El último owner está protegido.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({
    membershipId: uuidSchema,
    rol: rolSchema.optional(),
    portales: z.array(portalSchema).min(1).optional(),
    estado: z.enum(["activa", "suspendida"]).optional(),
  }),
  output: miembroSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await buscar(ctx, input.membershipId);
    verificarJerarquia(ctx, actual, input.rol);
    const pierdeOwner =
      actual.rol === "owner" &&
      ((input.rol !== undefined && input.rol !== "owner") || input.estado === "suspendida");
    if (pierdeOwner && !(await quedanOtrosOwners(ctx, actual.id))) {
      throw reglaDeNegocio("Es el último owner de la empresa: asigna otro owner antes.");
    }
    const data = {
      ...(input.rol ? { rol: input.rol } : {}),
      ...(input.portales ? { portales: input.portales } : {}),
      ...(input.estado ? { estado: input.estado } : {}),
    };
    if (dryRun) return { ...actual, ...data };
    await ctx.db.membership.update({ where: { id: actual.id }, data });
    return buscar(ctx, actual.id);
  },
});

export const usersRemove = defineCapability({
  id: "core.users.remove",
  descripcion: "Quita a un usuario de la empresa (elimina su membresía). Nunca al último owner.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({ membershipId: uuidSchema }),
  output: z.object({ eliminado: miembroSchema }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await buscar(ctx, input.membershipId);
    verificarJerarquia(ctx, actual, esRol(actual.rol) ? actual.rol : undefined);
    if (actual.rol === "owner" && !(await quedanOtrosOwners(ctx, actual.id))) {
      throw reglaDeNegocio("Es el último owner de la empresa: no se puede quitar.");
    }
    if (!dryRun) await ctx.db.membership.delete({ where: { id: actual.id } });
    return { eliminado: actual };
  },
});
