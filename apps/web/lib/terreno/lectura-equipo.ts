import { dispositivoActual } from "@/lib/dispositivo";
import { permitir } from "@/lib/rate-limit";
import { ejecutarComoEquipo } from "@/lib/terreno-servidor";

const json = (status: number, cuerpo: unknown, extra: Record<string, string> = {}) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store", ...extra } });

/**
 * Lectura del equipo de terreno emparejado (contexto, portería): sin sesión, la cookie del dispositivo es la
 * credencial; límite de 60 lecturas por minuto y por equipo (falla cerrado); el equipo revocado recibe 401.
 */
export async function leerComoEquipo(ambito: string, capacidad: string): Promise<Response> {
  const equipo = await dispositivoActual();
  if (!equipo) return json(401, { error: "sin_dispositivo" });
  if (equipo.estado !== "activo") return json(401, { error: "revocado", revocado: true });
  if (!(await permitir(`${ambito}:${equipo.dispositivoId}`, 60, 60_000, { fallarCerrado: true }))) {
    return json(429, { error: "demasiadas_consultas" }, { "Retry-After": "60" });
  }
  const r = await ejecutarComoEquipo(equipo, capacidad, {});
  if (r.ok) return json(200, r.data);
  if (r.error.code === "UNPROCESSABLE") return json(401, { error: "revocado", revocado: true });
  return json(500, { error: "no_se_pudo_leer" });
}
