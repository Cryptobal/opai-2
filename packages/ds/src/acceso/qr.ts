import { renderSVG } from "uqr";

/**
 * SVG de un código QR para `datos` (p. ej. el `otpauth://` del segundo factor). Se genera en el
 * servidor para no cargar el codificador en el navegador; el resultado se muestra con {@link CodigoQr}.
 */
export function qrSvg(datos: string): string {
  return renderSVG(datos, { border: 1 });
}
