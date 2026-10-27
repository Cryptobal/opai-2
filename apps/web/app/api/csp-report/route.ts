import { leerReporte, resumirReportes } from "@/lib/csp-reportes";
import { ipDe, permitir } from "@/lib/rate-limit";

export const maxDuration = 10;
const respuesta = (status: number) =>
  new Response(null, {
    status,
    headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) },
  });

/** Telemetría pública del navegador, no una operación de negocio ni una escritura por tenant. */
export async function POST(req: Request): Promise<Response> {
  const cerrado = { fallarCerrado: true };
  if (
    !(await permitir(`csp:${ipDe(req)}`, 30, 60_000, cerrado)) ||
    !(await permitir("csp:global", 300, 60_000, cerrado))
  )
    return respuesta(429);
  const tipo = req.headers.get("content-type")?.split(";")[0]?.trim();
  if (
    !["application/csp-report", "application/reports+json", "application/json"].includes(tipo ?? "")
  )
    return respuesta(415);
  try {
    const reportes = resumirReportes(await leerReporte(req), new URL(req.url).origin);
    if (!reportes) return respuesta(400);
    console.warn("[csp] violaciones", reportes);
    return respuesta(204);
  } catch (error) {
    return respuesta(error instanceof RangeError ? 413 : 400);
  }
}
