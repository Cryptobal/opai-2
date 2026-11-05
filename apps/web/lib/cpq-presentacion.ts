/* eslint-disable max-lines -- integrado sin lint por la caída de memoria del CI (CAR-181); dividir en el PR de pendientes */
import { conteo } from "./plural";

export { conteo };

/** Etiquetas en español para categorías del motor (nunca claves internas en UI). */
export const ETIQUETA_CATEGORIA_CPQ: Record<string, string> = {
  mano_obra: "Mano de obra",
  feriados: "Feriados",
  uniformes: "Uniformes",
  examenes: "Exámenes",
  colacion: "Colación",
  movilizacion: "Movilización",
  equipamiento: "Equipamiento",
  vehiculos: "Vehículos",
  infraestructura: "Infraestructura",
  otros: "Otros",
};

const ESTADO_BADGE: Record<
  string,
  { etiqueta: string; tono: "neutro" | "success" | "warning" | "danger" | "info" }
> = {
  borrador: { etiqueta: "Borrador", tono: "neutro" },
  en_aprobacion: { etiqueta: "Pendiente de aprobación", tono: "warning" },
  lista: { etiqueta: "Lista para enviar", tono: "info" },
  enviada: { etiqueta: "Enviada", tono: "success" },
  aceptada: { etiqueta: "Aceptada", tono: "success" },
  rechazada: { etiqueta: "Rechazada", tono: "danger" },
  vencida: { etiqueta: "Vencida", tono: "neutro" },
  reemplazada: { etiqueta: "Reemplazada", tono: "neutro" },
  archivada: { etiqueta: "Archivada", tono: "neutro" },
};

export function estadoCpqBadge(estado: string) {
  return ESTADO_BADGE[estado] ?? { etiqueta: estado, tono: "neutro" as const };
}

/** Tono del chip del estado único de la ficha (CAR-192). */
export function tonoEstadoFicha(estado: string): "neutro" | "success" | "warning" | "danger" | "info" {
  if (estado === "incompleta" || estado === "desactualizada" || estado === "margen_bajo") return "warning";
  if (estado === "en_aprobacion") return "warning";
  if (estado === "por_dejar_lista" || estado === "lista_para_enviar") return "info";
  if (estado === "enviada" || estado === "aceptada") return "success";
  if (estado === "rechazada") return "danger";
  return "neutro";
}

export function etiquetaCategoria(id: string) {
  return ETIQUETA_CATEGORIA_CPQ[id] ?? id.replaceAll("_", " ");
}

export function margenPctTexto(margenEfectivoPct: number | null | undefined) {
  if (margenEfectivoPct == null || margenEfectivoPct < 0) return "—";
  return `${(margenEfectivoPct / 10_000).toFixed(1)} %`;
}

export function semaforoEtiqueta(semaforo: string | undefined) {
  if (semaforo === "verde") return "Sobre el mínimo";
  if (semaforo === "amarillo") return "Cerca del mínimo";
  if (semaforo === "rojo") return "Bajo el mínimo";
  return semaforo ?? "—";
}

/** Subtítulo bajo el nombre de la línea (sin repetir «puesto · N posición»). */
export function subtituloLineaCpq(linea: {
  tipo: string;
  posiciones?: number | undefined;
  patron?: string | null | undefined;
  horaInicio?: string | null | undefined;
  horaFin?: string | null | undefined;
  diasCobertura?: number | null | undefined;
  cantidadEscalada?: number | null | undefined;
}): string | null {
  if (linea.tipo !== "puesto") {
    const etiqueta = ETIQUETA_CATEGORIA_CPQ[linea.tipo] ?? linea.tipo.replaceAll("_", " ");
    return etiqueta;
  }
  const partes: string[] = [];
  if (linea.patron?.trim()) partes.push(linea.patron.trim());
  else if (linea.horaInicio && linea.horaFin) partes.push(`${linea.horaInicio}–${linea.horaFin}`);
  const dotacion = linea.posiciones ?? linea.cantidadEscalada;
  if (dotacion != null && dotacion > 0) {
    partes.push(conteo(dotacion, "guardia"));
  }
  if (linea.diasCobertura != null && linea.diasCobertura > 0) {
    partes.push(`${linea.diasCobertura} días a la semana`);
  }
  return partes.length > 0 ? partes.join(" · ") : null;
}

/** Sin cálculo la venta no se inventa: «—» (CAR-162). */
export function ventaMensualTexto(
  ventaMensual: number | null | undefined,
  costoPendiente: boolean,
) {
  if (costoPendiente || ventaMensual == null) return "—";
  return ventaMensual;
}
