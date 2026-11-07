import { dispositivoActual } from "@/lib/dispositivo";
import { permitir } from "@/lib/rate-limit";
import { ejecutarComoEquipo } from "@/lib/terreno-servidor";

export const maxDuration = 10;

const json = (status: number, cuerpo: unknown, extra: Record<string, string> = {}) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store", ...extra } });

/**
 * Contexto del equipo de terreno emparejado (CAR-78 · E2): instalación, turnos de ahora y módulos activos. Sin
 * sesión: la cookie del dispositivo es la credencial. Solo lectura; el equipo revocado recibe 401.
 */
export async function GET(): Promise<Response> {
  const equipo = await dispositivoActual();
  if (!equipo) return json(401, { error: "sin_dispositivo" });
  if (equipo.estado !== "activo") return json(401, { error: "revocado", revocado: true });
  if (!(await permitir(`contexto:${equipo.dispositivoId}`, 60, 60_000, { fallarCerrado: true }))) {
    return json(429, { error: "demasiadas_consultas" }, { "Retry-After": "60" });
  }
  const r = await ejecutarComoEquipo(equipo, "core.terreno.contexto", {});
  if (r.ok) return json(200, r.data);
  if (r.error.code === "UNPROCESSABLE") return json(401, { error: "revocado", revocado: true });
  return json(500, { error: "no_se_pudo_leer" });
}
