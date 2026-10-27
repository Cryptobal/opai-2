// Cabeceras de seguridad del borde (núcleo P1 · CSP y HSTS). Se aplican a todas las rutas desde
// `next.config.ts`. La CSP viaja en modo Report-Only: no bloquea todavía porque el modo estricto
// con nonce exige reescribir la respuesta en el proxy (`apps/web/proxy.ts`), que lo cambia el #45
// (brief/04-pwa). Tras el #45 pasa a `Content-Security-Policy` con nonce por request y se puede
// retirar `'unsafe-inline'` de `script-src`.

export type Cabecera = { key: string; value: string };

// Host de Cloudflare R2 (S3-compatible): subida PUT firmada directa desde el navegador, descarga y
// vista previa de documentos y logos de marca (ADR-019, ADR-028, ADR-039). El `accountId` cambia por
// entorno (`R2_ACCOUNT_ID`), por eso el comodín de subdominio en vez de incrustar un valor del entorno.
const R2 = "https://*.r2.cloudflarestorage.com";

/**
 * CSP en directivas. Lo que no necesita nonce ya va estricto: `default-src 'self'`, `object-src`,
 * `frame-ancestors` y `base-uri`/`form-action`. `img-src`/`connect-src`/`frame-src` suman R2 porque
 * la app sube, descarga y previsualiza archivos contra ese host (los mapas van por `/api/geo/mapa`,
 * self). `script-src`/`style-src` conservan `'unsafe-inline'` (y `'unsafe-eval'` solo en desarrollo,
 * para el refresco de Next) hasta que el nonce del #45 permita endurecerlos.
 */
export function construirCsp(desarrollo: boolean): string {
  const script = desarrollo
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `img-src 'self' data: blob: ${R2}`,
    `connect-src 'self' ${R2}`,
    `frame-src 'self' blob: ${R2}`,
    script,
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");
}

/**
 * Cabeceras de seguridad para todas las rutas. `produccion` activa HSTS (los navegadores la ignoran
 * sobre HTTP, así que no molesta en local); `desarrollo` relaja `script-src` para el refresco de Next.
 */
export function cabecerasSeguridad(opciones: {
  produccion: boolean;
  desarrollo: boolean;
}): Cabecera[] {
  const cabeceras: Cabecera[] = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Cámara y geolocalización solo en el propio origen (los portales de terreno las usan); micrófono
    // deshabilitado del todo.
    { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
    // Report-Only por ahora (ver cabecera del archivo): reporta, no bloquea.
    { key: "Content-Security-Policy-Report-Only", value: construirCsp(opciones.desarrollo) },
  ];
  // HSTS solo para el host servido. NÚCLEO-H: sin inventario HTTPS verificado de TODOS los
  // subdominios no se habilitan includeSubDomains ni preload.
  if (opciones.produccion)
    cabeceras.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000",
    });
  return cabeceras;
}
