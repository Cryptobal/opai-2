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

  // La medición es informativa: no se ha podido validar con una key que se sepa buena qué responde SimpleAPI, así que
  // nunca deja la integración en error (el preflight de emisión exige `configurada`; CAR-240).
  const m = await medirKeySimpleApi(apiKey);
  const http = (n: number | null) => (n === null ? "sin token" : n === 0 ? "sin respuesta" : `HTTP ${n}`);
  const forma = formaDeKeySimpleApi(apiKey);
  const rara = forma.caracteresExtranos ? " y alguno no es letra, número ni guion" : "";
  const medido =
    `SimpleAPI (informativo, no bloquea la emisión): consulta de suscripción con Basic, ${http(m.basic)}; con token, ${http(m.bearer)}; ` +
    `suscripciones informadas: ${m.suscripciones ?? "sin dato"}. La key guardada tiene ${forma.largo} caracteres${rara}.`;

  if (!pfx || !clave) throw reglaDeNegocio(`Falta cargar el certificado digital y su clave. ${medido}`);
  let vence: string;
  try {
    vence = abrirCertificadoPfx(pfx, clave).meta.venceEn; // misma apertura que la emisión (clave recortada si así abre)
  } catch (e) {
    throw reglaDeNegocio(`El certificado no sirve: ${e instanceof Error ? e.message : "no se pudo abrir."} ${medido}`);
  }
  return `El certificado abre con su clave y vence el ${fechaCl(vence)}. ${medido}`;
}
