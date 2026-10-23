import {
  type ClaseTarea,
  geoGoogle,
  type Mailer,
  mailerConsola,
  mailerResend,
  MODELOS_POR_DEFECTO,
  type ProveedorIaId,
  proveedorIa,
  type SolicitudIa,
} from "@opai/integrations";

import { ajuste } from "../core/config/valores";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { credencialDe, integracionDe } from "./resolver";

export const consumoBase = (ctx: Contexto, modulo: string) => ({
  tenantId: ctx.tenantId,
  modulo,
  actorTipo: ctx.actor.tipo,
  actorId: ctx.actor.id ?? null,
  viaUserId: ctx.actor.viaUserId ?? null,
  apiKeyId: ctx.actor.tipo === "agent" ? ctx.actor.id : null,
  portal: ctx.portal,
});

/** Correo del tenant: Resend propio o de plataforma; en desarrollo, consola. Mide cada envío. */
export async function correoDe(
  ctx: Contexto,
  modulo = "core",
): Promise<Mailer & { remitente: string | null }> {
  const cred = await credencialDe(ctx, "resend");
  const fila = await integracionDe(ctx, "resend");
  const config = (fila?.config ?? {}) as { remitente?: string };
  const remitente = config.remitente ?? process.env["EMAIL_FROM"] ?? "OPAI <no-reply@opai.cl>";
  const mailer = cred
    ? mailerResend(cred.valor, remitente)
    : (ctx.servicios.correo ?? mailerConsola());
  return {
    nombre: mailer.nombre,
    remitente: cred ? remitente : null,
    async enviar(c) {
      await mailer.enviar(c);
      const consumo = {
        ...consumoBase(ctx, modulo),
        recurso: "correo.enviado",
        unidad: "correo",
        cantidad: 1,
      };
      await ctx.medidor
        .registrar({ ...consumo, sinCosto: cred?.modalidad === "propia" })
        .catch(() => undefined);
    },
  };
}

/** Geolocalización medida (ADR-027, ADR-031), o null si no hay credencial en este entorno. */
export async function geoDe(ctx: Contexto, modulo = "core") {
  const cred = await credencialDe(ctx, "google_maps");
  if (!cred) return null;
  const geo = geoGoogle(cred.valor);
  const medir = (recurso: string) =>
    ctx.medidor
      .registrar({
        ...consumoBase(ctx, modulo),
        recurso,
        unidad: "consulta",
        cantidad: 1,
        sinCosto: cred.modalidad === "propia",
      })
      .catch(() => undefined);
  return {
    async autocompletar(texto: string, sesion?: string) {
      const r = await geo.autocompletar(texto, sesion);
      await medir("geo.autocompletado");
      return r;
    },
    async detalle(placeId: string, sesion?: string) {
      const r = await geo.detalle(placeId, sesion);
      await medir("geo.geocodificacion");
      return r;
    },
    async geocodificar(direccion: string) {
      const r = await geo.geocodificar(direccion);
      await medir("geo.geocodificacion");
      return r;
    },
    urlMapa: geo.urlMapa,
  };
}

const ORDEN_IA: readonly ProveedorIaId[] = ["ia_anthropic", "ia_openai", "ia_google"];

/** IA por clase de tarea (ADR-031): proveedor propio configurado, si no el de plataforma. */
export async function iaDe(
  ctx: Contexto,
  clase: ClaseTarea,
  modulo = "core",
  solo?: ProveedorIaId,
) {
  for (const id of solo ? [solo] : ORDEN_IA) {
    const cred = await credencialDe(ctx, id);
    if (!cred) continue;
    const fila = await integracionDe(ctx, id);
    const propios = ((fila?.config ?? {}) as { modelos?: Partial<Record<ClaseTarea, string>> })
      .modelos;
    const plataforma = (
      await ajuste<Record<ClaseTarea, { proveedor: string; modelo: string }>>(
        ctx,
        "core",
        "ia_modelos",
      )
    )[clase];
    const modelo =
      propios?.[clase] ??
      (plataforma?.proveedor === id ? plataforma.modelo : undefined) ??
      MODELOS_POR_DEFECTO[id]?.[clase];
    if (!modelo) throw reglaDeNegocio(`Falta el modelo de la clase "${clase}" para ${id}.`);
    const proveedor = proveedorIa(id, cred.valor);
    return {
      proveedor: id,
      modelo,
      async completar(s: SolicitudIa) {
        const r = await proveedor.completar(modelo, s);
        const comun = {
          ...consumoBase(ctx, modulo),
          unidad: "token",
          sinCosto: cred.modalidad === "propia",
        };
        await Promise.all([
          ctx.medidor.registrar({
            ...comun,
            recurso: `ia.${clase}.entrada`,
            cantidad: r.tokensEntrada,
          }),
          ctx.medidor.registrar({
            ...comun,
            recurso: `ia.${clase}.salida`,
            cantidad: r.tokensSalida,
          }),
        ]).catch(() => undefined);
        return r;
      },
    };
  }
  return null;
}
