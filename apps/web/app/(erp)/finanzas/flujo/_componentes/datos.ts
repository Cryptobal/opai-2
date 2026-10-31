import type { Celda, ColumnaPlanilla, FilaPlanilla } from "@opai/ds";

import { ejecutarComoUsuario } from "@/lib/servidor";

export type FilaFlujo = {
  id: string;
  seccion: "ingreso" | "egreso";
  etiqueta: string;
  vinculo: string | null;
};
export type CeldaFlujo = {
  filaId: string;
  semana: string;
  capa: "plan" | "comprometido" | "real";
  monto: number;
  nota: string | null;
};
export type SemanaFlujo = {
  semana: string;
  ingresos: number;
  egresos: number;
  saldoFinal: number;
  tono: "peligro" | "alerta" | null;
  sellada: boolean;
};
export type Planilla = {
  umbral: number;
  filas: FilaFlujo[];
  celdas: CeldaFlujo[];
  semanas: SemanaFlujo[];
};

const TOTALES = { ingresos: "total-ing", egresos: "total-egr", saldo: "saldo" } as const;
const CAPA: Record<CeldaFlujo["capa"], { tono: NonNullable<Celda["tono"]>; detalle: string }> = {
  plan: { tono: "neutro", detalle: "Plan" },
  comprometido: { tono: "info", detalle: "Comprometido" },
  real: { tono: "success", detalle: "Real" },
};

export const clp = (n: number) => `${n < 0 ? "$ −" : "$ "}${Math.abs(n).toLocaleString("es-CL")}`;
const corta = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}`;

export function cargarPlanilla() {
  return ejecutarComoUsuario<Planilla>("erp", "finanzas.planilla.obtener", { semanas: 12 });
}

/** Columnas, filas y celdas para `PlanillaScreen`: filas del flujo, totales y saldo con su tono. */
export function armarPlanilla(p: Planilla) {
  const columnas: ColumnaPlanilla[] = p.semanas.map((s) => ({
    id: s.semana,
    etiqueta: corta(s.semana),
  }));
  const filas: FilaPlanilla[] = [
    ...p.filas.map((f) => ({
      id: f.id,
      etiqueta: f.etiqueta,
      ...(f.vinculo ? { sub: f.vinculo } : {}),
    })),
    { id: TOTALES.ingresos, etiqueta: "Total ingresos" },
    { id: TOTALES.egresos, etiqueta: "Total egresos" },
    { id: TOTALES.saldo, etiqueta: "Saldo final" },
  ];
  const celda = (filaId: string, semana: string): Celda | null => {
    const s = p.semanas.find((x) => x.semana === semana);
    if (!s) return null;
    if (filaId === TOTALES.ingresos) return { texto: clp(s.ingresos) };
    if (filaId === TOTALES.egresos) return { texto: clp(s.egresos) };
    if (filaId === TOTALES.saldo)
      return {
        texto: clp(s.saldoFinal),
        tono: s.tono === "peligro" ? "danger" : s.tono === "alerta" ? "warning" : "neutro",
        detalle: s.sellada
          ? "Sellada"
          : s.tono === "peligro"
            ? "Saldo negativo proyectado"
            : s.tono === "alerta"
              ? "Bajo el umbral"
              : "Proyectado",
      };
    const c = p.celdas.find((x) => x.filaId === filaId && x.semana === semana);
    if (!c) return null;
    return {
      texto: clp(c.monto),
      tono: CAPA[c.capa].tono,
      detalle: c.nota ? `${CAPA[c.capa].detalle} · ${c.nota}` : CAPA[c.capa].detalle,
    };
  };
  return { columnas, filas, celda };
}
