// Sello electrónico y sello de tiempo del PDF firmado (firma.md R6, P7). El prestador real (PAdES +
// sello de tiempo de un prestador acreditado) está por definir (P7): aquí va la INTERFAZ y un
// adaptador FALSO determinista para pruebas, sin claves ni proveedor. CAR-82 · PR 2.

/** Datos de un firmante que entran en la página de evidencia del PDF sellado (R6). */
export type FirmanteEvidencia = {
  nombre: string;
  /** RUN enmascarado para mostrar; la evidencia inmutable guarda el canónico aparte (CA8). */
  run: string | null;
  nivel: string;
  metodo: string;
  firmadoEn: string;
};

/** Lo que el sellador necesita para armar la página de evidencia (R6). */
export type EvidenciaSello = {
  solicitudId: string;
  /** H1: huella del PDF congelado que cada firmante firmó. */
  sha256Documento: string;
  nivel: string;
  firmantes: readonly FirmanteEvidencia[];
  /** URL pública del comprobante (`/verificar/<token>`) para el QR. */
  comprobanteUrl: string;
};

/** PDF firmado (documento congelado + página de evidencia), listo para guardar como versión nueva. */
export type PdfSellado = {
  /** Contenido del archivo sellado. En el falso es un texto determinista, no un PDF real. */
  bytes: string;
  mime: string;
  prestador: string;
  /** Sello de tiempo del prestador acreditado (ISO); null en el falso (sin proveedor, P7). */
  selloDeTiempo: string | null;
};

export interface Sello {
  readonly nombre: string;
  readonly disponible: boolean;
  /** Arma el PDF firmado a partir de la evidencia. OPAI calcula H2 sobre los bytes que devuelve. */
  sellar(evidencia: EvidenciaSello): Promise<PdfSellado>;
}

/** Línea determinista por firmante para que el falso produzca siempre los mismos bytes (y H2). */
function lineaFirmante(f: FirmanteEvidencia): string {
  return `- ${f.nombre} (${f.run ?? "s/RUN"}) · ${f.nivel} · ${f.metodo} · ${f.firmadoEn}`;
}

/**
 * Adaptador FALSO: no aplica PAdES ni sello de tiempo reales; arma una página de evidencia de texto
 * determinista a partir de H1 y los firmantes, para que H2 sea estable en pruebas. No usa claves ni
 * red. El sellado real (P7) lo hará un prestador acreditado detrás de esta misma interfaz.
 */
export function selloFalso(): Sello {
  return {
    nombre: "falso",
    disponible: true,
    async sellar(evidencia: EvidenciaSello): Promise<PdfSellado> {
      const cuerpo = [
        "OPAI · PDF firmado (sello de prueba, sin validez)",
        `Solicitud: ${evidencia.solicitudId}`,
        `Huella del documento (H1): ${evidencia.sha256Documento}`,
        `Nivel: ${evidencia.nivel}`,
        "Firmantes:",
        ...evidencia.firmantes.map(lineaFirmante),
        `Verificar: ${evidencia.comprobanteUrl}`,
      ].join("\n");
      return { bytes: cuerpo, mime: "application/pdf", prestador: "falso", selloDeTiempo: null };
    },
  };
}

/** Error claro cuando no hay sellador en un entorno que lo exige (prestador P7 sin contratar). */
export class SelloNoConfigurado extends Error {
  constructor() {
    super("Sellado de firma no configurado: falta el prestador de sello/sello de tiempo (P7).");
    this.name = "SelloNoConfigurado";
  }
}

/** Sellador de un entorno sin proveedor: falla cerrado al sellar, nunca al construir el contexto. */
export function selloNoConfigurado(): Sello {
  return {
    nombre: "no-configurado",
    disponible: false,
    async sellar() {
      throw new SelloNoConfigurado();
    },
  };
}
