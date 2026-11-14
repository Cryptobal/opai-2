/** Lectura GPS puntual del teléfono. */
export type Lectura = { lat: number; lng: number; precisionM: number };

/**
 * Una lectura GPS puntual; sin permiso, sin señal o pasado el tope devuelve null: el GPS suma, nunca bloquea (R2).
 * El tope propio cubre también el tiempo en que el navegador pide el permiso de ubicación.
 */
export function leerGps(timeoutMs = 8000): Promise<Lectura | null> {
  const lectura = new Promise<Lectura | null>((ok) => {
    if (!("geolocation" in navigator)) return ok(null);
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisionM: p.coords.accuracy }),
      () => ok(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5000 },
    );
  });
  const tope = new Promise<null>((ok) => setTimeout(() => ok(null), timeoutMs));
  return Promise.race([lectura, tope]);
}
