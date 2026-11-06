import { z } from "zod";

import { BiometriaError, BiometriaNoConfigurada, type Biometria } from "@opai/integrations";
import type { TenantTx } from "@opai/db";

import { reglaDeNegocio } from "../../errores";
import { consumoBase } from "../../integraciones/consumo-base";
import type { Contexto } from "../../types";
import { cifradoDeCampos, cifradoDeCamposTx } from "../cumplimiento/cifrado-campos";

/** Finalidad del consentimiento que habilita el reconocimiento facial (07d, Ley 21.719). */
export const PROPOSITO_BIOMETRIA = "biometria_asistencia";

export const TABLA = "enrolamientos_biometricos";
export const CAMPO = "referencia_cifrada";

/** Muestra de rostro capturada por la cámara. Se envía al proveedor y se descarta: nunca se guarda. */
export const muestraSchema = z
  .string()
  .min(8)
  .max(2_000_000)
  .describe("Muestra del rostro codificada, tal como la entrega la cámara. No se guarda.");

/**
 * Consentimiento vigente de la persona: el último hecho de su finalidad es «otorgado». Ordena por `id`
 * (uuid7 = orden real de creación), como el resto del cumplimiento.
 */
export async function consentimientoVigente(
  db: Pick<Contexto["db"], "consentimiento">,
  personaId: string,
): Promise<{ id: string } | null> {
  const f = await db.consentimiento.findFirst({
    where: { titularTipo: "persona", titularId: personaId, proposito: PROPOSITO_BIOMETRIA },
    orderBy: { id: "desc" },
    select: { id: true, estado: true },
  });
  return f && f.estado === "otorgado" ? { id: f.id } : null;
}

export const sinConsentimiento = () =>
  reglaDeNegocio(
    "La persona no ha dado su consentimiento para el reconocimiento facial. Regístralo en Cumplimiento antes de enrolarla.",
  );

/** Convierte las fallas esperables del proveedor en errores de negocio con mensaje claro. */
export async function conProveedor<T>(llamada: () => Promise<T>): Promise<T> {
  try {
    return await llamada();
  } catch (e) {
    if (e instanceof BiometriaError || e instanceof BiometriaNoConfigurada)
      throw reglaDeNegocio(e.message);
    throw e;
  }
}

/** Mide la operación (ADR-031). El proveedor simulado se mide pero no se cobra. */
export function medir(ctx: Contexto, recurso: string, proveedor: Biometria["nombre"]) {
  return ctx.medidor
    .registrar({
      ...consumoBase(ctx, "core"),
      recurso,
      unidad: "operacion",
      cantidad: 1,
      sinCosto: proveedor === "simulado",
      yaIncurrido: true,
    })
    .catch(() => undefined);
}

export const cifrarReferencia = (ctx: Contexto, tx: TenantTx, referencia: string) =>
  cifradoDeCamposTx(ctx, tx).cifrar(TABLA, CAMPO, referencia);

export const descifrarReferencia = (ctx: Contexto, guardado: string) =>
  cifradoDeCampos(ctx).descifrar(TABLA, CAMPO, guardado);
