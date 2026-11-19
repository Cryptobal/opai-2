import "server-only";

import { executeCapability, type Resultado } from "@opai/capabilities";

import { dispositivoActual } from "@/lib/dispositivo";
import { fuentesReales } from "@/lib/fuentes";
import { contextoSistema } from "@/lib/medidor";
import { permitir } from "@/lib/rate-limit";
import { jsonTerreno } from "@/lib/terreno/json-respuesta";

export type EquipoDeTerreno = NonNullable<Awaited<ReturnType<typeof dispositivoActual>>>;

/**
 * Ejecuta una capacidad interna de Terreno con la empresa del equipo emparejado. El equipo no tiene sesión:
 * su cookie de dispositivo es la credencial y ya fue resuelta (activo o revocado) por `dispositivoActual`.
 * La capacidad vuelve a verificar que el dispositivo sea de la empresa y esté activo.
 */
export async function ejecutarComoEquipo(
  equipo: EquipoDeTerreno,
  capacidad: string,
  entrada: Record<string, unknown>,
  opciones: { dryRun?: boolean } = {},
): Promise<Resultado> {
  // Los módulos activos de la empresa: sin ellos, una capacidad de Rondas, Acceso o Asistencia se rechazaría.
  const ctx = contextoSistema(equipo.tenantId, await fuentesReales.modulosActivos(equipo.tenantId));
  return executeCapability(
    ctx,
    capacidad,
    { dispositivoId: equipo.dispositivoId, ...entrada },
    opciones,
  );
}

/**
 * GET de solo lectura para el equipo de terreno emparejado (cookie del dispositivo = credencial).
 * `cupo` distingue el rate limit entre rutas (`contexto`, `rondas`, `porteria`, …).
 */
export async function lecturaEquipoTerreno(cupo: string, capacidad: string): Promise<Response> {
  const equipo = await dispositivoActual();
  if (!equipo) return jsonTerreno(401, { error: "sin_dispositivo" });
  if (equipo.estado !== "activo") return jsonTerreno(401, { error: "revocado", revocado: true });
  if (!(await permitir(`${cupo}:${equipo.dispositivoId}`, 60, 60_000, { fallarCerrado: true }))) {
    return jsonTerreno(429, { error: "demasiadas_consultas" }, { "Retry-After": "60" });
  }
  const r = await ejecutarComoEquipo(equipo, capacidad, {});
  if (r.ok) return jsonTerreno(200, r.data);
  if (r.error.code === "UNPROCESSABLE") return jsonTerreno(401, { error: "revocado", revocado: true });
  return jsonTerreno(500, { error: "no_se_pudo_leer" });
}

export type PersonaDeLista = {
  id: string;
  nombre: string;
  iniciales: string;
  cargo: string | null;
};

/** Quiénes pueden elegirse en «¿Quién eres?» (vínculo vigente en la instalación del equipo) y esa instalación. */
export async function personasDelEquipo(
  equipo: EquipoDeTerreno,
): Promise<{ instalacion: string; personas: PersonaDeLista[] }> {
  const r = await ejecutarComoEquipo(equipo, "core.personas_terreno.listar", {});
  if (!r.ok) return { instalacion: "", personas: [] };
  const d = r.data as { instalacion: string; items: PersonaDeLista[] };
  return { instalacion: d.instalacion, personas: d.items };
}
