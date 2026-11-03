import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { fechaCivil } from "./comun";
import { resumenHistorial } from "./desglose";
import { fechaDisplay } from "./formato";

const ZONA = "America/Santiago";

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
  auditarLectura: () => [],
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
        fechaIso: fechaCivil(p.vigenteDesde),
        resumen: resumenHistorial(clave, p.valorJson, p.verificacion),
        fuente: p.fuente,
        estado: p.estado,
      })),
      ...ten.map((t) => ({
        tipo: "tenant" as const,
        fechaIso: fechaCivil(t.vigenteDesde),
        resumen: resumenHistorial(clave, t.valorJson, t.origen),
        fuente: t.evidencia ?? "Empresa",
        estado: t.estado,
      })),
      ...cap.map((c) => ({
        tipo: "captura" as const,
        fechaIso: new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(c.capturadoEn),
        resumen: resumenHistorial(clave, c.valorLeidoJson, c.resultado),
        fuente: c.fuenteConsultada,
        estado: c.alertaEmitida ? "alerta" : "ok",
      })),
    ]
      .sort((a, b) => b.fechaIso.localeCompare(a.fechaIso))
      .map(({ fechaIso, ...rest }) => ({ ...rest, fecha: fechaDisplay(fechaIso) }));
  },
});
