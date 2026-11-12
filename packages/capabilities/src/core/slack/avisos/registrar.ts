// Slack F3 (CAR-293, ADR-093): registro de un aviso de terreno. Solo si Slack está conectado, la empresa
// activó ese tipo de aviso y hay a dónde mandarlo. Si no, no se guarda nada ni se encola nada: con la
// configuración por defecto el volumen es el mínimo y sin Slack OPAI no cambia.
import { slackConfigEfectiva, type SlackConfig } from "@opai/integrations";

import type { Contexto } from "../../../types";
import { filaIntegracionSlack, instalacionSlack } from "../comun";

export const TIPOS_AVISO = [
  "atraso",
  "ausencia",
  "fuera_de_zona",
  "sin_relevo",
  "incidente",
  "panico",
  "mensaje_guardia",
] as const;
export type TipoAviso = (typeof TIPOS_AVISO)[number];

export const TIPO_ENVIAR_AVISO = "core.slack.aviso_enviar";
export const TIPO_ESCALAR_PANICO = "core.slack.panico_escalar";

export type AvisoNuevo = {
  tipo: TipoAviso;
  /** Única por empresa: el mismo hecho nunca genera dos avisos (reintentos del despacho). */
  clave: string;
  instalacionId: string | null;
  personaId: string | null;
  titulo: string;
  detalle?: string | null;
  /** Ruta de OPAI (relativa) del botón «Ver en OPAI». */
  enlace?: string | null;
};

/** ¿La empresa activó este tipo de aviso? (decisiones 2 a 4 de Carlos, 11-nov-2026). */
export function avisoActivo(c: SlackConfig, tipo: TipoAviso): boolean {
  switch (tipo) {
    case "atraso":
      return c.avisos.atraso;
    case "ausencia":
      return c.avisos.ausencia;
    case "fuera_de_zona":
      return c.avisos.fueraDeZona;
    case "sin_relevo":
      return c.avisos.sinRelevo;
    case "incidente":
      return c.avisos.incidentes;
    case "mensaje_guardia":
      return c.avisos.mensajesGuardias;
    case "panico":
      return c.panico.alCanal || c.panico.mensajeDirectoSupervisor || c.panico.escalar;
  }
}

/** Canal del aviso: el pánico y su canal propio (o el general); lo demás, el general. */
export function canalDeAviso(c: SlackConfig, tipo: TipoAviso): string | null {
  if (tipo === "panico")
    return c.panico.alCanal ? ((c.canales.panico ?? c.canales.general)?.id ?? null) : null;
  return c.canales.general?.id ?? null;
}

/** Configuración de Slack vigente si la empresa está conectada; si no, null. */
export async function configSiConectada(ctx: Contexto): Promise<SlackConfig | null> {
  const [inst, fila] = await Promise.all([instalacionSlack(ctx), filaIntegracionSlack(ctx)]);
  return inst ? slackConfigEfectiva(fila?.config) : null;
}

/**
 * Registra el aviso y encola su envío (una transacción). Devuelve el id, o null si no corresponde
 * avisar o si ya estaba registrado.
 */
export async function registrarAvisoSlack(ctx: Contexto, a: AvisoNuevo): Promise<string | null> {
  const c = await configSiConectada(ctx);
  if (!c || !avisoActivo(c, a.tipo)) return null;
  const canal = canalDeAviso(c, a.tipo);
  // Sin canal elegido solo el pánico sigue (mensaje directo o escalamiento).
  if (!canal && a.tipo !== "panico") return null;
  return ctx.transaccion(async (tx) => {
    const r = await tx.slackAviso.createMany({
      data: [
        {
          tenantId: ctx.tenantId,
          tipo: a.tipo,
          clave: a.clave.slice(0, 200),
          instalacionId: a.instalacionId,
          personaId: a.personaId,
          titulo: a.titulo.slice(0, 300),
          detalle: a.detalle?.slice(0, 2000) ?? null,
          enlace: a.enlace ?? null,
          canalId: canal,
          envio: "pendiente",
          gestion: "abierto",
        },
      ],
      skipDuplicates: true,
    });
    if (r.count === 0) return null;
    const fila = await tx.slackAviso.findFirst({
      where: { clave: a.clave.slice(0, 200) },
      select: { id: true },
    });
    if (!fila) return null;
    await ctx.trabajos.encolar(tx, {
      tipo: TIPO_ENVIAR_AVISO,
      payload: { avisoId: fila.id },
      claveUnica: `slack-aviso:${fila.id}`,
      maxIntentos: 5,
    });
    if (a.tipo === "panico" && c.panico.escalar && c.panico.escalarAGrupoId)
      await ctx.trabajos.encolar(tx, {
        tipo: TIPO_ESCALAR_PANICO,
        payload: { avisoId: fila.id },
        claveUnica: `slack-panico-escalar:${fila.id}`,
        programadoPara: new Date(Date.now() + c.panico.escalarMinutos * 60_000),
        maxIntentos: 4,
      });
    return fila.id;
  });
}
