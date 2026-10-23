/**
 * Rate limit básico en memoria por instancia (ventana fija de 60 s). Suficiente para el Brief 01;
 * se centraliza (Redis/Upstash o la base) cuando haya tráfico real.
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

export function ipDe(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local"
  );
}
