// Cabeceras de seguridad del borde (núcleo P1 · CSP y HSTS). Se aplican a todas las rutas desde
// `next.config.ts` y el proxy. La CSP va en enforcement (CAR-57): bloquea scripts, estilos, marcos,
// objetos, conexiones e imágenes de otros orígenes. Conserva 'unsafe-inline' en script-src y
// style-src porque Next 16 con PPR emite los scripts inline del shell estático (y los de la
// reanudación) sin nonce; un nonce en la respuesta anularía 'unsafe-inline' y rompería ese shell.
// El proxy deja el nonce solo en el request, para TEMA/SW y los scripts que Next sí firma.

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
 * para el refresco de Next) mientras el shell estático PPR no lleve nonce ni hash (CAR-57).
 */
export function construirCsp(desarrollo: boolean, nonce?: string): string {
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
    script + (nonce ? ` 'nonce-${nonce}'` : ""),
    "style-src 'self' 'unsafe-inline'",
    "report-uri /api/csp-report",
    "report-to csp",
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
    // Enforcement (CAR-57): bloquea y además reporta a /api/csp-report (ver cabecera del archivo).
    { key: "Content-Security-Policy", value: construirCsp(opciones.desarrollo) },
    { key: "Reporting-Endpoints", value: 'csp="/api/csp-report"' },
  ];
  // HSTS solo para el host servido. NÚCLEO-H y CAR-57: sin inventario HTTPS verificado de TODOS los
  // subdominios de opai.cl no se habilitan includeSubDomains ni preload (pendiente en ESTADO.md).
  if (opciones.produccion)
    cabeceras.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000",
    });
  return cabeceras;
}
