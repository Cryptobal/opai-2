/** Lectura GPS puntual del teléfono. */
export type Lectura = { lat: number; lng: number; precisionM: number };

/** Una lectura GPS puntual; sin permiso o sin señal devuelve null: el GPS suma, nunca bloquea (R2). */
export function leerGps(timeoutMs = 8000): Promise<Lectura | null> {
  return new Promise((ok) => {
    if (!("geolocation" in navigator)) return ok(null);
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisionM: p.coords.accuracy }),
      () => ok(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5000 },
    );
  });
}
