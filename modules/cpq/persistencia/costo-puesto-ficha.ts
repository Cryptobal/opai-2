import { costoEmpleadorPorPersona, type JuegoDeValores } from "@opai/domain";

import { entradaCostoDesdeSueldo } from "./proveedor";

type LineaPuesto = {
  id: string;
  tipo: string;
  sueldoBaseClp: number | null;
  huellaJuegoValores: string | null;
};

export type CostoLineaFicha =
  | { estado: "ok"; costoEmpresaMensualClp: number; liquidoEstimadoClp: number; huellaJuego: string }
  | { estado: "pendiente"; mensaje: string };

export function costoLineaPuestoFicha(linea: LineaPuesto, juego: JuegoDeValores | null): CostoLineaFicha {
  if (linea.tipo !== "puesto") return { estado: "pendiente", mensaje: "Sin costo de puesto" };
  if (!linea.sueldoBaseClp) return { estado: "pendiente", mensaje: "costo pendiente: falta sueldo base" };
  if (!juego) {
    return { estado: "pendiente", mensaje: "costo pendiente: faltan valores legales publicados" };
  }
  try {
    const r = costoEmpleadorPorPersona(entradaCostoDesdeSueldo(linea.sueldoBaseClp), juego);
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
