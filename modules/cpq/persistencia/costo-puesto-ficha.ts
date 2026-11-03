import { costoEmpleadorPorPersona, type JuegoDeValores } from "@opai/domain";

import { entradaCostoDesdeLinea, opcionesDeLinea, sueldoBaseEfectivo, type LineaPuesto as LineaMotor } from "./proveedor";
import { SUPUESTOS_DEFECTO, type SupuestosTenant } from "./supuestos";

export type LineaPuestoFicha = Omit<LineaMotor, "patron" | "horaInicio" | "horaFin"> & {
  tipo: string;
  huellaJuegoValores: string | null;
};

export type CostoLineaFicha =
  | { estado: "ok"; costoEmpresaMensualClp: number; liquidoEstimadoClp: number; sueldoBaseClp: number; huellaJuego: string }
  | { estado: "pendiente"; mensaje: string };

/** Costo por persona de la línea con la misma mutual del cálculo (confirmada o 0 % supuesto). */
export function costoLineaPuestoFicha(
  linea: LineaPuestoFicha,
  juego: JuegoDeValores | null,
  mutualAdicional = 0,
  supuestos: SupuestosTenant = SUPUESTOS_DEFECTO,
): CostoLineaFicha {
  if (linea.tipo !== "puesto") return { estado: "pendiente", mensaje: "Sin costo de puesto" };
  if (!linea.sueldoBaseClp) return { estado: "pendiente", mensaje: "costo pendiente: falta sueldo base" };
  if (!juego) {
    return { estado: "pendiente", mensaje: "costo pendiente: faltan valores legales publicados" };
  }
  try {
    const opciones = opcionesDeLinea({ ...linea, patron: null, horaInicio: null, horaFin: null }, supuestos, mutualAdicional);
    const base = sueldoBaseEfectivo({ ...linea, patron: null, horaInicio: null, horaFin: null }, juego, opciones) ?? 0;
    const r = costoEmpleadorPorPersona(entradaCostoDesdeLinea(base, opciones), juego);
    return {
      estado: "ok",
      costoEmpresaMensualClp: r.costoEmpresaMensualClp,
      liquidoEstimadoClp: r.liquidoEstimadoClp,
      sueldoBaseClp: base,
      huellaJuego: r.huellaJuegoDeValores,
    };
  } catch {
    return { estado: "pendiente", mensaje: "costo pendiente: faltan valores legales para esta fecha" };
  }
}
