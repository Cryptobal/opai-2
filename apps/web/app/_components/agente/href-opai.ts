/** Solo rutas internas de OPAI (`/cuentas/…`); nada de hosts ni esquemas. */
export function hrefOpai(href: string): string | null {
  const h = href.trim();
  if ([...h].some((c) => c.trim() === "" || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
    return null;
  if (!/^\/(?![/\\])[^\\\s]*$/.test(h)) return null;
  return h;
}
