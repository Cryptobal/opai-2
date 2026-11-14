import { leerComoEquipo } from "@/lib/terreno/lectura-equipo";

export const maxDuration = 10;

/** Contexto del equipo de terreno emparejado (CAR-78 · E2): instalación, turnos de ahora y módulos activos. Solo lectura. */
export const GET = (): Promise<Response> => leerComoEquipo("contexto", "core.terreno.contexto");
