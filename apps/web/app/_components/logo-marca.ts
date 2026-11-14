/** Logo para el menú (CAR-335 D6b): el isotipo si hay, si no el logo principal; sin ninguno, nada. */
export function logoDeMarca(datos: unknown): string | undefined {
  if (!datos || typeof datos !== "object" || !("urls" in datos)) return undefined;
  const urls = datos.urls;
  if (!urls || typeof urls !== "object") return undefined;
  const leer = (k: string) => {
    const v: unknown = Reflect.get(urls, k);
    return typeof v === "string" && v ? v : undefined;
  };
  return leer("isotipoId") ?? leer("logoPrincipalId");
}
