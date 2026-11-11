// RCV de compras de SimpleAPI (CAR-273): las facturas que el SII registra como recibidas por la empresa en un mes.
// Igual que `finance-rcv-sync` de OPAI 1: `POST https://servicios.simpleapi.cl/api/rcv/compras/{mes}/{anio}` con Basic
// api:key y un multipart con `input` (JSON) y `certificado` (el .pfx). Es solo lectura: no tiene efecto tributario.

import { ErrorProveedorSii, detalleSeguroDeRespuesta } from "./error-proveedor";
import { postMultipartSimpleApi } from "./simpleapi-http";

export const SIMPLEAPI_SERVICIOS = "https://servicios.simpleapi.cl" as const;
export const rutaRcvCompras = (mes: number, anio: number) => `${SIMPLEAPI_SERVICIOS}/api/rcv/compras/${mes}/${anio}`;

export type CredencialesRcv = {
  apiKey: string;
  certificadoPfxBase64: string;
  certificadoClave: string;
  /** RUT del titular del certificado (sin puntos, con guion). */
  certificadoRut: string;
  /** RUT de la empresa cuyo registro de compras se consulta. */
  rutEmpresa: string;
};

/** Un documento recibido tal como lo informa el RCV, ya normalizado. Montos en pesos enteros. */
export type DocumentoRcv = {
  rutEmisor: string;
  razonSocial: string | null;
  tipoDte: number;
  folio: number;
  /** AAAA-MM-DD. */
  fechaEmision: string;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoTotal: number;
};

type Detalle = Record<string, unknown>;

/** SimpleAPI serializa a veces en camelCase y a veces en PascalCase (lo mismo que acepta OPAI 1). */
const campo = (d: Detalle, nombre: string): unknown => d[nombre] ?? d[nombre.charAt(0).toUpperCase() + nombre.slice(1)];
const entero = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v.replace(/[^\d-]/g, "")) : Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

export function normalizarDetalleRcv(d: Detalle): DocumentoRcv | null {
  const tipoDte = entero(campo(d, "tipoDTE") ?? campo(d, "tipoDte"));
  const folio = entero(campo(d, "folio"));
  const fecha = String(campo(d, "fechaEmision") ?? "").slice(0, 10);
  const rut = String(campo(d, "rutProveedor") ?? "").replace(/\./g, "").trim().toUpperCase();
  if (!tipoDte || folio <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{1,8}-[\dK]$/.test(rut)) return null;
  const razon = String(campo(d, "razonSocial") ?? "").trim();
  return {
    rutEmisor: rut,
    razonSocial: razon || null,
    tipoDte,
    folio,
    fechaEmision: fecha,
    montoNeto: entero(campo(d, "montoNeto")),
    montoExento: entero(campo(d, "montoExento")),
    montoIva: entero(campo(d, "montoIvaRecuperable")),
    montoTotal: entero(campo(d, "montoTotal")),
  };
}

/** Lista de detalle de compras de la respuesta, en cualquiera de las dos formas de nombre. */
function detalleCompras(json: unknown): Detalle[] {
  if (!json || typeof json !== "object") return [];
  const raiz = json as Record<string, unknown>;
  const compras = (raiz["compras"] ?? raiz["Compras"]) as Record<string, unknown> | undefined;
  const lista = compras?.["detalleCompras"] ?? compras?.["DetalleCompras"];
  return Array.isArray(lista) ? (lista.filter((x) => x && typeof x === "object") as Detalle[]) : [];
}

/**
 * Consulta el RCV de compras de un mes en el SII de producción (el RCV no existe en certificación). Devuelve los
 * documentos normalizados y cuántas filas se descartaron por venir incompletas. Nunca registra ni devuelve secretos.
 */
export async function consultarRcvCompras(
  creds: CredencialesRcv,
  mes: number,
  anio: number,
): Promise<{ documentos: DocumentoRcv[]; descartados: number }> {
  const input = {
    RutCertificado: creds.certificadoRut,
    Password: creds.certificadoClave,
    RutUsuario: creds.certificadoRut,
    PasswordSII: "",
    RutEmpresa: creds.rutEmpresa,
    Ambiente: 1,
    Detallado: true,
  };
  const res = await postMultipartSimpleApi(rutaRcvCompras(mes, anio), creds.apiKey, [
    { nombre: "input", texto: JSON.stringify(input) },
    {
      nombre: "certificado",
      bytes: Buffer.from(creds.certificadoPfxBase64, "base64"),
      tipo: "application/x-pkcs12",
      nombreArchivo: "certificado.pfx",
    },
  ]);
  const cuerpo = await res.text().catch(() => "");
  const secretos = [creds.apiKey, creds.certificadoClave];
  if (!res.ok) {
    const detalle = detalleSeguroDeRespuesta(cuerpo, secretos);
    throw new ErrorProveedorSii("consultar", `RCV de compras: respondió HTTP ${res.status}`, res.status, detalle, false);
  }
  let json: unknown;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    throw new ErrorProveedorSii("consultar", "RCV de compras: la respuesta no es un JSON válido", res.status, null, false);
  }
  const filas = detalleCompras(json);
  const documentos = filas.map(normalizarDetalleRcv).filter((d): d is DocumentoRcv => d !== null);
  return { documentos, descartados: filas.length - documentos.length };
}
