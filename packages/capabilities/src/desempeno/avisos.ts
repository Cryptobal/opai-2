// Avisos bajo la meta al cerrar el mes (ADR-094, CAR-312). Si la empresa activó
// `desempeno.aviso_bajo_meta` (silencio por defecto, ADR-020), el cierre emite un evento por persona
// bajo la meta y uno por jefatura directa de su ficha. Son transaccionales: solo este consumidor los
// envía, a la persona o a la jefatura, y solo si puede ver ese resultado. Nunca llevan el puntaje.
import { type Acceso, esRol, renderizar, tienePermisoEfectivo } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { valoresEfectivos } from "../core/config";
import { campoAjuste } from "../core/config/catalogo";
import { equipoDe } from "../core/jefatura";
import { comunicableDe, plantillaVigente } from "../core/comunicaciones/resolver";
import { defineConsumidor, type EventoPublicado } from "../eventos/consumidores";
import type { Contexto } from "../types";
import type { FilaCierre } from "./cierre-calculo";
import { PERMISOS_DESEMPENO } from "./comun";

export const EVENTO_PERSONA_BAJO_META = "desempeno.resultado.bajo_meta";
export const EVENTO_EQUIPO_BAJO_META = "desempeno.equipo.bajo_meta";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10" → "octubre de 2026". */
export const nombreDelMes = (p: string) => `${MESES[Number(p.slice(5, 7)) - 1] ?? p} de ${p.slice(0, 4)}`;

/** ¿La empresa activó el aviso? Sin el ajuste declarado (registro sin el módulo), apagado. */
export async function avisoActivo(ctx: Contexto): Promise<boolean> {
  const campo = campoAjuste("desempeno", "aviso_bajo_meta");
  if (!campo) return false;
  const v = await valoresEfectivos(ctx, [campo]);
  return v.get("desempeno.aviso_bajo_meta")?.valor === true;
}

const bajoMeta = (f: FilaCierre) => f.puntaje !== null && f.puntaje < 100;

/** Emite los avisos del cierre dentro de su transacción (outbox, ADR-029). Quien cierra mira antes el ajuste. */
export async function emitirBajoMeta(ctx: Contexto, tx: TenantTx, periodo: string, filas: FilaCierre[]) {
  const porJefe = new Map<string, string[]>();
  for (const f of filas.filter(bajoMeta)) {
    await ctx.eventos.emitir(tx, {
      tipo: EVENTO_PERSONA_BAJO_META,
      entidadTipo: "persona",
      entidadId: f.personaId,
      payload: { periodo, scorecardId: f.scorecardId },
    });
    if (f.jefePersonaId) porJefe.set(f.jefePersonaId, [...(porJefe.get(f.jefePersonaId) ?? []), f.personaId]);
  }
  for (const [jefe, personaIds] of porJefe) {
    await ctx.eventos.emitir(tx, {
      tipo: EVENTO_EQUIPO_BAJO_META,
      entidadTipo: "persona",
      entidadId: jefe,
      payload: { periodo, personaIds },
    });
  }
}

/** Usuario de la ficha con membresía activa y permiso efectivo de ver resultados, o null. */
async function usuarioQueVe(ctx: Contexto, personaId: string): Promise<string | null> {
  const p = await ctx.db.persona.findFirst({
    where: { id: personaId, anonimizadaEn: null },
    select: { usuarioId: true },
  });
  if (!p?.usuarioId) return null;
  const m = await ctx.db.membership.findFirst({
    where: { userId: p.usuarioId, estado: "activa" },
    include: { rolTenant: true, excepciones: true },
  });
  if (!m) return null;
  const r = m.rolTenant;
  const acceso: Acceso = {
    rol: r || !esRol(m.rol) ? null : m.rol,
    // Un rol personalizado archivado deniega, igual que en la sesión.
    permisosRol: r ? (r.archivadoEn ? [] : r.permisos) : null,
    excepciones: m.excepciones.map((e) => ({ permiso: e.permiso, conceder: e.conceder })),
  };
  return tienePermisoEfectivo(acceso, PERMISOS_DESEMPENO.resultadosVer) ? m.userId : null;
}

/** Destinatario y cantidad. A la persona, si su cargo le muestra su resultado; a la jefatura, solo por su equipo real. */
async function destinatario(ctx: Contexto, ev: EventoPublicado): Promise<{ usuarioId: string; cantidad: number } | null> {
  if (!ev.entidadId) return null;
  const p = (ev.payload ?? {}) as { scorecardId?: unknown; personaIds?: unknown };
  let cantidad = 0;
  if (ev.tipo === EVENTO_PERSONA_BAJO_META) {
    if (typeof p.scorecardId !== "string") return null;
    const s = await ctx.db.desempenoScorecard.findFirst({
      where: { id: p.scorecardId },
      select: { personaVeResultado: true },
    });
    if (!s?.personaVeResultado) return null;
  } else {
    // Solo cuentan las personas que la jefatura de cargos le deja ver (ADR-094 §9, ADR-022).
    const ids = Array.isArray(p.personaIds) ? p.personaIds.filter((x): x is string => typeof x === "string") : [];
    const equipo = (await equipoDe(ctx, ev.entidadId)).ids;
    cantidad = ids.filter((id) => equipo.has(id)).length;
    if (cantidad === 0) return null;
  }
  const usuarioId = await usuarioQueVe(ctx, ev.entidadId);
  return usuarioId ? { usuarioId, cantidad } : null;
}

export const consumidorBajoMeta = defineConsumidor({
  id: "desempeno.avisos.bajo_meta",
  descripcion: "Campana a la persona bajo la meta y a su jefatura al cerrar el mes, si la empresa lo activó.",
  eventos: [EVENTO_PERSONA_BAJO_META, EVENTO_EQUIPO_BAJO_META],
  async handler(ctx, ev) {
    if (!(await avisoActivo(ctx))) return;
    const e = comunicableDe(ev.tipo);
    const plantilla = e ? await plantillaVigente(ctx.db, e, "inapp") : null;
    const d = e && plantilla ? await destinatario(ctx, ev) : null;
    if (!e || !plantilla || !d) return;
    const { usuarioId, cantidad } = d;
    if (await ctx.db.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId } })) return;
    const p = (ev.payload ?? {}) as { periodo?: unknown };
    const periodo = typeof p.periodo === "string" ? p.periodo : "";
    const empresa = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } });
    const datos = {
      periodo: { nombre: nombreDelMes(periodo) },
      equipo: { bajo_meta: cantidad },
      empresa: { nombre: empresa?.nombre ?? "" },
      url: `${ctx.servicios.urlBase}/desempeno`,
    };
    const rutas = e.variables.map((v) => v.ruta);
    await ctx.db.notificacion.create({
      data: {
        tenantId: ctx.tenantId,
        usuarioId,
        eventoId: ev.id,
        titulo: renderizar(plantilla.asunto, datos, rutas),
        cuerpo: renderizar(plantilla.cuerpo, datos, rutas),
        enlace: datos.url,
      },
    });
  },
});
