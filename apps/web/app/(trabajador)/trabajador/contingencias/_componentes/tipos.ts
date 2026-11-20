export type Fila = {
  id: string;
  tipoEtiqueta: string;
  horaDeclarada: string;
  instalacionNombre: string;
  motivo: string;
  estado: "pendiente" | "aceptada" | "rechazada";
};