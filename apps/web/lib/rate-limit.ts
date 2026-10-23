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

/** ¿La clave superó `maximo` fallos en la ventana? No cuenta nada (solo consulta). */
export function bloqueado(clave: string, maximo: number, ventanaMs: number, ahora = Date.now()) {
  const v = ventanas.get(clave);
  return !!v && ahora - v.inicio < ventanaMs && v.n >= maximo;
}

/** Registra un fallo (p. ej. credenciales inválidas) en la ventana de la clave. */
export function registrarFallo(clave: string, ventanaMs: number, ahora = Date.now()): void {
  const v = ventanas.get(clave);
  if (!v || ahora - v.inicio >= ventanaMs) {
    ventanas.set(clave, { inicio: ahora, n: 1 });
    if (ventanas.size > 10_000) ventanas.clear();
    return;
  }
  v.n += 1;
}

/** Olvida los fallos de una clave (login exitoso). */
export function olvidar(clave: string): void {
  ventanas.delete(clave);
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
