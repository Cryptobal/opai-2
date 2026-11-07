import type { Contexto } from "../../types";
import type { MotivoRechazo } from "./hechos-evaluar";

export type Hecho = {
  clave: string;
  tipo: string;
  payload: unknown;
  personaId?: string | null | undefined;
  horaHecho: string;
};
type Datos<A extends { data: unknown }> = Extract<A["data"], readonly unknown[]>[number];
type Db = Contexto["db"];
export type FilaRegistro = Datos<Parameters<Db["registroAcceso"]["createMany"]>[0]>;
export type FilaIntento = Datos<Parameters<Db["intentoDenegado"]["createMany"]>[0]>;
export type FilaSalida = Datos<Parameters<Db["salidaAcceso"]["createMany"]>[0]>;
export type Tiempo = { recibidoEn: Date; corregir: (h: Date) => Date };
export type Equipo = { id: string; instalacionId: string };
export type Rechazos = Map<string, MotivoRechazo>;
