import { lecturaEquipoTerreno } from "@/lib/terreno-servidor";

export const maxDuration = 10;

/**
 * El libro de novedades de la instalación del equipo de terreno emparejado (CAR-77 parte 3). Sin sesión: la
 * cookie del dispositivo es la credencial. Solo lectura; el equipo revocado recibe 401.
 */
export async function GET(): Promise<Response> {
  return lecturaEquipoTerreno("libro", "core.libro_novedades_equipo.listar");
}