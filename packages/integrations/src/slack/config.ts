import { z } from "zod";

/** Canal público de Slack elegido por la empresa (ADR-093: nunca uno por instalación). */
export const canalSlackSchema = z
  .object({ id: z.string().regex(/^C[A-Z0-9]{6,20}$/), nombre: z.string().trim().min(1).max(80) })
  .strict();

const canales = z
  .object({
    /** Canal de las anomalías (atraso, ausencia, fuera de zona, sin relevo, incidentes). */
    general: canalSlackSchema.nullable(),
    /** Canal del pánico; si no hay, va al general. */
    panico: canalSlackSchema.nullable(),
    /** Canal del resumen por turno y zona; si no hay, va al general. */
    resumen: canalSlackSchema.nullable(),
  })
  .strict();
const avisos = z
  .object({
    atraso: z.boolean(),
    ausencia: z.boolean(),
    fueraDeZona: z.boolean(),
    sinRelevo: z.boolean(),
    incidentes: z.boolean(),
    mensajesGuardias: z.boolean(),
  })
  .strict();
const panico = z
  .object({
    alCanal: z.boolean(),
    /** Mensaje directo al supervisor zonal (F2/F3). */
    mensajeDirectoSupervisor: z.boolean(),
    /** Escalar si nadie toma el pánico en `escalarMinutos`. */
    escalar: z.boolean(),
    escalarMinutos: z.number().int().min(1).max(60),
    /** Grupo de usuarios de OPAI (CAR-251) que recibe el escalamiento; lo elige cada empresa. */
    escalarAGrupoId: z.uuid().nullable(),
  })
  .strict();
const resumen = z.object({ activo: z.boolean() }).strict();
const margen = z.number().int().min(1).max(240);

/**
 * Configuración por empresa de los avisos a Slack (ADR-093, decisiones 2 a 4 de Carlos). Es
 * configuración no secreta: vive en `core.integraciones.config`.
 */
export const slackConfigSchema = z
  .object({ canales, avisos, margenAtrasoMin: margen, panico, resumen })
  .strict();
export type SlackConfig = z.infer<typeof slackConfigSchema>;

/** Cambio parcial: solo lo que se manda cambia; lo demás queda como está guardado. */
export const slackConfigParcialSchema = z
  .object({
    canales: canales.partial().optional(),
    avisos: avisos.partial().optional(),
    margenAtrasoMin: margen.optional(),
    panico: panico.partial().optional(),
    resumen: resumen.partial().optional(),
  })
  .strict();
export type SlackConfigParcial = z.infer<typeof slackConfigParcialSchema>;

/**
 * Valores por defecto aprobados por Carlos el 11-nov-2026: «lo mínimo». Nada se envía hasta que la
 * empresa conecte Slack y elija un canal.
 */
export const SLACK_CONFIG_DEFECTO: SlackConfig = {
  canales: { general: null, panico: null, resumen: null },
  avisos: {
    atraso: true,
    ausencia: true,
    fueraDeZona: false,
    sinRelevo: false,
    incidentes: false,
    mensajesGuardias: false,
  },
  margenAtrasoMin: 15,
  panico: {
    alCanal: true,
    mensajeDirectoSupervisor: false,
    escalar: false,
    escalarMinutos: 5,
    escalarAGrupoId: null,
  },
  resumen: { activo: false },
};

/** Aplica un cambio parcial sobre una configuración completa. */
export function fusionarSlackConfig(base: SlackConfig, cambio: SlackConfigParcial): SlackConfig {
  return slackConfigSchema.parse({
    canales: { ...base.canales, ...cambio.canales },
    avisos: { ...base.avisos, ...cambio.avisos },
    margenAtrasoMin: cambio.margenAtrasoMin ?? base.margenAtrasoMin,
    panico: { ...base.panico, ...cambio.panico },
    resumen: { ...base.resumen, ...cambio.resumen },
  });
}

/** Configuración efectiva: la guardada sobre los valores por defecto. Una guardada inválida no rompe: vuelve al defecto. */
export function slackConfigEfectiva(guardada: unknown): SlackConfig {
  const r = slackConfigParcialSchema.safeParse(guardada ?? {});
  return r.success ? fusionarSlackConfig(SLACK_CONFIG_DEFECTO, r.data) : SLACK_CONFIG_DEFECTO;
}
