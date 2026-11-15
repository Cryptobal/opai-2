/**
 * Consulta firmada del OAuth del MCP (CAR-247) en las pantallas de acceso. El proveedor la agrega a
 * `/login`, `/elegir-empresa?oauth=1` y `/autorizar`; aquí solo se rearma: la firma la verifica el
 * servidor de `@opai/auth` antes de usarla.
 */
type Params = Record<string, string | string[] | undefined>;

export const RUTA_CONTINUAR_OAUTH = "/autorizar/continuar";

/** Rearma la consulta conservando claves repetidas (`ba_param`), sin las propias de la pantalla. */
export function consultaDe(params: Params, sin: readonly string[] = []): string {
  const q = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === undefined || sin.includes(clave)) continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) q.append(clave, v);
  }
  return q.toString();
}

/** En `/login` con consulta firmada, tras entrar se vuelve a reanudar la autorización. */
export function destinoContinuarOAuth(params: Params): string | null {
  if (params["sig"] === undefined) return null;
  return `${RUTA_CONTINUAR_OAUTH}?${consultaDe(params, ["next"])}`;
}

export const esContinuarOAuth = (destino: string): boolean =>
  destino.startsWith(`${RUTA_CONTINUAR_OAUTH}?`);
