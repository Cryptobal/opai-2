import { formatearFecha, sumarDias, type TipoMovimientoMiDt } from "@opai/domain";

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

function fila(
  registros: Map<string, { registradoEn: Date; documentoId: string | null }>,
  hoyCivil: string,
  tipo: TipoMovimientoMiDt,
  referenciaId: string,
  hechoEn: string,
  hechoTexto: string,
  base: ReturnType<typeof personaBase>,
) {
  return filaMovimiento(hoyCivil, registros.get(`${tipo}:${referenciaId}`), tipo, referenciaId, hechoEn, hechoTexto, base);
}

type PersonaResumen = { id: string; rut: string | null; nombres: string; apellidos: string };

type VinculoMiDt = {
  id: string;
  tipo: string;
  estado: string;
  inicio: Date;
  termino: Date | null;
  motivoTermino: string | null;
  persona: PersonaResumen;
};

type AnexoMiDt = {
  id: string;
  motivoCambio: string;
  aprobadoEn: Date | null;
  persona: PersonaResumen;
};

function movimientosDeVinculos(
  vinculos: VinculoMiDt[],
  registros: Map<string, { registradoEn: Date; documentoId: string | null }>,
  hoyCivil: string,
) {
  const items: MovimientoMiDt[] = [];
  for (const v of vinculos) {
    const persona = v.persona;
    if (!persona.rut) continue;
    const hechoAlta = dia(v.inicio);
    if (!hechoAlta) continue;
    const base = personaBase({ ...persona, rut: persona.rut }, v.tipo);
    items.push(
      fila(registros, hoyCivil, "alta", v.id, hechoAlta, `Ingreso el ${formatearFecha(hechoAlta)}`, base),
    );
    if (v.estado === "terminado" && v.termino) {
      const hechoBaja = dia(v.termino);
      if (!hechoBaja) continue;
      const motivo = v.motivoTermino ? ` · ${v.motivoTermino}` : "";
      items.push(
        fila(registros, hoyCivil, "baja", v.id, hechoBaja, `Término el ${formatearFecha(hechoBaja)}${motivo}`, base),
        fila(
          registros,
          hoyCivil,
          "finiquito",
          v.id,
          hechoBaja,
          `Finiquito tras término el ${formatearFecha(hechoBaja)}`,
          base,
        ),
      );
    }
  }
  return items;
}

function movimientosDeAnexos(
  anexos: AnexoMiDt[],
  registros: Map<string, { registradoEn: Date; documentoId: string | null }>,
  hoyCivil: string,
) {
  const items: MovimientoMiDt[] = [];
  for (const a of anexos) {
    const persona = a.persona;
    if (!persona.rut) continue;
    const hecho = dia(a.aprobadoEn);
    if (!hecho) continue;
    const cambio = MOTIVO_ANEXO[a.motivoCambio] ?? a.motivoCambio;
    items.push(
      fila(
        registros,
        hoyCivil,
        "anexo",
        a.id,
        hecho,
        `Cambio de ${cambio} · firmado el ${formatearFecha(hecho)}`,
        personaBase({ ...persona, rut: persona.rut }, "anexo"),
      ),
    );
  }
  return items;
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

  const items = [
    ...movimientosDeVinculos(vinculos, registros, hoyCivil),
    ...movimientosDeAnexos(anexos, registros, hoyCivil),
  ];
  const orden = (m: MovimientoMiDt) => (m.registrado ? 1 : 0) * 10_000 + Date.parse(`${m.plazoLimite}T00:00:00.000Z`);
  return items.sort((a, b) => orden(a) - orden(b) || b.hechoEn.localeCompare(a.hechoEn));
}