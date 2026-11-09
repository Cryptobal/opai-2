import { z } from "zod";

import { BiometriaError, ErrorProveedorBiometria } from "@opai/integrations";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import type { Contexto } from "../../types";
import { ajuste } from "../config";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { biometriaDe } from "../../integraciones/biometria";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "../maestros/alcance";
import {
  consentimientoVigente,
  descifrarReferencia,
  medir,
  muestraSchema,
  sinConsentimiento,
} from "./comun";

/** Similitud mínima (0–100) por defecto; la fija la plataforma (`biometria_umbral_similitud`, T-03). */
const PUNTAJE_MINIMO = 90;

/** Umbral de la plataforma; un valor ausente o fuera de rango cae al defecto en vez de abrir o cerrar todo. */
export async function umbralDePlataforma(ctx: Contexto): Promise<number> {
  const v = await ajuste<number>(ctx, "core", "biometria_umbral_similitud").catch(() => PUNTAJE_MINIMO);
  return typeof v === "number" && v >= 70 && v <= 99.9 ? v : PUNTAJE_MINIMO;
}

export const biometriaVerificar = defineCapability({
  id: "core.biometria.verificar",
  descripcion:
    "Verifica 1:1 que la muestra del rostro corresponde a la persona enrolada y que es una persona presente (prueba de vida). Exige su consentimiento vigente. Devuelve el resultado, nunca datos biométricos.",
  permiso: PERMISOS_CORE.personasRead,
  // La muestra es una imagen del rostro: no pasa por agentes ni por el MCP.
  soloPersonas: true,
  sensibles: ["muestra"],
  input: z.object({ personaId: uuidSchema, muestra: muestraSchema }),
  output: z.object({
    personaId: z.string(),
    verificado: z.boolean(),
    coincide: z.boolean(),
    vivo: z.boolean(),
    puntaje: z.number(),
    proveedor: z.string(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => [salida.personaId],
  handler: (ctx, { personaId, muestra }) => verificarRostro(ctx, personaId, muestra),
});

export type ResultadoRostro =
  | { tipo: "sin_enrolamiento" }
  | { tipo: "no_disponible" }
  | { tipo: "proveedor_caido" }
  | { tipo: "muestra_invalida" }
  | { tipo: "resultado"; verificado: boolean; coincide: boolean; vivo: boolean; puntaje: number; proveedor: string };

/**
 * Verificación 1:1 con prueba de vida de una persona ya autorizada por quien llama (la propia persona o un
 * equipo con su PIN). Devuelve un resultado etiquetado —sin consentimiento, sin rostro, proveedor caído— para que
 * el llamador caiga a RUT + PIN con el motivo correcto. Nunca devuelve datos biométricos.
 */
export async function evaluarRostro(ctx: Contexto, personaId: string, muestra: string): Promise<ResultadoRostro> {
  const consentimiento = await consentimientoVigente(ctx.db, personaId);
  const fila = consentimiento ? await ctx.db.enrolamientoBiometrico.findUnique({ where: { personaId } }) : null;
  if (!consentimiento || !fila || fila.consentimientoId !== consentimiento.id) return { tipo: "sin_enrolamiento" };
  const prov = await biometriaDe(ctx);
  if (!prov || prov.b.nombre !== fila.proveedor) return { tipo: "no_disponible" };
  const referencia = await descifrarReferencia(ctx, fila.referenciaCifrada);
  try {
    const r = await prov.b.verificar({ referencia, muestra, coleccion: prov.coleccion });
    await medir(ctx, "biometria.verificar", r.proveedor);
    return {
      tipo: "resultado",
      verificado: r.coincide && r.vivo && r.puntaje >= (await umbralDePlataforma(ctx)),
      coincide: r.coincide,
      vivo: r.vivo,
      puntaje: r.puntaje,
      proveedor: r.proveedor,
    };
  } catch (e) {
    if (e instanceof BiometriaError) return { tipo: e.motivo === "muestra_invalida" ? "muestra_invalida" : "sin_enrolamiento" };
    if (e instanceof ErrorProveedorBiometria) return { tipo: "proveedor_caido" };
    throw e;
  }
}

/** Verificación para una capacidad con permiso: lanza errores de negocio claros en vez de resultados etiquetados. */
export async function verificarRostro(ctx: Contexto, personaId: string, muestra: string) {
  const persona = await ctx.db.persona.findFirst({
    where: { id: personaId, ...dondePersona(ctx), archivadaEn: null, anonimizadaEn: null },
    select: { id: true },
  });
  if (!persona) throw noEncontrado("La persona");
  const consentimiento = await consentimientoVigente(ctx.db, personaId);
  if (!consentimiento) throw sinConsentimiento();
  const enrolado = await ctx.db.enrolamientoBiometrico.findUnique({ where: { personaId } });
  if (!enrolado) throw reglaDeNegocio("La persona no tiene su rostro enrolado. Marca con RUT y PIN.");
  if (enrolado.consentimientoId !== consentimiento.id)
    throw reglaDeNegocio("El consentimiento cambió desde que se enroló el rostro: enrólalo de nuevo.");
  const r = await evaluarRostro(ctx, personaId, muestra);
  if (r.tipo !== "resultado")
    throw reglaDeNegocio(
      r.tipo === "muestra_invalida"
        ? "La muestra no se pudo leer."
        : r.tipo === "proveedor_caido"
          ? "El reconocimiento facial no respondió. Marca con RUT y PIN."
          : "El rostro no se puede verificar ahora: vuelve a enrolarlo o marca con RUT y PIN.",
    );
  return { personaId, verificado: r.verificado, coincide: r.coincide, vivo: r.vivo, puntaje: r.puntaje, proveedor: r.proveedor };
}
