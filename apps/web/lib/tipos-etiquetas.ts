// Etiquetas que acompañan a las filas de las listas de Comercial.

export type EtiquetaDeFila = {
  id: string;
  nombre: string;
  tono: "neutral" | "info" | "success" | "warning" | "danger";
};

export type ConEtiquetas<T> = T & { etiquetas?: EtiquetaDeFila[] };
