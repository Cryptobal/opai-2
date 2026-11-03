import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { publicacionDesdeFila, fechaCivil } from "./comun";
import { desgloseIndicador } from "./desglose";
import { fechaDisplay, hoyCivil, pctDisplay, resumenIndicador } from "./formato";

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ZONA = "America/Santiago";

const filaSchema = z.object({
  clave: z.string(),
  nombre: z.string(),
  valorResumen: z.string(),
  desglose: z.array(z.string()),
  vigenteDesde: z.string(),
  fuente: z.string(),
  verificacion: z.enum(["verificado", "por_verificar"]),
  estado: z.string(),
  editable: z.boolean(),
  pendienteConfirmar: z.boolean(),
  detalleDisponible: z.boolean(),
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
      confirmadoPor: z.string().nullable(),
      confirmadoEn: z.string().nullable(),
    }),
    capturaSii: z.object({
      ultimaCaptura: z.string().nullable(),
      ufVigenteDesde: z.string().nullable(),
      ufDesactualizada: z.boolean(),
    }),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: () => [],
  async handler(ctx, input) {
    const fecha = input.fecha ?? hoyCivil();
    const fConsulta = new Date(`${fecha}T12:00:00.000Z`);
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
    const ufInd = indicadores.find((i) => i.clave === "uf");
    const ultimaCaptura = ufInd
      ? await ctx.db.capturaIndicador.findFirst({
          where: { indicadorId: ufInd.id },
          orderBy: { capturadoEn: "desc" },
        })
      : null;
    let confirmadoPor: string | null = null;
    if (perfil?.mutualConfirmadoPorId) {
      const u = await ctx.db.user.findUnique({
        where: { id: perfil.mutualConfirmadoPorId },
        select: { name: true },
      });
      confirmadoPor = u?.name ?? null;
    }
    let ufVigenteDesde: string | null = null;
    const filas = indicadores.map((ind) => {
      const t = tenantVals.find((v) => v.indicadorId === ind.id && v.vigenteDesde <= fConsulta);
      const p = publicados.find((v) => v.indicadorId === ind.id && v.vigenteDesde <= fConsulta);
      const pub = t
        ? publicacionDesdeFila({ ...t, indicador: ind })
        : p
          ? publicacionDesdeFila({ ...p, indicador: ind })
          : null;
      if (ind.clave === "uf" && pub) ufVigenteDesde = pub.vigenteDesde;
      const pendiente = pub?.estado === "propuesto" || pub?.verificacion === "por_verificar";
      return {
        clave: ind.clave,
        nombre: ind.nombre,
        valorResumen: pub ? resumenIndicador(ind.clave, pub.valor) : "Sin publicación",
        desglose: pub ? desgloseIndicador(ind.clave, pub.valor) : [],
        vigenteDesde: pub ? fechaDisplay(pub.vigenteDesde) : "—",
        fuente: pub?.fuente ?? ind.fuentePrimaria,
        verificacion: pub?.verificacion ?? "por_verificar",
        estado: pub?.estado ?? "propuesto",
        editable: ctx.autorizar(PERMISOS_CORE.remuneracionesManage),
        pendienteConfirmar: pendiente,
        detalleDisponible: Boolean(pub),
      };
    });
    const mutual = perfil?.mutualAdicionalEstado === "vigente" ? perfil.mutualAdicionalEscalada : null;
    const ultimaCapturaIso = ultimaCaptura
      ? new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ultimaCaptura.capturadoEn)
      : null;
    return {
      fecha,
      filas,
      mutualAdicional: {
        escalada: mutual ?? null,
        estado: (perfil?.mutualAdicionalEstado ?? "pendiente") as "pendiente" | "vigente",
        resumen:
          mutual != null
            ? pctDisplay(mutual)
            : "Sin tasa confirmada. Ingresa la cotización adicional de tu mutual.",
        confirmadoPor,
        confirmadoEn: perfil?.mutualConfirmadoEn
          ? fechaDisplay(fechaCivil(perfil.mutualConfirmadoEn))
          : null,
      },
      capturaSii: {
        ultimaCaptura: ultimaCapturaIso ? fechaDisplay(ultimaCapturaIso) : null,
        ufVigenteDesde: ufVigenteDesde ? fechaDisplay(ufVigenteDesde) : null,
        ufDesactualizada: ufVigenteDesde != null && ufVigenteDesde !== fecha,
      },
    };
  },
});
