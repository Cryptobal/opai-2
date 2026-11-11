/**
 * Contrato HTTP de SimpleAPI (REST) según su documentación oficial (colección Postman publicada en
 * https://documentacion.simpleapi.cl, revisada el 6-nov-2026, CAR-196). Cada forma de aquí está respaldada por un
 * ejemplo de esa documentación; lo que ella no responde queda anotado como «DECISIÓN CARLOS» en el PR.
 */

import { certificadoInput, correoReceptor, rutSii, type CredsCertificado } from "./simpleapi-formatos";
import type { AmbienteSii, PayloadEmisionDte } from "./tipos";

/** Host del ejemplo de autenticación de la documentación (`https://api.simpleapi.cl/{endpoint}`). */
export const SIMPLEAPI_BASE = "https://api.simpleapi.cl" as const;
const V1 = `${SIMPLEAPI_BASE}/api/v1`;

export const SIMPLEAPI_RUTAS = {
  generar: `${V1}/dte/generar`,
  envioGenerar: `${V1}/envio/generar`,
  envioEnviar: `${V1}/envio/enviar`,
  consultaEnvio: `${V1}/consulta/envio`,
} as const;

/** RUT del SII como receptor del sobre de envío (ejemplo de la documentación: `RutReceptor: "60803000-K"`). */
export const RUT_SII = "60803000-K" as const;

/**
 * Autenticación Basic con usuario «api» y la API key como contraseña: `Basic base64("api:" + key)` (CAR-240). Es lo que
 * usan OPAI 1.0 (que sí emite) y el SDK oficial. Se quitan espacios, saltos y caracteres invisibles que se cuelan al
 * pegar la key, también en medio: SimpleAPI rechaza esa key con el mismo 401 vacío que a una inválida (CAR-263).
 */
export const limpiarKeySimpleApi = (apiKey: string): string => apiKey.replace(/[\s\p{Cf}]/gu, "");
export const encabezadoAuthSimpleApi = (apiKey: string): string =>
  `Basic ${Buffer.from(`api:${limpiarKeySimpleApi(apiKey)}`, "utf8").toString("base64")}`;

export type CredencialesSimpleApiV1 = {
  apiKey: string;
  certificadoPfxBase64: string;
  certificadoClave: string;
  /** RUT del titular del certificado (campo `Certificado.Rut` de la documentación), no el de la empresa. */
  certificadoRut: string;
  /** RUT de la empresa emisora (campo `RutEmpresa` de las consultas). */
  rutEmpresa: string;
  resolucionNumero: number;
  resolucionFecha: string;
  razonSocialEmisor?: string;
  giroEmisor?: string;
  /** Código de actividad económica (ACTECO) del emisor; el SII lo exige en el encabezado del DTE. */
  actecoEmisor?: number;
  direccionEmisor?: string;
  comunaEmisor?: string;
  ciudadEmisor?: string;
};

const fechaSii = (iso: string) => iso.slice(0, 10);

/** 0 = certificación, 1 = producción (documentación: «Ambiente: Certificación = 0, Producción = 1»). */
export const codigoAmbiente = (a: AmbienteSii): 0 | 1 => (a === "produccion" ? 1 : 0);

/** Forma de pago: la documentación pide informarla (1 contado, 2 crédito, 3 sin costo); sin dato rige crédito. */
const FORMA_PAGO_CREDITO = 2;

