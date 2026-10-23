/**
 * Rate limit básico en memoria por instancia (ventana fija de 60 s por defecto). Suficiente para
 * la construcción; se centraliza (Redis/Upstash o la base) cuando haya tráfico real.
 */
const ventanas = new Map<string, { inicio: number; n: number }>();

export function permitir(
  clave: string,
  maximo: number,
  ventanaMs = 60_000,
  ahora = Date.now(),
): boolean {
  const v = ventanas.get(clave);
  if (!v || ahora - v.inicio >= ventanaMs) {
    ventanas.set(clave, { inicio: ahora, n: 1 });
    if (ventanas.size > 10_000) ventanas.clear();
    return true;
  }
  v.n += 1;
  return v.n <= maximo;
}

/** IP del cliente a partir de las cabeceras (Vercel pone `x-forwarded-for`). */
export function ipDeCabeceras(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
}

export function ipDe(req: Request): string {
  return ipDeCabeceras(req.headers);
}

/** Solo para tests: vacía las ventanas. */
export function limpiarVentanas(): void {
  ventanas.clear();
}
