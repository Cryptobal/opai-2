import { z } from "zod";

import { conflicto, defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { uuid } from "./esquemas";

const TIPOS = ["proveedor_caido", "cola_atrasada", "cadena_rota", "otro"] as const;
const vistaSchema = z.object({
  id: z.string(), tipo: z.enum(TIPOS), severidad: z.enum(["baja", "media", "alta"]),
  inicio: z.string(), fin: z.string().nullable(), detalle: z.string().nullable(), origen: z.enum(["manual", "automatico"]),
});
type Fila = { id: string; tipo: string; severidad: string; inicio: Date; fin: Date | null; detalle: string | null; origen: string };
const vista = (f: Fila) => ({
  id: f.id, tipo: f.tipo as (typeof TIPOS)[number], severidad: f.severidad as "baja" | "media" | "alta",
  inicio: f.inicio.toISOString(), fin: f.fin?.toISOString() ?? null, detalle: f.detalle, origen: f.origen as "manual" | "automatico",
});

export const incidentesRegistrar = defineCapability({
  id: "asistencia.incidentes.registrar",
  descripcion:
    "Registra un incidente técnico del sistema de asistencia (proveedor caído, cola atrasada, cadena rota u otro) con su inicio, su fin si ya terminó y su severidad. Los automáticos (cadena rota, cola atrasada) los abre el propio sistema.",
  permiso: "asistencia:corregir",
  input: z.object({
    tipo: z.enum(TIPOS), severidad: z.enum(["baja", "media", "alta"]), inicio: z.string().datetime(),
    fin: z.string().datetime().optional(), detalle: z.string().trim().max(500).optional(),
  }),
  output: vistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (i.fin && i.fin < i.inicio) throw reglaDeNegocio("El fin no puede ser anterior al inicio.");
    const datos = { tipo: i.tipo, severidad: i.severidad, inicio: new Date(i.inicio), fin: i.fin ? new Date(i.fin) : null, detalle: i.detalle ?? null, origen: "manual" };
    if (dryRun) return vista({ id: "", ...datos });
    return vista(await ctx.db.incidenteTecnico.create({ data: { tenantId: ctx.tenantId, ...datos } }));
  },
});

export const incidentesCerrar = defineCapability({
  id: "asistencia.incidentes.cerrar",
  descripcion: "Cierra un incidente técnico abierto fijando su fin.",
  permiso: "asistencia:corregir",
  input: z.object({ incidenteId: uuid, fin: z.string().datetime().optional() }),
  output: vistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const f = await ctx.db.incidenteTecnico.findUnique({ where: { id: i.incidenteId } });
    if (!f) throw noEncontrado("El incidente");
    if (f.fin) throw conflicto("El incidente ya estaba cerrado.");
    const fin = i.fin ? new Date(i.fin) : new Date();
    if (fin < f.inicio) throw reglaDeNegocio("El fin no puede ser anterior al inicio.");
    if (dryRun) return vista({ ...f, fin });
    return vista(await ctx.db.incidenteTecnico.update({ where: { id: f.id }, data: { fin } }));
  },
});

export const incidentesListar = defineCapability({
  id: "asistencia.incidentes.listar",
  descripcion: "Lista los incidentes técnicos del sistema de asistencia, los más recientes primero, con su inicio, fin y severidad.",
  permiso: "asistencia:ver",
  input: z.object({ soloAbiertos: z.boolean().default(false) }),
  output: z.object({ items: z.array(vistaSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: () => [],
  async handler(ctx, i) {
    const filas = await ctx.db.incidenteTecnico.findMany({ where: i.soloAbiertos ? { fin: null } : {}, orderBy: { inicio: "desc" }, take: 200 });
    return { items: filas.map(vista) };
  },
});
