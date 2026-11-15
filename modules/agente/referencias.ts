import { z } from "zod";

/** Entidad que una capacidad devolvió con ruta interna; nunca una URL inventada por el modelo. */
export const referenciaSchema = z.object({
  id: z.string().min(1).max(120),
  titulo: z.string().min(1).max(200),
  detalle: z.string().max(200).nullable(),
  href: z.string().min(1).max(300),
});
export type Referencia = z.infer<typeof referenciaSchema>;

/** Solo rutas internas de OPAI (`/cuentas/…`); nada de `//`, `javascript:` ni hosts. */
export function hrefOpai(href: string): string | null {
  const h = href.trim();
  if ([...h].some((c) => c.trim() === "" || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
    return null;
  if (!/^\/(?![/\\])[^\\\s]*$/.test(h)) return null;
  return h;
}

function tituloDe(o: Record<string, unknown>): string | null {
  for (const k of ["titulo", "nombre", "etiqueta"] as const) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 200);
  }
  return null;
}

function detalleDe(o: Record<string, unknown>): string | null {
  for (const k of ["detalle", "estado", "subtitulo"] as const) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 200);
  }
  return null;
}

/** Recorre el dato de una capacidad y junta ítems con `id` + `href` interno (+ título si hay). */
export function extraerReferencias(dato: unknown, salida: Map<string, Referencia> = new Map()) {
  if (dato == null) return salida;
  if (Array.isArray(dato)) {
    for (const x of dato) extraerReferencias(x, salida);
    return salida;
  }
  if (typeof dato !== "object") return salida;
  const o = dato as Record<string, unknown>;
  const href = typeof o["href"] === "string" ? hrefOpai(o["href"]) : null;
  const id = typeof o["id"] === "string" ? o["id"].trim() : "";
  const titulo = tituloDe(o);
  if (href && id && titulo) {
    const clave = `${href}|${id}`;
    if (!salida.has(clave))
      salida.set(clave, { id, titulo, detalle: detalleDe(o), href });
  }
  for (const v of Object.values(o)) extraerReferencias(v, salida);
  return salida;
}

const ENLACE_MD = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/** Quita enlaces que no estén en la lista permitida; deja solo el texto visible. */
export function filtrarEnlaces(texto: string, permitidos: ReadonlySet<string>): string {
  return texto.replace(ENLACE_MD, (todo, etiqueta: string, href: string) => {
    const seguro = hrefOpai(href);
    return seguro && permitidos.has(seguro) ? todo : etiqueta;
  });
}

/**
 * Inserta `[título](href)` la primera vez que el título aparece sin enlace, títulos largos primero.
 * No inventa rutas: solo usa las referencias ya extraídas de las capacidades.
 */
export function enlazarTitulos(texto: string, refs: readonly Referencia[]): string {
  const permitidos = new Set(refs.map((r) => r.href));
  let out = filtrarEnlaces(texto, permitidos);
  const orden = [...refs].sort((a, b) => b.titulo.length - a.titulo.length);
  for (const r of orden) {
    if (out.includes(`](${r.href})`)) continue;
    const i = out.toLowerCase().indexOf(r.titulo.toLowerCase());
    if (i < 0) continue;
    const antes = out.slice(0, i);
    if (antes.endsWith("[") || antes.endsWith("](")) continue;
    out = `${out.slice(0, i)}[${out.slice(i, i + r.titulo.length)}](${r.href})${out.slice(i + r.titulo.length)}`;
  }
  return out;
}

/** Hasta 4 tarjetas; si hay más, solo fichas de un segmento (`/cuentas/<id>`). */
export function referenciasParaTarjetas(refs: readonly Referencia[]): Referencia[] {
  if (refs.length <= 4) return [...refs];
  return refs.filter((r) => /^\/[a-z0-9-]+\/[^/]+$/i.test(r.href)).slice(0, 4);
}
