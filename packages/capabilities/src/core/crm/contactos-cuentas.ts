import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dondeCuenta } from "../maestros/alcance";
import { contactoDe } from "../maestros/contactos-vista";
import { cuentaDe } from "../maestros/cuentas";
import { vinculoSchema, vistaVinculo } from "./vinculos-comun";

export const contactosCuentas = defineCapability({
  auditarLectura: (s) => s.map((v) => v.contactoId),
  id: "core.contactos.cuentas",
  descripcion:
    "Cuentas a las que pertenece un contacto, con su cargo, roles y si es el principal en cada una.",
  permiso: PERMISOS_CORE.cuentasRead,
  portales: ["erp", "supervisor"],
  input: z.object({ contactoId: uuidSchema }),
  output: z.array(vinculoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await contactoDe(ctx, input.contactoId);
    const vinculos = await ctx.db.contactoCuenta.findMany({
      where: { contactoId: input.contactoId },
    });
    // Alcance por filas: solo las cuentas que el actor puede ver.
    const cuentas = await ctx.db.cuenta.findMany({
      where: { id: { in: vinculos.map((v) => v.cuentaId) }, AND: [dondeCuenta(ctx)] },
      select: { id: true, nombre: true },
    });
    return vinculos
      .flatMap((v) => {
        const c = cuentas.find((x) => x.id === v.cuentaId);
        return c ? [vistaVinculo(v, c.nombre)] : [];
      })
      .sort((a, b) => Number(b.esPrincipal) - Number(a.esPrincipal));
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
