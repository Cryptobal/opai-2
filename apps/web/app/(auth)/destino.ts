/** Destino seguro tras el login: solo rutas internas ("/x"), nunca "//dominio" ni URLs absolutas. */
export function destinoSeguro(next: string | string[] | undefined): string {
  const valor = Array.isArray(next) ? next[0] : next;
  return valor && valor.startsWith("/") && !valor.startsWith("//") ? valor : "/";
}
