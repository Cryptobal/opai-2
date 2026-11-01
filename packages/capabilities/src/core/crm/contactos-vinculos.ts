import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto } from "../../errores";
import { uuidSchema } from "../esquemas";
import { exigirNoAnonimizado } from "../maestros/anonimizado";
import { textoOpcional } from "../maestros/comun";
import { contactoDe } from "../maestros/contactos-vista";
import { cuentaDe } from "../maestros/cuentas";
import { rolesCuentaSchema } from "./comun";
import { unicoPrincipal, vinculoDe, vinculoSchema, vistaVinculo } from "./vinculos-comun";

export const contactosVincular = defineCapability({
  id: "core.contactos.vincular",
  descripcion:
    "Vincula un contacto existente a otra cuenta, con su cargo y roles en ella; si se marca como principal, el anterior de esa cuenta deja de serlo.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({
    contactoId: uuidSchema,
    cuentaId: uuidSchema,
    cargo: textoOpcional(120),
    roles: rolesCuentaSchema.default([]),
    esPrincipal: z.boolean().default(false),
  }),
  output: vinculoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const contacto = await contactoDe(ctx, input.contactoId);
    exigirNoAnonimizado(contacto, "El contacto");
    const cuenta = await cuentaDe(ctx, input.cuentaId);
    if (
      await ctx.db.contactoCuenta.count({ where: { contactoId: contacto.id, cuentaId: cuenta.id } })
    )
      throw conflicto("El contacto ya está vinculado a esa cuenta.");
    const datos = {
      cargo: input.cargo ?? null,
      roles: input.roles,
      esPrincipal: input.esPrincipal,
    };
    if (dryRun)
      return vistaVinculo(
        { id: "", contactoId: contacto.id, cuentaId: cuenta.id, ...datos },
        cuenta.nombre,
      );
    const nuevo = await ctx.transaccion(async (tx) => {
      if (datos.esPrincipal) await unicoPrincipal(tx, cuenta.id, contacto.id);
      const v = await tx.contactoCuenta.create({
        data: { tenantId: ctx.tenantId, contactoId: contacto.id, cuentaId: cuenta.id, ...datos },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.contacto.vinculado",
        entidadTipo: "contacto",
        entidadId: contacto.id,
        payload: { cuentaId: cuenta.id },
      });
      return v;
    });
    return vistaVinculo(nuevo, cuenta.nombre);
  },
});

export const contactosSetRoles = defineCapability({
  id: "core.contactos.set_roles",
  descripcion:
    "Cambia el cargo, los roles o el principal de un contacto en una de sus cuentas; solo cambia lo enviado.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({
    contactoId: uuidSchema,
    cuentaId: uuidSchema,
    cargo: textoOpcional(120),
    roles: rolesCuentaSchema.optional(),
    esPrincipal: z.boolean().optional(),
  }),
  output: vinculoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { contactoId, cuentaId, ...cambios }, { dryRun }) {
    const contacto = await contactoDe(ctx, contactoId);
    exigirNoAnonimizado(contacto, "El contacto");
    const cuenta = await cuentaDe(ctx, cuentaId);
    const actual = await vinculoDe(ctx, contactoId, cuentaId);
    const data = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
    if (dryRun) return vistaVinculo({ ...actual, ...data }, cuenta.nombre);
    const v = await ctx.transaccion(async (tx) => {
      if (cambios.esPrincipal) await unicoPrincipal(tx, cuentaId, contactoId);
      const r = await tx.contactoCuenta.update({ where: { id: actual.id }, data });
      // Si es el vínculo inicial, la fila del contacto sigue el mismo valor (el trigger lo refleja).
      if (contacto.cuentaId === cuentaId)
        await tx.contacto.update({ where: { id: contactoId }, data });
      await ctx.eventos.emitir(tx, {
        tipo: "core.contacto.vinculo_actualizado",
        entidadTipo: "contacto",
        entidadId: contactoId,
        payload: { cuentaId },
      });
      return r;
    });
    return vistaVinculo(v, cuenta.nombre);
  },
});
