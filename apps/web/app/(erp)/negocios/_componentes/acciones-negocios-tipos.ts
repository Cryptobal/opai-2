/** Acción secundaria de Negocios (CAR-371). */
export type AccionNegocios = {
  id: "seguimiento" | "reportes" | "transferir" | "exportar";
  href: string;
};

export const ETIQUETA_ACCION: Record<AccionNegocios["id"], string> = {
  seguimiento: "Pendientes de seguimiento",
  reportes: "Reportes",
  transferir: "Transferir cartera",
  exportar: "Exportar a Excel",
};
