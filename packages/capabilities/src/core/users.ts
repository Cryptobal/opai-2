import { z } from "zod";

import { esRol, PERMISOS_CORE, type Rol } from "@opai/domain";

import { defineCapability } from "../define";
import { prohibido, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { portalSchema, rolSchema, uuidSchema } from "./esquemas";
import { validarAsignacionRol } from "./permisos/asignaciones";
import { exigeAsignarRol, exigeGestionDeRoles } from "./permisos/comun";
import {
  aMiembro,
  buscar,
  type Miembro,
  miembroSchema,
  quedanOtrosOwners,
  ultimosAccesos,
} from "./users-miembro";

export { miembroSchema } from "./users-miembro";

/** Quien no es owner no puede tocar owners ni asignar un rol con permisos que él no tenga de hecho. */
function verificarJerarquia(ctx: Contexto, objetivo: Miembro, nuevoRol?: Rol): void {
  if (!ctx.rol) throw prohibido("Sin rol en esta empresa.");
  if (objetivo.rol === "owner" && !ctx.autorizar(PERMISOS_CORE.ownersManage)) {
    throw prohibido("Solo un owner puede cambiar a otro owner.");
  }
  // Dos barreras de §16.2: no asignar un rol base por encima del propio (`puedeAsignarRol` sobre el
  // rol base) y poder conceder todo lo que ese rol otorga (acceso REAL: rol personalizado +
  // excepciones). La jerarquía manda aunque un rol a medida iguale el acceso de uno más alto.
  if (nuevoRol) exigeAsignarRol(ctx, nuevoRol);
}

export const usersList = defineCapability({
  id: "core.users.list",
  descripcion: "Usuarios de la empresa actual con rol base, rol personalizado, portales y estado.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({}),
  output: z.array(miembroSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const filas = await ctx.db.membership.findMany({
      include: { user: true, rolTenant: true },
      orderBy: { createdAt: "asc" },
    });
    const accesos = await ultimosAccesos(
      ctx,
      filas.map((m) => m.userId),
    );
    return filas.map((m) => aMiembro(m, accesos.get(m.userId) ?? null));
  },
});

export const usersUpdate = defineCapability({
  id: "core.users.update",
  descripcion:
    "Cambia rol (base o personalizado por roleId), portales o estado de un usuario en una sola llamada. El último owner está protegido.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({
    membershipId: uuidSchema,
    rol: rolSchema.optional(),
    // Rol personalizado del tenant: null lo quita (vuelve al rol base). ADR-022, A21.
    roleId: uuidSchema.nullable().optional(),
    portales: z.array(portalSchema).min(1).optional(),
    estado: z.enum(["activa", "suspendida"]).optional(),
  }),
  output: miembroSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await buscar(ctx, input.membershipId);
    verificarJerarquia(ctx, actual, input.rol);
    // El rol base y la promoción a owner los cambia solo una persona, nunca una API key ni un agente
    // (review 5661003883 del #60; mandatos t365u y t366u de cerrar el Núcleo). `update` no puede ser
    // `soloPersonas` entera (un agente sí cambia portales o estado), así que se bloquean solo el rol
    // base y el rol personalizado: si no, una key de owner o admin se promovería o promovería a otros.
    if (input.rol !== undefined && ctx.actor.tipo === "agent") {
      throw prohibido(
        "Solo una persona puede cambiar el rol base o promover a owner, no una API key.",
      );
    }
    // Asignar o cambiar un rol personalizado es gobierno de acceso (§16.2): solo owner o admin y,
    // como `core.roles.assign` (soloPersonas, ADR-032), nunca una API key ni un agente.
    if (input.roleId !== undefined) {
      if (ctx.actor.tipo === "agent") {
        throw prohibido(
          "Solo una persona puede asignar o quitar un rol personalizado, no una API key.",
        );
      }
      exigeGestionDeRoles(ctx);
    }
    const pierdeOwner =
      actual.rol === "owner" &&
      ((input.rol !== undefined && input.rol !== "owner") || input.estado === "suspendida");
    if (pierdeOwner && !(await quedanOtrosOwners(ctx, actual.id))) {
      throw reglaDeNegocio(
        "Es el único owner de la empresa. Asigna otro owner antes de cambiar su rol.",
      );
    }
    // Un owner tiene acceso total por definición: al promover a owner se descartan su rol personalizado
    // y sus excepciones, para que nunca quede un owner restringido que cuente como «otro owner» (§16.2).
    const pasaAOwner = input.rol === "owner" && actual.rol !== "owner";
    // Regla del rol base bajo un personalizado (A21): se conserva el que ya tenía (o el que se pasa a
    // la vez); owner nunca lleva personalizado. Valida escalada y rol archivado como `roles.assign`.
    const roleId =
      input.roleId !== undefined
        ? await validarAsignacionRol(ctx, {
            rolBase: input.rol ?? actual.rol,
            roleId: input.roleId,
          })
        : undefined;
    const data = {
      ...(input.rol ? { rol: input.rol } : {}),
      ...(roleId !== undefined ? { roleId } : {}),
      ...(input.portales ? { portales: input.portales } : {}),
      ...(input.estado ? { estado: input.estado } : {}),
      ...(pasaAOwner ? { roleId: null } : {}),
    };
    if (dryRun) return { ...actual, ...data };
    await ctx.transaccion(async (tx) => {
      await tx.membership.update({ where: { id: actual.id }, data });
      if (pasaAOwner) await tx.permisoExcepcion.deleteMany({ where: { membershipId: actual.id } });
    });
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
