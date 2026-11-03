import type { ReactNode } from "react";

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

export type AvisoCpq = {
  id: string;
  tono: "warning" | "info" | "danger";
  titulo: string;
  detalle?: string;
  enlace?: { href: string; etiqueta: string };
};

/** Traduce advertencias técnicas del motor a avisos accionables (CAR-141). */
export function avisosDesdeCalculo(
  advertencias: string[] | undefined,
  ctx?: { nombrePuesto?: string },
): AvisoCpq[] {
  const out: AvisoCpq[] = [];
  const vistos = new Set<string>();
  for (const raw of advertencias ?? []) {
    const a = avisoDesdeTexto(raw, ctx);
    if (a && !vistos.has(a.id)) {
      vistos.add(a.id);
      out.push(a);
    }
  }
  return out;
}

function avisoDesdeTexto(raw: string, ctx?: { nombrePuesto?: string }): AvisoCpq | null {
  const puesto = ctx?.nombrePuesto ?? "el puesto";
  if (raw === "costo laboral pendiente: motor de sueldos") {
    return {
      id: "motor",
      tono: "warning",
      titulo: "Falta completar el costo laboral",
      detalle:
        "Publica los valores legales del día, confirma la mutual adicional de la empresa y asigna sueldo base a cada puesto.",
      enlace: { href: "/configuracion/grupo/remuneraciones", etiqueta: "Ir a Remuneraciones" },
    };
  }
  if (raw.startsWith("costo pendiente: falta sueldo base")) {
    return {
      id: "sueldo-base",
      tono: "warning",
      titulo: `Falta el sueldo base de ${puesto}`,
      detalle: "Configúralo en la línea del puesto o en Instalación › Sueldo.",
      enlace: { href: "/personas/cargos", etiqueta: "Ver cargos" },
    };
  }
  if (raw === "costo pendiente: falta mutual adicional") {
    return {
      id: "mutual",
      tono: "warning",
      titulo: "Falta la tasa de mutual adicional",
      detalle: "Ingrésala en Configuración › Remuneraciones.",
      enlace: { href: "/configuracion/grupo/remuneraciones", etiqueta: "Configurar mutual" },
    };
  }
  if (raw.startsWith("costo pendiente: falta ")) {
    const indicador = raw.replace("costo pendiente: falta ", "");
    return {
      id: `legal-${indicador}`,
      tono: "warning",
      titulo: `Falta el indicador «${indicador}»`,
      detalle: "Publica el valor legal vigente en Remuneraciones.",
      enlace: { href: "/configuracion/grupo/remuneraciones", etiqueta: "Ir a Remuneraciones" },
    };
  }
  if (raw.includes("valores legales")) {
    return {
      id: "legales",
      tono: "warning",
      titulo: "Faltan valores legales para calcular",
      detalle: raw,
      enlace: { href: "/configuracion/grupo/remuneraciones", etiqueta: "Ir a Remuneraciones" },
    };
  }
  if (raw === "falta valor UF") {
    return {
      id: "uf",
      tono: "warning",
      titulo: "Falta el valor UF del día",
      detalle: "Sin UF no se pueden calcular instrumentos en UF.",
      enlace: { href: "/configuracion/grupo/remuneraciones", etiqueta: "Ver remuneraciones" },
    };
  }
  if (raw === "precio subvalorado") {
    return {
      id: "subvalorado",
      tono: "info",
      titulo: "Precio por debajo del mínimo",
      detalle: "El margen efectivo queda bajo el mínimo configurado; pide aprobación antes de enviar.",
    };
  }
  return { id: raw, tono: "warning", titulo: raw };
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
