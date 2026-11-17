// Acuse / aceptación / reclamo de DTE recibidos ante el SII (CAR-644, paridad OPAI 1.0).
// POST https://api.simpleapi.cl/api/v1/compras/aceptacionreclamo — multipart con `input` + `files` (.pfx).

import { certificadoInput } from "./simpleapi-formatos";
import { SIMPLEAPI_BASE } from "./simpleapi-contrato";
import { postMultipartSimpleApi } from "./simpleapi-http";
import { detalleSeguroDeRespuesta } from "./error-proveedor";
import type { AmbienteSii } from "./tipos";

export const RUTA_ACUSE_COMPRA = `${SIMPLEAPI_BASE}/api/v1/compras/aceptacionreclamo` as const;

export type AccionAcuseSii = "ACD" | "RCD" | "ERM" | "RFP" | "RFT";

export type CredencialesAcuse = {
  apiKey: string;
  certificadoPfxBase64: string;
  certificadoClave: string;
  certificadoRut: string;
};

export type PedidoAcuse = {
  tipoDte: number;
  folio: number;
  /** RUT del proveedor emisor del DTE (sin puntos). */
  rutProveedor: string;
  accion: AccionAcuseSii;
};

export type ResultadoAcuse =
  | { ok: true; trackId?: string; motivo?: string; acdOk?: boolean; ermOk?: boolean }
  | { ok: false; motivo: string; incierto?: boolean };

type CuerpoAcuse = {
  TrackId?: number | string;
  trackId?: number | string;
  descripcion?: string;
  Descripcion?: string;
  mensaje?: string;
  Mensaje?: string;
  response?: string;
  Response?: string;
};

/** Interpreta el cuerpo de SimpleAPI: HTTP 200 no basta; el SII puede rechazar en `descripcion` o en el XML. */
export function interpretarAcuse(body: CuerpoAcuse | null): { ok: boolean | null; detalle?: string } {
  if (!body) return { ok: null };
  const xml = typeof body.response === "string" ? body.response : typeof body.Response === "string" ? body.Response : "";
  const detalle = String(
    body.descripcion ?? body.Descripcion ?? body.mensaje ?? body.Mensaje ?? xml.match(/<(?:descripcion|glosa|mensaje)[^>]*>([\s\S]*?)<\//i)?.[1] ?? "",
  ).trim();
  const norm = detalle.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (/accion completada ok|evento registrado previamente/.test(norm)) return { ok: true, detalle };
  if (detalle) return { ok: false, detalle };
  const cod = xml.match(/<(?:cod(?:igo)?respuesta|codigo_respuesta|cod_resp)[^>]*>\s*(-?\d+)\s*<\//i);
  if (cod) {
    const n = Number(cod[1]);
    return { ok: n === 0, detalle: n === 0 ? "Acción completada OK" : `Código SII ${n}` };
  }
  return { ok: null };
}

const esperaMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Una acción de aceptación o reclamo en el Registro de Aceptación del SII. */
export async function acuseRecibido(
  creds: CredencialesAcuse,
  pedido: PedidoAcuse,
  ambiente: AmbienteSii,
): Promise<ResultadoAcuse> {
  const input = {
    Certificado: certificadoInput(creds),
    Tipo: pedido.tipoDte,
    Folio: pedido.folio,
    Accion: pedido.accion,
    RutEmpresa: pedido.rutProveedor.replace(/\./g, "").trim().toUpperCase(),
    Ambiente: ambiente === "produccion" ? 1 : 0,
  };
  const res = await postMultipartSimpleApi(RUTA_ACUSE_COMPRA, creds.apiKey, [
    { nombre: "input", texto: JSON.stringify(input) },
    {
      nombre: "files",
      bytes: Buffer.from(creds.certificadoPfxBase64, "base64"),
      tipo: "application/x-pkcs12",
      nombreArchivo: "certificado.pfx",
    },
  ]);
  const secretos = [creds.apiKey, creds.certificadoClave];
  const cuerpo = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, motivo: `SimpleAPI respondió HTTP ${res.status}: ${detalleSeguroDeRespuesta(cuerpo, secretos) ?? "sin detalle"}` };
  }
  let json: CuerpoAcuse;
  try {
    json = JSON.parse(cuerpo) as CuerpoAcuse;
  } catch {
    return { ok: false, motivo: "La respuesta no es JSON válido" };
  }
  const visto = interpretarAcuse(json);
  if (visto.ok === false) return { ok: false, motivo: visto.detalle ?? "El SII rechazó la acción" };
  if (visto.ok === null) return { ok: false, motivo: "No se pudo interpretar la respuesta del SII", incierto: true };
  const trackId = json.TrackId ?? json.trackId;
  return {
    ok: true,
    ...(trackId !== undefined && trackId !== "" && trackId !== 0 ? { trackId: String(trackId) } : {}),
  };
}

/** Aceptación habitual: ACD y luego ERM (habilita crédito IVA). Entre ambas espera 1,5 s (límite SimpleAPI). */
export async function aceptarConAcuse(
  creds: CredencialesAcuse,
  pedido: Omit<PedidoAcuse, "accion">,
  ambiente: AmbienteSii,
): Promise<ResultadoAcuse> {
  const acd = await acuseRecibido(creds, { ...pedido, accion: "ACD" }, ambiente);
  if (!acd.ok) return acd;
  await esperaMs(1500);
  const erm = await acuseRecibido(creds, { ...pedido, accion: "ERM" }, ambiente);
  if (!erm.ok) {
    return {
      ok: true,
      acdOk: true,
      ermOk: false,
      ...(acd.trackId ? { trackId: acd.trackId } : {}),
      motivo: `El contenido quedó aceptado (ACD), pero falló el acuse de mercaderías (ERM): ${erm.motivo}. Revísalo en el portal del SII.`,
    };
  }
  const trackId = erm.trackId ?? acd.trackId;
  return { ok: true, acdOk: true, ermOk: true, ...(trackId ? { trackId } : {}) };
}