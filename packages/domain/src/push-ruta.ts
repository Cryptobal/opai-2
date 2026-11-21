/** Ruta interna del portal para `data.ruta` de push (sin host, query ni open redirect). */
export function rutaPushInterna(ruta: string | null | undefined): string {
  const defecto = "/bandeja";
  if (!ruta) return defecto;
  const limpia = ruta.trim();
  if (!limpia.startsWith("/") || limpia.startsWith("//") || limpia.includes("://") || limpia.includes("\\")) {
    return defecto;
  }
  const path = limpia.split(/[?#]/)[0] ?? limpia;
  if (path.includes("..") || !/^\/[A-Za-z0-9._\-/]*$/.test(path)) return defecto;
  return path;
}