import { abrirCertificadoPfx, formaDeKeySimpleApi, medirKeySimpleApi } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import { leerSecreto } from "../integraciones/secretos";
import type { Contexto } from "../types";

const fechaCl = (iso: string) => iso.slice(0, 10).split("-").reverse().join("-");

/**
 * Prueba real de Emisión DTE (CAR-263, CAR-240): mide qué responde SimpleAPI a la API key guardada
 * (`Suscripcion/status`, con Basic y con token) y
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

  const m = await medirKeySimpleApi(apiKey);
  const http = (n: number | null) => (n === null ? "sin token" : n === 0 ? "sin respuesta" : `HTTP ${n}`);
  const medido = `Consulta de suscripción: con Basic, ${http(m.basic)}; con token, ${http(m.bearer)}`;
  if (m.suscripciones === null) {
    throw reglaDeNegocio(`No se pudo comprobar la API key en SimpleAPI. ${medido}. Reintenta en unos minutos.`);
  }
  if (m.suscripciones === 0) {
    const forma = formaDeKeySimpleApi(apiKey);
    const pista = forma.caracteresExtranos ? " y alguno no es letra, número ni guion" : "";
    throw reglaDeNegocio(
      `SimpleAPI no informa ninguna suscripción para la API key guardada (lista vacía, lo mismo que responde a una key que no conoce). ${medido}. La key guardada tiene ${forma.largo} caracteres${pista}; compárala con la del panel de SimpleAPI.`,
    );
  }

  const suscripcion = ` (${m.suscripciones} ${m.suscripciones === 1 ? "suscripción" : "suscripciones"}; ${medido})`;
  if (!pfx || !clave) return `SimpleAPI reconoce la API key${suscripcion}. Falta cargar el certificado digital y su clave.`;
  let vence: string;
  try {
    vence = abrirCertificadoPfx(pfx, clave).meta.venceEn; // misma apertura que la emisión (clave recortada si así abre)
  } catch (e) {
    throw reglaDeNegocio(`SimpleAPI reconoce la API key${suscripcion}, pero el certificado no sirve: ${e instanceof Error ? e.message : "no se pudo abrir."}`);
  }
  return `SimpleAPI reconoce la API key${suscripcion}. El certificado abre con su clave y vence el ${fechaCl(vence)}.`;
}
