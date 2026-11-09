/** Prueba gratis que la empresa activó desde su ERP (`platform.cobros.pruebas_gratis_list`, CAR-222). */
export type PruebaGratisVista = {
  moduloId: string;
  nombre: string;
  inicio: string;
  hasta: string;
  estado: "vigente" | "vencida";
  diasRestantes: number;
  extensiones: number;
};
