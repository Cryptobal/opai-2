import {
  etiquetaPlazoMiDt,
  formatearFecha,
  formatearRut,
  plazoMiDtHasta,
  type TipoMovimientoMiDt,
} from "@opai/domain";

import { dia } from "../../core/maestros/comun";

export type MovimientoMiDt = {
  clave: string;
  movimientoTipo: TipoMovimientoMiDt;
  referenciaId: string;
  personaId: string;
  personaNombre: string;
  nombres: string;
  apellidos: string;
  rut: string;
  hechoEn: string;
  hechoTexto: string;
  plazoLimite: string;
  plazoEtiqueta: string;
  plazoTono: "success" | "warning" | "danger" | "neutral";
  registrado: boolean;
  registradoEn: string | null;
  comprobanteDocumentoId: string | null;
  tipoContrato: string;
};

type RegistroMiDt = { registradoEn: Date; documentoId: string | null };

function personaNombre(p: { nombres: string; apellidos: string }) {
  return `${p.apellidos} ${p.nombres}`.trim();
}

export function personaBase(p: { id: string; rut: string; nombres: string; apellidos: string }, tipoContrato: string) {
  return {
    personaId: p.id,
    personaNombre: personaNombre(p),
    nombres: p.nombres,
    apellidos: p.apellidos,
    rut: formatearRut(p.rut),
    tipoContrato,
  };
}

export function filaMovimiento(
  hoyCivil: string,
  reg: RegistroMiDt | undefined,
  tipo: TipoMovimientoMiDt,
  referenciaId: string,
  hechoEn: string,
  hechoTexto: string,
  base: ReturnType<typeof personaBase>,
): MovimientoMiDt {
  const plazo = etiquetaPlazoMiDt(hechoEn, hoyCivil, null);
  return {
    ...base,
    clave: `${tipo}:${referenciaId}`,
    movimientoTipo: tipo,
    referenciaId,
    hechoEn,
    hechoTexto,
    plazoLimite: plazoMiDtHasta(hechoEn),
    plazoEtiqueta: reg ? `Registrado el ${formatearFecha(dia(reg.registradoEn)!)}` : plazo.etiqueta,
    plazoTono: reg ? "success" : plazo.tono,
    registrado: !!reg,
    registradoEn: reg ? dia(reg.registradoEn) : null,
    comprobanteDocumentoId: reg?.documentoId ?? null,
  };
}