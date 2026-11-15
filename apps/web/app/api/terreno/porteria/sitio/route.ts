import { lecturaEquipoTerreno } from "@/lib/terreno-servidor";

export const maxDuration = 10;

/**
 * Quiénes están en sitio, para la portería del equipo de terreno emparejado (CAR-78 · E4d). Sin
 * sesión: la cookie del dispositivo es la credencial. Solo lectura; el equipo revocado recibe 401.
 */
export async function GET(): Promise<Response> {
  return lecturaEquipoTerreno("porteria", "core.terreno.en_sitio");
}
