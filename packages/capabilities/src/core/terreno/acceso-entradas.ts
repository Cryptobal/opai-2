import { diaEnZona, normalizarDocumento, normalizarPatente } from "@opai/domain";

import { type HuellaVersionada, huellasCandidatas } from "../../acceso/huella";
import type { Contexto } from "../../types";
import { tenantActual } from "../comun";
import { cruzarPrerregistros, type VisitanteDia } from "./acceso-prerregistro";
import { escribirFilas } from "./acceso-filas";
import type {
  Equipo,
  FilaIntento,
  FilaRegistro,
  FilaUso,
  Hecho,
  Rechazos,
  Tiempo,
} from "./acceso-tipos";
import type { TIPOS_HECHO_TERRENO } from "./hechos-tipos";

type Payload = ReturnType<(typeof TIPOS_HECHO_TERRENO)["acceso.entrada"]["parse"]>;
export type Doc = { tipo: string; clave: string; mascara: string; hs: HuellaVersionada[] };
export type Entrada = { h: Hecho; p: Payload; dia: string };

/** Documento y patente de la entrada (normalizados, con sus huellas); `null` y un rechazo si no sirven. */
function documentoDe(ctx: Contexto, e: Entrada, rechazos: Rechazos): Doc | null {
  if (e.p.patente !== undefined && normalizarPatente(e.p.patente) === null) {
    rechazos.set(e.h.clave, "patente_invalida");
    return null;
  }
  if (!e.p.documento) return null;
  const d = normalizarDocumento({
    tipo: e.p.documento.tipo,
    numero: e.p.documento.numero,
    ...(e.p.documento.pais === undefined ? {} : { pais: e.p.documento.pais }),
  });
  if (!d) {
    rechazos.set(e.h.clave, "documento_invalido");
    return null;
  }
  // Falla cerrado si falta la clave: el lote entero queda en el teléfono y se reintenta.
  const hs = huellasCandidatas({ tenantId: ctx.tenantId, tipo: d.tipo, clave: d.clave });
  return { tipo: d.tipo, clave: d.clave, mascara: d.mascara, hs };
}

/** Sin documento, el del visitante prerregistrado (la invitación ya lo identifica: solo se guarda su huella). */
const documentoDelVisitante = (v: VisitanteDia): Doc => ({
  tipo: v.docTipo,
  clave: v.huella,
  mascara: v.mascara,
  hs: [{ kid: v.huellaKid, huella: v.huella }],
});

/** Cruza cada entrada con los prerregistros y las listas de la instalación: entra (registro) o se deniega (intento). */
export async function evaluarEntradas(
  ctx: Contexto,
  equipo: Equipo,
  crudas: readonly { h: Hecho; p: Payload }[],
  t: Tiempo,
  rechazos: Rechazos,
): Promise<{ registros: FilaRegistro[]; intentos: FilaIntento[]; usos: FilaUso[] }> {
  // Días, días de semana y horarios se evalúan en la zona horaria de la empresa (`core.tenants.timezone`).
  const { timezone: zona } = await tenantActual(ctx);
  const entradas = [...crudas]
    .sort((a, b) => a.h.horaHecho.localeCompare(b.h.horaHecho))
    .map((e) => ({ ...e, dia: diaEnZona(t.corregir(new Date(e.h.horaHecho)), zona) }));
  const validas = entradas
    .map((e) => ({ e, d: documentoDe(ctx, e, rechazos) }))
    .filter((x) => !rechazos.has(x.e.h.clave) && (x.d || x.e.p.invitacion));
  const pre = await cruzarPrerregistros(
    ctx,
    equipo.instalacionId,
    validas.map(({ e, d }) => ({
      clave: e.h.clave,
      dia: e.dia,
      invitacion: e.p.invitacion,
      huellas: d?.hs.map((v) => v.huella) ?? [],
    })),
    rechazos,
  );
  const listos = validas.flatMap(({ e, d }) => {
    if (rechazos.has(e.h.clave)) return [];
    const v = pre.get(e.h.clave);
    const doc = d ?? (v ? documentoDelVisitante(v) : null);
    return doc ? [{ e, d: doc, pre: v }] : [];
  });
  return escribirFilas(ctx, equipo, listos, t, zona);
}
