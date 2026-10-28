import { type EstadoIncidente, puedeAvanzarIncidente } from "./cumplimiento";

export type HechoAviso = {
  evento: string;
  estado: string;
  destinatario: string | null;
  ocurridoEn: Date | null;
  createdAt: Date;
};

/** Hechos en orden cronológico: el plazo empieza en detección, no en el aviso. */
export function estadoAvisos(hechos: readonly HechoAviso[]) {
  const registro = hechos.find((h) => h.evento === "registro") ?? hechos[0];
  const avisados = new Set(
    hechos.filter((h) => h.evento === "aviso" && h.destinatario).map((h) => h.destinatario as string),
  );
  const actual = hechos[hechos.length - 1]?.estado ?? "abierto";
  const inicioPlazo = registro?.ocurridoEn ?? registro?.createdAt ?? null;
  return { avisados, actual: actual as EstadoIncidente, inicioPlazo };
}

/** Motivo de rechazo; conserva la precedencia de cerrado, duplicado y transición. */
export function motivoAvisoInvalido(
  actual: EstadoIncidente,
  avisados: ReadonlySet<string>,
  destinatario: string,
): string | null {
  if (actual === "cerrado") return 'No se puede notificar un caso "cerrado".';
  if (avisados.has(destinatario)) return `Ya consta el aviso a "${destinatario}" en este caso.`;
  if (actual !== "notificado" && !puedeAvanzarIncidente(actual, "notificado"))
    return `No se puede notificar un caso "${actual}".`;
  return null;
}
