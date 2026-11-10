/**
 * Carga un módulo diferido (chunk) y lo reintenta una vez tras una pausa corta. Tras un despliegue
 * o un corte de red el primer intento puede fallar; si el segundo también, rechaza. Nunca guarda el
 * rechazo: quien la llame de nuevo vuelve a intentarlo (CAR-209).
 */
export async function cargaRepetible<T>(cargar: () => Promise<T>, pausaMs = 400): Promise<T> {
  try {
    return await cargar();
  } catch {
    await new Promise((r) => setTimeout(r, pausaMs));
    return cargar();
  }
}
