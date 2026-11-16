import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { personaFicha } from "./personas-ficha-comun";
import { aplicarLaboralParcial } from "./personas-laboral-escritura";
import { actualizarLaboralInput } from "./personas-laboral-input";
import { cargarLaboral, laboralSchema } from "./personas-laboral-vista";
import { exigirPrendasDelKit } from "./uniforme-prendas";

/** Períodos del contrato (CAR-409): se registran aparte de la ficha laboral, como historia. */
export { capacidadesContratoPeriodos } from "./contrato-periodos";

export const personasLaboralVer = defineCapability({
  // CAR-429: el id del documento OS-10 que respalda la ficha también queda como revelado.
  auditarLectura: (s) => [s.personaId, ...(s.os10Respaldo ? [s.os10Respaldo.documentoId] : [])],
  id: "core.personas.laboral_ver",
  descripcion:
    "Muestra uniforme, jornada DT, credencial OS-10 (con su documento vigente en Documentos, si existe) y contacto laboral de una persona. La lectura queda auditada.",
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
    await exigirPrendasDelKit(ctx, input.uniforme?.tallas);
    if (dryRun) return cargarLaboral(ctx, p.id);
    await escribirConEvento(
      ctx,
      { tipo: "core.persona.laboral_actualizada", entidadTipo: "persona" },
      async (tx) => {
        await aplicarLaboralParcial(tx, p, input);
        return { id: p.id };
      },
    );
    return cargarLaboral(ctx, p.id);
  },
});
