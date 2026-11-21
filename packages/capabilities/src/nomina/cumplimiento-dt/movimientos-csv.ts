import { ETIQUETA_MOVIMIENTO_MI_DT } from "@opai/domain";

import type { MovimientoMiDt } from "./movimientos";

export function filaCsv(m: MovimientoMiDt) {
  return {
    movimiento: ETIQUETA_MOVIMIENTO_MI_DT[m.movimientoTipo],
    rut: m.rut,
    nombres: m.nombres,
    apellidos: m.apellidos,
    hechoEn: m.hechoEn,
    plazoLimite: m.plazoLimite,
    tipoContrato: m.tipoContrato,
    referenciaId: m.referenciaId,
  };
}