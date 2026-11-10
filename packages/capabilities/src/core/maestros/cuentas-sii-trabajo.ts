// Consulta al SII en cola (CAR-156): lo que no es una acción explícita de la persona (alta por API o
// MCP, importador) no llama al proveedor en línea; encola un trabajo por RUT y día que llena la caché.
import { z } from "zod";

import { cacheSiiVigente, claveConsultaSii, normalizarRut } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { cacheSiiEnBloque, guardarCacheSii } from "./cuentas-sii-cache";
import { consultarProveedor, fuenteContribuyente } from "./cuentas-sii-fuente";

export const TIPO_TRABAJO_SII = "core.sii.consultar_contribuyente";

/**
 * Si hay proveedor de consulta (key de SimpleAPI RUT cargada o fuente de prueba). Un fallo al leer la
 * credencial cuenta como «no configurado»: el alta y el importador no se caen por el SII.
 */
export async function siiDisponible(ctx: Contexto): Promise<boolean> {
  try {
    return (await fuenteContribuyente(ctx)).disponible;
  } catch {
    return false;
  }
}

/**
 * Encola (en `tx`) la consulta de un RUT: a lo más una por RUT y día. No llama al proveedor. Devuelve
 * false si ya estaba encolada hoy. Quien llama decide si hace falta (sin caché vigente y con proveedor).
 */
export function encolarConsultaSii(
  ctx: Contexto,
  tx: TenantTx,
  rut: string,
  ahora = new Date(),
): Promise<boolean> {
  return ctx.trabajos.encolar(tx, {
    tipo: TIPO_TRABAJO_SII,
    payload: { rut },
    claveUnica: claveConsultaSii(rut, ahora),
    maxIntentos: 3,
  });
}

export const trabajoConsultarContribuyenteSii = defineTrabajo({
  tipo: TIPO_TRABAJO_SII,
  descripcion:
    "Consulta al SII los datos tributarios de un RUT y los guarda en la caché de la empresa; no cambia ninguna cuenta.",
  payload: z.object({ rut: z.string().min(3).max(12) }),
  async handler(ctx, { rut: crudo }) {
    const rut = normalizarRut(crudo);
    if (!rut) return { omitido: "rut_invalido" };
    const fila = await ctx.db.siiContribuyente.findFirst({ where: { rut } });
    if (fila && cacheSiiVigente(fila.venceEn, new Date())) return { omitido: "en_cache" };
    const r = await consultarProveedor(ctx, rut);
    // Sin respuesta: se lanza para que el runner reintente con espera (hasta 3 intentos).
    if (r.estado === "sin_respuesta") throw new Error("El SII no respondió; se reintenta.");
    if (r.estado === "no_configurado") return { omitido: "no_configurado" };
    await guardarCacheSii(ctx, rut, r);
    return { estado: r.estado };
  },
});

/** Qué pasa con el SII al crear una cuenta (salida de `core.cuentas.create`). */
export const SII_AL_CREAR = ["sin_rut", "en_cache", "en_cola", "no_configurado"] as const;
export type SiiAlCrear = (typeof SII_AL_CREAR)[number];

/**
 * Al crear una cuenta con RUT (CAR-156): dice si hay datos del SII que ofrecer y deja lista la función
 * que encola la consulta en la transacción del alta. No llama al proveedor ni toca la ficha.
 */
export async function prepararSiiAlCrear(ctx: Contexto, rut: string | null | undefined) {
  const nada = { sii: "sin_rut" as SiiAlCrear, encolar: async (_tx: TenantTx) => false };
  if (!rut) return nada;
  if ((await cacheSiiEnBloque(ctx, [rut])).has(rut)) return { ...nada, sii: "en_cache" as const };
  if (!(await siiDisponible(ctx))) return { ...nada, sii: "no_configurado" as const };
  return { sii: "en_cola" as const, encolar: (tx: TenantTx) => encolarConsultaSii(ctx, tx, rut) };
}
