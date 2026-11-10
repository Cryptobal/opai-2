import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { escribirConEvento, sinDuplicado } from "../maestros/comun";
import {
  contarMiembros,
  descripcionGrupoSchema,
  exigeGestionDeGrupos,
  exigeNombreLibre,
  type GrupoFila,
  grupoDe,
  grupoSchema,
  grupoVigente,
  mensajeDuplicado,
  nombreGrupoSchema,
  vistaGrupo,
} from "./comun";

export const gruposCreate = defineCapability({
  id: "core.grupos.create",
  descripcion:
    "Crea un grupo o equipo de usuarios de la empresa (sin miembros; se agregan después). Solo owner o administrador.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({ nombre: nombreGrupoSchema, descripcion: descripcionGrupoSchema }),
  output: grupoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeGrupos(ctx);
    await exigeNombreLibre(ctx, input.nombre);
    const data = {
      tenantId: ctx.tenantId,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
    };
    if (dryRun) return vistaGrupo({ id: "", archivadoEn: null, ...data });
    const g = await sinDuplicado(
      escribirConEvento<GrupoFila>(
        ctx,
        { tipo: "core.grupo.creado", entidadTipo: "grupo_usuarios" },
        (tx) => tx.grupoUsuarios.create({ data }),
      ),
      mensajeDuplicado(input.nombre),
    );
    return vistaGrupo(g);
  },
});

export const gruposUpdate = defineCapability({
  id: "core.grupos.update",
  descripcion:
    "Cambia el nombre o la descripción de un grupo o equipo de usuarios vigente. Solo owner o administrador.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({
    id: uuidSchema.describe("Id del grupo."),
    nombre: nombreGrupoSchema.optional(),
    descripcion: descripcionGrupoSchema,
  }),
  output: grupoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeGrupos(ctx);
    const actual = await grupoVigente(ctx, input.id);
    if (input.nombre !== undefined) await exigeNombreLibre(ctx, input.nombre, actual.id);
    const data = {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion } : {}),
    };
    const miembros = await contarMiembros(ctx, actual.id);
    if (dryRun) return vistaGrupo({ ...actual, ...data }, miembros);
    const g = await sinDuplicado(
      escribirConEvento<GrupoFila>(
        ctx,
        { tipo: "core.grupo.actualizado", entidadTipo: "grupo_usuarios" },
        (tx) => tx.grupoUsuarios.update({ where: { id: actual.id }, data }),
      ),
      mensajeDuplicado(input.nombre ?? actual.nombre),
    );
    return vistaGrupo(g, miembros);
  },
});

export const gruposArchive = defineCapability({
  id: "core.grupos.archive",
  descripcion:
    "Archiva un grupo o equipo de usuarios: sale de la lista y conserva sus miembros e historial (no se borra). Solo owner o administrador.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({ id: uuidSchema.describe("Id del grupo.") }),
  output: grupoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeGrupos(ctx);
    const actual = await grupoDe(ctx, input.id);
    const miembros = await contarMiembros(ctx, actual.id);
    if (actual.archivadoEn) return vistaGrupo(actual, miembros);
    if (dryRun) return vistaGrupo({ ...actual, archivadoEn: new Date() }, miembros);
    const g = await escribirConEvento<GrupoFila>(
      ctx,
      { tipo: "core.grupo.archivado", entidadTipo: "grupo_usuarios" },
      (tx) =>
        tx.grupoUsuarios.update({ where: { id: actual.id }, data: { archivadoEn: new Date() } }),
    );
    return vistaGrupo(g, miembros);
  },
});
