/** A dónde se concilia un movimiento sin factura (CAR-328): filas del flujo y cuentas contables de movimiento. */
export type FilaDestino = { id: string; seccion: "ingreso" | "egreso"; etiqueta: string };
export type CuentaDestino = { id: string; codigo: string; nombre: string };
export type Destinos = { filas: FilaDestino[]; cuentas: CuentaDestino[] };

export type SugerenciaRegla = {
  reglaId: string;
  nombre: string;
  flujoFilaId: string;
  filaEtiqueta: string;
  cuentaContableId: string | null;
  cuentaContable: string | null;
};

/** Destino elegido en «Reconocer»: fila obligatoria, cuenta opcional y, si se pide, la regla a crear. */
export type EleccionFila = {
  filaId: string | null;
  cuentaId: string | null;
  crearRegla: boolean;
  nombreRegla: string;
  glosaContiene: string;
};

/** Primeras palabras útiles de la glosa para proponer la condición de la regla («Compra RESEND»). */
export function glosaSugerida(glosa: string): string {
  const sinNumeros = glosa.replace(/\b\d[\d.\-kK]*\b/g, " ").replace(/\s+/g, " ").trim();
  return sinNumeros.split(" ").slice(0, 3).join(" ").slice(0, 60);
}

export const eleccionInicial = (glosa: string): EleccionFila => ({
  filaId: null,
  cuentaId: null,
  crearRegla: false,
  nombreRegla: glosaSugerida(glosa),
  glosaContiene: glosaSugerida(glosa),
});
