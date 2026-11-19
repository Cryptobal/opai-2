import type { DatosPunto } from "./hoja-punto-datos";

export type SetCampoPunto = <K extends keyof DatosPunto>(k: K, v: DatosPunto[K]) => void;