// Consulta al SII en lote del importador de 1.0 (CAR-156). Simular solo lee la caché (no escribe ni
// llama al proveedor); aplicar encola la consulta de los RUT sin caché vigente. Nunca escribe datos del
// SII en las cuentas (eso es `core.cuentas.aplicar_sii`) ni inventa datos: si el SII no está
// configurado lo reporta y el importador sigue igual. Solo lee la caché y la integración (nunca llama
// al proveedor), así que un SII caído no la afecta.
import { z } from "zod";

import { compararConSii, normalizarRut } from "@opai/domain";
import type { Plan } from "@opai/db/importar-opai1";

import { cacheSiiEnBloque } from "../core/maestros/cuentas-sii-cache";
import { valoresSii } from "../core/maestros/cuentas-sii-fuente";
import { encolarConsultaSii, siiDisponible } from "../core/maestros/cuentas-sii-trabajo";
import type { Contexto } from "../types";

/** Tope de consultas que encola una corrida (el resto queda para «Consultar SII» en cada ficha). */
export const MAX_ENCOLAR_SII = 500;
const APLICA = new Set(["crear", "actualizar", "sin_cambios"]);

export const resumenSiiSchema = z.object({
  /** disponible: hay key de SimpleAPI RUT; error: no se pudo leer la caché (el import sigue igual). */
  estado: z.enum(["disponible", "no_configurado", "error"]),
  cuentasConRut: z.number().int(),
  /** Con respuesta vigente del SII guardada. */
  enCache: z.number().int(),
  /** En caché y el SII trae al menos un dato tributario que la cuenta no tiene (se ofrece, no se aplica). */
  completables: z.number().int(),
  /** Sin respuesta vigente: se consultan en segundo plano al aplicar. */
  porConsultar: z.number().int(),
  /** Consultas encoladas en esta corrida (solo al aplicar de verdad). */
  encoladas: z.number().int(),
});
export type ResumenSii = z.infer<typeof resumenSiiSchema>;

function cuentasConRut(plan: Pick<Plan, "cuentas">) {
  const out = new Map<string, Plan["cuentas"][number]>();
  for (const d of plan.cuentas) {
    if (!APLICA.has(d.accion) || d.fusionaCon || !d.datos?.rut) continue;
    const rut = normalizarRut(d.datos.rut);
    if (rut && !out.has(rut)) out.set(rut, d);
  }
  return out;
}

export async function resumenSiiDelPlan(
  ctx: Contexto,
  plan: Pick<Plan, "cuentas">,
  { encolar }: { encolar: boolean },
): Promise<ResumenSii> {
  const porRut = cuentasConRut(plan);
  const vacio = { cuentasConRut: porRut.size, enCache: 0, completables: 0, encoladas: 0 };
  try {
    const cache = await cacheSiiEnBloque(ctx, [...porRut.keys()]);
    let completables = 0;
    for (const [rut, r] of cache) {
      const datos = porRut.get(rut)?.datos;
      if (!datos || !("datos" in r)) continue;
      const campos = compararConSii(datos, valoresSii(r.datos));
      if (campos.some((c) => c.estado === "vacio_ficha")) completables += 1;
    }
    const faltan = [...porRut.keys()].filter((rut) => !cache.has(rut));
    const disponible = await siiDisponible(ctx);
    let encoladas = 0;
    if (encolar && disponible && faltan.length) {
      const lote = faltan.slice(0, MAX_ENCOLAR_SII);
      await ctx.transaccion(async (tx) => {
        for (const rut of lote) {
          if (await encolarConsultaSii(ctx, tx, rut)) encoladas += 1;
        }
      });
    }
    return {
      ...vacio,
      estado: disponible ? "disponible" : "no_configurado",
      enCache: cache.size,
      completables,
      porConsultar: faltan.length,
      encoladas,
    };
  } catch {
    // El lote del SII es un extra: un error fuera de la base no tumba el importador ni inventa datos.
    // (Un error de base dentro de la transacción del handler la aborta igual; aquí solo hay lecturas
    // simples de la caché y la inserción en la cola.)
    return { ...vacio, estado: "error", porConsultar: porRut.size };
  }
}
