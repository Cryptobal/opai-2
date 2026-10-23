/**
 * Destino seguro tras el login: solo rutas internas ("/x"). Rechaza "//dominio", "/\dominio",
 * esquemas, caracteres de control y cualquier valor que el navegador resolvería fuera del origen.
 */
export function destinoSeguro(next: string | string[] | undefined): string {
  const valor = Array.isArray(next) ? next[0] : next;
  if (!valor || !valor.startsWith("/") || valor.length > 2048) return "/";
  // Barras invertidas y caracteres de control (\t, \n…) los normaliza el navegador a "/".
  const control = [...valor].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f);
  if (control || valor.includes("\\") || valor.startsWith("//")) return "/";
  try {
    const base = "https://opai.invalid";
    const url = new URL(valor, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}
