import {
  decidirAcceso,
  type EntradaLista,
  normalizarDocumento,
  normalizarPatente,
} from "@opai/domain";

import { huellasCandidatas } from "../../acceso/huella";
import type { Contexto } from "../../types";
import type { Equipo, FilaIntento, FilaRegistro, Hecho, Rechazos, Tiempo } from "./acceso-tipos";
import type { TIPOS_HECHO_TERRENO } from "./hechos-tipos";

/** Zona horaria de días y horarios de las listas (V1: la del país; la de la instalación llega con su ajuste). */
const ZONA = "America/Santiago";
/** Una entrada que llega con más de 2 minutos de retraso respecto de su hora se marca como diferida (R20). */
const DIFERIDO_MS = 120_000;

type Payload = ReturnType<(typeof TIPOS_HECHO_TERRENO)["acceso.entrada"]["parse"]>;

/** Cruza cada entrada con las listas de la instalación: entra (registro) o se deniega (intento). */
export async function evaluarEntradas(
  ctx: Contexto,
  equipo: Equipo,
  entradas: readonly { h: Hecho; p: Payload }[],
  t: Tiempo,
  rechazos: Rechazos,
): Promise<{ registros: FilaRegistro[]; intentos: FilaIntento[] }> {
  const base = {
    tenantId: ctx.tenantId,
    instalacionId: equipo.instalacionId,
    dispositivoId: equipo.id,
  };
  const registros: FilaRegistro[] = [];
  const intentos: FilaIntento[] = [];
  const docs = entradas.flatMap((e) => {
    const d = normalizarDocumento({
      tipo: e.p.documento.tipo,
      numero: e.p.documento.numero,
      ...(e.p.documento.pais === undefined ? {} : { pais: e.p.documento.pais }),
    });
    const pat = e.p.patente === undefined ? undefined : normalizarPatente(e.p.patente);
    if (!d) rechazos.set(e.h.clave, "documento_invalido");
    else if (pat === null) rechazos.set(e.h.clave, "patente_invalida");
    else {
      // Falla cerrado si falta la clave: el lote entero queda en el teléfono y se reintenta.
      const hs = huellasCandidatas({ tenantId: ctx.tenantId, tipo: d.tipo, clave: d.clave });
      const [vigente] = hs;
      if (vigente) return [{ ...e, d, patente: pat ?? null, hs, vigente }];
    }
    return [];
  });
  if (docs.length > 0) {
    const [lista, hayAutorizadas] = await Promise.all([
      ctx.db.entradaLista.findMany({
        where: {
          instalacionId: equipo.instalacionId,
          huella: { in: docs.flatMap((x) => x.hs.map((v) => v.huella)) },
        },
        include: { registros: { select: { id: true }, take: 1 } },
      }),
      ctx.db.entradaLista.count({
        where: { instalacionId: equipo.instalacionId, tipo: "autorizada" },
      }),
    ]);
    const consumidas = new Set<string>();
    for (const x of docs.sort((a, b) => a.h.horaHecho.localeCompare(b.h.horaHecho))) {
      const propias = lista.filter(
        (l) => l.docTipo === x.d.tipo && x.hs.some((v) => v.huella === l.huella),
      );
      const dominio = (l: (typeof propias)[number]): EntradaLista => ({
        tipo: l.tipo === "bloqueada" ? "bloqueada" : "autorizada",
        clave: x.d.clave,
        tiposRegistro: l.tiposRegistro,
        vigenteDesde: l.vigenteDesde,
        vigenteHasta: l.vigenteHasta,
        dias: l.dias,
        desdeMin: l.desdeMin,
        hastaMin: l.hastaMin,
        usoUnico: l.usoUnico,
        consumida: l.registros.length > 0 || consumidas.has(l.id),
      });
      const hora = t.corregir(new Date(x.h.horaHecho));
      const decision = decidirAcceso({
        clave: x.d.clave,
        tipoRegistro: x.p.tipoRegistro,
        modo: hayAutorizadas ? "solo_autorizados" : "permitir_fuera_de_lista",
        entradas: propias.map(dominio),
        ahora: hora,
        zona: ZONA,
      });
      const comun = {
        ...base,
        clave: x.h.clave,
        personaId: x.h.personaId ?? null,
        tipoRegistro: x.p.tipoRegistro,
        docTipo: x.d.tipo,
        huella: x.vigente.huella,
        huellaKid: x.vigente.kid,
        mascara: x.d.mascara,
        horaCorregida: hora,
      };
      if (decision.resultado === "denegado") {
        intentos.push({ ...comun, motivo: decision.motivo });
        continue;
      }
      const usada = propias.find(
        (l) => l.tipo === "autorizada" && l.usoUnico && !dominio(l).consumida,
      );
      if (usada) consumidas.add(usada.id);
      registros.push({
        ...comun,
        nombre: x.p.nombre,
        empresa: x.p.empresa ?? null,
        motivoVisita: x.p.motivo ?? null,
        patente: x.patente,
        entradaListaId: usada?.id ?? null,
        origen:
          t.recibidoEn.getTime() - new Date(x.h.horaHecho).getTime() > DIFERIDO_MS
            ? "diferido"
            : "en_linea",
      });
    }
  }

  return { registros, intentos };
}
