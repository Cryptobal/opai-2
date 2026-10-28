import { z } from "zod";

import { tituloVencimientos, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { obtenerCapacidad } from "../../registry";
import { documentosMatriz } from "../documentos/matriz";
import { dondePersona } from "../maestros/alcance";

const pendienteSchema = z.object({
  tipo: z.enum(["aprobaciones", "documentos", "invitaciones", "integraciones", "anexos"]),
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
      if (
        ctx.autorizar(PERMISOS_CORE.documentosRead) &&
        ctx.autorizar(PERMISOS_CORE.personasRead)
      ) {
        // La matriz aplica el mismo alcance y selección de documentos que la pantalla.
        const { resumen, limiteExcedido } = await documentosMatriz.handler(
          ctx,
          { soloPendientes: false },
          { dryRun: false },
        );
        const { vencidos, porVencer } = resumen;
        if (limiteExcedido || vencidos || porVencer)
          items.push({
            tipo: "documentos",
            titulo: limiteExcedido
              ? "Vencimientos sin conteo completo"
              : tituloVencimientos(vencidos, porVencer),
            detalle: limiteExcedido
              ? "Hay más de 2.000 personas; el semáforo es parcial."
              : "Revisa el semáforo de vencimientos y pide la renovación",
            tono: vencidos ? "danger" : "warning",
            href: "/personas/vencimientos?origen=inicio",
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
      // Lleva a /personas?anexo=borrador, que exige anexos.read: el conteo usa el mismo alcance.
      if (ctx.autorizar(PERMISOS_CORE.anexosManage) && ctx.autorizar(PERMISOS_CORE.anexosRead)) {
        const n = await ctx.db.anexoContrato.count({
          where: { estado: "borrador", persona: dondePersona(ctx) },
        });
        if (n)
          items.push({
            tipo: "anexos",
            titulo: `${plural(n, "anexo de contrato", "anexos de contrato")} en borrador`,
            detalle: "Revisa el cambio y apruébalo o recházalo con motivo",
            tono: "warning",
            href: "/personas?anexo=borrador",
            accion: "Revisar",
          });
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
