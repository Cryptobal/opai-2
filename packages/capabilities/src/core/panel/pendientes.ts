import { z } from "zod";

import { estadoVigencia, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { obtenerCapacidad } from "../../registry";
import { documentosEnAlcance } from "../documentos/alcance-doc";
import { filtroDocumentoSensible } from "../documentos/sensibles";
import { dia, hoy } from "../maestros/comun";

const pendienteSchema = z.object({
  tipo: z.enum(["aprobaciones", "documentos", "invitaciones", "integraciones"]),
  titulo: z.string(),
  detalle: z.string(),
  tono: z.enum(["warning", "danger", "neutro"]),
  href: z.string().describe("Ruta del ERP donde se resuelve."),
  accion: z.string().describe('Texto del botón: "Revisar", "Reenviar"…'),
});

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export const inicioPendientes = defineCapability({
  auditarLectura: false, // Solo contadores/estado, sin correos ni contenido personal de terceros.
  id: "core.inicio.pendientes",
  descripcion:
    "Lo que requiere una decisión hoy en la empresa: aprobaciones de agentes por vencer, documentos vencidos o por vencer, invitaciones sin aceptar e integraciones con error, según los permisos del actor.",
  permiso: null,
  input: z.object({}),
  output: z.array(pendienteSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    // Conserva los locks de alcance hasta completar los contadores, sin lock de auditoría.
    return ctx.transaccion(async (tx) => {
      ctx = { ...ctx, db: tx, transaccion: (fn) => fn(tx) };
      const items: z.input<typeof pendienteSchema>[] = [];
      const ahora = new Date();
      if (ctx.autorizar(PERMISOS_CORE.aprobacionesManage)) {
        const ap = await ctx.db.aprobacion.findMany({
          where: { estado: "pendiente", venceEn: { gt: ahora } },
          orderBy: { venceEn: "asc" },
          select: { capability: true, venceEn: true },
        });
        if (ap.length) {
          const altas = ap.filter(
            (a) => obtenerCapacidad(a.capability)?.efecto === "irreversible",
          ).length;
          const horas = Math.max(
            1,
            Math.round(((ap[0]?.venceEn.getTime() ?? 0) - ahora.getTime()) / 3_600_000),
          );
          items.push({
            tipo: "aprobaciones",
            titulo: `${plural(ap.length, "aprobación", "aprobaciones")} de agentes`,
            detalle: `${altas} de riesgo alto · la más antigua vence en ${horas} h`,
            tono: "warning",
            href: "/configuracion/aprobaciones",
            accion: "Revisar",
          });
        }
      }
      if (ctx.autorizar(PERMISOS_CORE.documentosRead)) {
        const limite = new Date(ahora.getTime() + 30 * 86_400_000);
        // Alcance por filas (ADR-022): un actor acotado solo cuenta documentos de entidades a su cargo.
        const permitidos = await documentosEnAlcance(ctx);
        const docs = await ctx.db.documento.findMany({
          where: {
            ...filtroDocumentoSensible(ctx),
            estado: "disponible",
            venceEn: { lte: limite },
            ...(permitidos ? { id: { in: [...permitidos] } } : {}),
          },
          select: { venceEn: true },
        });
        const estados = docs.map((d) => estadoVigencia(dia(d.venceEn), hoy(), 30));
        const vencidos = estados.filter((e) => e === "vencido").length;
        const porVencer = estados.filter((e) => e === "por_vencer").length;
        if (vencidos || porVencer)
          items.push({
            tipo: "documentos",
            titulo: `${plural(vencidos, "documento vencido", "documentos vencidos")} · ${porVencer} vencen en 30 días`,
            detalle: "Revisa el semáforo de vencimientos y pide la renovación",
            tono: vencidos ? "danger" : "warning",
            href: "/personas/vencimientos",
            accion: "Pedir renovación",
          });
      }
      if (!ctx.alcance && ctx.autorizar(PERMISOS_CORE.usersManage)) {
        const inv = await ctx.db.invitation.findMany({
          where: { acceptedAt: null, revocadaEn: null, expiresAt: { gt: ahora } },
          orderBy: { expiresAt: "asc" },
          select: { expiresAt: true },
        });
        if (inv[0]) {
          const dias = Math.max(
            1,
            Math.round((inv[0].expiresAt.getTime() - ahora.getTime()) / 86_400_000),
          );
          items.push({
            tipo: "invitaciones",
            titulo: `${plural(inv.length, "invitación", "invitaciones")} sin aceptar`,
            detalle: `La primera vence en ${plural(dias, "día", "días")}`,
            tono: "neutro",
            href: "/configuracion/usuarios",
            accion: "Reenviar",
          });
        }
      }
      if (ctx.autorizar(PERMISOS_CORE.integracionesManage)) {
        const conError = await ctx.db.integracion.findMany({
          where: { estado: "error" },
          select: { proveedor: true },
        });
        for (const i of conError)
          items.push({
            tipo: "integraciones",
            titulo: `${i.proveedor} con error`,
            detalle: "Revisa la configuración y prueba la conexión",
            tono: "danger",
            href: `/configuracion/integraciones/${i.proveedor}`,
            accion: "Revisar",
          });
      }
      return items;
    });
  },
});
