import { reglaDeNegocio, type Contexto } from "@opai/capabilities";

import {
  contratoCamposDeEnvio,
  textosConTokens,
  validarTextosPropuesta,
} from "../domain/documento/propuesta-campos";
import type { ContratoCamposEnvio, DestinatarioEnvio } from "../domain/documento/propuesta-tecnica";
import { textosBiblioteca } from "./pdf-propuesta-biblioteca";
import { resolverCamposPropuesta } from "./valores-campos-propuesta";

/** Faltante del render cuando el texto repite `referencias` y no hay ninguna autorizada (CAR-138 PR 7). */
const SIN_REFERENCIAS = "colecciones.referencias";

/** Cuenta del negocio de la cotización, de donde salen los campos del cliente. */
export async function cuentaDeCotizacion(ctx: Contexto, cotizacionId: string): Promise<string | null> {
  const cot = await ctx.db.cpqCotizacion.findFirst({ where: { id: cotizacionId }, select: { negocioId: true } });
  const neg = cot ? await ctx.db.negocio.findFirst({ where: { id: cot.negocioId }, select: { cuentaId: true } }) : null;
  return neg?.cuentaId ?? null;
}

/**
 * Valida los tokens de la propuesta contra el catálogo único (finalidad «propuesta»), resuelve sus
 * valores con el contexto autorizado del actor y devuelve el contrato a congelar. Sin tokens no hace
 * nada. Rechaza tokens inválidos o con datos faltantes: un envío nunca sale con campos vacíos.
 */
export async function contratoCamposPropuesta(
  ctx: Contexto,
  input: {
    cotizacionId: string;
    propuestaBloquesJson: string;
    bloquesBiblioteca: Readonly<Record<string, number>>;
    destinatarios: readonly DestinatarioEnvio[];
    plantillaHtml?: string;
  },
): Promise<ContratoCamposEnvio | undefined> {
  const textos = [
    ...textosConTokens(
      input.propuestaBloquesJson,
      await textosBiblioteca(ctx, input.propuestaBloquesJson, input.bloquesBiblioteca),
    ),
    ...(input.plantillaHtml ? [input.plantillaHtml] : []),
  ];
  const v = validarTextosPropuesta(textos);
  if (v.problemas.length > 0) {
    const detalle = v.problemas
      .slice(0, 5)
      .map((p) => p.mensaje)
      .join(" ");
    throw reglaDeNegocio(`La propuesta tiene campos que no se pueden usar: ${detalle}`);
  }
  if (v.usados.length === 0 && v.colecciones.length === 0) return undefined;

  const cuentaId = await cuentaDeCotizacion(ctx, input.cotizacionId);
  if (!cuentaId) {
    throw reglaDeNegocio(
      "La propuesta usa campos del cliente, pero el negocio no tiene cuenta asociada.",
    );
  }
  const contactoId = input.destinatarios.find((d) => d.contactoId)?.contactoId;
  const r = await resolverCamposPropuesta(ctx, {
    finalidad: "propuesta",
    cuentaId,
    contactoId,
    cotizacionId: input.cotizacionId,
    enviada: true,
    referencias: v.colecciones.includes("referencias"),
  });
  const contrato = contratoCamposDeEnvio(textos, v.usados, v.colecciones, {
    campos: r.campos,
    colecciones: r.colecciones,
  });
  if (contrato.faltantes.includes(SIN_REFERENCIAS)) {
    throw reglaDeNegocio(
      "La propuesta muestra clientes de referencia, pero ningún cliente activo tiene un consentimiento vigente para serlo. Registra el consentimiento o quita esa sección.",
    );
  }
  if (contrato.faltantes.length > 0) {
    throw reglaDeNegocio(
      `Faltan datos para completar la propuesta: ${contrato.faltantes.join(", ")}. Complétalos en el cliente o quita esos campos.`,
    );
  }
  return contrato;
}
