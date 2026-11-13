// Cartola contra Web4Leads con un día de diferencia (CAR-341). Web4Leads informa a veces la fecha contable del
// día hábil siguiente y la cartola la del día de la operación (o al revés). Un movimiento de la cartola sin calce
// exacto que coincide en monto y glosa con uno de Web4Leads del día anterior o siguiente es el mismo movimiento.
import { descomponerClaveDedupe, type FilaDedupePlanificada } from "./dedupe";

type Existente = { claveDedupe: string; origen?: string };

function moverDia(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Base `fecha|monto|glosa` con la fecha corrida en `dias`. */
function baseCorrida(base: string, dias: number): string | null {
  const corte = base.indexOf("|");
  const fecha = base.slice(0, corte);
  if (corte !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  return `${moverDia(fecha, dias)}${base.slice(corte)}`;
}

/**
 * Marca como duplicadas las filas nuevas de la cartola que calzan, con ±1 día, con un movimiento de Web4Leads
 * que el calce exacto no usó. Los calces exactos consumen primero los movimientos que no son de Web4Leads.
 */
export function conVecinosWeb4leads(plan: FilaDedupePlanificada[], existentes: Existente[]): FilaDedupePlanificada[] {
  const web = new Map<string, number>();
  const total = new Map<string, number>();
  for (const e of existentes) {
    const { base } = descomponerClaveDedupe(e.claveDedupe);
    total.set(base, (total.get(base) ?? 0) + 1);
    if (e.origen === "web4leads") web.set(base, (web.get(base) ?? 0) + 1);
  }
  if (web.size === 0) return plan;
  const usadas = new Map<string, number>();
  for (const p of plan) if (p.estado === "duplicada") usadas.set(p.base, (usadas.get(p.base) ?? 0) + 1);
  const libres = new Map<string, number>();
  for (const [base, n] of web) {
    const otras = (total.get(base) ?? 0) - n;
    libres.set(base, n - Math.max(0, (usadas.get(base) ?? 0) - otras));
  }
  return plan.map((p) => {
    if (p.estado !== "leida") return p;
    for (const dias of [-1, 1]) {
      const vecina = baseCorrida(p.base, dias);
      const quedan = vecina ? (libres.get(vecina) ?? 0) : 0;
      if (vecina && quedan > 0) {
        libres.set(vecina, quedan - 1);
        return { indice: p.indice, estado: "duplicada", base: p.base, saldoDespues: p.saldoDespues };
      }
    }
    return p;
  });
}
