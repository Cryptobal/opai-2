import "server-only";

import { executeCapability, type Resultado } from "@opai/capabilities";

import type { dispositivoActual } from "@/lib/dispositivo";
import { fuentesReales } from "@/lib/fuentes";
import { contextoSistema } from "@/lib/medidor";

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
