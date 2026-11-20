import { lecturaEquipoTerreno } from "@/lib/terreno-servidor";

export const maxDuration = 10;

/** Visitantes prerregistrados para hoy, para la portería del equipo de terreno emparejado (CAR-478). Solo lectura. */
export const GET = (): Promise<Response> =>
  lecturaEquipoTerreno("porteria-esperados", "core.terreno.esperados");
