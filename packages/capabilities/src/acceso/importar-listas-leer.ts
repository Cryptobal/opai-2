import { ALCANCES_LISTA, normalizarDocumento, type AlcanceLista, type TipoDocumento } from "@opai/domain";
import type { FilaNormalizada } from "@opai/domain/importacion";

import { fecha, norm, texto } from "../core/importar/comun";
import type { Contexto } from "../types";
import { huellasCandidatas, huellaVigente } from "./huella";

export type DatosLista = {
  alcance: AlcanceLista;
  instalacionId: string | null;
  cuentaId: string | null;
  grupoId: string | null;
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
export type Inst = { id: string; nombre: string };

export type FilaLeida = {
  inst: Inst;
  alcance: AlcanceLista;
  grupoNombre: string | null;
  tipo: string;
  docTipo: string;
  huella: string;
  huellaKid: string;
  mascara: string;
  nombre: string | null;
  motivo: string | null;
  vigenteDesde: Date | null;
  vigenteHasta: Date | null;
  candidatas: string[];
};

function parseAlcanceImportado(raw: string | null): AlcanceLista | string {
  const v = norm(raw ?? "instalacion");
  return (ALCANCES_LISTA as readonly string[]).includes(v) ? (v as AlcanceLista) : "Alcance inválido: use empresa, cuenta, instalación o grupo.";
}

/** Datos de una fila ya validada, o el error (sin el número del documento: el motivo queda en el lote). */
export function leerFilaLista(
  ctx: Contexto,
  f: FilaNormalizada,
  inst: Inst | string,
): FilaLeida | string {
  if (typeof inst === "string") return inst;
  const alcanceRes = parseAlcanceImportado(texto(f.datos["alcance"]));
  if (!(ALCANCES_LISTA as readonly string[]).includes(alcanceRes as string)) return alcanceRes;
  const alcance = alcanceRes as AlcanceLista;
  const grupoNombre = texto(f.datos["grupo"]);
  if (alcance === "grupo" && !grupoNombre) return "Un alcance de grupo necesita el nombre del grupo.";
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
  return {
    inst,
    alcance,
    grupoNombre,
    tipo,
    docTipo: d.tipo,
    huella: h.huella,
    huellaKid: h.kid,
    mascara: d.mascara,
    nombre: texto(f.datos["nombre"]),
    motivo,
    vigenteDesde: desde,
    vigenteHasta: fin,
    candidatas: huellasCandidatas(doc).map((x) => x.huella),
  };
}

export async function instalacionDe(ctx: Contexto) {
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

export function coincideEntradaLista(
  e: {
    alcance: string;
    instalacionId: string | null;
    cuentaId: string | null;
    grupoId: string | null;
    tipo: string;
    docTipo: string;
    huella: string;
  },
  datos: DatosLista,
  candidatas: string[],
) {
  return (
    e.alcance === datos.alcance &&
    e.instalacionId === datos.instalacionId &&
    e.cuentaId === datos.cuentaId &&
    e.grupoId === datos.grupoId &&
    e.tipo === datos.tipo &&
    e.docTipo === datos.docTipo &&
    candidatas.includes(e.huella)
  );
}