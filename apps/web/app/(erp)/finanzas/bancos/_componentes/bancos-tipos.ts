export type CuentaBanco = {
  id: string;
  banco: string;
  numeroVisible: string;
  moneda: string;
  flujoFilaId: string | null;
  activa: boolean;
  ultimaSyncEn: string | null;
  saldoBanco: number | null;
};

export type MovimientoBanco = {
  id: string;
  cuentaId: string;
  fecha: string;
  monto: number;
  glosa: string;
  referencia: string | null;
  estado: string;
  origen: string;
  /** Dónde quedó conciliado (fila del flujo, «Facturas» o «Compras») y la regla que lo hizo, si fue una. */
  clasificacion?: string | null;
  regla?: string | null;
};

export const PESTANAS_ESTADO_BANCO = [
  { id: "pendiente", etiqueta: "Sin reconocer" },
  { id: "sugerido", etiqueta: "Sugeridos" },
  { id: "por_autorizar", etiqueta: "Por autorizar" },
  { id: "conciliado", etiqueta: "Conciliados" },
  { id: "ignorado", etiqueta: "Ignorados" },
] as const;
