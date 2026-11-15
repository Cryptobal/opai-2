/** Portales que pueden mostrar una entrada del changelog in-app (CAR-542). */
export const PORTALES_NOVEDAD = [
  "erp",
  "terreno",
  "supervisor",
  "cliente",
  "trabajador",
  "platform",
] as const;

export type PortalNovedad = (typeof PORTALES_NOVEDAD)[number];

const PORTALES = new Set<string>(PORTALES_NOVEDAD);

/** Audiencia declarada en el frontmatter; si falta, la novedad es solo del ERP. */
export function portalesDeEntrada(portales: readonly string[] | undefined): readonly string[] {
  if (!portales?.length) return ["erp"];
  const limpios = portales.filter((p) => PORTALES.has(p));
  return limpios.length ? limpios : ["erp"];
}

/** El ERP ve todo el catálogo del tenant; los demás portales solo entradas que los incluyen. */
export function visibleEnPortal(portales: readonly string[] | undefined, portal: string): boolean {
  if (portal === "erp") return true;
  return portalesDeEntrada(portales).includes(portal);
}