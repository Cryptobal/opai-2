import { formaDeKeySimpleApi, probarKeySimpleApi, validarCertificadoPfx } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import { leerSecreto } from "../integraciones/secretos";
import type { Contexto } from "../types";

const fechaCl = (iso: string) => iso.slice(0, 10).split("-").reverse().join("-");

/**
 * Prueba real de Emisión DTE (CAR-263): pregunta a SimpleAPI si reconoce la API key guardada (`Suscripcion/status`) y
 * abre el certificado .pfx con su clave. No emite, no usa folios y no envía el certificado ni el CAF. Antes esta
 * integración caía en la prueba de correo y «Conexión correcta» no decía nada de SimpleAPI.
 */
export async function probarEmisionDte(ctx: Contexto): Promise<string> {
  const integ = await ctx.db.integracion.findUnique({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_emision" } },
  });
  const [apiKey, pfx, clave] = integ
    ? await Promise.all([
        leerSecreto(ctx, integ.id, "api_key"),
        leerSecreto(ctx, integ.id, "certificado_pfx"),
        leerSecreto(ctx, integ.id, "certificado_clave"),
      ])
    : [null, null, null];
  if (!apiKey) throw reglaDeNegocio("Falta la API key de SimpleAPI en Emisión DTE.");

  const r = await probarKeySimpleApi(apiKey);
  if (r.estado === "sin_respuesta") {
    throw reglaDeNegocio(`SimpleAPI respondió HTTP ${r.status} al consultar la suscripción; no se pudo comprobar la API key. Reintenta en unos minutos.`);
  }
  if (r.estado === "no_reconocida") {
    const forma = formaDeKeySimpleApi(apiKey);
    const pista = forma.caracteresExtranos
      ? ` La key guardada tiene ${forma.largo} caracteres y alguno no es letra, número ni guion (por ejemplo comillas o un punto pegados junto a la key).`
      : ` La key guardada tiene ${forma.largo} caracteres.`;
    throw reglaDeNegocio(
      `SimpleAPI no reconoce la API key guardada (HTTP ${r.status}): está mal copiada, vencida o no tiene suscripción a SimpleAPI DTE.${pista} Cópiala de nuevo desde el panel de SimpleAPI y guárdala aquí.`,
    );
  }

  const suscripcion = r.detalle ? ` (${r.detalle})` : "";
  if (!pfx || !clave) return `SimpleAPI reconoce la API key${suscripcion}. Falta cargar el certificado digital y su clave.`;
  let vence: string;
  try {
    vence = validarCertificadoPfx(pfx, clave).meta.venceEn;
  } catch (e) {
    throw reglaDeNegocio(`SimpleAPI reconoce la API key${suscripcion}, pero el certificado no sirve: ${e instanceof Error ? e.message : "no se pudo abrir."}`);
  }
  return `SimpleAPI reconoce la API key${suscripcion}. El certificado abre con su clave y vence el ${fechaCl(vence)}.`;
}
