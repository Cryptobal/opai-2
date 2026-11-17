import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { alcanceContingencias, vistaContingenciaSchema } from "./contingencias-esquema";
import { ETIQUETA_TIPO, nombreCompleto } from "./formato";
import { personaPropia } from "./persona-propia";

export const contingenciasListar = defineCapability({
  id: "asistencia.contingencias.listar",
  descripcion:
    "Lista marcas de contingencia: en ERP y supervisor las de sus instalaciones; en el portal del trabajador solo las propias.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno"],
  input: z.object({ estado: z.enum(["pendiente", "aceptada", "rechazada"]).optional() }),
  output: z.object({ items: z.array(vistaContingenciaSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((c) => c.id),
  async handler(ctx, i) {
    const yo =
      ctx.portal === "trabajador" || ctx.portal === "terreno" ? await personaPropia(ctx).catch(() => null) : null;
    if ((ctx.portal === "trabajador" || ctx.portal === "terreno") && !yo) return { items: [] };
    if ((ctx.portal === "erp" || ctx.portal === "supervisor") && !ctx.autorizar("asistencia:ver")) return { items: [] };
    const filas = await ctx.db.contingencia.findMany({
      where: {
        ...(i.estado ? { estado: i.estado } : {}),
        ...(yo ? { personaId: yo.id } : alcanceContingencias(ctx.alcance)),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const personas = new Map(
      (await ctx.db.persona.findMany({
        where: { id: { in: filas.map((f) => f.personaId) } },
        select: { id: true, nombres: true, apellidos: true },
      })).map((p) => [p.id, nombreCompleto(p)]),
    );
    const instalaciones = new Map(
      (await ctx.db.instalacion.findMany({
        where: { id: { in: filas.map((f) => f.instalacionId) } },
        select: { id: true, nombre: true },
      })).map((x) => [x.id, x.nombre]),
    );
    return {
      items: filas.map((f) => ({
        id: f.id,
        personaId: f.personaId,
        personaNombre: personas.get(f.personaId) ?? "—",
        instalacionId: f.instalacionId,
        instalacionNombre: instalaciones.get(f.instalacionId) ?? "—",
        tipo: f.tipo as never,
        tipoEtiqueta: ETIQUETA_TIPO[f.tipo] ?? f.tipo,
        horaDeclarada: f.horaDeclarada.toISOString(),
        motivo: f.motivo,
        estado: f.estado as never,
        evidenciaDocumentoId: f.evidenciaDocumentoId,
        marcaId: f.marcaId,
      })),
    };
  },
});