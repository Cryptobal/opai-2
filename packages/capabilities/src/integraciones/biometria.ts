import {
  type Biometria,
  biometriaDelEntorno,
  biometriaRekognition,
  biometriaSimuladaCompartida,
  coleccionDe,
  entornoAdmiteBiometriaSimulada,
} from "@opai/integrations";

import { ajuste } from "../core/config";
import type { Contexto } from "../types";
import { integracionDe } from "./resolver";
import { leerSecreto } from "./secretos";

export type BiometriaDeEmpresa = {
  b: Biometria;
  /** Colección de esta empresa: una por empresa, nunca compartida (D-05). */
  coleccion: string;
  /** Credenciales propias de la empresa (BYOK): se mide pero no se cobra. */
  propio: boolean;
};

/**
 * Biometría de la empresa (ADR-027, ADR-079): su proveedor y sus credenciales salen de la integración
 * «biometria» y del almacén cifrado, nunca de variables de entorno. El simulado solo existe en pruebas y
 * desarrollo o en una empresa de prueba (slug `qa-…`). Un proveedor real en una empresa que no es de prueba
 * exige además el ajuste de plataforma `biometria_empresas_reales` (Ley 21.719): sin él, falla cerrado (null).
 */
export async function biometriaDe(ctx: Contexto): Promise<BiometriaDeEmpresa | null> {
  const coleccion = coleccionDe(ctx.tenantId);
  const fila = await integracionDe(ctx, "biometria");
  const proveedor = (fila?.config as { proveedor?: string } | null)?.proveedor ?? "simulado";
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } });
  const esPrueba = !!t?.slug.startsWith("qa-");
  if (proveedor === "simulado") {
    if (esPrueba) return { b: biometriaSimuladaCompartida(), coleccion, propio: false };
    return entornoAdmiteBiometriaSimulada(process.env)
      ? { b: biometriaDelEntorno(), coleccion, propio: false }
      : null;
  }
  if (proveedor !== "rekognition" || !fila) return null;
  if (!esPrueba && !(await ajuste<boolean>(ctx, "core", "biometria_empresas_reales"))) return null;
  const [accessKeyId, secretAccessKey, region] = await Promise.all(
    ["access_key_id", "secret_access_key", "region"].map((n) => leerSecreto(ctx, fila.id, n)),
  );
  if (!accessKeyId || !secretAccessKey || !region) return null;
  return { b: biometriaRekognition({ accessKeyId, secretAccessKey, region }), coleccion, propio: true };
}
