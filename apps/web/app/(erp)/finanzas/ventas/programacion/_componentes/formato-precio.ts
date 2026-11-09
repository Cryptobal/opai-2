// Formato al tipear del precio unitario de una programación (CAR-228). Lógica pura.

/** CLP con punto de miles («1.500.000»); sin decimales. */
export const precioClpTexto = (crudo: string): string =>
  (crudo.split(",")[0] ?? "")
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+$)/g, ".");

/** UF con coma decimal («12,5»): hasta 4 decimales (los enteros los valida `parseUf` al guardar); el punto tipeado cuenta como coma. */
export function precioUfTexto(crudo: string): string {
  const [e = "", ...d] = crudo.replace(/[^\d.,]/g, "").split(/[.,]/);
  return d.length ? `${e},${d.join("").slice(0, 4)}` : e;
}
