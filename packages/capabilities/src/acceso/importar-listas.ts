// Importar listas autorizada y bloqueada desde una planilla (CAR-480) sobre el motor común (CAR-279).
import { normalizarDocumento, type TipoDocumento } from "@opai/domain";
import type { FilaNormalizada } from "@opai/domain/importacion";

import { fecha, norm, texto } from "../core/importar/comun";
import type { FilaPlan, Importador } from "../core/importar/tipos";
import type { Contexto } from "../types";
import { PERMISO_LISTAS } from "./comun";
import { huellasCandidatas, huellaVigente } from "./huella";
import { defListas } from "./importar-listas-campos";

export type DatosLista = {
  instalacionId: string;
  tipo: string;
  docTipo: string;
  huella: string;
  huellaKid: string;
  mascara: string;
  nombre: string | null;
  motivo: string | null;
  vigenteDesde: Date | null;
  vigenteHasta: Date | null;
};

const UN_DIA = 86_400_000;
type Inst = { id: string; nombre: string };

/** Datos de una fila ya validada, o el error (sin el número del documento: el motivo queda en el lote). */
function leerFila(
  ctx: Contexto,
  f: FilaNormalizada,
  inst: Inst | string,
): { datos: DatosLista; candidatas: string[]; inst: Inst } | string {
  if (typeof inst === "string") return inst;
  const tipo = texto(f.datos["lista"]) ?? "";
  const docTipo = (texto(f.datos["documento_tipo"]) ?? "run") as TipoDocumento;
  const d = normalizarDocumento({
    tipo: docTipo,
    numero: texto(f.datos["documento"]) ?? "",
    pais: texto(f.datos["pais"]) ?? "",
  });
  if (!d)
    return "Documento inválido: revisa el dígito verificador del RUT o el país del pasaporte.";
  const motivo = texto(f.datos["motivo"]);
  if (tipo === "bloqueada" && !motivo) return "Un bloqueo necesita motivo.";
  const desde = fecha(f.datos["vigente_desde"]);
  const hasta = fecha(f.datos["vigente_hasta"]);
  const fin = hasta ? new Date(hasta.getTime() + UN_DIA) : null;
  if (desde && fin && desde >= fin) return "La vigencia termina antes de empezar.";
  const doc = { tenantId: ctx.tenantId, tipo: d.tipo, clave: d.clave };
  const h = huellaVigente(doc);
  const datos: DatosLista = {
    instalacionId: inst.id,
    tipo,
    docTipo: d.tipo,
    huella: h.huella,
    huellaKid: h.kid,
    mascara: d.mascara,
    nombre: texto(f.datos["nombre"]),
    motivo,
    vigenteDesde: desde,
    vigenteHasta: fin,
  };
  return { datos, inst, candidatas: huellasCandidatas(doc).map((x) => x.huella) };
}

async function instalacionDe(ctx: Contexto) {
  const todas = await ctx.db.instalacion.findMany({
    where: { archivadaEn: null },
    select: { id: true, nombre: true },
  });
  return (nombre: string): Inst | string => {
    const c = todas.filter((i) => norm(i.nombre) === norm(nombre));
    if (c.length === 1 && c[0]) return c[0];
    return c.length > 1
      ? `Hay ${c.length} instalaciones llamadas «${nombre}»: renombra una antes de importar.`
      : `No existe la instalación «${nombre}».`;
  };
}

export const importadorListas: Importador<DatosLista> = {
  def: defListas,
  entidad: "acceso_entrada_lista",
  permiso: PERMISO_LISTAS,
  modulo: "acceso",
  actualizables: ["nombre", "motivo", "vigenteDesde", "vigenteHasta"],
  async planificar(ctx, filas) {
    const resolver = await instalacionDe(ctx);
    const insts = filas.map((f) => resolver(texto(f.datos["instalacion"]) ?? ""));
    const ids = insts.flatMap((i) => (typeof i === "string" ? [] : [i.id]));
    const existentes = await ctx.db.entradaLista.findMany({
      where: { instalacionId: { in: ids } },
    });
    return filas.map((f, n): FilaPlan<DatosLista> => {
      const leida = leerFila(ctx, f, insts[n] ?? "");
      if (typeof leida === "string")
        return {
          fila: f.fila,
          clave: `fila:${f.fila}`,
          etiqueta: "",
          accion: "error",
          mensajes: [leida],
        };
      const { datos, candidatas, inst } = leida;
      const existente = existentes.find(
        (e) =>
          e.instalacionId === datos.instalacionId &&
          e.tipo === datos.tipo &&
          e.docTipo === datos.docTipo &&
          candidatas.includes(e.huella),
      );
      return {
        fila: f.fila,
        clave: `${datos.instalacionId}|${datos.tipo}|${datos.docTipo}|${datos.huella}`,
        etiqueta: `${datos.nombre ?? datos.mascara} · ${inst.nombre}`,
        accion: existente ? "actualizar" : "crear",
        mensajes: [],
        datos,
        ...(existente ? { existente } : {}),
      };
    });
  },
  async crear(tx, ctx, datos) {
    return (await tx.entradaLista.create({ data: { ...datos, tenantId: ctx.tenantId } })).id;
  },
  async actualizar(tx, id, { instalacionId: _i, tipo: _t, docTipo: _d, ...cambios }) {
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
