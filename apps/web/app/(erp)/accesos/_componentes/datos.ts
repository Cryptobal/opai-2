import { ejecutarComoUsuario } from "@/lib/servidor";

export type Pagina<T> = { items: T[]; siguiente: string | null };

export type Registro = {
  id: string;
  instalacionId: string;
  instalacion: string;
  entradaEn: string;
  salidaEn: string | null;
  tipoRegistro: string;
  nombre: string;
  empresa: string | null;
  documento: string;
  patente: string | null;
  origen: string;
  anulado: boolean;
};

export type RegistroFicha = Registro & {
  recibidoEn: string;
  motivoVisita: string | null;
  campos: { etiqueta: string; valor: string }[];
  docTipo: string;
  lista: "autorizada" | "bloqueada" | null;
  dispositivo: string | null;
  punto: string | null;
  salidaOrigen: string | null;
  anulacion: { en: string; motivo: string } | null;
};

export type Intento = {
  id: string;
  instalacion: string;
  ocurrioEn: string;
  tipoRegistro: string;
  documento: string;
  motivo: string;
};

export const cargarRegistro = (id: string) =>
  ejecutarComoUsuario<RegistroFicha>("erp", "acceso.registros.get", { id });
