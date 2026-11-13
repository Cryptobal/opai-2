import "server-only";

import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

export const VISTAS = [
  { id: "mes", etiqueta: "Por mes" },
  { id: "semana", etiqueta: "Por semana" },
] as const;
export type Vista = (typeof VISTAS)[number]["id"];

/** Escenarios de cobro (CAR-378): cuántas semanas tarde pagan los clientes. */
export const ATRASOS = [
  { id: "0", etiqueta: "A tiempo" },
  { id: "1", etiqueta: "+1 sem." },
  { id: "2", etiqueta: "+2 sem." },
  { id: "4", etiqueta: "+4 sem." },
] as const;
export type Atraso = (typeof ATRASOS)[number]["id"];

type Punto = { semana: string; saldo: number };
export type Resumen = {
  escenario: { atrasoCobrosSemanas: number };
  umbral: number;
  fuenteSaldo: "banco" | "sin_banco";
  periodos: { clave: string; desde: string; hasta: string; semanas: number; ingresos: number; egresos: number; neto: number; saldoInicial: number; saldoFinal: number; tono: "peligro" | "alerta" | null }[];
  indicadores: {
    primerQuiebre: (Punto & { faltaParaUmbral: number }) | null;
    primerNegativo: Punto | null;
    minimo: Punto | null;
    semanasDeCaja: number;
    semanasBajoUmbral: number;
    finHorizonte: Punto | null;
  };
};

/** Resumen del flujo: una sola capacidad por navegación (la misma serie de la planilla). */
export async function cargarResumen(sp: SearchParams) {
  const p = await leerParametros(sp);
  const vista: Vista = VISTAS.find((v) => v.id === p["vista"])?.id ?? "mes";
  const atraso: Atraso = ATRASOS.find((a) => a.id === p["atraso"])?.id ?? "0";
  const r = await ejecutarComoUsuario<Resumen>("erp", "finanzas.planilla.resumen", { agrupar: vista, atrasoCobrosSemanas: Number(atraso) });
  return { state: estadoPantalla(r), vista, atraso, resumen: r.ok ? r.data : null };
}

export const rutaResumen = (vista: Vista, atraso: Atraso) => {
  const q = new URLSearchParams();
  if (vista !== "mes") q.set("vista", vista);
  if (atraso !== "0") q.set("atraso", atraso);
  const s = q.toString();
  return `/finanzas/flujo/resumen${s ? `?${s}` : ""}`;
};
