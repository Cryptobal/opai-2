// Formatos de campos del JSON de SimpleAPI alineados con OPAI 1.0, que sí emite (CAR-240).

/** RUT como lo espera el SII (`12345678-9`, sin puntos, DV en mayúscula), igual que `toSiiRut` de OPAI 1.0. */
export function rutSii(rut: string): string {
  const limpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  return limpio.length < 2 ? limpio : `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

/**
 * RUT del titular para `Certificado.Rut`, como `extractRut` de OPAI 1.0: el `12345678-9` que trae el serialNumber del
 * certificado, aunque venga con puntos o con un prefijo; si no aparece, el valor normalizado.
 */
export function rutTitularSii(rut: string): string {
  const m = /(?<!\d)(\d{1,8}-[\dkK])\b/.exec(rut.replace(/[.\s]/g, ""));
  return m?.[1] ? m[1].toUpperCase() : rutSii(rut);
}

/** `<CorreoRecep>` admite una sola dirección de hasta 80 caracteres; una lista o un texto inválido no se informa. */
const CORREO_UNICO = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
export const correoReceptor = (c: string | undefined) => (c && c.length <= 80 && CORREO_UNICO.test(c) ? c : null);
