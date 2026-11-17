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
async function todasVencimientos(dias: number) {
  const filas: FilaVencimiento[] = [];
  let cursor: string | undefined;
  for (;;) {
    const r = await ejecutarComoUsuario<{ items: FilaVencimiento[]; siguiente: string | null }>(
      "erp",
      "core.documentos.vencimientos",
      { dias, limite: 200, ...(cursor ? { cursor } : {}) },
    );
    if (!r.ok) return r;
    filas.push(...r.data.items);
    if (!r.data.siguiente) return { ok: true as const, data: filas };
    cursor = r.data.siguiente;
  }
}

export async function cargarVencimientos() {
  const dias = Math.max(...VENTANAS_VENCIMIENTO_DEFECTO);
  const [r, voc] = await Promise.all([todasVencimientos(dias), vocabularioActual()]);
  const filas = r.ok ? r.data.filter((d) => esTipoVencimiento(d.entidad?.tipo)) : [];
  return {
    state: estadoPantalla(r),
    grupos: agruparVencimientos(filas, hoyIso()),
    etiquetas: etiquetasEntidad(voc),
  };
}
