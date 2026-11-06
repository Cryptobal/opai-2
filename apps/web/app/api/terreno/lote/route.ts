import { LOTE_MAXIMO_BYTES } from "@opai/domain";

import { dispositivoActual } from "@/lib/dispositivo";
import { permitir } from "@/lib/rate-limit";
import { ejecutarComoEquipo } from "@/lib/terreno-servidor";

export const maxDuration = 20;

const json = (status: number, cuerpo: unknown, extra: Record<string, string> = {}) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store", ...extra } });

/**
 * Recibe el lote de hechos que un equipo de terreno capturó, posiblemente sin conexión (CAR-78 · B3). Sin
 * sesión: la cookie del dispositivo es la credencial, y solo desde el mismo origen. El equipo revocado
 * recibe 401 y no escribe nada. Responde por hecho: recibido, duplicado o rechazado (con su motivo).
 */
export async function POST(req: Request): Promise<Response> {
  const origen = req.headers.get("origin");
  if (origen && origen !== new URL(req.url).origin) return json(403, { error: "origen" });
  if (req.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") {
    return json(415, { error: "tipo" });
  }
  const equipo = await dispositivoActual();
  if (!equipo) return json(401, { error: "sin_dispositivo" });
  if (equipo.estado !== "activo") return json(401, { error: "revocado", revocado: true });
  if (!(await permitir(`lote:${equipo.dispositivoId}`, 30, 60_000, { fallarCerrado: true }))) {
    return json(429, { error: "demasiados_envios" }, { "Retry-After": "60" });
  }
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > LOTE_MAXIMO_BYTES) return json(413, { error: "lote_grande" });
  const texto = await req.text();
  if (texto.length > LOTE_MAXIMO_BYTES) return json(413, { error: "lote_grande" });
  let cuerpo: { horaEnvio?: unknown; hechos?: unknown };
  try {
    cuerpo = JSON.parse(texto) as typeof cuerpo;
  } catch {
    return json(400, { error: "json" });
  }
  const r = await ejecutarComoEquipo(equipo, "core.hechos_terreno.recibir", {
    horaEnvio: cuerpo.horaEnvio,
    hechos: cuerpo.hechos,
  });
  if (r.ok) return json(200, r.data);
  if (r.error.code === "INVALID_INPUT") return json(422, { error: "lote_invalido" });
  if (r.error.code === "UNPROCESSABLE") return json(401, { error: "revocado", revocado: true });
  return json(500, { error: "no_se_pudo_recibir" });
}
