/** Límite por IP de los extremos OAuth públicos (CAR-247), o null si la ruta no es de OAuth. */
export type LimiteOAuth = {
  ambito: "oauth-registro" | "oauth-ip";
  maximo: number;
  ventanaMs: number;
  fallarCerrado: boolean;
};

export function limiteOAuth(metodo: string, ruta: string): LimiteOAuth | null {
  if (!ruta.startsWith("/api/auth/oauth2/")) return null;
  // Registrar una app crea filas sin autenticación: tope bajo y cerrado si la base del límite cae.
  if (metodo === "POST" && ruta === "/api/auth/oauth2/register")
    return { ambito: "oauth-registro", maximo: 20, ventanaMs: 60 * 60_000, fallarCerrado: true };
  return { ambito: "oauth-ip", maximo: 60, ventanaMs: 60_000, fallarCerrado: false };
}
