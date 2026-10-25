import { headers } from "next/headers";

import { metricasActuales, serverTiming, totalDesdeInicio } from "@/lib/metricas-navegacion";

/**
 * Marca de servidor con las métricas del request (ADR-045): emite el `Server-Timing` del request en
 * un `<script type="application/json">` del HTML, que el gate de Playwright (`e2e/rendimiento.spec.ts`)
 * lee para comprobar fases, total y número de consultas a Neon. Se renderiza al final del contenido,
 * así captura la sesión, la identidad y los datos de la página. El `total` se mide desde que el proxy
 * recibió el request (`x-opai-t0`, inyectada en `proxy.ts`); sin esa cabecera, queda en 0.
 *
 * Va en el HTML y no en una cabecera HTTP porque App Router no deja fijar cabeceras de respuesta tras
 * renderizar en streaming (ver `lib/metricas-navegacion.ts`).
 */
export async function MarcadorMetricas() {
  const total = totalDesdeInicio(Number((await headers()).get("x-opai-t0")));
  const m = metricasActuales();
  const datos = {
    serverTiming: serverTiming(m, total),
    consultas: m.consultas,
    fases: m.fases,
    totalMs: Math.round(total * 10) / 10,
  };
  return (
    <script
      type="application/json"
      id="opai-metricas"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos) }}
    />
  );
}
