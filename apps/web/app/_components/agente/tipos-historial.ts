export type Resumen = {
  id: string;
  titulo: string;
  mensajes: number;
  ultimaActividad: string;
  archivada: boolean;
};
export type Guardado = { rol: "usuario" | "agente"; texto: string; pasos?: string[] };
