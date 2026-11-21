import { estadoCpqBadge } from "@/lib/cpq-presentacion";

const ESTADOS_LISTA = [
  "borrador",
  "en_aprobacion",
  "lista",
  "enviada",
  "aceptada",
  "rechazada",
  "vencida",
  "reemplazada",
] as const;

export const opcionesEstadoCpq = ESTADOS_LISTA.map((valor) => ({
  valor,
  etiqueta: estadoCpqBadge(valor).etiqueta,
}));