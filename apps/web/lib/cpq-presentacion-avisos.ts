const REMUNERACIONES = "/configuracion/remuneraciones";

export type AvisoCpq = {
  id: string;
  tono: "warning" | "info" | "danger";
  titulo: string;
  detalle?: string;
  enlace?: { href: string; etiqueta: string };
  /** Abre la hoja de edición del puesto en la ficha (CAR-162). */
  editarPuesto?: boolean;
};

export function avisoDesdeTexto(raw: string, ctx?: { nombrePuesto?: string }): AvisoCpq | null {
  const puesto = ctx?.nombrePuesto ?? "el puesto";
  if (raw === "costo laboral pendiente: motor de sueldos") {
    return {
      id: "motor",
      tono: "warning",
      titulo: "Falta completar el costo laboral",
      detalle: "Publica los valores legales, confirma la mutual adicional y asigna sueldo base a cada puesto.",
      enlace: { href: REMUNERACIONES, etiqueta: "Ir a Remuneraciones" },
    };
  }
  if (raw.startsWith("costo pendiente: falta sueldo base")) {
    return {
      id: "sueldo-base",
      tono: "warning",
      titulo: `Falta el sueldo base de ${puesto}`,
      detalle: "Configúralo en la hoja de edición del puesto.",
      editarPuesto: true,
    };
  }
  if (raw === "costo pendiente: mutual adicional sin confirmar") {
    return {
      id: "mutual-sin-confirmar",
      tono: "warning",
      titulo: "Mutual adicional sin confirmar",
      detalle:
        "El cálculo usa 0 % de mutual adicional. Confírmala en Remuneraciones antes de enviar la cotización al cliente.",
      enlace: { href: REMUNERACIONES, etiqueta: "Confirmar mutual" },
    };
  }
  if (raw === "costo pendiente: falta mutual adicional") {
    return {
      id: "mutual",
      tono: "warning",
      titulo: "Falta la tasa de mutual adicional",
      detalle: "Ingrésala y confírmala en Configuración › Remuneraciones.",
      enlace: { href: REMUNERACIONES, etiqueta: "Configurar mutual" },
    };
  }
  if (raw.startsWith("costo pendiente: falta ")) {
    const indicador = raw.replace("costo pendiente: falta ", "");
    return {
      id: `legal-${indicador}`,
      tono: "warning",
      titulo: `Falta el indicador «${indicador}»`,
      detalle: "Publica el valor legal vigente en Remuneraciones.",
      enlace: { href: REMUNERACIONES, etiqueta: "Ir a Remuneraciones" },
    };
  }
  if (raw.includes("valores legales")) {
    return {
      id: "legales",
      tono: "warning",
      titulo: "Faltan valores legales para calcular",
      detalle: raw,
      enlace: { href: REMUNERACIONES, etiqueta: "Ir a Remuneraciones" },
    };
  }
  if (raw === "falta valor UF") {
    return {
      id: "uf",
      tono: "warning",
      titulo: "Falta el valor UF del día",
      detalle: "Sin UF no se pueden calcular instrumentos en UF.",
      enlace: { href: REMUNERACIONES, etiqueta: "Ver remuneraciones" },
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
