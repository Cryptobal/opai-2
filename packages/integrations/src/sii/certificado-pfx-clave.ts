import { MSG_CLAVE_NO_COINCIDE, validarCertificadoPfx } from "./certificado-pfx";

/**
 * Abre el certificado con su clave recortada (CAR-240: un espacio o salto de línea al copiarla no debe viajar a
 * SimpleAPI) y, solo si la recortada no lo abre, con la clave tal cual. Devuelve la clave que lo abrió: es la que se
 * guarda y la que se envía.
 */
export function abrirCertificadoPfx(
  archivoBase64: string,
  clave: string,
  ahora = new Date(),
): ReturnType<typeof validarCertificadoPfx> & { clave: string } {
  const recortada = clave.trim();
  if (recortada && recortada !== clave) {
    try {
      return { ...validarCertificadoPfx(archivoBase64, recortada, ahora), clave: recortada };
    } catch (e) {
      // Solo si la recortada no abre el archivo se prueba la clave tal cual (puede llevar espacios a propósito). Otro
      // motivo (vencido, sin llave privada) es del certificado y se informa tal cual.
      if (!(e instanceof Error) || e.message !== MSG_CLAVE_NO_COINCIDE) throw e;
    }
  }
  return { ...validarCertificadoPfx(archivoBase64, clave, ahora), clave };
}
