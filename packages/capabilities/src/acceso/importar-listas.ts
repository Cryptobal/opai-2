// Importar listas autorizada y bloqueada desde una planilla (CAR-480) sobre el motor común (CAR-279).
import type { FilaNormalizada } from "@opai/domain/importacion";

import { norm, texto } from "../core/importar/comun";
import type { FilaPlan, Importador } from "../core/importar/tipos";
import type { Contexto } from "../types";
import { PERMISO_LISTAS } from "./comun";
import { defListas } from "./importar-listas-campos";
import {
  coincideEntradaLista,
  type DatosLista,
  type Inst,
  instalacionDe,
  leerFilaLista,
} from "./importar-listas-leer";
import { clavesAlcance, metaListasInstalacion } from "./listas-alcance";

export type { DatosLista } from "./importar-listas-leer";

type FilaOk = { fila: number; datos: DatosLista; candidatas: string[]; inst: Inst };

function errorFila(fila: number, mensaje: string): FilaPlan<DatosLista> {
  return { fila, clave: `fila:${fila}`, etiqueta: "", accion: "error", mensajes: [mensaje] };
}

async function planificarFilas(
  ctx: Contexto,
  filas: readonly FilaNormalizada[],
): Promise<(FilaPlan<DatosLista> | FilaOk)[]> {
  const resolver = await instalacionDe(ctx);
  const insts = filas.map((f) => resolver(texto(f.datos["instalacion"]) ?? ""));
  const gruposDb = await ctx.db.grupoLista.findMany({ select: { id: true, nombre: true } });
  const grupoIdDe = (nombre: string): string | string => {
    const c = gruposDb.filter((g) => norm(g.nombre) === norm(nombre));
    if (c.length === 1 && c[0]) return c[0].id;
    return c.length > 1
      ? `Hay ${c.length} grupos llamados «${nombre}».`
      : `No existe el grupo «${nombre}».`;
  };

  const listas: (FilaPlan<DatosLista> | FilaOk)[] = [];
  for (let n = 0; n < filas.length; n++) {
    const f = filas[n]!;
    const leida = leerFilaLista(ctx, f, insts[n] ?? "");
    if (typeof leida === "string") {
      listas.push(errorFila(f.fila, leida));
      continue;
    }
    let grupoId: string | null = null;
    if (leida.alcance === "grupo" && leida.grupoNombre) {
      const g = grupoIdDe(leida.grupoNombre);
      if (typeof g === "string") {
        listas.push(errorFila(f.fila, g));
        continue;
      }
      grupoId = g;
    }
    const meta = await metaListasInstalacion(ctx, leida.inst.id);
    const claves = clavesAlcance({
      alcance: leida.alcance,
      instalacionId: leida.inst.id,
      grupoId,
      meta,
    });
    const datos: DatosLista = {
      ...claves,
      tipo: leida.tipo,
      docTipo: leida.docTipo,
      huella: leida.huella,
      huellaKid: leida.huellaKid,
      mascara: leida.mascara,
      nombre: leida.nombre,
      motivo: leida.motivo,
      vigenteDesde: leida.vigenteDesde,
      vigenteHasta: leida.vigenteHasta,
    };
    listas.push({ fila: f.fila, datos, candidatas: leida.candidatas, inst: leida.inst });
  }
  return listas;
}

export const importadorListas: Importador<DatosLista> = {
  def: defListas,
  entidad: "acceso_entrada_lista",
  permiso: PERMISO_LISTAS,
  modulo: "acceso",
  actualizables: ["nombre", "motivo", "vigenteDesde", "vigenteHasta"],
  async planificar(ctx, filas) {
    const listas = await planificarFilas(ctx, filas);
    const cuentaIds = new Set<string>();
    const grupoIds = new Set<string>();
    const instIds = new Set<string>();
    let hayEmpresa = false;
    for (const slot of listas) {
      if (!("inst" in slot)) continue;
      hayEmpresa ||= slot.datos.alcance === "empresa";
      if (slot.datos.instalacionId) instIds.add(slot.datos.instalacionId);
      if (slot.datos.cuentaId) cuentaIds.add(slot.datos.cuentaId);
      if (slot.datos.grupoId) grupoIds.add(slot.datos.grupoId);
    }
    const or = [
      ...(hayEmpresa ? [{ alcance: "empresa" as const }] : []),
      ...(instIds.size ? [{ instalacionId: { in: [...instIds] } }] : []),
      ...(cuentaIds.size ? [{ alcance: "cuenta" as const, cuentaId: { in: [...cuentaIds] } }] : []),
      ...(grupoIds.size ? [{ alcance: "grupo" as const, grupoId: { in: [...grupoIds] } }] : []),
    ];
    const existentes =
      or.length > 0 ? await ctx.db.entradaLista.findMany({ where: { OR: or } }) : [];

    return listas.map((slot) => {
      if (!("inst" in slot)) return slot;
      const { fila, datos, candidatas, inst } = slot;
      const existente = existentes.find((e) => coincideEntradaLista(e, datos, candidatas));
      const clave = `${datos.alcance}|${datos.instalacionId ?? ""}|${datos.cuentaId ?? ""}|${datos.grupoId ?? ""}|${datos.tipo}|${datos.docTipo}|${datos.huella}`;
      return {
        fila,
        clave,
        etiqueta: `${datos.nombre ?? datos.mascara} · ${inst.nombre} (${datos.alcance})`,
        accion: existente ? ("actualizar" as const) : ("crear" as const),
        mensajes: [],
        datos,
        ...(existente ? { existente } : {}),
      };
    });
  },
  async crear(tx, ctx, datos) {
    return (await tx.entradaLista.create({ data: { ...datos, tenantId: ctx.tenantId } })).id;
  },
  async actualizar(tx, id, { instalacionId: _i, tipo: _t, docTipo: _d, alcance: _a, ...cambios }) {
    await tx.entradaLista.update({ where: { id }, data: cambios });
  },
  actuales: (tx, ids) => tx.entradaLista.findMany({ where: { id: { in: [...ids] } } }),
  async bloqueos(tx, ids) {
    const usadas = await tx.entradaLista.findMany({
      where: { id: { in: [...ids] }, registros: { some: {} } },
      select: { id: true },
    });
    return new Map(usadas.map((e) => [e.id, "ya se usó en un ingreso"]));
  },
  async borrar(tx, ids) {
    await tx.entradaLista.deleteMany({ where: { id: { in: [...ids] } } });
  },
};