import type { Contexto } from "@opai/capabilities";

import { correccionesVista } from "../correcciones-listar";
import { ETIQUETA_TIPO } from "../formato";
import { horaZona, type Col, type Fila, type FiltroFilas } from "./filas-comun";
import { rangoDias } from "./esquema";

const horaRango = (desde: string, hasta: string) => ({
  gte: new Date(`${desde}T00:00:00.000Z`),
  lte: new Date(`${hasta}T23:59:59.999Z`),
});

export async function filasDomingosFestivos(ctx: Contexto, filtro: FiltroFilas, alcance: object) {
  const whereDia = {
    fecha: rangoDias(filtro.desde, filtro.hasta),
    ...(filtro.personaId ? { personaId: filtro.personaId } : {}),
    AND: [alcance, filtro.instalacionId ? { instalacionId: filtro.instalacionId } : {}],
  };
  const dias = await ctx.db.dia.findMany({ where: whereDia, orderBy: { fecha: "asc" } });
  const cal = await ctx.db.diaCalendario.findMany({
    where: {
      fecha: rangoDias(filtro.desde, filtro.hasta),
      archivadaEn: null,
      OR: [{ tenantId: null }, { tenantId: ctx.tenantId }],
    },
    select: { fecha: true },
  });
  const festivos = new Set(cal.map((f) => f.fecha.toISOString().slice(0, 10)));
  const porPersona = new Map<string, { domingos: number; festivos: number; personaId: string }>();
  for (const d of dias) {
    if (d.minutosTrabajados <= 0 && d.estado !== "presente") continue;
    const fIso = d.fecha.toISOString().slice(0, 10);
    const r = porPersona.get(d.personaId) ?? { domingos: 0, festivos: 0, personaId: d.personaId };
    if (d.fecha.getUTCDay() === 0) r.domingos += 1;
    else if (festivos.has(fIso)) r.festivos += 1;
    porPersona.set(d.personaId, r);
  }
  const personas = await ctx.db.persona.findMany({
    where: { id: { in: [...porPersona.keys()] } },
    select: { id: true, nombres: true, apellidos: true },
  });
  const nombres = new Map(personas.map((p) => [p.id, `${p.nombres} ${p.apellidos}`.trim()]));
  const filas: Fila[] = [...porPersona.values()].map((r) => ({
    trabajador: nombres.get(r.personaId) ?? r.personaId,
    domingos: r.domingos,
    festivos: r.festivos,
    total: r.domingos + r.festivos,
  }));
  const columnas: Col[] = [
    { clave: "trabajador", etiqueta: "Trabajador" },
    { clave: "domingos", etiqueta: "Domingos trabajados" },
    { clave: "festivos", etiqueta: "Festivos trabajados" },
    { clave: "total", etiqueta: "Total" },
  ];
  return { columnas, filas, siglasUsadas: [] as string[], provisorio: false };
}

export async function filasModificaciones(ctx: Contexto, filtro: FiltroFilas, alcance: object) {
  const marcas = await ctx.db.marca.findMany({
    where: {
      horaServidor: horaRango(filtro.desde, filtro.hasta),
      ...(filtro.personaId ? { personaId: filtro.personaId } : {}),
      AND: [alcance, filtro.instalacionId ? { instalacionId: filtro.instalacionId } : {}],
    },
    select: { id: true },
    take: 5000,
  });
  const items = (await correccionesVista(ctx, { marcaId: { in: marcas.map((m) => m.id) } })).filter(
    (c) => c.estado !== "pendiente" || c.rige === "propuesta",
  );
  const filas: Fila[] = items.map((c) => ({
    originalTipo: ETIQUETA_TIPO[c.original.tipo] ?? c.original.tipo,
    originalHora: c.original.hora,
    propuestaTipo: ETIQUETA_TIPO[c.propuesta.tipo] ?? c.propuesta.tipo,
    propuestaHora: c.propuesta.hora,
    estado: c.estado,
    motivo: c.motivo,
    solicitadoPor: "Empleador",
  }));
  const columnas: Col[] = [
    { clave: "originalHora", etiqueta: "Hora original" },
    { clave: "originalTipo", etiqueta: "Tipo original" },
    { clave: "propuestaHora", etiqueta: "Hora corregida" },
    { clave: "propuestaTipo", etiqueta: "Tipo corregido" },
    { clave: "estado", etiqueta: "Estado" },
    { clave: "motivo", etiqueta: "Motivo" },
    { clave: "solicitadoPor", etiqueta: "Solicitado por" },
  ];
  return { columnas, filas, siglasUsadas: [] as string[], provisorio: items.some((c) => c.estado === "pendiente") };
}

export async function filasReporteDiario(ctx: Contexto, filtro: FiltroFilas, alcance: object, zona: string) {
  const dia = filtro.hasta;
  const marcas = await ctx.db.marca.findMany({
    where: {
      horaServidor: horaRango(dia, dia),
      ...(filtro.personaId ? { personaId: filtro.personaId } : {}),
      AND: [alcance, filtro.instalacionId ? { instalacionId: filtro.instalacionId } : {}],
    },
    orderBy: { horaServidor: "asc" },
    take: 5000,
  });
  const personas = new Map(
    (
      await ctx.db.persona.findMany({
        where: { id: { in: [...new Set(marcas.map((m) => m.personaId))] } },
        select: { id: true, nombres: true, apellidos: true },
      })
    ).map((p) => [p.id, `${p.nombres} ${p.apellidos}`.trim()]),
  );
  const filas: Fila[] = marcas.map((m) => ({
    hora: horaZona(m.horaServidor, zona),
    trabajador: personas.get(m.personaId) ?? m.personaId,
    tipo: ETIQUETA_TIPO[m.tipo] ?? m.tipo,
    metodo: m.metodo,
    origen: m.origen,
    hash: `${m.hash.slice(0, 12)}…`,
  }));
  const columnas: Col[] = [
    { clave: "hora", etiqueta: "Hora" },
    { clave: "trabajador", etiqueta: "Trabajador" },
    { clave: "tipo", etiqueta: "Tipo" },
    { clave: "metodo", etiqueta: "Método" },
    { clave: "origen", etiqueta: "Origen" },
    { clave: "hash", etiqueta: "Hash" },
  ];
  return { columnas, filas, siglasUsadas: [] as string[], provisorio: false };
}

export async function filasIncidentes(ctx: Contexto, filtro: FiltroFilas) {
  const incidentes = await ctx.db.incidenteTecnico.findMany({
    where: { inicio: horaRango(filtro.desde, filtro.hasta) },
    orderBy: { inicio: "desc" },
  });
  const filas: Fila[] = incidentes.map((i) => ({
    tipo: i.tipo,
    severidad: i.severidad,
    inicio: i.inicio.toISOString(),
    fin: i.fin?.toISOString() ?? "—",
    detalle: i.detalle ?? "",
    origen: i.origen,
  }));
  const columnas: Col[] = [
    { clave: "inicio", etiqueta: "Inicio" },
    { clave: "fin", etiqueta: "Fin" },
    { clave: "tipo", etiqueta: "Tipo" },
    { clave: "severidad", etiqueta: "Severidad" },
    { clave: "origen", etiqueta: "Origen" },
    { clave: "detalle", etiqueta: "Detalle" },
  ];
  return { columnas, filas, siglasUsadas: [] as string[], provisorio: false };
}