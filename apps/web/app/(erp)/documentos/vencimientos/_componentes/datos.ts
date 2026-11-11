import { agruparVencimientos, VENTANAS_VENCIMIENTO_DEFECTO } from "@opai/domain";

import type { Documento } from "@/app/_components/documentos/tipos";
import { hoyIso } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";
import { vocabularioActual } from "@/lib/vocabulario";

import { etiquetasEntidad } from "../../_componentes/etiquetas";
import { esTipoVencimiento } from "./entidades";

export type FilaVencimiento = Documento & {
  entidad: { tipo: string; id: string; nombre: string | null } | null;
};

/**
 * Lo vencido y lo que vence en las ventanas de aviso (B2: 30 y 60 días), de cualquier dueño que
 * el explorador muestra. Una sola lectura de `core.documentos.vencimientos`, que ya aplica
 * alcance y sensibles en la consulta. Un documento a 16 días cae en la banda de 30.
 */
export async function cargarVencimientos() {
  const dias = Math.max(...VENTANAS_VENCIMIENTO_DEFECTO);
  const [r, voc] = await Promise.all([
    ejecutarComoUsuario<FilaVencimiento[]>("erp", "core.documentos.vencimientos", { dias }),
    vocabularioActual(),
  ]);
  const filas = r.ok ? r.data.filter((d) => esTipoVencimiento(d.entidad?.tipo)) : [];
  return {
    state: estadoPantalla(r),
    grupos: agruparVencimientos(filas, hoyIso()),
    etiquetas: etiquetasEntidad(voc),
  };
}
