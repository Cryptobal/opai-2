// CAR-352: piezas comunes de los destinos de eventos salientes (referente: Stripe).
import { randomBytes } from "node:crypto";

import { z } from "zod";

import { cifrar, descifrar } from "@opai/integrations";
import { normalizarUrlWebhook, problemaUrlWebhook } from "@opai/domain";

import type { TenantTx } from "@opai/db";

import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { eventoDeclarado } from "../../eventos/catalogo";
import { dekDe } from "../../integraciones/secretos";
import type { Contexto } from "../../types";

/** Tope de destinos por empresa, como en Stripe: suficientes para integraciones reales. */
export const MAX_DESTINOS = 16;

export const urlSchema = z
  .string()
  .trim()
  .max(2048)
  .describe("Dirección https pública que recibe los eventos (POST con JSON firmado).");
export const eventosSchema = z
  .array(z.string().min(1).max(120))
  .min(1)
  .max(200)
  .describe("Ids del catálogo de eventos a enviar (por ejemplo core.cuenta.creada).");
export const descripcionSchema = z.string().trim().max(200).optional();

export const destinoSchema = z.object({
  id: z.string(),
  url: z.string(),
  descripcion: z.string().nullable(),
  eventos: z.array(z.string()),
  activo: z.boolean(),
  /** Últimos caracteres del secreto de firma, para reconocerlo sin revelarlo. */
  secretoSufijo: z.string(),
  secretoRotadoEn: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DestinoFila = {
  id: string;
  url: string;
  descripcion: string | null;
  eventos: string[];
  activo: boolean;
  secretoSufijo: string;
  secretoRotadoEn: Date;
  createdAt: Date;
  updatedAt: Date;
};

/** Columnas que se leen siempre: el secreto cifrado nunca sale de este módulo. */
export const SELECT_DESTINO = {
  id: true,
  url: true,
  descripcion: true,
  eventos: true,
  activo: true,
  secretoSufijo: true,
  secretoRotadoEn: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const vistaDestino = (d: DestinoFila) => ({ ...d });

/**
 * Los destinos reciben eventos de toda la empresa: quien tiene alcance acotado a filas (supervisor,
 * cliente) no los administra, aunque un rol personalizado le dé el permiso.
 */
export function exigeSinAlcance(ctx: Contexto): void {
  if (ctx.alcance) throw prohibido("Los destinos de eventos son de toda la empresa.");
}

/** Valida la dirección y devuelve su forma canónica, que es la que se guarda. */
export function urlValida(url: string): string {
  const problema = problemaUrlWebhook(url.trim());
  if (problema) throw reglaDeNegocio(problema);
  return normalizarUrlWebhook(url);
}

/** Sin repetidos y solo eventos del catálogo (núcleo y módulos). */
export function eventosValidos(eventos: readonly string[]): string[] {
  const unicos = [...new Set(eventos)];
  const desconocidos = unicos.filter((e) => !eventoDeclarado(e));
  if (desconocidos.length) {
    throw reglaDeNegocio(`Eventos que no están en el catálogo: ${desconocidos.join(", ")}.`);
  }
  return unicos.sort();
}

export async function destinoDe(ctx: Contexto, id: string): Promise<DestinoFila> {
  const d = await ctx.db.webhookDestino.findUnique({ where: { id }, select: SELECT_DESTINO });
  if (!d) throw noEncontrado("El destino de eventos");
  return d;
}

/** Secreto con prefijo reconocible (como `whsec_` de Stripe) y 32 bytes aleatorios. */
export const generarSecreto = () => `whsec_${randomBytes(32).toString("base64url")}`;

const AAD = (tenantId: string) => Buffer.from(`${tenantId}:core.webhook_destinos.secreto`);

/** Cifra el secreto con la DEK del tenant (envelope, ADR-027), dentro de la transacción abierta. */
export async function cifrarSecreto(ctx: Contexto, tx: TenantTx, secreto: string) {
  await tx.$queryRaw`/* 07d:bloqueo-dek */ SELECT id FROM core.claves_tenant WHERE tenant_id = ${ctx.tenantId}::uuid FOR SHARE`;
  const c = cifrar(
    await dekDe({ ...ctx, db: tx }),
    Buffer.from(secreto, "utf8"),
    AAD(ctx.tenantId),
  );
  return {
    secretoCifrado: Uint8Array.from(c.cifrado),
    secretoIv: Uint8Array.from(c.iv),
    secretoTag: Uint8Array.from(c.tag),
    secretoSufijo: secreto.slice(-4),
    secretoRotadoEn: new Date(),
  };
}

/** Solo para el envío en el servidor (CAR-352, parte 2). Nunca se devuelve por capacidad. */
export async function descifrarSecreto(
  ctx: Contexto,
  d: { secretoCifrado: Uint8Array; secretoIv: Uint8Array; secretoTag: Uint8Array },
): Promise<string> {
  const claro = descifrar(
    await dekDe(ctx),
    { cifrado: d.secretoCifrado, iv: d.secretoIv, tag: d.secretoTag },
    AAD(ctx.tenantId),
  );
  return claro.toString("utf8");
}
