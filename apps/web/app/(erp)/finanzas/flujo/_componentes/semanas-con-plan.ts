import type { Planilla } from "./datos";

/** Semanas donde la fila tiene celda Plan guardada (movible con Reprogramar; CAR-582). */
export function semanasConPlan(planilla: Planilla, filaId: string): string[] {
  const conPlan = new Set(
    planilla.celdas.filter((c) => c.filaId === filaId && c.capa === "plan").map((c) => c.semana),
  );
  return planilla.semanas.map((s) => s.semana).filter((s) => conPlan.has(s));
}

export function filaTienePlanMovible(planilla: Planilla, filaId: string): boolean {
  return semanasConPlan(planilla, filaId).length > 0;
}