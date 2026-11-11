// Formatos de campos del JSON de SimpleAPI alineados con OPAI 1.0, que sí emite (CAR-240).

/** RUT como lo espera el SII (`12345678-9`, sin puntos, DV en mayúscula), igual que `toSiiRut` de OPAI 1.0. */
export function rutSii(rut: string): string {
  const limpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  return limpio.length < 2 ? limpio : `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

/**
 * RUT del titular del certificado (`Certificado.Rut`), como `extractRut` de OPAI 1.0 (CAR-240): el primer
 * `12345678-9` del texto (serialNumber o CN del certificado), sin puntos ni espacios y con el DV en mayúscula; null si
 * no aparece. Es el RUT de la persona titular, nunca el de la empresa emisora. Un cuerpo de más de 8 dígitos no se
 * recorta a sus últimos 8 (no es un RUT).
 */
export function rutTitularCertificado(texto: string): string | null {
  const m = /(?<!\d)(\d{1,8}-[\dkK])(?![\dkK])/.exec(texto.replace(/[.\s]/g, ""));
  return m?.[1] ? m[1].toUpperCase() : null;
}

/** Forma que SimpleAPI espera en `Certificado.Rut` (sin puntos, con guion y DV en mayúscula). */
export const RUT_TITULAR_SII = /^\d{1,8}-[0-9K]$/;

export type CredsCertificado = { certificadoRut: string; certificadoClave: string };

/**
 * Bloque `Certificado` de todos los `input` (CAR-240): el RUT del titular del certificado como lo extrae 1.0 (nunca el
 * de la empresa) y la clave tal como abre el .pfx (ya recortada al guardarla y al leerla).
 */
export function certificadoInput(creds: CredsCertificado): { Rut: string; Password: string } {
  return { Rut: rutTitularCertificado(creds.certificadoRut) ?? rutSii(creds.certificadoRut), Password: creds.certificadoClave };
}

/** `<CorreoRecep>` admite una sola dirección de hasta 80 caracteres; una lista o un texto inválido no se informa. */
const CORREO_UNICO = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
export const correoReceptor = (c: string | undefined) => (c && c.length <= 80 && CORREO_UNICO.test(c) ? c : null);
