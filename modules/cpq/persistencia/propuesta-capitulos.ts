import { noEncontrado, reglaDeNegocio, resolverCamposDocumento, uuid7, type Contexto } from "@opai/capabilities";

import {
  armarCapitulo,
  esClaveSeccion,
  type CapituloVista,
  type ClaveSeccionCapitulo,
  type EntradaCapitulo,
  type OrigenCapitulo,
  type PuestoCapitulo,
} from "../domain/documento/capitulo-instalacion";
import { personasPorPosicion } from "../domain/motor/dotacion";
import type { Puesto } from "../domain/motor/tipos";
import { claveDePatron } from "./mapear";

type Linea = {
  nombre: string;
  tipo: string;
  posiciones: number;
  patron: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  diasCobertura: number | null;
  diasSemana: readonly unknown[] | null;
  personasPorPosicionEscaladas: number | null;
  personasMotivo: string | null;
};

/** Personas que exige un puesto: la misma regla del motor (`personasPorPosicion`) × posiciones; nulo si no se puede calcular. */
export function dotacionPuesto(l: Linea, patrones: ReadonlyMap<string, NonNullable<Puesto["patronDef"]>>): number | null {
  try {
    const nombre = l.patron ?? "4x4";
    const p: Puesto = {
      id: "capitulo", seccion: "capitulo", habilitada: true, variables: {}, tipo: "puesto", posiciones: l.posiciones,
      patron: nombre, patronDef: patrones.get(claveDePatron(nombre)),
      horaInicio: l.horaInicio ?? "08:00", horaFin: l.horaFin ?? "20:00",
      diasCobertura: l.diasSemana?.length ? l.diasSemana.length : (l.diasCobertura ?? 7),
      ...(l.personasPorPosicionEscaladas != null
        ? { personasPorPosicionEscaladas: l.personasPorPosicionEscaladas, motivoPersonas: l.personasMotivo ?? "" }
        : {}),
    };
    const n = personasPorPosicion(p);
    return Number((n.n * BigInt(l.posiciones) * 100n) / n.d) / 100;
  } catch {
    return null;
  }
}

const turnoTexto = (l: Linea) =>
  [l.patron, l.horaInicio && l.horaFin ? `${l.horaInicio}–${l.horaFin}` : null].filter(Boolean).join(" · ");

/** Instalaciones de la versión: secciones con `instalacionId` (la «Común» no tiene capítulo). */
export async function instalacionesDeVersion(ctx: Contexto, versionId: string) {
  const secs = await ctx.db.cpqSeccion.findMany({
    where: { versionId, instalacionId: { not: null } },
    orderBy: [{ orden: "asc" }],
  });
  const lineas = secs.length
    ? await ctx.db.cpqLinea.findMany({
        where: { seccionId: { in: secs.map((s) => s.id) }, tipo: "puesto", habilitada: true },
        orderBy: [{ orden: "asc" }, { id: "asc" }],
      })
    : [];
  return secs.flatMap((s) =>
    s.instalacionId ? [{ instalacionId: s.instalacionId, nombre: s.nombre, lineas: lineas.filter((l) => l.seccionId === s.id) }] : [],
  );
}

async function direccionYMapa(ctx: Contexto, cuentaId: string | null, instalacionId: string) {
  if (!cuentaId) return { nombre: null, direccion: null, mapa: null };
  try {
    const r = await resolverCamposDocumento(ctx, { finalidad: "propuesta", cuentaId, instalacionIds: [instalacionId], referencias: false });
    const i = r.colecciones.instalaciones[0];
    const t = (k: string) => (typeof i?.[k] === "string" ? (i[k] as string) : null);
    return { nombre: t("instalacion.nombre"), direccion: t("instalacion.direccion"), mapa: t("instalacion.mapa_url") };
  } catch {
    return { nombre: null, direccion: null, mapa: null };
  }
}

