import { LOTE_MAXIMO_BYTES } from "@opai/domain";

import { dispositivoActual } from "@/lib/dispositivo";
import { permitir } from "@/lib/rate-limit";
import { jsonTerreno } from "@/lib/terreno/json-respuesta";
import { ejecutarComoEquipo } from "@/lib/terreno-servidor";

export const maxDuration = 20;

/**
 * Recibe el lote de hechos que un equipo de terreno capturó, posiblemente sin conexión (CAR-78 · B3). Sin
 * sesión: la cookie del dispositivo es la credencial, y solo desde el mismo origen. El equipo revocado
 * recibe 401 y no escribe nada. Responde por hecho: recibido, duplicado o rechazado (con su motivo).
 */
export async function POST(req: Request): Promise<Response> {
  const origen = req.headers.get("origin");
  if (origen && origen !== new URL(req.url).origin) return jsonTerreno(403, { error: "origen" });
  if (req.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") {
    return jsonTerreno(415, { error: "tipo" });
  }
  const equipo = await dispositivoActual();
  if (!equipo) return jsonTerreno(401, { error: "sin_dispositivo" });
  if (equipo.estado !== "activo") return jsonTerreno(401, { error: "revocado", revocado: true });
  if (!(await permitir(`lote:${equipo.dispositivoId}`, 30, 60_000, { fallarCerrado: true }))) {
    return jsonTerreno(429, { error: "demasiados_envios" }, { "Retry-After": "60" });
  }
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > LOTE_MAXIMO_BYTES) return jsonTerreno(413, { error: "lote_grande" });
  const texto = await req.text();
  if (texto.length > LOTE_MAXIMO_BYTES) return jsonTerreno(413, { error: "lote_grande" });
  let cuerpo: { horaEnvio?: unknown; hechos?: unknown };
  try {
    cuerpo = JSON.parse(texto) as typeof cuerpo;
  } catch {
    return jsonTerreno(400, { error: "json" });
  }
  const r = await ejecutarComoEquipo(equipo, "core.hechos_terreno.recibir", {
    horaEnvio: cuerpo.horaEnvio,
    hechos: cuerpo.hechos,
  });
  if (r.ok) return jsonTerreno(200, r.data);
  if (r.error.code === "INVALID_INPUT") return jsonTerreno(422, { error: "lote_invalido" });
  if (r.error.code === "UNPROCESSABLE") return jsonTerreno(401, { error: "revocado", revocado: true });
  return jsonTerreno(500, { error: "no_se_pudo_recibir" });
}
