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
          const uCampos = {
            tallaCamisa: uniformeData.tallaCamisa ?? null,
            tallaPantalon: uniformeData.tallaPantalon ?? null,
            tallaChaqueta: uniformeData.tallaChaqueta ?? null,
            tallaZapato: uniformeData.tallaZapato ?? null,
            notas: uniformeData.notas ?? null,
          };
          const u = await tx.personaUniforme.upsert({
            where: { personaId: p.id },
            create: { tenantId: p.tenantId, personaId: p.id, ...uCampos },
            update: uCampos,
          });
          if (entrega) {
            await tx.personaUniformeEntrega.create({
              data: {
                tenantId: p.tenantId,
                uniformeId: u.id,
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
          const jBase = {
            resolucion: j.resolucion ?? null,
            resolucionVigenteDesde: j.resolucionVigenteDesde
              ? aFecha(j.resolucionVigenteDesde)
              : null,
            horasSemanales: j.horasSemanales ?? null,
            distribucion: j.distribucion ?? null,
            articulo22: j.articulo22 ?? false,
            plazoFijoPeriodo: j.plazoFijoPeriodo ?? null,
            terminoPlazoFijo: j.terminoPlazoFijo ? aFecha(j.terminoPlazoFijo) : null,
            avisoTerminoDias: j.avisoTerminoDias ?? null,
          };
          await tx.personaJornadaDt.upsert({
            where: { personaId: p.id },
            create: { tenantId: p.tenantId, personaId: p.id, ...jBase },
            update: jBase,
          });
        }
        if (input.os10) {
          const o = input.os10;
          const oBase = {
            credencial: o.credencial ?? null,
            venceEn: o.venceEn ? aFecha(o.venceEn) : null,
          };
          await tx.personaOs10.upsert({
            where: { personaId: p.id },
            create: { tenantId: p.tenantId, personaId: p.id, ...oBase },
            update: oBase,
          });
        }
        if (input.contacto) {
          const c = input.contacto;
          const cBase = {
            estadoCivil: c.estadoCivil ?? null,
            telefonoSecundario: c.telefonoSecundario ?? null,
            emergenciaNombre: c.emergenciaNombre ?? null,
            emergenciaRelacion: c.emergenciaRelacion ?? null,
            emergenciaTelefono: c.emergenciaTelefono ?? null,
          };
          await tx.personaContactoLaboral.upsert({
            where: { personaId: p.id },
            create: { tenantId: p.tenantId, personaId: p.id, ...cBase },
            update: cBase,
          });
        }
        return { id: p.id };
      },
    );
    return cargarLaboral(ctx, p.id);
  },
});
