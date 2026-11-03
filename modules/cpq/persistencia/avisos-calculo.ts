import { AVISO_MUTUAL_SUPUESTA, type AvisoCalculoCpq, type ResultadoCalculo } from "../domain/motor";
import type { JuegoResuelto, MutualResuelta } from "./valores-legales";

type LineaAviso = { id: string; tipo: string; nombre: string; habilitada: boolean; sueldoBaseClp: number | null };

/**
 * Causas concretas de lo pendiente (CAR-162), con código y sin montos: falta el juego legal,
 * la mutual se calcula con 0 % supuesto o falta el sueldo de una línea de puesto.
 */
export function avisosCalculo(
  lineas: readonly LineaAviso[],
  resuelto: JuegoResuelto,
  mutual: MutualResuelta,
): AvisoCalculoCpq[] {
  const puestos = lineas.filter((l) => l.tipo === "puesto" && l.habilitada);
  const avisos: AvisoCalculoCpq[] = [];
  if (resuelto.faltante) {
    avisos.push({
      codigo: "juego_legal_faltante",
      mensaje: `Falta el valor legal «${resuelto.faltante}» para la fecha del cálculo.`,
      indicador: resuelto.faltante,
    });
  }
  if (!mutual.confirmada && puestos.length > 0) {
    avisos.push({ codigo: "mutual_sin_confirmar", mensaje: AVISO_MUTUAL_SUPUESTA });
  }
  for (const l of puestos.filter((p) => !p.sueldoBaseClp)) {
    avisos.push({
      codigo: "sueldo_faltante",
      mensaje: `Falta el sueldo base de «${l.nombre.slice(0, 120)}».`,
      lineaId: l.id,
    });
  }
  return avisos;
}

/** Agrega avisos y su advertencia legible al resultado; la mutual supuesta no lo vuelve no enviable. */
export function aplicarAvisos(resultado: ResultadoCalculo, avisos: AvisoCalculoCpq[]): void {
  resultado.avisos = avisos;
  if (avisos.some((a) => a.codigo === "mutual_sin_confirmar")) {
    resultado.advertencias = [...new Set([...resultado.advertencias, AVISO_MUTUAL_SUPUESTA])];
  }
}

/** Bloqueo de envío al cliente por la mutual supuesta (misma regla en pantalla, API y MCP). */
export function mutualBloqueaEnvio(resultado: Pick<ResultadoCalculo, "avisos">): boolean {
  return Boolean(resultado.avisos?.some((a) => a.codigo === "mutual_sin_confirmar"));
}
