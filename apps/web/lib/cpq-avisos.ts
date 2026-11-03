/** Página real de Remuneraciones (CAR-162: antes había enlaces a rutas que daban 404). */
export const RUTA_REMUNERACIONES = "/configuracion/remuneraciones";
/** Abre la confirmación de la mutual adicional al llegar a Remuneraciones. */
export const RUTA_CONFIRMAR_MUTUAL = `${RUTA_REMUNERACIONES}?mutual=1`;

export type AccionAvisoCpq = { tipo: "editar_linea"; lineaId: string; etiqueta: string };

export type AvisoCpq = {
  id: string;
  tono: "warning" | "info" | "danger";
  titulo: string;
  detalle?: string;
  enlace?: { href: string; etiqueta: string };
  /** Acción local (no navega): abre la hoja de edición de la línea. */
  accion?: AccionAvisoCpq;
  /** Impide calcular el costo (la mutual supuesta no bloquea el cálculo, solo el envío). */
  bloquea: boolean;
};

/** Aviso tipado que devuelve el servidor (`calculo.avisos`, CAR-162). */
export type AvisoServidorCpq = {
  codigo: string;
  mensaje: string;
  lineaId?: string;
  indicador?: string;
};

/** Advertencias de texto que ya quedan cubiertas por un aviso con código. */
const CUBIERTAS = (a: string) =>
  a === "costo laboral pendiente: motor de sueldos" ||
  a.startsWith("costo pendiente: falta") ||
  a.startsWith("Mutual adicional sin confirmar");

function desdeCodigo(a: AvisoServidorCpq): AvisoCpq | null {
  if (a.codigo === "juego_legal_faltante") {
    return {
      id: `legal-${a.indicador ?? "juego"}`,
      tono: "warning",
      titulo: `Falta el valor legal «${a.indicador ?? "indicadores"}»`,
      detalle:
        "Sin ese valor no se puede calcular el costo. Revisa los indicadores en Remuneraciones.",
      enlace: { href: RUTA_REMUNERACIONES, etiqueta: "Ir a Remuneraciones" },
      bloquea: true,
    };
  }
  if (a.codigo === "mutual_sin_confirmar") {
    return {
      id: "mutual",
      tono: "info",
      titulo: "Mutual adicional sin confirmar: se calcula con 0 %",
      detalle:
        "Puedes cotizar, pero para enviar al cliente hay que confirmar la tasa de la empresa.",
      enlace: { href: RUTA_CONFIRMAR_MUTUAL, etiqueta: "Confirmar mutual" },
      bloquea: false,
    };
  }
  if (a.codigo === "sueldo_faltante" && a.lineaId) {
    return {
      id: `sueldo-${a.lineaId}`,
      tono: "warning",
      titulo: a.mensaje,
      detalle: "Ingrésalo en el puesto para calcular el costo.",
      accion: { tipo: "editar_linea", lineaId: a.lineaId, etiqueta: "Ingresar sueldo" },
      bloquea: true,
    };
  }
  return null;
}

/** Cálculos congelados antes de CAR-162 (sin `avisos`): se traduce el texto, sin enlaces rotos. */
function desdeTexto(raw: string): AvisoCpq {
  if (raw === "falta valor UF" || raw === "Falta valor UF del día o del período.") {
    return {
      id: "uf",
      tono: "warning",
      titulo: "Falta el valor UF del día",
      detalle: "Sin UF no se pueden calcular instrumentos en UF.",
      enlace: { href: RUTA_REMUNERACIONES, etiqueta: "Ver remuneraciones" },
      bloquea: true,
    };
  }
  if (raw === "precio subvalorado") {
    return {
      id: "subvalorado",
      tono: "info",
      titulo: "Precio por debajo del mínimo",
      detalle:
        "El margen efectivo queda bajo el mínimo configurado; pide aprobación antes de enviar.",
      bloquea: false,
    };
  }
  if (raw.includes("valores legales")) {
    return {
      id: "legales",
      tono: "warning",
      titulo: "Faltan valores legales para calcular",
      detalle: "Revisa los indicadores vigentes en Remuneraciones.",
      enlace: { href: RUTA_REMUNERACIONES, etiqueta: "Ir a Remuneraciones" },
      bloquea: true,
    };
  }
  if (CUBIERTAS(raw)) {
    return {
      id: "costo-laboral",
      tono: "warning",
      titulo: "Falta completar el costo laboral",
      detalle: "Recalcula para ver qué falta: sueldo de un puesto o un valor legal.",
      enlace: { href: RUTA_REMUNERACIONES, etiqueta: "Ir a Remuneraciones" },
      bloquea: true,
    };
  }
  return { id: raw, tono: "warning", titulo: raw, bloquea: false };
}

/** Avisos accionables del cálculo: primero los tipados por código, luego el resto de advertencias. */
export function avisosCpq(calculo: {
  advertencias?: string[];
  avisos?: AvisoServidorCpq[];
}): AvisoCpq[] {
  const tipados = calculo.avisos;
  const textos = (calculo.advertencias ?? []).filter((a) => !tipados || !CUBIERTAS(a));
  const todos = [...(tipados ?? []).map(desdeCodigo), ...textos.map(desdeTexto)];
  const vistos = new Set<string>();
  return todos.filter((a): a is AvisoCpq => {
    if (!a || vistos.has(a.id)) return false;
    vistos.add(a.id);
    return true;
  });
}

/** Aviso bajo una línea de puesto con costo pendiente (`costosLinea`, solo con costos). */
export function avisoLineaPuesto(
  mensaje: string | undefined,
  linea: { id: string; nombre: string },
): AvisoCpq | null {
  if (!mensaje) return null;
  if (mensaje.includes("sueldo base")) {
    return desdeCodigo({
      codigo: "sueldo_faltante",
      mensaje: `Falta el sueldo base de «${linea.nombre}»`,
      lineaId: linea.id,
    });
  }
  return desdeTexto(mensaje);
}
