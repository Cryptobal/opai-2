import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { mesDeParametros } from "../../../pauta/_componentes/datos";

export type FilaInformeRondas = {
  instalacionId: string;
  instalacion: string;
  cuenta: string;
  realizadas: number;
  completadas: number;
  incompletas: number;
  atrasadas: number;
  noRealizadas: number;
};

type Informe = { anio: number; mes: number; instalaciones: FilaInformeRondas[] };

export async function cargarInformeRondas(p: Parametros) {
  const { anio, mes } = mesDeParametros(p);
  const r = await ejecutarComoUsuario<Informe>("erp", "rondas.informes.cumplimiento", { anio, mes });
  return {
    state: estadoPantalla(r),
    anio,
    mes,
    filas: r.ok ? r.data.instalaciones : [],
  };
}