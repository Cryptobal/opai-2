import { z } from "zod";

import { conflicto, defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";
import { esRol } from "@opai/domain";

import { sinDuplicado, tipoSchema, uuidSchema, vistaTipo } from "./esquemas";
import { PERMISO_TIPOS_MANAGE } from "./permisos";
import { exigirMiembroActivo } from "./util";

/**
 * Cambia un tipo de ticket existente: nombre, dueño por defecto, aprobación, SLA, roles y
 * activo/inactivo. Un tipo nunca se borra (los tickets lo referencian): se desactiva y deja de
 * ofrecerse al crear. Usa el mismo helper de membresía activa que `tipos.crear`.
 */
export const tiposActualizar = defineCapability({
  id: "tickets.tipos.actualizar",
  descripcion:
    "Modifica un tipo de ticket del tenant: su dueño por defecto, si exige aprobación y de quién, el SLA opcional, los roles que lo usan, su orden y si está activo.",
  permiso: PERMISO_TIPOS_MANAGE,
  input: z.object({
    id: uuidSchema,
    nombre: z.string().trim().min(2).max(120).optional(),
    descripcion: z.string().trim().max(500).nullable().optional(),
    responsableDefectoTipo: z.enum(["rol", "usuario"]).optional(),
    responsableDefectoRol: z.string().trim().min(1).max(40).nullable().optional(),
    responsableDefectoUsuarioId: uuidSchema.nullable().optional(),
    requiereAprobacion: z.boolean().optional(),
    aprobadorRol: z.string().trim().min(1).max(40).nullable().optional(),
    slaHoras: z.number().int().min(1).max(24 * 90).nullable().optional(),
    rolesPermitidos: z.array(z.string()).max(10).optional(),
    activo: z.boolean().optional(),
    orden: z.number().int().min(0).max(1000).optional(),
  }),
  output: tipoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { id, ...cambios } = input;
    const actual = await ctx.db.tipoTicket.findFirst({ where: { id } });
    if (!actual) throw noEncontrado("El tipo de ticket");
    // Solo las claves presentes: Prisma no acepta `undefined` explícito (exactOptionalPropertyTypes).
    const data = {
      ...(cambios.nombre !== undefined && { nombre: cambios.nombre }),
      ...(cambios.descripcion !== undefined && { descripcion: cambios.descripcion }),
      ...(cambios.responsableDefectoTipo !== undefined && { responsableDefectoTipo: cambios.responsableDefectoTipo }),
      ...(cambios.responsableDefectoRol !== undefined && { responsableDefectoRol: cambios.responsableDefectoRol }),
      ...(cambios.responsableDefectoUsuarioId !== undefined && { responsableDefectoUsuarioId: cambios.responsableDefectoUsuarioId }),
      ...(cambios.requiereAprobacion !== undefined && { requiereAprobacion: cambios.requiereAprobacion }),
      ...(cambios.aprobadorRol !== undefined && { aprobadorRol: cambios.aprobadorRol }),
      ...(cambios.slaHoras !== undefined && { slaHoras: cambios.slaHoras }),
      ...(cambios.rolesPermitidos !== undefined && { rolesPermitidos: cambios.rolesPermitidos }),
      ...(cambios.activo !== undefined && { activo: cambios.activo }),
      ...(cambios.orden !== undefined && { orden: cambios.orden }),
    };
    const f = { ...actual, ...data };
    for (const r of [...f.rolesPermitidos, f.responsableDefectoRol, f.aprobadorRol]) {
      if (r && !esRol(r)) throw reglaDeNegocio(`"${r}" no es un rol válido.`);
    }
    if (f.responsableDefectoTipo === "rol" && !f.responsableDefectoRol)
      throw reglaDeNegocio("Falta el rol responsable por defecto.");
    if (f.responsableDefectoTipo === "usuario") {
      if (!f.responsableDefectoUsuarioId) throw reglaDeNegocio("Falta el usuario responsable por defecto.");
      await exigirMiembroActivo(ctx, f.responsableDefectoUsuarioId, "El responsable por defecto");
    }
    if (f.requiereAprobacion && !f.aprobadorRol)
      throw reglaDeNegocio("Un tipo con aprobación necesita el rol que aprueba.");
    if (dryRun) return vistaTipo(f);
    const guardado = await ctx.transaccion(async (tx) => {
      const r = await sinDuplicado(
        tx.tipoTicket.updateMany({ where: { id }, data }),
        `Ya existe un tipo de ticket llamado "${f.nombre}".`,
      );
      if (r.count !== 1) throw conflicto("El tipo cambió mientras tanto.");
      const t = await tx.tipoTicket.findFirst({ where: { id } });
      if (!t) throw noEncontrado("El tipo de ticket");
      await ctx.eventos.emitir(tx, {
        tipo: "tickets.tipo.actualizado",
        entidadTipo: "tipoTicket",
        entidadId: id,
        payload: { nombre: t.nombre, activo: t.activo },
      });
      return t;
    });
    return vistaTipo(guardado);
  },
});
