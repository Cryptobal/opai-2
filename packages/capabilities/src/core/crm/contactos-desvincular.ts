import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { contactoDe } from "../maestros/contactos-vista";
import { cuentaDe } from "../maestros/cuentas";
import { vinculoDe } from "./vinculos-comun";

export const contactosDesvincular = defineCapability({
  id: "core.contactos.desvincular",
  descripcion:
    "Quita el vínculo de un contacto con una cuenta (se pierde su cargo y roles ahí). El contacto debe conservar al menos una cuenta y no puede participar en negocios de la cuenta que se quita.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({ contactoId: uuidSchema, cuentaId: uuidSchema }),
  output: z.object({ contactoId: z.string(), cuentaId: z.string(), cuentasRestantes: z.number() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const contacto = await contactoDe(ctx, input.contactoId);
    await cuentaDe(ctx, input.cuentaId);
    const actual = await vinculoDe(ctx, contacto.id, input.cuentaId);
    const otros = (await ctx.db.contactoCuenta.findMany({ where: { contactoId: contacto.id } }))
      .filter((v) => v.id !== actual.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const siguiente = otros[0];
    if (!siguiente)
      throw reglaDeNegocio(
        "El contacto debe conservar al menos una cuenta: archívalo en su lugar.",
      );
    const enNegocios = await ctx.db.negocioContacto.findMany({
      where: { contactoId: contacto.id },
    });
    const negocios = enNegocios.length
      ? await ctx.db.negocio.count({
          where: { id: { in: enNegocios.map((n) => n.negocioId) }, cuentaId: input.cuentaId },
        })
      : 0;
    if (negocios)
      throw reglaDeNegocio(
        "El contacto participa en negocios de esa cuenta; quítalo de ellos primero.",
      );
    const resultado = {
      contactoId: contacto.id,
      cuentaId: input.cuentaId,
      cuentasRestantes: otros.length,
    };
    if (dryRun) return resultado;
    await ctx.transaccion(async (tx) => {
      await tx.contactoCuenta.delete({ where: { id: actual.id } });
      // La fila del contacto apuntaba a esta cuenta: pasa a la siguiente con los datos de su vínculo.
      if (contacto.cuentaId === input.cuentaId)
        await tx.contacto.update({
          where: { id: contacto.id },
          data: {
            cuentaId: siguiente.cuentaId,
            cargo: siguiente.cargo,
            roles: siguiente.roles,
            esPrincipal: siguiente.esPrincipal,
          },
        });
      await ctx.eventos.emitir(tx, {
        tipo: "core.contacto.desvinculado",
        entidadTipo: "contacto",
        entidadId: contacto.id,
        payload: { cuentaId: input.cuentaId },
      });
    });
    return resultado;
  },
});

export const cuentasContactos = defineCapability({
  auditarLectura: (s) => s.map((c) => c.contactoId),
  id: "core.cuentas.contactos",
  descripcion:
    "Contactos de una cuenta incluidos los que la comparten con otras cuentas, con el cargo y los roles que tienen en ella (principal primero).",
  permiso: PERMISOS_CORE.cuentasRead,
  portales: ["erp", "supervisor"],
  input: z.object({ cuentaId: uuidSchema, incluirArchivados: z.boolean().default(false) }),
  output: z.array(
    z.object({
      contactoId: z.string(),
      nombres: z.string(),
      apellidos: z.string(),
      email: z.string().nullable(),
      telefono: z.string().nullable(),
      cargo: z.string().nullable(),
      roles: z.array(z.string()),
      esPrincipal: z.boolean(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await cuentaDe(ctx, input.cuentaId);
    const vinculos = await ctx.db.contactoCuenta.findMany({ where: { cuentaId: input.cuentaId } });
    const contactos = await ctx.db.contacto.findMany({
      where: {
        id: { in: vinculos.map((v) => v.contactoId) },
        ...(input.incluirArchivados ? {} : { archivadoEn: null }),
      },
    });
    return vinculos
      .flatMap((v) => {
        const c = contactos.find((x) => x.id === v.contactoId);
        if (!c) return [];
        return [
          {
            contactoId: c.id,
            nombres: c.nombres,
            apellidos: c.apellidos,
            email: c.email ?? null,
            telefono: c.telefono ?? null,
            cargo: v.cargo,
            roles: v.roles,
            esPrincipal: v.esPrincipal,
          },
        ];
      })
      .sort(
        (a, b) =>
          Number(b.esPrincipal) - Number(a.esPrincipal) || a.apellidos.localeCompare(b.apellidos),
      );
  },
});
