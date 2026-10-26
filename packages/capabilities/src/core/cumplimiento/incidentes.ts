import { z } from "zod";

import {
  type EstadoIncidente,
  ESTADOS_INCIDENTE,
  PERMISOS_CORE,
  puedeAvanzarIncidente,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { uuid7 } from "../documentos/uuid7";
import { actorLegible } from "./comunes";
import { incidenteVista, salidaIncidente, ultimoHecho } from "./incidentes-comun";

export const incidenteRegistrar = defineCapability({
  id: "core.cumplimiento.incidente_registrar",
  descripcion:
    "Registra un incidente de seguridad o una brecha de datos personales (Ley 21.719): cuándo ocurrió, su alcance y las categorías de datos afectados, sin datos personales en claro. Abre el caso y lo deja auditado (flujo manual).",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    descripcion: z.string().trim().min(5).max(2000),
    alcance: z.string().trim().max(2000).optional(),
    datosAfectados: z.string().trim().max(2000).optional().describe("Categorías afectadas, sin datos en claro."),
    ocurridoEn: z.string().datetime().optional().describe("Cuándo ocurrió (ISO 8601)."),
  }),
  output: incidenteVista,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (dryRun)
      return { casoId: "", estado: "abierto", ultimoEvento: "registro", registradoEn: new Date().toISOString() };
    // El caso se identifica por el id del primer hecho; se fija al crear (incidentes es append-only:
    // opai_app no puede UPDATE, así que no se puede rellenar casoId después).
    const nid = uuid7();
    const fila = await ctx.transaccion(async (tx) => {
      const f = await tx.incidente.create({
        data: {
          id: nid,
          tenantId: ctx.tenantId,
          casoId: nid,
          evento: "registro",
          estado: "abierto",
          descripcion: input.descripcion,
          alcance: input.alcance ?? null,
          datosAfectados: input.datosAfectados ?? null,
          ocurridoEn: input.ocurridoEn ? new Date(input.ocurridoEn) : null,
          registradoPor: actorLegible(ctx),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.cumplimiento.incidente_registrado",
        entidadTipo: "incidente",
        entidadId: f.id,
        payload: { casoId: f.id },
      });
      return f;
    });
    return salidaIncidente(fila);
  },
});

export const incidenteAvanzar = defineCapability({
  id: "core.cumplimiento.incidente_avanzar",
  descripcion:
    "Avanza el estado de un incidente de seguridad en su atención (en evaluación, cerrado…) agregando un hecho nuevo, sin editar los anteriores (Ley 21.719). La transición queda auditada.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    casoId: uuidSchema,
    estado: z.enum(ESTADOS_INCIDENTE),
    nota: z.string().trim().max(2000).optional(),
  }),
  output: incidenteVista,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ultimoHecho(ctx, input.casoId);
    if (!puedeAvanzarIncidente(actual.estado as EstadoIncidente, input.estado))
      throw reglaDeNegocio(`No se puede pasar de "${actual.estado}" a "${input.estado}".`);
    if (dryRun)
      return { casoId: input.casoId, estado: input.estado, ultimoEvento: "avance", registradoEn: new Date().toISOString() };
    const fila = await ctx.transaccion(async (tx) => {
      const f = await tx.incidente.create({
        data: {
          tenantId: ctx.tenantId,
          casoId: input.casoId,
          evento: "avance",
          estado: input.estado,
          nota: input.nota ?? null,
          registradoPor: actorLegible(ctx),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.cumplimiento.incidente_avanzado",
        entidadTipo: "incidente",
        entidadId: f.id,
        payload: { casoId: input.casoId, estado: input.estado },
      });
      return f;
    });
    return salidaIncidente(fila);
  },
});