export async function capitulosDePropuesta(
  ctx: Contexto,
  prop: { id: string; versionId: string; cotizacionId: string },
): Promise<CapituloVista[]> {
  const instalaciones = await instalacionesDeVersion(ctx, prop.versionId);
  if (instalaciones.length === 0) return [];
  const cot = await ctx.db.cpqCotizacion.findFirst({ where: { id: prop.cotizacionId }, select: { negocioId: true } });
  const neg = cot ? await ctx.db.negocio.findFirst({ where: { id: cot.negocioId }, select: { cuentaId: true } }) : null;
  const patrones = new Map(
    (await ctx.db.patronTurno.findMany({ where: { activo: true } })).map((p) => [
      claveDePatron(p.nombre),
      { clase: p.clase, diasTrabajo: p.diasTrabajo, diasDescanso: p.diasDescanso, diasSemana: p.diasSemana },
    ]),
  );
  const filas = await ctx.db.cpqPropuestaCapitulo.findMany({ where: { propuestaId: prop.id } });
  const out: CapituloVista[] = [];
  for (const ins of instalaciones) {
    const dm = await direccionYMapa(ctx, neg?.cuentaId ?? null, ins.instalacionId);
    const textos: Partial<Record<ClaveSeccionCapitulo, string>> = {};
    for (const f of filas)
      if (f.instalacionId === ins.instalacionId && esClaveSeccion(f.seccionClave)) textos[f.seccionClave] = f.contenido;
    const puestos: PuestoCapitulo[] = ins.lineas.map((l) => ({
      nombre: l.nombre,
      guardiasSimultaneos: l.posiciones,
      dotacion: dotacionPuesto(l, patrones),
      turno: turnoTexto(l),
    }));
    const entrada: EntradaCapitulo = {
      instalacionId: ins.instalacionId,
      nombre: ins.nombre || dm.nombre || "Instalación",
      direccion: dm.direccion,
      mapaUrl: dm.mapa,
      puestos,
      textos,
    };
    out.push(armarCapitulo(entrada));
  }
  return out;
}

export async function guardarSeccionCapitulo(
  ctx: Contexto,
  d: {
    propuestaId: string;
    instalacionId: string;
    seccionClave: ClaveSeccionCapitulo;
    contenido: string;
    origen: OrigenCapitulo;
    escribir: boolean;
  },
) {
  const prop = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { id: d.propuestaId } });
  if (!prop) throw noEncontrado("La propuesta técnica");
  if (prop.estado === "congelada") throw reglaDeNegocio("La propuesta está congelada: no se pueden cambiar sus capítulos.");
  const sec = await ctx.db.cpqSeccion.findFirst({ where: { versionId: prop.versionId, instalacionId: d.instalacionId } });
  if (!sec) throw reglaDeNegocio("La instalación no es parte de esta cotización.");
  const actor = ctx.usuario?.id;
  if (!actor) throw reglaDeNegocio("Se necesita una persona responsable para guardar el capítulo.");
  if (!d.escribir) return { propuestaId: prop.id, instalacionId: d.instalacionId, seccionClave: d.seccionClave, eliminada: d.contenido === "" };
  const donde = { propuestaId: prop.id, instalacionId: d.instalacionId, seccionClave: d.seccionClave };
  if (d.contenido === "") {
    await ctx.db.cpqPropuestaCapitulo.deleteMany({ where: donde });
  } else {
    await ctx.db.cpqPropuestaCapitulo.upsert({
      where: { propuestaId_instalacionId_seccionClave: donde },
      create: { id: uuid7(), tenantId: ctx.tenantId, ...donde, contenido: d.contenido, origen: d.origen, actualizadoPorId: actor },
      update: { contenido: d.contenido, origen: d.origen, actualizadoPorId: actor },
    });
  }
  return { ...donde, eliminada: d.contenido === "" };
}

/** Capítulos de la propuesta de un envío (los que se imprimen en el PDF enviado). */
export async function capitulosDeEnvio(ctx: Contexto, propuestaTecnicaId: string | null): Promise<CapituloVista[]> {
  if (!propuestaTecnicaId) return [];
  const prop = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { id: propuestaTecnicaId } });
  return prop ? capitulosDePropuesta(ctx, prop) : [];
}
