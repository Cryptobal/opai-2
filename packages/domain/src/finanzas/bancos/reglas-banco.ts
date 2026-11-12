// Reglas de conciliación del banco (ADR-074, CAR-328). Lógica pura: decide si una regla calza con un
// movimiento y si puede conciliarlo sola. Concilia sola solo con monto exacto y referencia exacta;
// cualquier otro calce deja una sugerencia que una persona confirma.

import { normalizarRut } from "../../rut";

export type CampoRegla = "rut" | "glosa" | "monto" | "referencia";
export type OperadorRegla = "igual" | "contiene" | "empieza" | "exacto" | "entre";
export type AlcanceRegla = "abonos" | "cargos" | "ambos";

export type CondicionRegla = {
  campo: CampoRegla;
  operador: OperadorRegla;
  /** Texto o RUT; en monto, el valor en CLP (positivo, sin signo). */
  valor: string;
  /** Solo en monto «entre»: límite superior en CLP. */
  hasta?: number | undefined;
};

export type DefinicionRegla = {
  alcance: AlcanceRegla;
  condiciones: CondicionRegla[];
};

export type ReglaEvaluable = DefinicionRegla & {
  id: string;
  nombre: string;
  prioridad: number;
  modo: "todas" | "alguna";
  activa: boolean;
  flujoFilaId: string | null;
};

export type MovimientoEvaluable = { monto: number; glosa: string; referencia: string | null };

/** Operadores válidos por campo (el editor solo ofrece estos y el servidor rechaza el resto). */
export const OPERADORES_POR_CAMPO: Record<CampoRegla, readonly OperadorRegla[]> = {
  rut: ["igual"],
  glosa: ["contiene", "empieza"],
  monto: ["exacto", "entre"],
  referencia: ["igual", "contiene"],
};

const texto = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

/** RUTs válidos que aparecen en un texto, con o sin puntos y guion. */
export function rutsEnTexto(s: string): string[] {
  const out = new Set<string>();
  for (const m of s.matchAll(/(?<![\d.])\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK](?![\dkK])/g)) {
    const r = normalizarRut(m[0]);
    if (r) out.add(r);
  }
  return [...out];
}

const entero = (v: string) => {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isSafeInteger(n) ? n : NaN;
};

export function condicionCalza(c: CondicionRegla, m: MovimientoEvaluable): boolean {
  const abs = Math.abs(m.monto);
  switch (c.campo) {
    case "rut": {
      const rut = normalizarRut(c.valor);
      if (!rut) return false;
      return rutsEnTexto(`${m.glosa} ${m.referencia ?? ""}`).includes(rut);
    }
    case "glosa": {
      const v = texto(c.valor);
      if (!v) return false;
      const g = texto(m.glosa);
      return c.operador === "empieza" ? g.startsWith(v) : g.includes(v);
    }
    case "referencia": {
      const v = texto(c.valor);
      const r = texto(m.referencia ?? "");
      if (!v || !r) return false;
      return c.operador === "contiene" ? r.includes(v) : r === v;
    }
    case "monto": {
      const desde = entero(c.valor);
      if (Number.isNaN(desde)) return false;
      if (c.operador === "entre") return c.hasta != null && abs >= desde && abs <= c.hasta;
      return abs === desde;
    }
  }
}

function enAlcance(alcance: AlcanceRegla, monto: number): boolean {
  if (alcance === "abonos") return monto > 0;
  if (alcance === "cargos") return monto < 0;
  return true;
}

export function reglaCalza(r: ReglaEvaluable, m: MovimientoEvaluable): boolean {
  if (!r.activa || r.condiciones.length === 0 || !enAlcance(r.alcance, m.monto)) return false;
  return r.modo === "alguna"
    ? r.condiciones.some((c) => condicionCalza(c, m))
    : r.condiciones.every((c) => condicionCalza(c, m));
}

/**
 * Concilia sola solo si la regla exige monto exacto y referencia igual y ambas calzan (ADR-074).
 * Con «alguna» nunca: una sola condición no basta para conciliar sin una persona.
 */
export function reglaConciliaSola(r: ReglaEvaluable, m: MovimientoEvaluable): boolean {
  if (r.modo !== "todas" || !r.flujoFilaId || !reglaCalza(r, m)) return false;
  const monto = r.condiciones.some((c) => c.campo === "monto" && c.operador === "exacto");
  const ref = r.condiciones.some((c) => c.campo === "referencia" && c.operador === "igual");
  return monto && ref;
}

/** Orden de evaluación: mayor prioridad primero; a igual prioridad, por nombre. */
export function ordenarReglas<T extends Pick<ReglaEvaluable, "prioridad" | "nombre">>(reglas: T[]): T[] {
  return [...reglas].sort((a, b) => b.prioridad - a.prioridad || a.nombre.localeCompare(b.nombre, "es"));
}

/** La primera regla activa con destino que calza, en orden de prioridad; null si ninguna. */
export function primeraReglaQueCalza<T extends ReglaEvaluable>(reglas: T[], m: MovimientoEvaluable): T | null {
  return ordenarReglas(reglas).find((r) => r.flujoFilaId !== null && reglaCalza(r, m)) ?? null;
}

/** Lee la definición guardada en JSON; un formato desconocido no calza nunca (null). */
export function definicionDesdeJson(json: unknown): DefinicionRegla | null {
  if (!json || typeof json !== "object") return null;
  const o = json as { alcance?: unknown; condiciones?: unknown };
  if (o.alcance !== "abonos" && o.alcance !== "cargos" && o.alcance !== "ambos") return null;
  if (!Array.isArray(o.condiciones)) return null;
  const condiciones: CondicionRegla[] = [];
  for (const c of o.condiciones as Record<string, unknown>[]) {
    const campo = c?.["campo"] as CampoRegla;
    const operador = c?.["operador"] as OperadorRegla;
    if (!(campo in OPERADORES_POR_CAMPO) || !OPERADORES_POR_CAMPO[campo].includes(operador)) return null;
    if (typeof c["valor"] !== "string") return null;
    const hasta = typeof c["hasta"] === "number" ? c["hasta"] : undefined;
    condiciones.push({ campo, operador, valor: c["valor"], ...(hasta != null ? { hasta } : {}) });
  }
  return { alcance: o.alcance, condiciones };
}
