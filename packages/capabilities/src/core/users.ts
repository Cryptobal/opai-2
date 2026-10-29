import { z } from "zod";

import { esRol, PERMISOS_CORE, portalesIncoherentes, type Rol } from "@opai/domain";

import { defineCapability } from "../define";
import { conflicto, prohibido, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { portalSchema, rolSchema, uuidSchema } from "./esquemas";
import { validarAsignacionRol } from "./permisos/asignaciones";
import { exigeAsignarRol, exigeGestionDeRoles } from "./permisos/comun";
import { limpiarPortalObsoleto } from "./users-portal";
import { buscar, type Miembro, miembroSchema, quedanOtrosOwners } from "./users-miembro";

export { miembroSchema } from "./users-miembro";
export { usersList } from "./users-consulta";
export { usersMfaRestablecer } from "./users-mfa";

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
    // Coherencia rol-portal (NÚCLEO-D1): valida la combinación final (rol nuevo o el que ya tenía,
    // contra los portales nuevos o los que ya tenía). Un rol personalizado hereda la de su rol base.
    const rolEfectivo = input.rol ?? (esRol(actual.rol) ? actual.rol : undefined);
    if (!rolEfectivo && (input.portales !== undefined || input.estado === "activa")) {
      throw reglaDeNegocio("La membresía tiene un rol desconocido. Indica un rol válido.");
    }
    if (
      rolEfectivo &&
      (input.rol !== undefined || input.portales !== undefined || input.estado === "activa")
    ) {
      const incoherentes = portalesIncoherentes(rolEfectivo, input.portales ?? actual.portales);
      if (incoherentes.length > 0) {
        throw reglaDeNegocio(`El rol "${rolEfectivo}" no admite el portal "${incoherentes[0]}".`);
      }
    }
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
      // Compare-and-swap: la combinación validada debe seguir siendo la actual al escribir.
      const r = await tx.membership.updateMany({
        where: {
          id: actual.id,
          tenantId: ctx.tenantId,
          rol: actual.rol,
          portales: { equals: actual.portales },
          estado: actual.estado,
        },
        data,
      });
      if (r.count !== 1) throw conflicto("La membresía cambió. Recarga y vuelve a intentarlo.");
      await limpiarPortalObsoleto(tx, ctx.tenantId, actual, input);
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
