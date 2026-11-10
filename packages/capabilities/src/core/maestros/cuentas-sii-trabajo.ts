// Consulta al SII en cola (CAR-156): lo que no es una acción explícita de la persona (alta por API o
// MCP, importador) no llama al proveedor en línea; encola un trabajo por RUT y día que llena la caché.
import { z } from "zod";

import { cacheSiiVigente, claveConsultaSii, normalizarRut } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { cacheSiiEnBloque, guardarCacheSii } from "./cuentas-sii-cache";
import { consultarProveedor, contribuyenteConfigurado } from "./cuentas-sii-fuente";

export const TIPO_TRABAJO_SII = "core.sii.consultar_contribuyente";

/**
 * Si hay proveedor de consulta (key de SimpleAPI RUT cargada o fuente de prueba), sin descifrar la key.
 * Corre dentro de la transacción de quien llama: no atrapa errores de base (abortarían la transacción
 * igual); un error de base hace fallar el alta o el importador como cualquier otra lectura.
 */
export const siiDisponible = (ctx: Contexto) => contribuyenteConfigurado(ctx);

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

/** Borra cada día las respuestas del SII vencidas de la empresa (retención, Ley 21.719). */
export const trabajoPurgarCacheSii = defineTrabajo({
  tipo: "core.sii.purgar_cache",
  descripcion: "Borra las respuestas del SII guardadas que ya vencieron (caché de consulta por RUT).",
  payload: z.object({ dia: z.string() }),
  periodicidad: "diaria",
  async handler(ctx) {
    const r = await ctx.db.siiContribuyente.deleteMany({ where: { venceEn: { lte: new Date() } } });
    return { borradas: r.count };
  },
});
