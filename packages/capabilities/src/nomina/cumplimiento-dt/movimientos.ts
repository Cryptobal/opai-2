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

type RegistroMiDt = { registradoEn: Date; documentoId: string | null };

function personaBase(p: { id: string; rut: string; nombres: string; apellidos: string }, tipoContrato: string) {
  return {
    personaId: p.id,
    personaNombre: personaNombre(p),
    nombres: p.nombres,
    apellidos: p.apellidos,
    rut: formatearRut(p.rut),
    tipoContrato,
  };
}

function filaMovimiento(
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
    const base = { ...personaBase(v.persona, v.tipo), personaId: v.personaId };
    const hechoAlta = dia(v.inicio)!;
    items.push(
      filaMovimiento(
        hoyCivil,
        registros.get(`alta:${v.id}`),
        "alta",
        v.id,
        hechoAlta,
        `Ingreso el ${formatearFecha(hechoAlta)}`,
        base,
      ),
    );
    if (v.estado === "terminado" && v.termino) {
      const hechoBaja = dia(v.termino)!;
      const motivo = v.motivoTermino ? ` · ${v.motivoTermino}` : "";
      items.push(
        filaMovimiento(
          hoyCivil,
          registros.get(`baja:${v.id}`),
          "baja",
          v.id,
          hechoBaja,
          `Término el ${formatearFecha(hechoBaja)}${motivo}`,
          base,
        ),
      );
    }
  }

  for (const a of anexos) {
    const hecho = dia(a.aprobadoEn)!;
    const cambio = MOTIVO_ANEXO[a.motivoCambio] ?? a.motivoCambio;
    items.push(
      filaMovimiento(
        hoyCivil,
        registros.get(`anexo:${a.id}`),
        "anexo",
        a.id,
        hecho,
        `Cambio de ${cambio} · firmado el ${formatearFecha(hecho)}`,
        personaBase(a.persona, "anexo"),
      ),
    );
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