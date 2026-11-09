import { z } from "zod";

import {
  type Biometria,
  BiometriaError,
  ErrorProveedorBiometria,
  BiometriaNoConfigurada,
} from "@opai/integrations";
import type { TenantTx } from "@opai/db";

import { reglaDeNegocio } from "../../errores";
import { biometriaDe, type BiometriaDeEmpresa } from "../../integraciones/biometria";
import { consumoBase } from "../../integraciones/consumo-base";
import type { Contexto } from "../../types";
import { cifradoDeCampos, cifradoDeCamposTx } from "../cumplimiento/cifrado-campos";

/** Finalidad del consentimiento que habilita el reconocimiento facial (07d, Ley 21.719). */
export const PROPOSITO_BIOMETRIA = "biometria_asistencia";

/** Lo emite la anonimización de una persona que tiene su rostro enrolado (retención o pedido del titular). */
export const EVENTO_ANONIMIZACION = "core.biometria.anonimizacion_pendiente";

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
    if (e instanceof BiometriaError || e instanceof BiometriaNoConfigurada || e instanceof ErrorProveedorBiometria)
      throw reglaDeNegocio(
        e instanceof ErrorProveedorBiometria && e.codigo === "proveedor"
          ? "El reconocimiento facial no respondió. Marca con RUT y PIN."
          : e.message,
      );
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

/**
 * Bloquea la fila de la persona (`FOR UPDATE`) dentro de la transacción. Enrolar, borrar, revocar y
 * anonimizar toman el mismo bloqueo, así que se serializan: o el enrolamiento queda confirmado antes de que
 * el borrado lo busque, o el borrado/la revocación ya están confirmados cuando el enrolamiento revalida.
 */
export async function bloquearPersona(tx: TenantTx, personaId: string): Promise<void> {
  await tx.$queryRaw`/* 07d:bloqueo-biometria */ SELECT id FROM core.personas WHERE id = ${personaId}::uuid FOR UPDATE`;
}

/** Adaptador del proveedor con que se enroló. Si la empresa usa otro, no se manda la referencia al equivocado. */
export async function proveedorDe(ctx: Contexto, nombre: string): Promise<BiometriaDeEmpresa> {
  const r = await biometriaDe(ctx);
  if (!r)
    throw reglaDeNegocio(
      "El reconocimiento facial no está disponible en esta empresa: falta proveedor o autorización.",
    );
  if (r.b.nombre !== nombre)
    throw reglaDeNegocio(
      `El rostro se enroló con el proveedor «${nombre}» y esta empresa usa «${r.b.nombre}»; no se puede operar hasta alinearlos.`,
    );
  return r;
}
