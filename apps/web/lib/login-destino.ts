/** Entrada sin sesión: el Portal Trabajador tiene su propio ingreso (RUT + PIN); el resto, el de correo. */
export function loginDe(destino?: string): string {
  const base =
    destino === "/trabajador" || destino?.startsWith("/trabajador/")
      ? "/trabajador/login"
      : "/login";
  return destino ? `${base}?next=${encodeURIComponent(destino)}` : base;
}
