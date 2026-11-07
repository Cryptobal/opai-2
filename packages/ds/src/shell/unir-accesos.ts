import type { ItemFijado } from "./fijados";

/** Ruta comparable: sin query, sin hash y sin barra final (la raíz queda «/»). */
export function normalizarHref(href: string): string {
  const ruta = href.split(/[?#]/, 1)[0] ?? "";
  const limpia = ruta.replace(/\/+$/, "");
  return limpia === "" ? "/" : limpia;
}

const claveEtiqueta = (etiqueta: string) =>
  etiqueta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/**
 * «Fijados y recientes» sin repetidos (CAR-224): primero los fijados (decisión explícita de la
 * persona), luego los recientes, y hasta `maximo` accesos. Un acceso se descarta si su destino ya está
 * (misma ruta normalizada) o si es un reciente con el mismo nombre que uno ya mostrado: dos fichas
 * «Cotizaciones» seguidas no se distinguen a simple vista y una de ellas es ruido. Los fijados nunca
 * se esconden entre sí.
 */
export function unirAccesos(
  fijados: readonly ItemFijado[],
  recientes: readonly ItemFijado[],
  maximo: number,
): ItemFijado[] {
  const rutas = new Set<string>();
  const nombres = new Set<string>();
  const lista: ItemFijado[] = [];
  const poner = (item: ItemFijado, reciente: boolean) => {
    const ruta = normalizarHref(item.href);
    const nombre = claveEtiqueta(item.etiqueta);
    if (rutas.has(ruta) || (reciente && nombres.has(nombre))) return;
    rutas.add(ruta);
    nombres.add(nombre);
    lista.push(reciente ? { ...item, href: ruta } : item);
  };
  for (const f of fijados) poner(f, false);
  for (const r of recientes) poner(r, true);
  return lista.slice(0, maximo);
}

/**
 * Una página que lleva el título genérico de su sección (la ficha de una cotización se titula
 * «Cotizaciones») se cuenta como esa sección: así la lista y sus fichas no ocupan dos chips iguales.
 * Solo cambia el destino cuando la ruta cuelga de la entrada de menú y el nombre coincide.
 */
export function canonicalizarReciente(
  reciente: ItemFijado,
  menu: readonly { href: string; etiqueta: string }[],
): ItemFijado {
  const ruta = normalizarHref(reciente.href);
  const nombre = claveEtiqueta(reciente.etiqueta);
  const seccion = menu.find((m) => {
    const base = normalizarHref(m.href);
    return base !== "/" && ruta.startsWith(`${base}/`) && claveEtiqueta(m.etiqueta) === nombre;
  });
  return seccion ? { ...reciente, href: normalizarHref(seccion.href) } : { ...reciente, href: ruta };
}
