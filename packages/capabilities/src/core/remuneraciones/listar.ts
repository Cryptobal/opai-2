import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { publicacionDesdeFila, fechaCivil } from "./comun";

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const filaSchema = z.object({
  clave: z.string(),
  nombre: z.string(),
  valorResumen: z.string(),
  vigenteDesde: z.string(),
  fuente: z.string(),
  verificacion: z.enum(["verificado", "por_verificar"]),
  estado: z.string(),
  editable: z.boolean(),
  pendienteConfirmar: z.boolean(),
});

export const remuneracionesIndicadoresListar = defineCapability({
  id: "core.remuneraciones.listar",
  descripcion: "Indicadores legales vigentes en una fecha, con fuente, estado y vigencia.",
  permiso: PERMISOS_CORE.remuneracionesRead,
  input: z.object({ fecha: fechaSchema.optional() }),
  output: z.object({
    fecha: fechaSchema,
    filas: z.array(filaSchema),
    mutualAdicional: z.object({
      escalada: z.number().int().nullable(),
      estado: z.enum(["pendiente", "vigente"]),
      resumen: z.string(),
    }),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const fecha = input.fecha ?? new Date().toISOString().slice(0, 10);
    const [indicadores, perfil] = await Promise.all([
      ctx.db.indicadorLegal.findMany({ orderBy: { clave: "asc" } }),
      ctx.db.remuneracionesPerfil.findUnique({ where: { tenantId: ctx.tenantId } }),
    ]);
    const publicados = await ctx.db.valorPublicado.findMany({
      where: { estado: { in: ["vigente", "propuesto", "retenido"] } },
      include: { indicador: true },
      orderBy: { vigenteDesde: "desc" },
    });
    const tenantVals = await ctx.db.valorTenant.findMany({
      where: { tenantId: ctx.tenantId, estado: { in: ["vigente", "propuesto", "retenido"] } },
      include: { indicador: true },
      orderBy: { vigenteDesde: "desc" },
    });
    const resumenValor = (clave: string, json: unknown): string => {
      if (clave === "uf") return `$ ${((json as number) / 100).toLocaleString("es-CL")}`;
      if (typeof json === "number") return String(json);
      return "Ver detalle";
    };
    const filas = indicadores.map((ind) => {
      const t = tenantVals.find((v) => v.indicadorId === ind.id && v.vigenteDesde <= new Date(`${fecha}T00:00:00.000Z`));
      const p = publicados.find((v) => v.indicadorId === ind.id && v.vigenteDesde <= new Date(`${fecha}T00:00:00.000Z`));
      const pub = t ? publicacionDesdeFila({ ...t, indicador: ind }) : p ? publicacionDesdeFila({ ...p, indicador: ind }) : null;
      const pendiente = pub?.estado === "propuesto" || pub?.verificacion === "por_verificar";
      return {
        clave: ind.clave,
        nombre: ind.nombre,
        valorResumen: pub ? resumenValor(ind.clave, pub.valor) : "Sin publicación",
        vigenteDesde: pub?.vigenteDesde ?? "—",
        fuente: pub?.fuente ?? ind.fuentePrimaria,
        verificacion: pub?.verificacion ?? "por_verificar",
        estado: pub?.estado ?? "propuesto",
        editable: ctx.autorizar(PERMISOS_CORE.remuneracionesManage),
        pendienteConfirmar: pendiente,
      };
    });
    const mutual = perfil?.mutualAdicionalEstado === "vigente" ? perfil.mutualAdicionalEscalada : null;
    return {
      fecha,
      filas,
      mutualAdicional: {
        escalada: mutual ?? null,
        estado: (perfil?.mutualAdicionalEstado ?? "pendiente") as "pendiente" | "vigente",
        resumen: mutual != null ? `${(mutual / 10_000).toFixed(2).replace(".", ",")} %` : "Pendiente",
      },
    };
  },
});

export const remuneracionesHistorial = defineCapability({
  id: "core.remuneraciones.historial",
  descripcion: "Historial de valores publicados y capturas de un indicador legal.",
  permiso: PERMISOS_CORE.remuneracionesRead,
  input: z.object({ clave: z.string().min(1) }),
  output: z.array(
    z.object({
      tipo: z.enum(["publicado", "captura", "tenant"]),
      fecha: z.string(),
      resumen: z.string(),
      fuente: z.string(),
      estado: z.string(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { clave }) {
    const ind = await ctx.db.indicadorLegal.findUnique({ where: { clave } });
    if (!ind) return [];
    const [pub, cap, ten] = await Promise.all([
      ctx.db.valorPublicado.findMany({ where: { indicadorId: ind.id }, orderBy: { vigenteDesde: "desc" }, take: 40 }),
      ctx.db.capturaIndicador.findMany({ where: { indicadorId: ind.id }, orderBy: { capturadoEn: "desc" }, take: 40 }),
      ctx.db.valorTenant.findMany({ where: { tenantId: ctx.tenantId, indicadorId: ind.id }, orderBy: { vigenteDesde: "desc" }, take: 20 }),
    ]);
    return [
      ...pub.map((p) => ({
        tipo: "publicado" as const,
        fecha: fechaCivil(p.vigenteDesde),
        resumen: String(p.verificacion),
        fuente: p.fuente,
        estado: p.estado,
      })),
      ...ten.map((t) => ({
        tipo: "tenant" as const,
        fecha: fechaCivil(t.vigenteDesde),
        resumen: t.origen,
        fuente: t.evidencia ?? "Empresa",
        estado: t.estado,
      })),
      ...cap.map((c) => ({
        tipo: "captura" as const,
        fecha: c.capturadoEn.toISOString().slice(0, 10),
        resumen: c.resultado,
        fuente: c.fuenteConsultada,
        estado: c.alertaEmitida ? "alerta" : "ok",
      })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha));
  },
});
