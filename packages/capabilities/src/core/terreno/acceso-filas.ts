import { randomUUID } from "node:crypto";

import { decidirAcceso, type EntradaLista, normalizarPatente } from "@opai/domain";

import { fechaDia } from "../../acceso/prerregistro-comun";
import type { Contexto } from "../../types";
import type { Doc, Entrada } from "./acceso-entradas";
import type { VisitanteDia } from "./acceso-prerregistro";
import type { Equipo, FilaIntento, FilaRegistro, FilaUso, Tiempo } from "./acceso-tipos";

/** Una entrada que llega con más de 2 minutos de retraso respecto de su hora se marca como diferida (R20). */
const DIFERIDO_MS = 120_000;
type Lista = { e: Entrada; d: Doc; pre?: VisitanteDia | undefined };

/** Entradas de lista de la instalación que coinciden con alguna huella del lote, y si hay lista autorizada. */
async function listasDe(ctx: Contexto, instalacionId: string, huellas: string[]) {
  const [lista, hayAutorizadas] = await Promise.all([
    ctx.db.entradaLista.findMany({
      where: { instalacionId, huella: { in: huellas } },
      include: { registros: { select: { id: true }, take: 1 } },
    }),
    ctx.db.entradaLista.count({ where: { instalacionId, tipo: "autorizada" } }),
  ]);
  return { lista, hayAutorizadas: hayAutorizadas > 0 };
}
type Listas = Awaited<ReturnType<typeof listasDe>>;

/** Un prerregistro vigente autoriza ese día como una entrada de lista sin horario (R2); el bloqueo igual gana (R7). */
const autorizaPrerregistro = (clave: string): EntradaLista => ({
  tipo: "autorizada",
  clave,
  tiposRegistro: [],
  vigenteDesde: null,
  vigenteHasta: null,
  dias: [],
  desdeMin: null,
  hastaMin: null,
  usoUnico: false,
  consumida: false,
});

/** Decide una entrada con sus listas (y su prerregistro, si tiene); devuelve la decisión y la lista de uso único que consume. */
function decidir(x: Lista, l: Listas, hora: Date, zona: string, consumidas: Set<string>) {
  const propias = l.lista.filter(
    (f) => f.docTipo === x.d.tipo && x.d.hs.some((v) => v.huella === f.huella),
  );
  const dominio = (f: (typeof propias)[number]): EntradaLista => ({
    tipo: f.tipo === "bloqueada" ? "bloqueada" : "autorizada",
    clave: x.d.clave,
    tiposRegistro: f.tiposRegistro,
    vigenteDesde: f.vigenteDesde,
    vigenteHasta: f.vigenteHasta,
    dias: f.dias,
    desdeMin: f.desdeMin,
    hastaMin: f.hastaMin,
    usoUnico: f.usoUnico,
    consumida: f.registros.length > 0 || consumidas.has(f.id),
  });
  const decision = decidirAcceso({
    clave: x.d.clave,
    tipoRegistro: x.e.p.tipoRegistro,
    modo: l.hayAutorizadas || x.pre ? "solo_autorizados" : "permitir_fuera_de_lista",
    entradas: [...propias.map(dominio), ...(x.pre ? [autorizaPrerregistro(x.d.clave)] : [])],
    ahora: hora,
    zona,
  });
  const usada = x.pre
    ? undefined
    : propias.find((f) => f.tipo === "autorizada" && f.usoUnico && !dominio(f).consumida);
  if (usada && decision.resultado === "permitido") consumidas.add(usada.id);
  return {
    decision,
    entradaListaId: decision.resultado === "permitido" ? (usada?.id ?? null) : null,
  };
}

/** Fila de un registro de entrada: datos de la entrada o, si faltan, los del prerregistro. */
function filaRegistro(
  x: Lista,
  comun: Omit<FilaRegistro, "nombre" | "origen">,
  id: string,
  entradaListaId: string | null,
  t: Tiempo,
): FilaRegistro {
  return {
    ...comun,
    id,
    nombre: x.e.p.nombre,
    empresa: x.e.p.empresa ?? x.pre?.empresa ?? null,
    motivoVisita: x.e.p.motivo ?? null,
    patente: (x.e.p.patente ? normalizarPatente(x.e.p.patente) : null) ?? x.pre?.patente ?? null,
    entradaListaId,
    origen:
      t.recibidoEn.getTime() - new Date(x.e.h.horaHecho).getTime() > DIFERIDO_MS
        ? "diferido"
        : "en_linea",
  };
}

/** Registros, intentos y usos de prerregistro de las entradas listas para decidir (todo es solo inserción). */
export async function escribirFilas(
  ctx: Contexto,
  equipo: Equipo,
  listos: readonly Lista[],
  t: Tiempo,
  zona: string,
): Promise<{ registros: FilaRegistro[]; intentos: FilaIntento[]; usos: FilaUso[] }> {
  const registros: FilaRegistro[] = [];
  const intentos: FilaIntento[] = [];
  const usos: FilaUso[] = [];
  if (listos.length === 0) return { registros, intentos, usos };
  const l = await listasDe(
    ctx,
    equipo.instalacionId,
    listos.flatMap((x) => x.d.hs.map((v) => v.huella)),
  );
  const consumidas = new Set<string>();
  for (const x of listos) {
    const hora = t.corregir(new Date(x.e.h.horaHecho));
    const { decision, entradaListaId } = decidir(x, l, hora, zona, consumidas);
    const vigente = x.d.hs[0] ?? { kid: "", huella: "" };
    const comun = {
      tenantId: ctx.tenantId,
      instalacionId: equipo.instalacionId,
      dispositivoId: equipo.id,
      clave: x.e.h.clave,
      personaId: x.e.h.personaId ?? null,
      tipoRegistro: x.e.p.tipoRegistro,
      docTipo: x.d.tipo,
      huella: vigente.huella,
      huellaKid: vigente.kid,
      mascara: x.d.mascara,
      horaCorregida: hora,
    };
    if (decision.resultado === "denegado") {
      intentos.push({ ...comun, motivo: decision.motivo });
      continue;
    }
    const id = randomUUID();
    registros.push(filaRegistro(x, comun, id, entradaListaId, t));
    if (x.pre)
      usos.push({
        tenantId: ctx.tenantId,
        visitanteId: x.pre.visitanteId,
        dia: fechaDia(x.pre.dia),
        registroId: id,
      });
  }
  return { registros, intentos, usos };
}
