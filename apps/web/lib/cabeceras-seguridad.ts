// Cabeceras de seguridad del borde (núcleo P1). Se aplican a todas las rutas desde `next.config.ts`.

export type Cabecera = { key: string; value: string };

/**
 * Cabeceras de seguridad para todas las rutas. `produccion` activa HSTS (los navegadores la ignoran
 * sobre HTTP, así que no molesta en local).
 */
export function cabecerasSeguridad(opciones: { produccion: boolean }): Cabecera[] {
  const cabeceras: Cabecera[] = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Cámara y geolocalización solo en el propio origen (los portales de terreno las usan); micrófono
    // deshabilitado del todo.
    { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
  ];
  // HSTS solo en producción. Sin `preload` hasta que Carlos lo decida (inscribir el dominio en la
  // lista de precarga es difícil de revertir).
  if (opciones.produccion)
    cabeceras.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  return cabeceras;
}
