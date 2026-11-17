import { mesDeParametros } from "@/app/(erp)/pauta/_componentes/datos";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { DotacionInstalacion } from "./dotacion-tipos";

/** Dotación de la instalación según la Pauta del mes pedido en `?mes=` (o el mes en curso). */
export async function cargarDotacion(instalacionId: string, p: Parametros) {
  const { anio, mes } = mesDeParametros(p);
  return ejecutarComoUsuario<DotacionInstalacion>("erp", "pauta.dotacion.listar", {
    instalacionId,
    anio,
    mes,
  });
}