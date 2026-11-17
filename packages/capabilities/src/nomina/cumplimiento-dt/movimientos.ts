import { ETIQUETA_MOVIMIENTO_MI_DT, formatearFecha, sumarDias } from "@opai/domain";

import { aFecha, dia, hoy } from "../../core/maestros/comun";
import type { Contexto } from "../../types";

import { filaMovimiento, personaBase, type MovimientoMiDt } from "./movimientos-fila";

export type { MovimientoMiDt } from "./movimientos-fila";

const MOTIVO_ANEXO: Record<string, string> = {
  capa: "capa de sueldo",
  monto: "monto",
  instalacion: "instalación",
  rol: "rol",
};

async function registrosPorClave(ctx: Contexto) {
  const filas = await ctx.db.nominaRegistroMiDt.findMany({ where: { tenantId: ctx.tenantId } });
  const m = new Map<string, (typeof filas)[number]>();
  for (const r of filas) m.set(`${r.movimientoTipo}:${r.referenciaId}`, r);
  return m;
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
      items.push(
        filaMovimiento(
          hoyCivil,
          registros.get(`finiquito:${v.id}`),
          "finiquito",
          v.id,
          hechoBaja,
          `Finiquito tras término el ${formatearFecha(hechoBaja)}`,
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