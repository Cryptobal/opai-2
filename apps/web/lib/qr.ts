import { renderSVG } from "uqr";

/**
 * SVG de un código QR para `datos` (p. ej. el `otpauth://` del segundo factor, NÚCLEO-F). Vive en el
 * servidor y solo lo usa la Server Action de enrolamiento, para no cargar el codificador en el
 * navegador (presupuesto de JS, ADR-037). El SVG se muestra con `CodigoQr` del DS.
 */
export function qrSvg(datos: string): string {
  return renderSVG(datos, { border: 1 });
}
