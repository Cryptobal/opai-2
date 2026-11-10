/**
 * URL con el parámetro de una hoja (`?convertir=1`) puesto, conservando ruta, resto de parámetros y
 * ancla. Las hojas se abren en el cliente con esta URL (`history.pushState`): el cambio no pide la
 * página al servidor, así que un fallo puntual de la base no puede tumbar la ficha (CAR-209).
 */
export function urlConHoja(actual: string, param: string, base = "http://local.invalid"): string {
  const u = new URL(actual, base);
  u.searchParams.set(param, "1");
  return `${u.pathname}${u.search}${u.hash}`;
}
