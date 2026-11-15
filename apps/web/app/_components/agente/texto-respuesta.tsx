import { TextoNovedad } from "../novedades/texto-novedad";

import type { ReferenciaEntidad } from "./tipos";

/**
 * Respuesta del agente (CAR-446): mismo markdown seguro que las novedades, pero solo enlaces cuyo
 * href salió de las capacidades del turno (nunca URLs inventadas por el modelo).
 */
export function TextoRespuesta({
  texto,
  referencias = [],
}: {
  texto: string;
  referencias?: readonly ReferenciaEntidad[];
}) {
  const permitidos = new Set(referencias.map((r) => r.href));
  return (
    <TextoNovedad
      texto={texto}
      className="text-md flex flex-col gap-2 break-words text-fg"
      enlaceOk={(href) => permitidos.has(href)}
    />
  );
}
