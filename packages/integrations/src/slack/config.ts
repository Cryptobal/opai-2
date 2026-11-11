import { z } from "zod";

/** Canal público de Slack elegido por la empresa (ADR-093: nunca uno por instalación). */
export const canalSlackSchema = z
  .object({ id: z.string().regex(/^C[A-Z0-9]{6,20}$/), nombre: z.string().trim().min(1).max(80) })
  .strict();

/**
 * Configuración por empresa de los avisos a Slack (ADR-093, decisiones 2 a 4 de Carlos). Valores por
 * defecto aprobados por Carlos el 11-nov-2026: «lo mínimo». Nada se envía hasta que la empresa conecte
 * Slack y elija un canal. Es configuración no secreta: vive en `core.integraciones.config`.
 */
export const slackConfigSchema = z
  .object({
    canales: z
      .object({
        /** Canal de las anomalías (atraso, ausencia, fuera de zona, sin relevo, incidentes). */
        general: canalSlackSchema.nullable().prefault(null),
        /** Canal del pánico; si no hay, va al general. */
        panico: canalSlackSchema.nullable().prefault(null),
        /** Canal del resumen por turno y zona; si no hay, va al general. */
        resumen: canalSlackSchema.nullable().prefault(null),
      })
      .strict()
      .prefault({}),
    avisos: z
      .object({
        atraso: z.boolean().prefault(true),
        ausencia: z.boolean().prefault(true),
        fueraDeZona: z.boolean().prefault(false),
        sinRelevo: z.boolean().prefault(false),
        incidentes: z.boolean().prefault(false),
        mensajesGuardias: z.boolean().prefault(false),
      })
      .strict()
      .prefault({}),
    /** Minutos de atraso desde los que se avisa. */
    margenAtrasoMin: z.number().int().min(1).max(240).prefault(15),
    panico: z
      .object({
        alCanal: z.boolean().prefault(true),
        /** Mensaje directo al supervisor zonal (F2/F3). */
        mensajeDirectoSupervisor: z.boolean().prefault(false),
        /** Escalar si nadie toma el pánico en `escalarMinutos`. */
        escalar: z.boolean().prefault(false),
        escalarMinutos: z.number().int().min(1).max(60).prefault(5),
        /** Grupo de usuarios de OPAI (CAR-251) que recibe el escalamiento; lo elige cada empresa. */
        escalarAGrupoId: z.uuid().nullable().prefault(null),
      })
      .strict()
      .prefault({}),
    resumen: z
      .object({ activo: z.boolean().prefault(false) })
      .strict()
      .prefault({}),
  })
  .strict();

export type SlackConfig = z.infer<typeof slackConfigSchema>;

/** Configuración efectiva: la guardada sobre los valores por defecto. Una guardada inválida no rompe: vuelve al defecto. */
export function slackConfigEfectiva(guardada: unknown): SlackConfig {
  const r = slackConfigSchema.safeParse(guardada ?? {});
  return r.success ? r.data : slackConfigSchema.parse({});
}
