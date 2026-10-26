import { z } from "zod";

import { calcularPlazo, type EstadoIncidente, PERMISOS_CORE, puedeAvanzarIncidente } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { ajuste } from "../config";
import { uuidSchema } from "../esquemas";
import { actorLegible } from "./comunes";
import { incidenteVista, salidaIncidente, ultimoHecho } from "./incidentes-comun";

export const incidenteNotificar = defineCapability({
  id: "core.cumplimiento.incidente_notificar",
  descripcion:
    "Deja constancia del aviso de una brecha a la Agencia de Protección de Datos o a los titulares (Ley 21.719): a quién, por qué canal, con qué plazo y evidencia. Marca el caso como notificado; es un acto manual auditado.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    casoId: uuidSchema,
    destinatario: z.string().trim().min(2).max(200).describe('A quién se avisó ("agencia", "titulares" o un texto).'),
    canal: z.string().trim().max(80).optional(),
    evidenciaDocId: uuidSchema.optional().describe("Documento de evidencia del aviso, mismo tenant."),
    nota: z.string().trim().max(2000).optional(),
  }),
  output: incidenteVista.extend({ plazoEn: z.string().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ultimoHecho(ctx, input.casoId);
    if (!puedeAvanzarIncidente(actual.estado as EstadoIncidente, "notificado"))
      throw reglaDeNegocio(`No se puede notificar un caso "${actual.estado}".`);
    const dias = await ajuste<number>(ctx, "core", "cumplimiento_brecha_dias_plazo");
    const plazoEn = calcularPlazo(new Date(), dias);
    if (dryRun)
      return { casoId: input.casoId, estado: "notificado", ultimoEvento: "aviso", registradoEn: new Date().toISOString(), plazoEn: plazoEn?.toISOString() ?? null };
    const fila = await ctx.transaccion(async (tx) => {
      const f = await tx.incidente.create({
        data: {
          tenantId: ctx.tenantId,
          casoId: input.casoId,
          evento: "aviso",
          estado: "notificado",
          destinatario: input.destinatario,
          canal: input.canal ?? null,
          plazoEn,
          evidenciaDocId: input.evidenciaDocId ?? null,
          nota: input.nota ?? null,
          registradoPor: actorLegible(ctx),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.cumplimiento.brecha_notificada",
        entidadTipo: "incidente",
        entidadId: f.id,
        payload: { casoId: input.casoId, destinatario: input.destinatario },
      });
      return f;
    });
    return { ...salidaIncidente(fila), plazoEn: plazoEn?.toISOString() ?? null };
  },
});
