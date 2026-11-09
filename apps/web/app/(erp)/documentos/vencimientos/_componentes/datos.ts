import { agruparVencimientos, VENTANAS_VENCIMIENTO_DEFECTO } from "@opai/domain";

import type { Documento } from "@/app/_components/documentos/tipos";
import { hoyIso } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type FilaVencimiento = Documento & {
  entidad: { tipo: string; id: string; nombre: string | null } | null;
};

/** Cuentas e instalaciones: lo que cubre la pantalla 04 (las personas tienen su propia matriz). */
const ENTIDADES_DE_LA_PANTALLA = ["cuenta", "instalacion"];

/**
 * Vencimientos de cuentas e instalaciones en las ventanas de aviso (B2: 30 y 60 días). Una sola
 * lectura de `core.documentos.vencimientos`, que ya aplica alcance y sensibles en la consulta.
 */
export async function cargarVencimientos() {
  const dias = Math.max(...VENTANAS_VENCIMIENTO_DEFECTO);
  const r = await ejecutarComoUsuario<FilaVencimiento[]>("erp", "core.documentos.vencimientos", {
    dias,
  });
  const filas = r.ok
    ? r.data.filter((d) => d.entidad && ENTIDADES_DE_LA_PANTALLA.includes(d.entidad.tipo))
    : [];
  return {
    state: estadoPantalla(r),
    grupos: agruparVencimientos(filas, hoyIso()),
  };
}
