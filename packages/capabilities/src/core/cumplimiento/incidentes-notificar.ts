import { z } from "zod";

import {
  avisosPendientes,
  brechaNotificada,
  calcularPlazo,
  DESTINATARIOS_BRECHA,
  type EstadoIncidente,
  PERMISOS_CORE,
  puedeAvanzarIncidente,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { ajuste } from "../config";
import { uuidSchema } from "../esquemas";
import { actorLegible } from "./comunes";
import { bloquearCaso, hechosDeCaso, incidenteVista, salidaIncidente } from "./incidentes-comun";

type Hecho = { evento: string; estado: string; destinatario: string | null; ocurridoEn: Date | null; createdAt: Date };

/** Registro inicial del caso (fecha de detección/registro) y destinatarios ya avisados. */
function estadoAvisos(hechos: readonly Hecho[]) {
  const registro = hechos.find((h) => h.evento === "registro") ?? hechos[0];
  const avisados = new Set(
    hechos.filter((h) => h.evento === "aviso" && h.destinatario).map((h) => h.destinatario as string),
  );
  const actual = hechos[hechos.length - 1]?.estado ?? "abierto";
  // El plazo corre desde la DETECCIÓN (`ocurrido_en`) o, si no se conoce, desde el REGISTRO
  // (`created_at`), nunca desde el aviso (Ley 21.719 §16.5).
  const inicioPlazo = registro?.ocurridoEn ?? registro?.createdAt ?? null;
  return { avisados, actual: actual as EstadoIncidente, inicioPlazo };
}

export const incidenteNotificar = defineCapability({
  id: "core.cumplimiento.incidente_notificar",
  descripcion:
    "Deja constancia del aviso de una brecha a la Agencia de Protección de Datos o a los titulares (Ley 21.719): a quién, por qué canal y con qué evidencia. El plazo corre desde la detección; el caso queda «notificado» solo cuando constan los avisos a todos los destinatarios. Es un acto manual auditado.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    casoId: uuidSchema,
    destinatario: z
      .enum(DESTINATARIOS_BRECHA)
      .describe('A quién se avisó: "agencia" (Agencia de Protección de Datos) o "titulares".'),
    canal: z.string().trim().max(80).optional(),
    evidenciaDocId: uuidSchema.optional().describe("Documento de evidencia del aviso, mismo tenant."),
    nota: z.string().trim().max(2000).optional(),
  }),
  output: incidenteVista.extend({
    plazoEn: z.string().nullable(),
    notificada: z.boolean().describe("True si ya constan los avisos a todos los destinatarios."),
    pendientes: z.array(z.string()).describe("Destinatarios que aún faltan por avisar."),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const dias = await ajuste<number>(ctx, "core", "cumplimiento_brecha_dias_plazo");
    if (dryRun) {
      const { avisados, actual, inicioPlazo } = estadoAvisos(await hechosDeCaso(ctx.db, input.casoId));
      validar(actual, avisados, input.destinatario);
      const nuevos = new Set([...avisados, input.destinatario]);
      const notificada = brechaNotificada(nuevos);
      const plazoEn = calcularPlazo(inicioPlazo ?? new Date(), dias);
      return {
        casoId: input.casoId,
        estado: notificada ? "notificado" : actual,
        ultimoEvento: "aviso",
        registradoEn: new Date().toISOString(),
        plazoEn: plazoEn?.toISOString() ?? null,
        notificada,
        pendientes: avisosPendientes(nuevos),
      };
    }
    // Lee el estado y los avisos vigentes y anota el aviso en la misma transacción, bajo advisory lock
    // por caso: dos avisos concurrentes no dejan la brecha sin marcar notificada (sin TOCTOU).
    const { fila, notificada, nuevos, plazoEn } = await ctx.transaccion(async (tx) => {
      await bloquearCaso(tx, input.casoId);
      const { avisados, actual, inicioPlazo } = estadoAvisos(await hechosDeCaso(tx, input.casoId));
      validar(actual, avisados, input.destinatario);
      const nuevosSet = new Set([...avisados, input.destinatario]);
      const completa = brechaNotificada(nuevosSet);
      const plazo = calcularPlazo(inicioPlazo ?? new Date(), dias);
      const f = await tx.incidente.create({
        data: {
          tenantId: ctx.tenantId,
          casoId: input.casoId,
          evento: "aviso",
          // El caso solo pasa a "notificado" cuando constan todos los avisos; si falta alguno,
          // conserva el estado vigente (no se fabrica una transición).
          estado: completa ? "notificado" : actual,
          destinatario: input.destinatario,
          canal: input.canal ?? null,
          plazoEn: plazo,
          evidenciaDocId: input.evidenciaDocId ?? null,
          nota: input.nota ?? null,
          registradoPor: actorLegible(ctx),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.cumplimiento.brecha_notificada",
        entidadTipo: "incidente",
        entidadId: f.id,
        payload: { casoId: input.casoId, destinatario: input.destinatario, notificada: completa },
      });
      return { fila: f, notificada: completa, nuevos: nuevosSet, plazoEn: plazo };
    });
    return {
      ...salidaIncidente(fila),
      plazoEn: plazoEn?.toISOString() ?? null,
      notificada,
      pendientes: avisosPendientes(nuevos),
    };
  },
});

/** Valida que el caso admita un aviso y que el destinatario no esté ya avisado. */
function validar(actual: EstadoIncidente, avisados: ReadonlySet<string>, destinatario: string): void {
  if (actual === "cerrado") throw reglaDeNegocio('No se puede notificar un caso "cerrado".');
  if (avisados.has(destinatario))
    throw reglaDeNegocio(`Ya consta el aviso a "${destinatario}" en este caso.`);
  // Si aún no está notificado, debe poder llegar a "notificado" desde el estado vigente.
  if (actual !== "notificado" && !puedeAvanzarIncidente(actual, "notificado"))
    throw reglaDeNegocio(`No se puede notificar un caso "${actual}".`);
}
