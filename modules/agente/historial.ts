import { defineCapability, entidadAuditada, prohibido } from "@opai/capabilities";
import { z } from "zod";

import { entidadesVisibles, type RefEntidad } from "./historial-entidades";

const resultadoSchema = z.enum(["ok", "error", "pendiente", "rechazado", "vencido"]);
type Resultado = z.infer<typeof resultadoSchema>;

const salidaSchema = z.object({
  capacidad: z.string(),
  fecha: z.string(),
  resultado: resultadoSchema.describe(
    "ok: hecho; error: se aprobó pero falló; pendiente: espera aprobación humana; rechazado o vencido: no se ejecutó.",
  ),
  entidad: z
    .object({ tipo: z.string(), id: z.string(), etiqueta: z.string().nullable() })
    .nullable()
    .describe("Entidad afectada, solo si la persona puede leer su ficha; sin datos personales."),
});

// Estado de la aprobación humana → resultado mostrado. `aprobada` guarda el envoltorio de
// `executeCapability` ({ok:true,data} o {ok:false,error}); solo `ok === true` cuenta como hecho, y un
// resultado ausente o ilegible (ejecución interrumpida) se muestra conservadoramente como «error».
function resultadoDeAprobacion(estado: string, resultado: unknown): Resultado {
  if (estado === "pendiente") return "pendiente";
  if (estado === "rechazada") return "rechazado";
  if (estado === "vencida") return "vencido";
  const ok = !!resultado && typeof resultado === "object" && "ok" in resultado && resultado.ok;
  return ok === true ? "ok" : "error";
}

export const historialList = defineCapability({
  id: "agente.historial.list",
  permiso: "agente:usar",
  descripcion:
    "Lista metadatos de las acciones del agente interno vía el usuario actual: acción, fecha, resultado y entidad afectada; las conversaciones se consultan en agente.conversaciones.list.",
  input: z.object({ limite: z.number().int().min(1).max(50).default(20) }),
  output: z.array(salidaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (!ctx.usuario) throw prohibido("Requiere usuario.");
    // Un servicio no hereda el historial personal de su responsable (ADR-051).
    if (ctx.principal?.tipo === "servicio") return [];
    const agente = `agente-interno:${ctx.usuario.id}`;
    const [hechas, pedidas] = await Promise.all([
      ctx.db.auditEvent.findMany({
        where: {
          tenantId: ctx.tenantId,
          actorType: "agent",
          actorId: agente,
          viaUserId: ctx.usuario.id,
        },
        orderBy: { createdAt: "desc" },
        take: input.limite,
        select: { capability: true, createdAt: true, entityType: true, entityId: true },
      }),
      // Lo irreversible queda en la cola de aprobación; al aprobarse corre como la persona que aprueba,
      // así que no hay evento del agente y esta fila es la única huella (sin duplicados).
      ctx.db.aprobacion.findMany({
        where: { tenantId: ctx.tenantId, agenteInternoId: agente, viaUserId: ctx.usuario.id },
        orderBy: { createdAt: "desc" },
        take: input.limite,
        select: { capability: true, createdAt: true, estado: true, resultado: true, input: true },
      }),
    ]);
    const filas = [
      ...hechas.map((f) => ({
        capacidad: f.capability,
        fecha: f.createdAt,
        resultado: "ok" as Resultado,
        ref: f.entityType && f.entityId ? { tipo: f.entityType, id: f.entityId } : null,
      })),
      ...pedidas.map((a) => {
        const { entityType, entityId } = entidadAuditada(a.capability, a.input, undefined);
        return {
          capacidad: a.capability,
          fecha: a.createdAt,
          resultado: resultadoDeAprobacion(a.estado, a.resultado),
          ref: entityType && entityId ? { tipo: entityType, id: entityId } : null,
        };
      }),
    ]
      .sort((x, y) => y.fecha.getTime() - x.fecha.getTime())
      .slice(0, input.limite);
    const visibles = await entidadesVisibles(
      ctx,
      filas.flatMap((f): RefEntidad[] => (f.ref ? [f.ref] : [])),
    );
    return filas.map((f) => ({
      capacidad: f.capacidad,
      fecha: f.fecha.toISOString(),
      resultado: f.resultado,
      entidad: f.ref ? (visibles.get(`${f.ref.tipo}:${f.ref.id}`) ?? null) : null,
    }));
  },
});
