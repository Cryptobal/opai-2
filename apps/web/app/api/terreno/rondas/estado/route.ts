import { lecturaEquipoTerreno } from "@/lib/terreno-servidor";

export const maxDuration = 10;

/**
 * Las rondas disponibles y abiertas del equipo de terreno emparejado (CAR-78 · E3e). Sin
 * sesión: la cookie del dispositivo es la credencial. Solo lectura; el equipo revocado recibe 401.
 */
export async function GET(): Promise<Response> {
  return lecturaEquipoTerreno("rondas", "core.terreno.rondas");
}
