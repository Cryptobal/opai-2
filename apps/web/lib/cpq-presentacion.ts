import type { ReactNode } from "react";

import { avisoDesdeTexto, type AvisoCpq } from "@/lib/cpq-presentacion-avisos";

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

export type { AvisoCpq };

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

export function etiquetaCategoria(id: string) {
  return ETIQUETA_CATEGORIA_CPQ[id] ?? id.replaceAll("_", " ");
}

export function margenPctTexto(margenEfectivoPct: number | null | undefined, costoPendiente = false) {
  if (costoPendiente || margenEfectivoPct == null || margenEfectivoPct < 0) return "—";
  return `${(margenEfectivoPct / 10_000).toFixed(1)} %`;
}

export function semaforoEtiqueta(semaforo: string | undefined) {
  if (semaforo === "verde") return "Sobre el mínimo";
  if (semaforo === "amarillo") return "Cerca del mínimo";
  if (semaforo === "rojo") return "Bajo el mínimo";
  return semaforo ?? "—";
}

/** Personas escaladas del motor (escala 10_000), con plural correcto. */
export function dotacionPersonasTexto(personasEscaladas: number | undefined) {
  if (personasEscaladas == null) return "—";
  const n = Math.round(personasEscaladas / 10_000);
  return `${n} ${n === 1 ? "persona" : "personas"}`;
}

/** Traduce advertencias técnicas del motor a avisos accionables (CAR-141). */
export function avisosDesdeCalculo(
  advertencias: string[] | undefined,
  ctx?: { nombrePuesto?: string },
): AvisoCpq[] {
  const out: AvisoCpq[] = [];
  const vistos = new Set<string>();
  const rawList = advertencias ?? [];
  const hayEspecificos = rawList.some(
    (a) =>
      a.startsWith("costo pendiente:") &&
      a !== "costo laboral pendiente: motor de sueldos" &&
      !a.includes("motor de sueldos"),
  );
  for (const raw of rawList) {
    if (raw === "costo laboral pendiente: motor de sueldos" && hayEspecificos) continue;
    const a = avisoDesdeTexto(raw, ctx);
    if (a && !vistos.has(a.id)) {
      vistos.add(a.id);
      out.push(a);
    }
  }
  return out;
}

/** Texto corto tras recalcular cuando aún faltan datos (CAR-162). */
export function mensajeFaltantesRecalcular(advertencias: string[] | undefined): string | null {
  const avisos = avisosDesdeCalculo(advertencias);
  if (avisos.length === 0) return null;
  return avisos.map((a) => a.titulo).join(" · ");
}

export function avisoLineaPuesto(mensaje: string | undefined, nombreLinea: string): AvisoCpq | null {
  if (!mensaje) return null;
  return avisoDesdeTexto(mensaje, { nombrePuesto: nombreLinea });
}

/** Subtítulo bajo el nombre de la línea (sin repetir «puesto · N posición»). */
export function subtituloLineaCpq(linea: {
  tipo: string;
  posiciones?: number;
  patron?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  diasCobertura?: number | null;
  cantidadEscalada?: number | null;
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
    partes.push(`${dotacion} guardia${dotacion === 1 ? "" : "s"}`);
  }
  if (linea.diasCobertura != null && linea.diasCobertura > 0) {
    partes.push(`${linea.diasCobertura} días a la semana`);
  }
  return partes.length > 0 ? partes.join(" · ") : null;
}

export function ventaMensualTexto(ventaMensual: number | null | undefined, costoPendiente: boolean) {
  if (costoPendiente || ventaMensual == null) return "Pendiente";
  return ventaMensual;
}

export function costoCategoriaTexto(costoMensual: number, pendiente: boolean) {
  if (pendiente || costoMensual === 0) return "Pendiente";
  return costoMensual;
}

export type EnlaceCpq = { href: string; etiqueta: string; children?: ReactNode };
