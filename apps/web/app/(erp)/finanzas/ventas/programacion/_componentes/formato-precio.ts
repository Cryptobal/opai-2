// Formato al tipear del precio unitario de una programación (CAR-228). Lógica pura.
/** CLP con punto de miles («1.500.000»); sin decimales. */
export function precioClpTexto(crudo: string): string {
  const d = (crudo.split(",")[0] ?? "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** UF con coma decimal («12,5», «1.234,5678»): hasta 7 enteros y 4 decimales; el punto tipeado cuenta como coma. */
export function precioUfTexto(crudo: string): string {
  const t = crudo.replace(/[^\d.,]/g, "");
  const corte = t.search(/[.,]/);
  const entero = (corte < 0 ? t : t.slice(0, corte)).slice(0, 7);
  if (corte < 0) return entero;
  const dec = t.slice(corte + 1).replace(/\D/g, "").slice(0, 4);
  return `${entero || "0"},${dec}`;
}

export const precioTexto = (moneda: "CLP" | "UF", crudo: string) =>
  moneda === "UF" ? precioUfTexto(crudo) : precioClpTexto(crudo);
