import { leerComoEquipo } from "@/lib/terreno/lectura-equipo";

export const maxDuration = 10;

/** Quiénes están en sitio, para la portería del equipo de terreno emparejado (CAR-78 · E4d). Solo lectura. */
export const GET = (): Promise<Response> => leerComoEquipo("porteria", "core.terreno.en_sitio");