/** Objeto del campo `input` de POST /api/v1/dte/generar, con las claves de `buildDtePayload` de OPAI 1.0. */
export function entradaGenerarDte(
  payload: PayloadEmisionDte,
  creds: Pick<
    CredencialesSimpleApiV1,
    | "certificadoRut"
    | "certificadoClave"
    | "razonSocialEmisor"
    | "giroEmisor"
    | "actecoEmisor"
    | "direccionEmisor"
    | "comunaEmisor"
    | "ciudadEmisor"
  >,
) {
  const lineas = payload.lineas?.length
    ? payload.lineas
    : [{ orden: 0, glosa: payload.glosa ?? "Servicio", monto: payload.montos.total }];
  const documentoExento = payload.tipoDte === 34 || (payload.montos.neto === 0 && payload.montos.exento > 0);
  const detalles = lineas.map((l, i) => ({
    NumeroLinea: i + 1,
    // Como OPAI 1.0, que sí emite (CAR-240): la línea afecta no lleva IndicadorExento y la factura exenta (34) tampoco.
    // Una NC o ND (61/56) sobre una factura exenta sí lo lleva en 1: sus totales vienen sin neto ni IVA y las líneas
    // deben cuadrar con eso (CAR-234).
    ...(documentoExento && payload.tipoDte !== 34 ? { IndicadorExento: 1 } : {}),
    Nombre: l.glosa,
    Cantidad: l.cantidad ?? 1,
    Precio: l.precioUnitario ?? l.monto,
    MontoItem: l.monto,
  }));
  // Nombres JSON de OPAI 1.0 (`FechaDocumentoReferenciaString`, `Numero`): los del modelo C# de SimpleAPI.
  const referencias = (payload.referencias ?? []).map((r, i) => ({
    Numero: i + 1,
    TipoDocumento: String(r.tipoDte),
    FolioReferencia: String(r.folio),
    // FchRef es la fecha del documento referenciado, no la de este DTE; sin dato, la de emisión (filas antiguas).
    FechaDocumentoReferenciaString: fechaSii(r.fecha ?? payload.fechaEmision),
    ...(r.codigo != null ? { CodigoReferencia: r.codigo } : {}),
    ...(r.razon ? { RazonReferencia: r.razon } : {}),
  }));
  const ciudadReceptor = payload.ciudadReceptor ?? payload.comunaReceptor;
  const correo = correoReceptor(payload.emailReceptor);
  return {
    Documento: {
      // ID del nodo Documento (atributo XML): fijo por tipo y folio, para que un reintento genere el mismo documento.
      Id: `F${payload.folio}T${payload.tipoDte}`,
      Encabezado: {
        IdentificacionDTE: {
          TipoDTE: payload.tipoDte,
          Folio: payload.folio,
          FechaEmisionString: fechaSii(payload.fechaEmision),
          // Sin vencimiento, como 1.0, que no lo manda y sí emite (decisión de Carlos, 10-nov-2026, CAR-240): ni
          // `FechaVencimiento` ni `FechaVencimientoString`. El vencimiento sigue en OPAI (UI, PDF y cobranza).
          FormaPago: FORMA_PAGO_CREDITO,
        },
        Emisor: {
          Rut: rutSii(payload.rutEmisor),
          ...(creds.razonSocialEmisor ? { RazonSocial: creds.razonSocialEmisor } : {}),
          ...(creds.giroEmisor ? { Giro: creds.giroEmisor } : {}),
          // Nombres y forma (lista de ACTECO) tomados del adaptador de OPAI 1.0, que ya emite con SimpleAPI.
          ...(creds.actecoEmisor ? { ActividadEconomica: [creds.actecoEmisor] } : {}),
          ...(creds.direccionEmisor ? { DireccionOrigen: creds.direccionEmisor } : {}),
          ...(creds.comunaEmisor ? { ComunaOrigen: creds.comunaEmisor } : {}),
          ...(creds.ciudadEmisor ? { CiudadOrigen: creds.ciudadEmisor } : {}),
        },
        Receptor: {
          Rut: rutSii(payload.rutReceptor),
          RazonSocial: payload.razonSocialReceptor,
          ...(payload.direccionReceptor ? { Direccion: payload.direccionReceptor } : {}),
          ...(payload.comunaReceptor ? { Comuna: payload.comunaReceptor } : {}),
          // OPAI 1.0 siempre informa la ciudad. Sin ciudad en la cuenta va su comuna real, nunca un valor fijo (Carlos,
          // 10-nov-2026); sin comuna el preflight ya bloquea.
          ...(ciudadReceptor ? { Ciudad: ciudadReceptor } : {}),
          ...(payload.giroReceptor ? { Giro: payload.giroReceptor } : {}),
          ...(correo ? { CorreoRecep: correo } : {}),
        },
        // Como 1.0: MontoExento siempre; la tasa y el IVA solo en un documento afecto.
        Totales: {
          MontoNeto: payload.montos.neto,
          MontoExento: payload.montos.exento,
          ...(documentoExento ? {} : { TasaIVA: 19, IVA: payload.montos.iva }),
          MontoTotal: payload.montos.total,
        },
      },
      Detalles: detalles,
      ...(referencias.length > 0 ? { Referencias: referencias } : {}),
    },
    Certificado: certificadoInput(creds),
  };
}

/** JSON del campo `input` de POST /api/v1/dte/generar (esquema unificado de la documentación). */
export function jsonInputGenerarDte(payload: PayloadEmisionDte, creds: Parameters<typeof entradaGenerarDte>[1]): string {
  return JSON.stringify(entradaGenerarDte(payload, creds));
}

/** JSON del campo `input` de POST /api/v1/envio/generar (sobre de envío al SII). */
export function jsonInputSobreEnvio(
  payload: { rutEmisor: string; resolucionNumero: number; resolucionFecha: string },
  creds: CredsCertificado,
): string {
  return JSON.stringify({
    Certificado: certificadoInput(creds),
    Caratula: {
      RutEmisor: payload.rutEmisor,
      RutReceptor: RUT_SII,
      FechaResolucion: fechaSii(payload.resolucionFecha),
      NumeroResolucion: payload.resolucionNumero,
    },
  });
}

/** JSON del campo `input` de POST /api/v1/envio/enviar. `Tipo`: EnvioDTE = 1, EnvioBoleta = 2. */
export function jsonInputEnviarSii(
  ambiente: AmbienteSii,
  creds: CredsCertificado,
): string {
  return JSON.stringify({
    Certificado: certificadoInput(creds),
    Ambiente: codigoAmbiente(ambiente),
    Tipo: 1,
  });
}

/** JSON del campo `input` de POST /api/v1/consulta/envio. */
export function jsonInputConsultaEnvio(
  rutEmpresa: string,
  trackId: string,
  ambiente: AmbienteSii,
  creds: CredsCertificado,
): string {
  return JSON.stringify({
    Certificado: certificadoInput(creds),
    RutEmpresa: rutEmpresa,
    TrackId: Number(trackId),
    Ambiente: codigoAmbiente(ambiente),
    ServidorBoletaREST: false,
  });
}
