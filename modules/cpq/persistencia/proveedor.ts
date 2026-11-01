import { costoEmpleadorPorPersona, entradaReferencia, juegoDeValores, juegoReferencia, publicacionesReferencia } from "@opai/domain";
import type { JuegoDeValores } from "@opai/domain";

import type { ProveedorCostoEmpleador } from "../domain/motor/tipos";

type LineaPuesto = { id: string; sueldoBaseClp: number | null; patron: string | null; horaInicio: string | null; horaFin: string | null };

/** Valores legales M1; si falta publicación para la fecha de la cotización, usa la referencia de prueba. */
export async function juegoParaFecha(fecha: string): Promise<JuegoDeValores> {
  try {
    return await juegoDeValores(fecha, publicacionesReferencia());
  } catch {
    return juegoReferencia();
  }
}

export function proveedorDesdeLineas(
  lineas: readonly LineaPuesto[],
  juego: JuegoDeValores,
): ProveedorCostoEmpleador {
  const porId = new Map(lineas.map((l) => [l.id, l]));
  return {
    obtener: ({ lineaId }) => {
      const l = porId.get(lineaId);
      if (!l?.sueldoBaseClp) return null;
      const r = costoEmpleadorPorPersona(
        entradaReferencia(l.sueldoBaseClp),
        juego,
      );
      return { costoMensualClp: r.costoEmpresaMensualClp, origen: `07e:${r.huellaJuegoDeValores}` };
    },
  };
}
