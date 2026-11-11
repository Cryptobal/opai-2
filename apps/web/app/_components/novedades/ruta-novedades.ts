/** Ruta de la pantalla Novedades según el portal activo (cada route group tiene su prefijo). */
export function rutaNovedades(portal: string): string {
  if (portal === "erp") return "/novedades";
  if (portal === "platform") return "/platform/novedades";
  return `/${portal}/novedades`;
}
