import { costoEmpleadorPorPersona, type JuegoDeValores } from "@opai/domain";

import { entradaCostoDesdeLinea } from "./proveedor";

type LineaPuesto = {
  id: string;
  tipo: string;
  sueldoBaseClp: number | null;
  huellaJuegoValores: string | null;
};

export type CostoLineaFicha =
  | { estado: "ok"; costoEmpresaMensualClp: number; liquidoEstimadoClp: number; huellaJuego: string }
  | { estado: "pendiente"; mensaje: string };

/** Costo por persona de la línea con la misma mutual del cálculo (confirmada o 0 % supuesto). */
export function costoLineaPuestoFicha(
  linea: LineaPuesto,
  juego: JuegoDeValores | null,
  mutualAdicional = 0,
): CostoLineaFicha {
  if (linea.tipo !== "puesto") return { estado: "pendiente", mensaje: "Sin costo de puesto" };
  if (!linea.sueldoBaseClp) return { estado: "pendiente", mensaje: "costo pendiente: falta sueldo base" };
  if (!juego) {
    return { estado: "pendiente", mensaje: "costo pendiente: faltan valores legales publicados" };
  }
  try {
    const r = costoEmpleadorPorPersona(entradaCostoDesdeLinea(linea.sueldoBaseClp, { mutualAdicional }), juego);
    return {
      estado: "ok",
      costoEmpresaMensualClp: r.costoEmpresaMensualClp,
      liquidoEstimadoClp: r.liquidoEstimadoClp,
      huellaJuego: r.huellaJuegoDeValores,
    };
  } catch {
    return { estado: "pendiente", mensaje: "costo pendiente: faltan valores legales para esta fecha" };
  }
}
