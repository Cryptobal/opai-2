import { lecturaEquipoTerreno } from "@/lib/terreno-servidor";

export const maxDuration = 10;

/**
 * Contexto del equipo de terreno emparejado (CAR-78 · E2): instalación, turnos de ahora y módulos activos. Sin
 * sesión: la cookie del dispositivo es la credencial. Solo lectura; el equipo revocado recibe 401.
 */
export async function GET(): Promise<Response> {
  return lecturaEquipoTerreno("contexto", "core.terreno.contexto");
}
