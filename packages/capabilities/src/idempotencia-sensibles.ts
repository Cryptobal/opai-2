import { createHmac } from "node:crypto";

import { jsonCanonico } from "@opai/domain";

/**
 * La reserva de idempotencia guarda `sha256(capacidad + input)` sin sal. Si el input lleva un secreto de
 * poco espacio (un PIN de 6 dígitos), esa huella lo vuelve recuperable por fuerza bruta. Antes de
 * reservar, cada campo `sensibles` se reemplaza por su HMAC-SHA256 con un secreto del servidor: la misma
 * clave con otro PIN sigue siendo «distinta», pero la huella ya no se puede invertir sin el secreto.
 */
const SAL = process.env["BETTER_AUTH_SECRET"] ?? "opai::idempotencia::sal-dev";

export function ocultarSensibles(
  entrada: unknown,
  sensibles: readonly string[] | undefined,
): unknown {
  if (
    !sensibles?.length ||
    entrada === null ||
    typeof entrada !== "object" ||
    Array.isArray(entrada)
  )
    return entrada;
  const copia: Record<string, unknown> = { ...(entrada as Record<string, unknown>) };
  for (const campo of sensibles) {
    if (!(campo in copia)) continue;
    copia[campo] = createHmac("sha256", SAL)
      .update(`${campo}\n${jsonCanonico(copia[campo])}`)
      .digest("hex");
  }
  return copia;
}
