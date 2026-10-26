import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { listarInventario } from "./inventario";

const actividadSchema = z.object({
  modulo: z.string(),
  tabla: z.string(),
  finalidad: z.string(),
  categorias: z.array(z.string()),
  campos: z.array(z.string()),
  camposSensibles: z.array(z.string()),
  baseLicitud: z.string(),
  reguladoNoBorrable: z.boolean(),
  destinatarios: z.array(z.string()),
  retencion: z.string().nullable(),
});

export const cumplimientoRat = defineCapability({
  id: "core.cumplimiento.rat",
  descripcion:
    "Registro de actividades de tratamiento (RAT, Ley 21.719): inventario de las tablas con datos personales, por módulo, con categoría, campos, campos sensibles cifrados, base de licitud (propuesta), retención y destinatarios (encargados ulteriores).",
  permiso: PERMISOS_CORE.cumplimientoRead,
  input: z.object({
    modulo: z.string().trim().optional().describe('Filtra por módulo, p. ej. "core".'),
  }),
  output: z.object({
    /** Las bases de licitud son propuestas: las confirma asesoría legal (§16.2). */
    basesPropuestas: z.boolean(),
    actividades: z.array(actividadSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(_ctx, input) {
    const actividades = listarInventario()
      .filter((d) => !input.modulo || d.modulo === input.modulo)
      .map((d) => ({
        modulo: d.modulo,
        tabla: d.tabla,
        finalidad: d.finalidad,
        categorias: [...d.categorias],
        campos: [...d.campos],
        camposSensibles: [...(d.camposSensibles ?? [])],
        baseLicitud: d.baseLicitud,
        reguladoNoBorrable: d.reguladoNoBorrable ?? false,
        destinatarios: [...(d.destinatarios ?? [])],
        retencion: d.retencion ?? null,
      }));
    return { basesPropuestas: true, actividades };
  },
});
