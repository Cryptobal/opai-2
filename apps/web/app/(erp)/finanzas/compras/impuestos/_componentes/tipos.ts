type Libro = { documentos: number; neto: number; exento: number; iva: number };

/** Salida de `finanzas.impuestos.borrador_f29`. */
export type BorradorF29 = {
  periodo: string;
  ventas: Libro;
  compras: Libro & { pendientesRevision: number; reclamados: number };
  debito: number;
  credito: number;
  ivaAPagar: number;
  remanenteMes: number;
  tasaPpmBps: number;
  ppm: number;
  totalAPagar: number;
  fechaPago: string;
  ivaPostergado: boolean;
};
