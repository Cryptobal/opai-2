import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { uuid } from "./esquemas";

export const telefonoHabilitar = defineCapability({
  id: "asistencia.telefono.habilitar",
  descripcion:
    "RR. HH. habilita o deshabilita a una persona para marcar desde su teléfono personal (D-01). Además la persona debe aceptar su uso, la instalación debe incluir el canal y la empresa debe permitirlo. La persona necesita tener su PIN asignado.",
  permiso: "asistencia:configurar",
  portales: ["erp"],
  soloPersonas: true,
  input: z.object({ personaId: uuid, habilitado: z.boolean() }),
  output: z.object({ habilitado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!(await ctx.db.persona.findFirst({ where: { id: i.personaId, archivadaEn: null, anonimizadaEn: null }, select: { id: true } })))
      throw noEncontrado("La persona");
    const cred = await ctx.db.credencialTerreno.findUnique({ where: { personaId: i.personaId }, select: { id: true } });
    if (!cred) throw reglaDeNegocio("Primero asigna un PIN de terreno a la persona.");
    if (dryRun) return { habilitado: i.habilitado };
    await ctx.transaccion(async (tx) => {
      await tx.credencialTerreno.update({ where: { personaId: i.personaId }, data: { telefonoPersonalHabilitado: i.habilitado } });
      await ctx.bitacora.registrar(tx, {
        tipo: "asistencia.telefono.habilitacion", entidadTipo: "persona", entidadId: i.personaId, payload: { habilitado: i.habilitado },
      });
    });
    return { habilitado: i.habilitado };
  },
});
