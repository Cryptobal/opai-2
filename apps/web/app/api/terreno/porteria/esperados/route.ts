import { leerComoEquipo } from "@/lib/terreno/lectura-equipo";

export const maxDuration = 10;

/** Visitantes prerregistrados para hoy, para la portería del equipo de terreno emparejado (CAR-478). Solo lectura. */
export const GET = (): Promise<Response> =>
  leerComoEquipo("porteria-esperados", "core.terreno.esperados");
