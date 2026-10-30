// Dominio puro de Rondas: sin Next, React ni base de datos. Todo cálculo tiene test.

/** Ejemplo: normaliza un nombre para búsquedas. Reemplazar por la lógica real del módulo. */
export function normalizarNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ");
}
