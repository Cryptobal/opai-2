export type CatalogoReporte = { id: string; titulo: string; descripcion: string; obligatorio: boolean };

export type VistaReporteDt = {
  tipo: string;
  titulo: string;
  cabecera: {
    razonSocial: string;
    rutEmpleador: string;
    trabajador: string | null;
    rutTrabajador: string | null;
    lugar: string;
    periodo: string;
  };
  columnas: { clave: string; etiqueta: string }[];
  filas: Record<string, string | number | boolean | null>[];
  siglasUsadas: string[];
  totalFilas: number;
  provisorio: boolean;
};