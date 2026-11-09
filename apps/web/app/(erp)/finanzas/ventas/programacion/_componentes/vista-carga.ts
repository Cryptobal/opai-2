/**
 * Qué se pinta según el estado de la carga. Nunca «nada»: una carga fallida mostraba una pantalla en blanco (CAR-221 B).
 * «empty» (sin clientes) sí muestra el formulario, que lo explica. Puro, sin acceso a datos, para poder probarlo solo.
 */
export function vistaDeCarga(state: string): "formulario" | "forbidden" | "error" {
  if (state === "ready" || state === "empty") return "formulario";
  return state === "forbidden" ? "forbidden" : "error";
}
