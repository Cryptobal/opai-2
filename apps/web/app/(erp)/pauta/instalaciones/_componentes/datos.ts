import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { mesDeParametros } from "../../_componentes/datos";

export const ORDENES = ["cobertura", "ppc", "ausentismo", "atrasos"] as const;
export type Orden = (typeof ORDENES)[number];

export type FilaInforme = {
  instalacionId: string;
  instalacion: string;
  cuenta: string;
  puestos: number;
  turnosProgramados: number;
  cobertura: number | null;
  ppc: number;
  refuerzos: number;
  diasConTurno: number;
  ausentismo: number | null;
  atrasos: number | null;
};

type Informe = { anio: number; mes: number; conAsistencia: boolean; instalaciones: FilaInforme[] };

/**
 * Pauta · Por instalación (CAR-330): una sola consulta, `pauta.informes.instalaciones`, con el mes de
 * `?mes=aaaa-mm` y el orden de `?orden=` (por defecto, cobertura: las peores primero).
 */
export async function cargarInforme(p: Parametros) {
  const { anio, mes } = mesDeParametros(p);
  const orden: Orden = (ORDENES as readonly string[]).includes(p["orden"] ?? "")
    ? (p["orden"] as Orden)
    : "cobertura";
  const r = await ejecutarComoUsuario<Informe>("erp", "pauta.informes.instalaciones", {
    anio,
    mes,
    orden,
  });
  return {
    state: estadoPantalla(r),
    anio,
    mes,
    orden,
    conAsistencia: r.ok ? r.data.conAsistencia : false,
    filas: r.ok ? r.data.instalaciones : [],
  };
}
