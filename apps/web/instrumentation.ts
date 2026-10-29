import type { Instrumentation } from "next";

/**
 * Captura los errores del servidor que no pasan por `executeCapability` (render de un Server
 * Component, una ruta o una Server Action sin capacidad): log estructurado sin cuerpo ni cabeceras
 * de la petición (CAR-49). Sentry queda fuera hasta que Carlos entregue el DSN.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  console.error("[request] error_interno", {
    evento: "request.error_interno",
    ruta: context.routePath,
    tipo: context.routeType,
    method: request.method,
    errorName: error instanceof Error ? error.name : typeof error,
  });
};
