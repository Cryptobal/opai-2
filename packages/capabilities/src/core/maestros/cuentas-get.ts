import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dondeInstalacion } from "./alcance";
import { cuentaSchema, vistaCuenta } from "./cuentas-vista";
import { cuentaDe } from "./cuentas-acceso";

export const cuentasGet = defineCapability({
  auditarLectura: (s) => [
    s.id,
    ...s.representantes.map((r) => r.id),
    ...s.contactos.map((c) => c.id),
  ],
  id: "core.cuentas.get",
  descripcion:
    "Ficha de una cuenta: datos legales y comerciales, representantes, contactos activos, instalaciones y cantidad de documentos.",
  permiso: PERMISOS_CORE.cuentasRead,
  input: z.object({ id: uuidSchema }),
  output: cuentaSchema.extend({
    representantes: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        rut: z.string(),
        email: z.string().nullable(),
      }),
    ),
    contactos: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        email: z.string().nullable(),
        esPrincipal: z.boolean(),
      }),
    ),
    instalaciones: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        estado: z.string(),
        comuna: z.string().nullable(),
      }),
    ),
    documentos: z.number(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const c = await cuentaDe(ctx, input.id);
    const [representantes, contactos, instalaciones, documentos] = await Promise.all([
      ctx.db.cuentaRepresentante.findMany({
        where: { cuentaId: c.id },
        orderBy: { nombre: "asc" },
      }),
      ctx.db.contacto.findMany({
        where: { cuentaId: c.id, archivadoEn: null },
        orderBy: [{ esPrincipal: "desc" }, { apellidos: "asc" }],
      }),
      ctx.db.instalacion.findMany({
        // Una cuenta puede entrar al alcance por una sola instalación: la ficha lista solo las que
        // están a cargo del actor, no todas las de la cuenta (ADR-022).
        where: { cuentaId: c.id, archivadaEn: null, AND: [dondeInstalacion(ctx)] },
        orderBy: { nombre: "asc" },
      }),
      ctx.db.documentoVinculo.count({ where: { entidadTipo: "cuenta", entidadId: c.id } }),
    ]);
    return {
      ...vistaCuenta(c),
      representantes: representantes.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        rut: r.rut,
        email: r.email,
      })),
      contactos: contactos.map((k) => ({
        id: k.id,
        nombre: `${k.nombres} ${k.apellidos}`,
        email: k.email,
        esPrincipal: k.esPrincipal,
      })),
      instalaciones: instalaciones.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        estado: i.estado,
        comuna: i.comuna,
      })),
      documentos,
    };
  },
});
