export type Tramo = "por_vencer" | "1_30" | "31_60" | "61_mas";

export type ResumenCobranza = {
  hoy: string;
  tramos: Record<Tramo, number>;
  totalVencido: number;
  deudores: Deudor[];
};

export type Deudor = {
  cuentaId: string;
  nombre: string;
  rut: string | null;
  facturasVencidas: number;
  saldoVencido: number;
  atrasoMaximoDias: number;
  tramo: Tramo;
  ultimaGestion: string | null;
};

export type FacturaVencida = {
  documentoId: string;
  folio: number | null;
  vencimiento: string;
  atrasoDias: number;
  saldo: number;
  tramo: Tramo;
  pausada: boolean;
  pasosEnviados: number[];
};

export type Gestion = {
  id: string;
  documentoId: string;
  canal: "correo" | "whatsapp_manual" | "nota";
  origen: "manual" | "automatico";
  paso: number | null;
  resultado: "enviado" | "fallido" | "omitido";
  detalle: string | null;
  fecha: string;
};

export type FichaDeudor = {
  cuentaId: string;
  nombre: string;
  rut: string | null;
  saldoVencido: number;
  facturas: FacturaVencida[];
  contactos: { nombre: string; email: string | null; telefono: string | null }[];
  gestiones: Gestion[];
};
