import { z } from "zod";

import { PERMISOS_CORE, ROLES_CONTACTO_INSTALACION } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio, conflicto } from "../../errores";
import { uuidSchema } from "../esquemas";
import { dondeContacto } from "./alcance";
import type { Contexto } from "../../types";
import { instalacionDe } from "./instalaciones";

const rolInstalacionSchema = z.enum(ROLES_CONTACTO_INSTALACION);

const contactoRef = z.object({
  contactoId: z.string(),
  vinculoId: z.string(),
  nombre: z.string(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  roles: z.array(rolInstalacionSchema),
});

async function contactosDeCuenta(ctx: Contexto, cuentaId: string) {
  const porVinculo = await ctx.db.contactoCuenta.findMany({
    where: { cuentaId },
    select: { contactoId: true },
  });
  const idsVinculo = porVinculo.map((v) => v.contactoId);
  return ctx.db.contacto.findMany({
    where: {
      OR: [{ cuentaId }, { id: { in: idsVinculo } }],
      archivadoEn: null,
      AND: [dondeContacto(ctx)],
    },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      email: true,
      telefono: true,
    },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });
}

function nombre(c: { nombres: string; apellidos: string }) {
  return `${c.nombres} ${c.apellidos}`.trim();
}

/** Contactos vinculados a la instalación y candidatos de la cuenta (CAR-608). */
export const instalacionesContactosList = defineCapability({
  auditarLectura: (s) => [...s.vinculados, ...s.candidatos].map((c) => c.contactoId),
  id: "core.instalacion_contactos.list",
  descripcion:
    "Contactos de la instalación con su rol operacional y contactos de la cuenta aún no vinculados.",
  permiso: PERMISOS_CORE.instalacionesRead,
  portales: ["erp", "supervisor"],
  input: z.object({ instalacionId: uuidSchema }),
  output: z.object({
    instalacionId: z.string(),
    vinculados: z.array(contactoRef),
    candidatos: z.array(
      z.object({
        contactoId: z.string(),
        nombre: z.string(),
        email: z.string().nullable(),
        telefono: z.string().nullable(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (!ctx.autorizar(PERMISOS_CORE.cuentasRead))
      throw prohibido("Sin permiso para ver contactos.");
    const i = await instalacionDe(ctx, input.instalacionId);
    const [vinculos, cuentaContactos] = await Promise.all([
      ctx.db.contactoInstalacion.findMany({
        where: { instalacionId: i.id },
        include: {
          contacto: {
            select: { id: true, nombres: true, apellidos: true, email: true, telefono: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      contactosDeCuenta(ctx, i.cuentaId),
    ]);
    const vinculadosIds = new Set(vinculos.map((v) => v.contactoId));
    const parseRoles = (roles: string[]) =>
      roles.filter((r): r is z.infer<typeof rolInstalacionSchema> =>
        (ROLES_CONTACTO_INSTALACION as readonly string[]).includes(r),
      );
    return {
      instalacionId: i.id,
      vinculados: vinculos.map((v) => ({
        contactoId: v.contactoId,
        vinculoId: v.id,
        nombre: nombre(v.contacto),
        email: v.contacto.email,
        telefono: v.contacto.telefono,
        roles: parseRoles(v.roles),
      })),
      candidatos: cuentaContactos
        .filter((c) => !vinculadosIds.has(c.id))
        .map((c) => ({
          contactoId: c.id,
          nombre: nombre(c),
          email: c.email,
          telefono: c.telefono,
        })),
    };
  },
});

export const instalacionesContactosVincular = defineCapability({
  id: "core.instalacion_contactos.vincular",
  descripcion:
    "Vincula un contacto de la cuenta de la instalación con uno o más roles operacionales.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({
    instalacionId: uuidSchema,
    contactoId: uuidSchema,
    roles: z.array(rolInstalacionSchema).min(1).max(4),
  }),
  output: z.object({ vinculoId: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const i = await instalacionDe(ctx, input.instalacionId);
    const contacto = await ctx.db.contacto.findFirst({
      where: { id: input.contactoId, AND: [dondeContacto(ctx)] },
    });
    if (!contacto) throw reglaDeNegocio("El contacto no pertenece a tu alcance.");
    const enCuenta = await ctx.db.contactoCuenta.count({
      where: { contactoId: input.contactoId, cuentaId: i.cuentaId },
    });
    if (contacto.cuentaId !== i.cuentaId && enCuenta === 0) {
      throw reglaDeNegocio("El contacto debe estar vinculado a la cuenta de la instalación.");
    }
    if (
      await ctx.db.contactoInstalacion.count({
        where: { instalacionId: i.id, contactoId: input.contactoId },
      })
    ) {
      throw conflicto("El contacto ya está vinculado a esta instalación.");
    }
    if (dryRun) return { vinculoId: "" };
    const v = await ctx.transaccion(async (tx) => {
      const row = await tx.contactoInstalacion.create({
        data: {
          tenantId: ctx.tenantId,
          instalacionId: i.id,
          contactoId: input.contactoId,
          roles: input.roles,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.instalacion.actualizada",
        entidadTipo: "instalacion",
        entidadId: i.id,
        payload: { contactoVinculado: input.contactoId },
      });
      return row;
    });
    return { vinculoId: v.id };
  },
});

export const instalacionesContactosSetRoles = defineCapability({
  id: "core.instalacion_contactos.set_roles",
  descripcion: "Cambia los roles operacionales de un contacto en la instalación.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({
    vinculoId: uuidSchema,
    roles: z.array(rolInstalacionSchema).min(1).max(4),
  }),
  output: z.object({ vinculoId: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.contactoInstalacion.findFirst({
      where: { id: input.vinculoId },
      include: { instalacion: true },
    });
    if (!actual) throw reglaDeNegocio("Vínculo no encontrado.");
    await instalacionDe(ctx, actual.instalacionId);
    if (dryRun) return { vinculoId: actual.id };
    await ctx.transaccion(async (tx) => {
      await tx.contactoInstalacion.update({
        where: { id: actual.id },
        data: { roles: input.roles },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.instalacion.actualizada",
        entidadTipo: "instalacion",
        entidadId: actual.instalacionId,
        payload: { contactoRoles: actual.contactoId },
      });
    });
    return { vinculoId: actual.id };
  },
});

export const instalacionesContactosQuitar = defineCapability({
  id: "core.instalacion_contactos.quitar",
  descripcion: "Quita el vínculo de un contacto con la instalación; la persona sigue en la cuenta.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ vinculoId: uuidSchema }),
  output: z.object({ quitado: z.literal(true) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.contactoInstalacion.findFirst({ where: { id: input.vinculoId } });
    if (!actual) throw reglaDeNegocio("Vínculo no encontrado.");
    await instalacionDe(ctx, actual.instalacionId);
    if (dryRun) return { quitado: true as const };
    await ctx.transaccion(async (tx) => {
      await tx.contactoInstalacion.delete({ where: { id: actual.id } });
      await ctx.eventos.emitir(tx, {
        tipo: "core.instalacion.actualizada",
        entidadTipo: "instalacion",
        entidadId: actual.instalacionId,
        payload: { contactoQuitado: actual.contactoId },
      });
    });
    return { quitado: true as const };
  },
});