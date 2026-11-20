export type Fila = {
  correccionId: string;
  original: { tipo: string; hora: string };
  propuesta: { tipo: string; hora: string };
  motivo: string;
  venceEn: string | null;
};