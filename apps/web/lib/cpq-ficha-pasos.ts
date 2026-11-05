// Pasos de la ficha de cotización (CAR-192, alternativa B): cuántos pendientes tiene cada bloque y cuál
// se abre primero. Puro y sin cifras: solo cuenta causas que el servidor ya entrega a todos.

export type BloqueFicha = "cliente" | "puestos" | "costos" | "documento";
export const ORDEN_BLOQUES: readonly BloqueFicha[] = ["cliente", "puestos", "costos", "documento"];

export type EntradaPasos = {
  /** Estado único del servidor (`meta.estadoFicha.estado`). */
  estado: string;
  tieneCuenta: boolean;
  /** Puestos habilitados en la versión. */
  puestos: number;
  /** Avisos que bloquean el cálculo (sueldo faltante, valores legales faltantes). */
  avisosBloqueantes: number;
  /** Códigos de `meta.estadoFicha.bloqueos`. */
  bloqueos: readonly string[];
  mutualPendiente: boolean;
};

export type PasoFicha = { bloque: BloqueFicha; pendientes: number; bloqueado: boolean };
export type PasosFicha = { pasos: PasoFicha[]; primeroAbierto: BloqueFicha };

const CERRADAS = new Set(["enviada", "aceptada", "rechazada", "vencida", "reemplazada", "archivada"]);

export function pasosDeFicha(e: EntradaPasos): PasosFicha {
  const cuenta = e.tieneCuenta ? 0 : 1;
  const sinPuestos = e.puestos === 0 ? 1 : 0;
  const puestos = sinPuestos + e.avisosBloqueantes;
  // Sin puestos o con datos pendientes el margen no se puede juzgar: no cuenta como pendiente de Costos.
  const sinDatos = e.bloqueos.includes("sin_lineas") || e.bloqueos.includes("costos_pendientes");
  const costos = sinDatos ? 0 : e.bloqueos.filter((b) => b === "desactualizada" || b === "margen_bajo").length;
  // Documento y envío: «Dejar lista» (o pedir aprobación) y confirmar la mutual son lo que falta.
  const listo = e.estado === "lista_para_enviar" || CERRADAS.has(e.estado) || e.estado === "en_aprobacion";
  const delDocumento = (listo ? 0 : 1) + (e.mutualPendiente ? 1 : 0);
  const antes = cuenta + puestos + costos;
  const pasos: PasoFicha[] = [
    { bloque: "cliente", pendientes: cuenta, bloqueado: false },
    { bloque: "puestos", pendientes: puestos, bloqueado: false },
    { bloque: "costos", pendientes: costos, bloqueado: false },
    // Mientras haya pendientes antes, el último bloque no cuenta los suyos: se resuelven en orden.
    { bloque: "documento", pendientes: antes > 0 ? 0 : delDocumento, bloqueado: antes > 0 },
  ];
  const primero = pasos.find((p) => p.pendientes > 0);
  return { pasos, primeroAbierto: primero?.bloque ?? "documento" };
}
