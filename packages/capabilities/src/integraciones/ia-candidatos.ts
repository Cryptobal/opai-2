// Resolución de los candidatos de IA del tenant (ADR-031, ADR-049) y política BYOK (t214s684).
import { type ClaseTarea, MODELOS_POR_DEFECTO, type ProveedorIaId } from "@opai/integrations";

import { ajuste } from "../core/config/valores";
import type { Contexto } from "../types";
import type { Candidato } from "./ia-respaldo";
import { credencialDe, integracionDe } from "./resolver";

const ORDEN_IA: readonly ProveedorIaId[] = [
  "ia_anthropic",
  "ia_openai",
  "ia_google",
  "ia_xai",
  "ia_compatible",
];

type ConfigIa = { modelos?: Partial<Record<ClaseTarea, string>>; baseUrl?: string };

/** Proveedor propio configurado por el tenant que no se puede usar, con el motivo (para avisar). */
export type PropiaInutil = { id: ProveedorIaId; razon: string };

export type Candidatos = {
  cands: Candidato[];
  /** La cadena quedó restringida a keys propias (BYOK): nunca se cae a OPAI. */
  soloPropias: boolean;
  /** Proveedores propios configurados pero inservibles (sin modelo, sin secreto o sin base URL). */
  propiasInutiles: PropiaInutil[];
};

/**
 * Proveedores de IA conectados por el tenant, en orden de preferencia, con modelo resuelto.
 *
 * Política BYOK (Carlos, 26-oct-2026 21:58 CLT, t214s684): se decide si el tenant tiene key propia
 * ANTES de descartar candidatos por modelo o secreto. Si la tiene, la cadena solo usa keys propias
 * y nunca cae a OPAI, aunque ninguna propia sirva (entonces `cands` queda vacío y se avisa arriba).
 * No aplica al probar un proveedor concreto (`solo`).
 */
export async function candidatosIa(
  ctx: Contexto,
  clase: ClaseTarea,
  solo?: ProveedorIaId,
): Promise<Candidatos> {
  const plataforma = (
    await ajuste<Record<ClaseTarea, { proveedor: string; modelo: string }>>(ctx, "core", "ia_modelos")
  )[clase];
  const out: Candidato[] = [];
  const propiasInutiles: PropiaInutil[] = [];
  let tieneKeyPropia = false;
  for (const id of solo ? [solo] : ORDEN_IA) {
    const fila = await integracionDe(ctx, id);
    const esPropia = fila?.modalidad === "propia";
    if (esPropia) tieneKeyPropia = true;
    const config = (fila?.config ?? {}) as ConfigIa;
    const modelo =
      config.modelos?.[clase] ??
      (plataforma?.proveedor === id ? plataforma.modelo : undefined) ??
      MODELOS_POR_DEFECTO[id]?.[clase];
    const cred = await credencialDe(ctx, id);
    const anota = (razon: string) => {
      if (esPropia) propiasInutiles.push({ id, razon });
    };
    if (!cred) {
      anota("sin credencial guardada");
      continue;
    }
    if (!modelo) {
      anota(`sin modelo para la clase ${clase}`);
      continue;
    }
    if (id === "ia_compatible" && !config.baseUrl) {
      anota("sin base URL configurada");
      continue;
    }
    out.push({ id, modelo, cred, ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}) });
  }
  const soloPropias = !solo && tieneKeyPropia;
  const cands = soloPropias ? out.filter((c) => c.cred.modalidad === "propia") : out;
  return { cands, soloPropias, propiasInutiles };
}
