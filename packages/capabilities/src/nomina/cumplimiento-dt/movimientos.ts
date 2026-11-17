import {
  ETIQUETA_MOVIMIENTO_MI_DT,
  etiquetaPlazoMiDt,
  formatearFecha,
  formatearRut,
  plazoMiDtHasta,
  sumarDias,
  type TipoMovimientoMiDt,
} from "@opai/domain";

import { aFecha, dia, hoy } from "../../core/maestros/comun";
import type { Contexto } from "../../types";

const MOTIVO_ANEXO: Record<string, string> = {
  capa: "capa de sueldo",
  monto: "monto",
  instalacion: "instalación",
  rol: "rol",
};

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

async function registrosPorClave(ctx: Contexto) {
  const filas = await ctx.db.nominaRegistroMiDt.findMany({ where: { tenantId: ctx.tenantId } });
  const m = new Map<string, (typeof filas)[number]>();
  for (const r of filas) m.set(`${r.movimientoTipo}:${r.referenciaId}`, r);
  return m;
}

function personaNombre(p: { nombres: string; apellidos: string }) {
  return `${p.apellidos} ${p.nombres}`.trim();
}

/** Lista movimientos Mi DT (altas, bajas y anexos) derivados del núcleo más los registros. */
export async function movimientosMiDt(ctx: Contexto, hoyCivil = hoy()): Promise<MovimientoMiDt[]> {
  const registros = await registrosPorClave(ctx);
  const desde = aFecha(sumarDias(hoy(), -730));

  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: { tenantId: ctx.tenantId, OR: [{ inicio: { gte: desde } }, { termino: { gte: desde } }] },
    include: { persona: { select: { id: true, rut: true, nombres: true, apellidos: true } } },
    orderBy: { inicio: "desc" },
  });

  const anexos = await ctx.db.anexoContrato.findMany({
    where: { tenantId: ctx.tenantId, estado: "aprobado", aprobadoEn: { not: null, gte: desde } },
    include: { persona: { select: { id: true, rut: true, nombres: true, apellidos: true } } },
    orderBy: { aprobadoEn: "desc" },
  });

  const items: MovimientoMiDt[] = [];

  for (const v of vinculos) {
    const base = {
      personaId: v.personaId,
      personaNombre: personaNombre(v.persona),
      nombres: v.persona.nombres,
      apellidos: v.persona.apellidos,
      rut: formatearRut(v.persona.rut),
      tipoContrato: v.tipo,
    };
    const hechoAlta = dia(v.inicio)!;
    const regAlta = registros.get(`alta:${v.id}`);
    const plazoAlta = etiquetaPlazoMiDt(hechoAlta, hoyCivil, null);
    items.push({
      clave: `alta:${v.id}`,
      movimientoTipo: "alta",
      referenciaId: v.id,
      hechoEn: hechoAlta,
      hechoTexto: `Ingreso el ${formatearFecha(hechoAlta)}`,
      plazoLimite: plazoMiDtHasta(hechoAlta),
      plazoEtiqueta: regAlta ? `Registrado el ${formatearFecha(dia(regAlta.registradoEn))}` : plazoAlta.etiqueta,
      plazoTono: regAlta ? "success" : plazoAlta.tono,
      registrado: !!regAlta,
      registradoEn: regAlta ? dia(regAlta.registradoEn) : null,
      comprobanteDocumentoId: regAlta?.documentoId ?? null,
      ...base,
    });

    if (v.estado === "terminado" && v.termino) {
      const hechoBaja = dia(v.termino)!;
      const regBaja = registros.get(`baja:${v.id}`);
      const plazoBaja = etiquetaPlazoMiDt(hechoBaja, hoyCivil, null);
      const motivo = v.motivoTermino ? ` · ${v.motivoTermino}` : "";
      items.push({
        clave: `baja:${v.id}`,
        movimientoTipo: "baja",
        referenciaId: v.id,
        hechoEn: hechoBaja,
        hechoTexto: `Término el ${formatearFecha(hechoBaja)}${motivo}`,
        plazoLimite: plazoMiDtHasta(hechoBaja),
        plazoEtiqueta: regBaja ? `Registrado el ${formatearFecha(dia(regBaja.registradoEn))}` : plazoBaja.etiqueta,
        plazoTono: regBaja ? "success" : plazoBaja.tono,
        registrado: !!regBaja,
        registradoEn: regBaja ? dia(regBaja.registradoEn) : null,
        comprobanteDocumentoId: regBaja?.documentoId ?? null,
        ...base,
      });

      const regFin = registros.get(`finiquito:${v.id}`);
      const plazoFin = etiquetaPlazoMiDt(hechoBaja, hoyCivil, null);
      items.push({
        clave: `finiquito:${v.id}`,
        movimientoTipo: "finiquito",
        referenciaId: v.id,
        hechoEn: hechoBaja,
        hechoTexto: `Finiquito tras término el ${formatearFecha(hechoBaja)}`,
        plazoLimite: plazoMiDtHasta(hechoBaja),
        plazoEtiqueta: regFin ? `Registrado el ${formatearFecha(dia(regFin.registradoEn))}` : plazoFin.etiqueta,
        plazoTono: regFin ? "success" : plazoFin.tono,
        registrado: !!regFin,
        registradoEn: regFin ? dia(regFin.registradoEn) : null,
        comprobanteDocumentoId: regFin?.documentoId ?? null,
        ...base,
      });
    }
  }

  for (const a of anexos) {
    const hecho = dia(a.aprobadoEn)!;
    const reg = registros.get(`anexo:${a.id}`);
    const plazo = etiquetaPlazoMiDt(hecho, hoyCivil, null);
    const cambio = MOTIVO_ANEXO[a.motivoCambio] ?? a.motivoCambio;
    items.push({
      clave: `anexo:${a.id}`,
      movimientoTipo: "anexo",
      referenciaId: a.id,
      personaId: a.personaId,
      personaNombre: personaNombre(a.persona),
      nombres: a.persona.nombres,
      apellidos: a.persona.apellidos,
      rut: formatearRut(a.persona.rut),
      tipoContrato: "anexo",
      hechoEn: hecho,
      hechoTexto: `Cambio de ${cambio} · firmado el ${formatearFecha(hecho)}`,
      plazoLimite: plazoMiDtHasta(hecho),
      plazoEtiqueta: reg ? `Registrado el ${formatearFecha(dia(reg.registradoEn))}` : plazo.etiqueta,
      plazoTono: reg ? "success" : plazo.tono,
      registrado: !!reg,
      registradoEn: reg ? dia(reg.registradoEn) : null,
      comprobanteDocumentoId: reg?.documentoId ?? null,
    });
  }

  const orden = (m: MovimientoMiDt) => (m.registrado ? 1 : 0) * 10_000 + Date.parse(`${m.plazoLimite}T00:00:00.000Z`);
  return items.sort((a, b) => orden(a) - orden(b) || b.hechoEn.localeCompare(a.hechoEn));
}

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