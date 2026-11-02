import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { aFecha, escribirConEvento } from "./comun";
import { personaFicha } from "./personas-ficha-comun";
import { actualizarLaboralInput } from "./personas-laboral-input";
import { cargarLaboral, laboralSchema } from "./personas-laboral-vista";

export const personasLaboralVer = defineCapability({
  auditarLectura: (s) => [s.personaId],
  id: "core.personas.laboral_ver",
  descripcion:
    "Muestra uniforme, jornada DT, credencial OS-10 y contacto laboral de una persona. La lectura queda auditada.",
  permiso: PERMISOS_CORE.personasLaboralRead,
  input: z.object({ id: uuidSchema }),
  output: laboralSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await personaFicha(ctx, input.id);
    return cargarLaboral(ctx, input.id);
  },
});

export const personasLaboralActualizar = defineCapability({
  id: "core.personas.laboral_actualizar",
  descripcion:
    "Actualiza uniforme, jornada DT, OS-10 o contacto laboral de una persona. Puede registrar una entrega de uniforme en el historial.",
  permiso: PERMISOS_CORE.personasLaboralManage,
  input: actualizarLaboralInput.extend({ id: uuidSchema }),
  output: laboralSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await personaFicha(ctx, input.id);
    if (dryRun) return cargarLaboral(ctx, p.id);
    await escribirConEvento(
      ctx,
      { tipo: "core.persona.laboral_actualizada", entidadTipo: "persona" },
      async (tx) => {
        if (input.uniforme) {
          const { entrega, ...uniformeData } = input.uniforme;
          const patch: Record<string, string | null> = {};
          if (uniformeData.tallaCamisa !== undefined) patch.tallaCamisa = uniformeData.tallaCamisa;
          if (uniformeData.tallaPantalon !== undefined) patch.tallaPantalon = uniformeData.tallaPantalon;
          if (uniformeData.tallaChaqueta !== undefined) patch.tallaChaqueta = uniformeData.tallaChaqueta;
          if (uniformeData.tallaZapato !== undefined) patch.tallaZapato = uniformeData.tallaZapato;
          if (uniformeData.notas !== undefined) patch.notas = uniformeData.notas;
          let u = await tx.personaUniforme.findUnique({ where: { personaId: p.id } });
          if (Object.keys(patch).length) {
            u = await tx.personaUniforme.upsert({
              where: { personaId: p.id },
              create: {
                tenantId: p.tenantId,
                personaId: p.id,
                tallaCamisa: patch.tallaCamisa ?? null,
                tallaPantalon: patch.tallaPantalon ?? null,
                tallaChaqueta: patch.tallaChaqueta ?? null,
                tallaZapato: patch.tallaZapato ?? null,
                notas: patch.notas ?? null,
              },
              update: patch,
            });
          }
          if (entrega) {
            const uniforme =
              u ??
              (await tx.personaUniforme.upsert({
                where: { personaId: p.id },
                create: {
                  tenantId: p.tenantId,
                  personaId: p.id,
                  tallaCamisa: null,
                  tallaPantalon: null,
                  tallaChaqueta: null,
                  tallaZapato: null,
                  notas: null,
                },
                update: {},
              }));
            await tx.personaUniformeEntrega.create({
              data: {
                tenantId: p.tenantId,
                uniformeId: uniforme.id,
                personaId: p.id,
                entregadaEn: aFecha(entrega.entregadaEn),
                articulo: entrega.articulo,
                talla: entrega.talla ?? null,
                cantidad: entrega.cantidad,
                notas: entrega.notas ?? null,
              },
            });
          }
        }
        if (input.jornadaDt) {
          const j = input.jornadaDt;
          const patch: Record<string, unknown> = {};
          if (j.resolucion !== undefined) patch.resolucion = j.resolucion;
          if (j.resolucionVigenteDesde !== undefined) {
            patch.resolucionVigenteDesde = j.resolucionVigenteDesde
              ? aFecha(j.resolucionVigenteDesde)
              : null;
          }
          if (j.horasSemanales !== undefined) patch.horasSemanales = j.horasSemanales;
          if (j.distribucion !== undefined) patch.distribucion = j.distribucion;
          if (j.articulo22 !== undefined) patch.articulo22 = j.articulo22;
          if (j.plazoFijoPeriodo !== undefined) patch.plazoFijoPeriodo = j.plazoFijoPeriodo;
          if (j.terminoPlazoFijo !== undefined) {
            patch.terminoPlazoFijo = j.terminoPlazoFijo ? aFecha(j.terminoPlazoFijo) : null;
          }
          if (j.avisoTerminoDias !== undefined) patch.avisoTerminoDias = j.avisoTerminoDias;
          if (Object.keys(patch).length) {
            await tx.personaJornadaDt.upsert({
              where: { personaId: p.id },
              create: {
                tenantId: p.tenantId,
                personaId: p.id,
                resolucion: null,
                resolucionVigenteDesde: null,
                horasSemanales: null,
                distribucion: null,
                articulo22: false,
                plazoFijoPeriodo: null,
                terminoPlazoFijo: null,
                avisoTerminoDias: null,
                ...patch,
              },
              update: patch,
            });
          }
        }
        if (input.os10) {
          const o = input.os10;
          const patch: Record<string, unknown> = {};
          if (o.credencial !== undefined) patch.credencial = o.credencial;
          if (o.venceEn !== undefined) patch.venceEn = o.venceEn ? aFecha(o.venceEn) : null;
          if (Object.keys(patch).length) {
            await tx.personaOs10.upsert({
              where: { personaId: p.id },
              create: { tenantId: p.tenantId, personaId: p.id, credencial: null, venceEn: null, ...patch },
              update: patch,
            });
          }
        }
        if (input.contacto) {
          const c = input.contacto;
          const patch: Record<string, string | null> = {};
          if (c.estadoCivil !== undefined) patch.estadoCivil = c.estadoCivil;
          if (c.telefonoSecundario !== undefined) patch.telefonoSecundario = c.telefonoSecundario;
          if (c.emergenciaNombre !== undefined) patch.emergenciaNombre = c.emergenciaNombre;
          if (c.emergenciaRelacion !== undefined) patch.emergenciaRelacion = c.emergenciaRelacion;
          if (c.emergenciaTelefono !== undefined) patch.emergenciaTelefono = c.emergenciaTelefono;
          if (Object.keys(patch).length) {
            await tx.personaContactoLaboral.upsert({
              where: { personaId: p.id },
              create: {
                tenantId: p.tenantId,
                personaId: p.id,
                estadoCivil: null,
                telefonoSecundario: null,
                emergenciaNombre: null,
                emergenciaRelacion: null,
                emergenciaTelefono: null,
                ...patch,
              },
              update: patch,
            });
          }
        }
        return { id: p.id };
      },
    );
    return cargarLaboral(ctx, p.id);
  },
});
