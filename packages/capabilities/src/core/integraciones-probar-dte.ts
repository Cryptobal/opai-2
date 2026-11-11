import { abrirCertificadoPfx, formaDeKeySimpleApi, probarKeySimpleApi } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import { leerSecreto } from "../integraciones/secretos";
import type { Contexto } from "../types";

const fechaCl = (iso: string) => iso.slice(0, 10).split("-").reverse().join("-");

/**
 * Prueba real de Emisión DTE (CAR-263, CAR-263b): pregunta a SimpleAPI si reconoce la API key guardada
 * (`Suscripcion/status`, en Basic y cruda) y abre el certificado .pfx con su clave. No emite, no usa folios y no envía el certificado ni el CAF. Antes esta
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

  // Basic `api:key` y, si SimpleAPI lo rechaza, la key cruda de su documentación (CAR-263b). Log categórico: estado y
  // esquema aceptado, nunca la key ni el header.
  const r = await probarKeySimpleApi(apiKey);
  const esquema = r.estado === "reconocida" ? r.esquema : null;
  console.info("[sii] probar_key", { evento: "sii.simpleapi.probar_key", estado: r.estado, status: r.status, esquema });
  if (r.estado === "sin_respuesta") {
    const que = r.status === 0 ? "no respondió" : `respondió HTTP ${r.status}`;
    throw reglaDeNegocio(`SimpleAPI ${que} al consultar la suscripción; no se pudo comprobar la API key. Reintenta en unos minutos.`);
  }
  if (r.estado === "no_reconocida") {
    // El largo es una pista para compararla con el panel de SimpleAPI, no una regla: no hay un largo correcto.
    const forma = formaDeKeySimpleApi(apiKey);
    const pista = forma.caracteresExtranos
      ? ` La key guardada tiene ${forma.largo} caracteres y alguno no es letra, número ni guion (por ejemplo comillas o un punto pegados junto a la key).`
      : ` La key guardada tiene ${forma.largo} caracteres; compárala con la del panel.`;
    throw reglaDeNegocio(
      `SimpleAPI no reconoce la API key guardada (HTTP ${r.status}, probada como Basic y como key directa): está mal copiada, vencida o sin suscripción a SimpleAPI DTE.${pista} Cópiala de nuevo desde el panel de SimpleAPI y guárdala aquí.`,
    );
  }

  const suscripcion = r.detalle ? ` (${r.detalle})` : "";
  if (!pfx || !clave) return `SimpleAPI reconoce la API key${suscripcion}. Falta cargar el certificado digital y su clave.`;
  let vence: string;
  try {
    vence = abrirCertificadoPfx(pfx, clave).meta.venceEn; // misma apertura que la emisión (clave recortada si así abre)
  } catch (e) {
    throw reglaDeNegocio(`SimpleAPI reconoce la API key${suscripcion}, pero el certificado no sirve: ${e instanceof Error ? e.message : "no se pudo abrir."}`);
  }
  return `SimpleAPI reconoce la API key${suscripcion}. El certificado abre con su clave y vence el ${fechaCl(vence)}.`;
}
