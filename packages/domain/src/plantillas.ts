// Plantillas de comunicaciones (ADR-020): variables {{ruta.variable}} validadas contra las que
// declara el evento. Escape HTML para correos. Sin lógica ni código arbitrario en la plantilla.

const VARIABLE = /\{\{\s*([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)\s*\}\}/gi;

export class ErrorPlantilla extends Error {
  readonly variables: string[];
  constructor(variables: string[]) {
    super(`Variables no declaradas en la plantilla: ${variables.join(", ")}.`);
    this.name = "ErrorPlantilla";
    this.variables = variables;
  }
}

export function variablesUsadas(texto: string): string[] {
  return [...new Set([...texto.matchAll(VARIABLE)].map((m) => m[1] as string))];
}

/** Lanza ErrorPlantilla si la plantilla usa variables que el evento no declara. */
export function validarPlantilla(texto: string, declaradas: readonly string[]): void {
  const desconocidas = variablesUsadas(texto).filter((v) => !declaradas.includes(v));
  if (desconocidas.length > 0) throw new ErrorPlantilla(desconocidas);
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function valorEn(datos: Record<string, unknown>, ruta: string): unknown {
  return ruta.split(".").reduce<unknown>((acc, parte) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[parte];
    return undefined;
  }, datos);
}

/** Renderiza la plantilla. Valores ausentes quedan vacíos; `html` escapa cada valor. */
export function renderizar(
  texto: string,
  datos: Record<string, unknown>,
  declaradas: readonly string[],
  opciones: { html?: boolean } = {},
): string {
  validarPlantilla(texto, declaradas);
  return texto.replace(VARIABLE, (_, ruta: string) => {
    const v = valorEn(datos, ruta);
    const s = v === undefined || v === null ? "" : String(v);
    return opciones.html ? escaparHtml(s) : s;
  });
}
