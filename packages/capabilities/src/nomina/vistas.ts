import { etiquetaPeriodo } from "@opai/domain";

import { dia, iso } from "./comun";

type PeriodoFila = {
  id: string;
  anio: number;
  mes: number;
  estado: string;
  inicio: Date;
  fin: Date;
  cierrePrevisto: Date;
  cerradoEn: Date | null;
  pagadoEn: Date | null;
  motivoReapertura: string | null;
};

export function vistaPeriodo(p: PeriodoFila, novedades: number) {
  return {
    id: p.id,
    anio: p.anio,
    mes: p.mes,
    etiqueta: etiquetaPeriodo(p.anio, p.mes),
    estado: p.estado as "abierto" | "en_revision" | "cerrado" | "pagado",
    inicio: dia(p.inicio) ?? "",
    fin: dia(p.fin) ?? "",
    cierrePrevisto: dia(p.cierrePrevisto) ?? "",
    cerradoEn: iso(p.cerradoEn),
    pagadoEn: iso(p.pagadoEn),
    motivoReapertura: p.motivoReapertura ?? null,
    novedades,
  };
}
