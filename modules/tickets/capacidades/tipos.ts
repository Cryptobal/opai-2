import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";
import { esRol } from "@opai/domain";

import { sinDuplicado, tipoSchema, vistaTipo } from "./esquemas";
import { PERMISO_TIPOS_MANAGE, PERMISO_VER } from "./permisos";

/**
 * Tipos activos visibles para el rol actual (sin tipos ocultos, modulos/tickets.md §3): un
 * `rolesPermitidos` vacío es visible para todos; si no está vacío, solo para esos roles.
 */
export const tiposListar = defineCapability({
  id: "tickets.tipos.listar",
  descripcion:
    "Lista los tipos de ticket activos que el rol actual puede usar al crear un ticket o una solicitud, con su regla de dueño, aprobación y SLA.",
  permiso: PERMISO_VER,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.array(tipoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.tipoTicket.findMany({
      where: { ...(input.incluirInactivos ? {} : { activo: true }) },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    const rol = ctx.rol;
    return filas
      .filter((t) => t.rolesPermitidos.length === 0 || (rol && t.rolesPermitidos.includes(rol)))
      .map(vistaTipo);
  },
});

export const tiposCrear = defineCapability({
  id: "tickets.tipos.crear",
  descripcion:
    "Crea un tipo de ticket del tenant: su dueño por defecto, si exige aprobación y de quién, el SLA opcional y qué roles lo pueden usar.",
  permiso: PERMISO_TIPOS_MANAGE,
  input: z.object({
    nombre: z.string().trim().min(2).max(120),
    descripcion: z.string().trim().max(500).optional(),
    responsableDefectoTipo: z.enum(["rol", "usuario"]).default("rol"),
    responsableDefectoRol: z.string().trim().min(1).max(40).optional(),
    responsableDefectoUsuarioId: z.uuid().optional(),
    requiereAprobacion: z.boolean().default(false),
    aprobadorRol: z.string().trim().min(1).max(40).optional(),
    slaHoras: z.number().int().min(1).max(24 * 90).optional(),
    rolesPermitidos: z.array(z.string()).max(10).default([]),
  }),
  output: tipoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    for (const r of [...input.rolesPermitidos, input.responsableDefectoRol, input.aprobadorRol]) {
      if (r && !esRol(r)) throw reglaDeNegocio(`"${r}" no es un rol válido.`);
    }
    if (input.responsableDefectoTipo === "rol" && !input.responsableDefectoRol)
      throw reglaDeNegocio("Falta el rol responsable por defecto.");
    if (input.responsableDefectoTipo === "usuario" && !input.responsableDefectoUsuarioId)
      throw reglaDeNegocio("Falta el usuario responsable por defecto.");
    if (input.requiereAprobacion && !input.aprobadorRol)
      throw reglaDeNegocio("Un tipo con aprobación necesita el rol que aprueba.");
    const data = {
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      responsableDefectoTipo: input.responsableDefectoTipo,
      responsableDefectoRol: input.responsableDefectoRol ?? null,
      responsableDefectoUsuarioId: input.responsableDefectoUsuarioId ?? null,
      requiereAprobacion: input.requiereAprobacion,
      aprobadorRol: input.aprobadorRol ?? null,
      slaHoras: input.slaHoras ?? null,
      rolesPermitidos: input.rolesPermitidos,
    };
    if (dryRun) {
      return vistaTipo({ id: "", activo: true, orden: 0, ...data });
    }
    const creado = await ctx.transaccion(async (tx) => {
      const t = await sinDuplicado(
        tx.tipoTicket.create({ data: { ...data, tenantId: ctx.tenantId } }),
        `Ya existe un tipo de ticket llamado "${input.nombre}".`,
      );
      await ctx.eventos.emitir(tx, {
        tipo: "tickets.tipo.creado",
        entidadTipo: "tipoTicket",
        entidadId: t.id,
        payload: { nombre: t.nombre },
      });
      return t;
    });
    return vistaTipo(creado);
  },
});
