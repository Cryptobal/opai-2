import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dondeContacto } from "./alcance";
import { definidos, escribirConEvento } from "./comun";
import {
  campos,
  contactoDe,
  contactoSchema,
  emailLibre,
  unicoPrincipal,
  vista,
} from "./contactos-vista";
import { cuentaDe } from "./cuentas";
import { exigirNoAnonimizado } from "./anonimizado";

export const contactosList = defineCapability({
  auditarLectura: (s) => s.map((c) => c.id),
  id: "core.contactos.list",
  descripcion: "Contactos de una cuenta (principal primero), con correo, teléfono, cargo y roles.",
  permiso: PERMISOS_CORE.cuentasRead,
  portales: ["erp", "supervisor"],
  input: z.object({ cuentaId: uuidSchema, incluirArchivados: z.boolean().default(false) }),
  output: z.array(contactoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.contacto.findMany({
      where: {
        cuentaId: input.cuentaId,
        AND: [dondeContacto(ctx)],
        ...(input.incluirArchivados ? {} : { archivadoEn: null }),
      },
      orderBy: [{ esPrincipal: "desc" }, { apellidos: "asc" }],
    });
    return filas.map(vista);
  },
});

export const contactosGet = defineCapability({
  auditarLectura: (s) => [s.id],
  id: "core.contactos.get",
  descripcion: "Ficha de un contacto de una cuenta: datos, roles y si es el principal.",
  permiso: PERMISOS_CORE.cuentasRead,
  input: z.object({ id: uuidSchema }),
  output: contactoSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => vista(await contactoDe(ctx, input.id)),
});

export const contactosCreate = defineCapability({
  id: "core.contactos.create",
  descripcion:
    "Agrega un contacto a una cuenta. El correo es único dentro de la cuenta; si se marca como principal, el anterior deja de serlo.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({ cuentaId: uuidSchema, ...campos }),
  output: contactoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cuentaDe(ctx, input.cuentaId);
    await emailLibre(ctx, input.cuentaId, input.email);
    const data = definidos(input);
    if (dryRun) {
      const base = {
        email: null,
        telefono: null,
        cargo: null,
        notas: null,
        esPrincipal: false,
        roles: [],
      };
      return vista({ ...base, ...data, id: "", estado: "activo", archivadoEn: null });
    }
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.contacto.creado", entidadTipo: "contacto" },
      async (tx) => {
        const nuevo = await tx.contacto.create({
          data: {
            esPrincipal: false,
            roles: [],
            ...data,
            estado: "activo",
            tenantId: ctx.tenantId,
          },
        });
        if (nuevo.esPrincipal) await unicoPrincipal(tx, nuevo.cuentaId, nuevo.id);
        return nuevo;
      },
    );
    return vista(c);
  },
});

export const contactosUpdate = defineCapability({
  id: "core.contactos.update",
  descripcion:
    "Actualiza un contacto (datos, roles, principal, activo/inactivo). Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({
    id: uuidSchema,
    estado: z.enum(["activo", "inactivo"]).optional(),
    ...z.object(campos).partial().shape,
  }),
  output: contactoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await contactoDe(ctx, id);
    exigirNoAnonimizado(actual, "El contacto");
    await emailLibre(ctx, actual.cuentaId, cambios.email, id);
    const data = definidos(cambios);
    if (dryRun) return vista({ ...actual, ...data });
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.contacto.actualizado", entidadTipo: "contacto" },
      async (tx) => {
        const r = await tx.contacto.update({ where: { id }, data });
        if (r.esPrincipal) await unicoPrincipal(tx, r.cuentaId, r.id);
        return r;
      },
    );
    return vista(c);
  },
});

export const contactosArchive = defineCapability({
  id: "core.contactos.archive",
  descripcion: "Archiva un contacto (deja de aparecer; se conserva el historial).",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({ id: uuidSchema }),
  output: contactoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const actual = await contactoDe(ctx, id);
    const data = { archivadoEn: actual.archivadoEn ?? new Date(), esPrincipal: false };
    if (dryRun) return vista({ ...actual, ...data });
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.contacto.actualizado", entidadTipo: "contacto" },
      (tx) => tx.contacto.update({ where: { id }, data }),
    );
    return vista(c);
  },
});
