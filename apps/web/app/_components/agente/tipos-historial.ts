export type Resumen = {
  id: string;
  titulo: string;
  mensajes: number;
  ultimaActividad: string;
  archivada: boolean;
};
import type { ReferenciaEntidad } from "./tipos";

export type Guardado = {
  rol: "usuario" | "agente";
  texto: string;
  pasos?: string[];
  referencias?: ReferenciaEntidad[];
};
