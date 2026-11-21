import { codigoLote, type EstadoLote } from "../domain";

type LoteFila = {
  id: string; codigo: number; esReversa: boolean; estado: string; totalClp: number; cantidad: number; creadoPorId: string;
  aprobadoPorId: string | null; aprobadoEn: Date | null; generadoEn: Date | null; pagadoEn: Date | null;
  fechaPago: Date | null; referenciaPago: string | null; createdAt: Date;
};

export function loteResumenDe(l: LoteFila) {
  return {
    id: l.id, codigo: l.codigo, codigoVisible: l.esReversa ? `${codigoLote(l.codigo)} (reversa)` : codigoLote(l.codigo), esReversa: l.esReversa, estado: l.estado as EstadoLote,
    totalClp: l.totalClp, cantidad: l.cantidad, creadoPorId: l.creadoPorId, aprobadoPorId: l.aprobadoPorId,
    aprobadoEn: l.aprobadoEn?.toISOString() ?? null, generadoEn: l.generadoEn?.toISOString() ?? null,
    pagadoEn: l.pagadoEn?.toISOString() ?? null, fechaPago: l.fechaPago?.toISOString().slice(0, 10) ?? null,
    referenciaPago: l.referenciaPago, creadoEn: l.createdAt.toISOString(),
  };
}
