/**
 * Contrato HTTP de SimpleAPI v1 usado por OPAI 1.0 (referencia: auditoría 2026-11 §2.2).
 * Los nombres de campos multipart siguen la convención del proveedor; validar contra certificación real (CAR-154).
 */

import type { AmbienteSii, PayloadEmisionDte } from "./tipos";

/** Base documentada en la integración Gard 1.0; certificación y producción comparten host con ambiente en el cuerpo. */
export const SIMPLEAPI_V1_BASE = "https://api.simpleapi.cl/api/v1" as const;

export const SIMPLEAPI_RUTAS = {
  generar: `${SIMPLEAPI_V1_BASE}/dte/generar`,
  envioGenerar: `${SIMPLEAPI_V1_BASE}/envio/generar`,
  envioEnviar: `${SIMPLEAPI_V1_BASE}/envio/enviar`,
  consultar: `${SIMPLEAPI_V1_BASE}/envio/consultar`,
} as const;

/** Auth Basic con la API key como usuario y contraseña vacía (paridad 1.0). */
export function encabezadoAuthSimpleApi(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`, "utf8").toString("base64")}`;
}

export type CredencialesSimpleApiV1 = {
  apiKey: string;
  certificadoPfxBase64: string;
  certificadoClave: string;
  resolucionNumero: number;
  resolucionFecha: string;
  razonSocialEmisor?: string;
  giroEmisor?: string;
};

function fechaSii(iso: string): string {
  return iso.slice(0, 10);
}

/** JSON del campo `input` para POST dte/generar (estructura alineada al SDK ChileSystems). */
export function jsonInputGenerarDte(
  payload: PayloadEmisionDte,
  creds: Pick<CredencialesSimpleApiV1, "resolucionNumero" | "resolucionFecha" | "razonSocialEmisor" | "giroEmisor">,
): string {
  const lineas =
    payload.lineas?.length && payload.lineas.length > 0
      ? payload.lineas
      : [{ orden: 0, glosa: payload.glosa ?? "Servicio", monto: payload.montos.total }];

  const detalle = lineas.map((l, i) => {
    const n = i + 1;
    const monto = l.monto;
    const cantidad = l.cantidad ?? 1;
    const precio = l.precioUnitario ?? monto;
    return {
      NroLinDet: n,
      NmbItem: l.glosa,
      QtyItem: cantidad,
      PrcItem: precio,
      MontoItem: monto,
    };
  });

  const referencias =
    payload.referencias?.map((r, i) => ({
      NroLinRef: i + 1,
      TpoDocRef: r.tipoDte,
      FolioRef: r.folio,
      CodRef: r.codigo,
      ...(r.razon ? { RazonRef: r.razon } : {}),
    })) ?? [];

  const doc: Record<string, unknown> = {
    Encabezado: {
      IdDoc: {
        TipoDTE: payload.tipoDte,
        Folio: payload.folio,
        FchEmis: fechaSii(payload.fechaEmision),
      },
      Emisor: {
        RUTEmisor: payload.rutEmisor,
        ...(creds.razonSocialEmisor ? { RznSoc: creds.razonSocialEmisor } : {}),
        ...(creds.giroEmisor ? { GiroEmis: creds.giroEmisor } : {}),
      },
      Receptor: {
        RUTRecep: payload.rutReceptor,
        RznSocRecep: payload.razonSocialReceptor,
        ...(payload.giroReceptor ? { GiroRecep: payload.giroReceptor } : {}),
        ...(payload.direccionReceptor ? { DirRecep: payload.direccionReceptor } : {}),
        ...(payload.comunaReceptor ? { CmnaRecep: payload.comunaReceptor } : {}),
        ...(payload.ciudadReceptor ? { CiudadRecep: payload.ciudadReceptor } : {}),
        ...(payload.emailReceptor ? { CorreoRecep: payload.emailReceptor } : {}),
      },
      Totales: {
        MntNeto: payload.montos.neto,
        MntExe: payload.montos.exento,
        IVA: payload.montos.iva,
        MntTotal: payload.montos.total,
      },
    },
    Detalle: detalle,
  };
  if (referencias.length > 0) doc.Referencia = referencias;

  return JSON.stringify({
    Ambiente: payload.ambiente === "produccion" ? 1 : 0,
    Caratula: {
      NroResol: creds.resolucionNumero,
      FchResol: fechaSii(creds.resolucionFecha),
    },
    Documento: doc,
  });
}

export function ambienteSimpleApi(ambiente: AmbienteSii): "certificacion" | "produccion" {
  return ambiente;
}
