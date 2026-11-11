import { validarCertificadoPfx } from "./certificado-pfx";

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
    } catch {
      // Sigue con la clave tal cual: puede llevar espacios a propósito.
    }
  }
  return { ...validarCertificadoPfx(archivoBase64, clave, ahora), clave };
}
