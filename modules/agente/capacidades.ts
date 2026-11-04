import {
  comoAgenteInterno,
  defineCapability,
  iaElegidaDelAgente,
  modelosDelAgente,
  prohibido,
  externo,
} from "@opai/capabilities";
import { z } from "zod";

import { prepararTurno } from "./bucle";
import { contextoSchema, guardarTurno } from "./conversaciones-guardado";
import {
  conversacionesArchivar,
  conversacionesBorrar,
  conversacionesRenombrar,
} from "./conversaciones-escritura";
import { conversacionesGet, conversacionesList } from "./conversaciones";
import { confirmarPlan, firmarPlan } from "./planes";

export const modeloSchema = z.object({
  proveedor: z.enum(["ia_anthropic", "ia_openai", "ia_google", "ia_compatible", "ia_xai"]),
  modelo: z.string().min(1).max(200),
  clase: z.enum(["economica", "estandar", "potente"]),
});
const secreto = () => {
  const valor = process.env["BETTER_AUTH_SECRET"];
  if (!valor || valor.length < 32) throw prohibido("No está disponible la firma del plan.");
  return valor;
};

export const modelosList = defineCapability({
  id: "agente.modelos.list",
  permiso: "agente:usar",
  descripcion:
    "Lista los modelos disponibles entre los proveedores conectados de esta empresa, sin credenciales.",
  input: z.object({}),
  output: z.array(modeloSchema),
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx) => modelosDelAgente(ctx),
});

export const turnoPreparar = defineCapability({
  id: "agente.turno.preparar",
  permiso: "agente:usar",
  // La sesión humana delega su identidad; una API key no inicia otro agente vía su responsable.
  soloPersonas: true,
  descripcion:
    "Prepara una solicitud del usuario con lecturas y vistas previas; nunca ejecuta escrituras de negocio sin confirmación.",
  sensibles: ["mensaje"],
  input: z.object({
    mensaje: z.string().trim().min(1).max(6_000),
    modelo: modeloSchema,
    nivel: z.enum(["aprobar_todo", "paso_a_paso"]),
    /** Retoma esta conversación; sin id se crea una nueva (R19). */
    conversacionId: z.string().uuid().optional(),
    contexto: contextoSchema.optional(),
  }),
  output: z.object({
    conversacionId: z.string().uuid().nullable(),
    token: z.string().nullable(),
    texto: externo(z.string()),
    pasos: z.array(z.unknown()),
    tokens: z.number(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, modo) {
    const delegado = comoAgenteInterno(ctx);
    if (modo.dryRun)
      return {
        conversacionId: null,
        token: null,
        texto: "Solicitará un plan sin ejecutar escrituras.",
        pasos: [],
        tokens: 0,
      };
    const firma = secreto();
    const ia = await iaElegidaDelAgente(delegado, input.modelo);
    const plan = await prepararTurno(delegado, input.mensaje, ia);
    // Guardar corre en la misma transacción que la auditoría (ADR-052): si falla, el turno falla cerrado.
    const conversacionId = await guardarTurno(ctx, {
      conversacionId: input.conversacionId,
      contexto: input.contexto,
      mensaje: input.mensaje,
      texto: plan.texto,
      pasos: plan.pasos.map((p) => p.capacidad),
    });
    return {
      conversacionId,
      token: plan.pasos.length ? firmarPlan(delegado, plan, input.nivel, firma) : null,
      texto: plan.texto,
      pasos: plan.pasos,
      tokens: plan.tokens,
    };
  },
});

export const planConfirmar = defineCapability({
  id: "agente.plan.confirmar",
  permiso: "agente:usar",
  // Una decisión humana no puede llegar por MCP ni por un resultado de herramienta.
  soloPersonas: true,
  descripcion:
    "Acepta o rechaza un plan o paso firmado para el usuario actual; lo irreversible sigue pendiente de aprobación humana.",
  sensibles: ["token"],
  input: z.object({ token: z.string().max(500_000), aceptar: z.boolean() }),
  output: z.unknown(),
  efecto: "escritura",
  dryRun: true,
  handler: async (ctx, input, modo) =>
    confirmarPlan(ctx, comoAgenteInterno(ctx), input.token, input.aceptar, secreto(), modo.dryRun),
});

export const historialList = defineCapability({
  id: "agente.historial.list",
  permiso: "agente:usar",
  descripcion:
    "Lista metadatos de las acciones del agente interno vía el usuario actual; las conversaciones se consultan en agente.conversaciones.list.",
  input: z.object({ limite: z.number().int().min(1).max(50).default(20) }),
  output: z.array(z.object({ capacidad: z.string(), fecha: z.string() })),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (!ctx.usuario) throw prohibido("Requiere usuario.");
    // Un servicio no hereda el historial personal de su responsable (ADR-051).
    if (ctx.principal?.tipo === "servicio") return [];
    const filas = await ctx.db.auditEvent.findMany({
      where: {
        tenantId: ctx.tenantId,
        actorType: "agent",
        actorId: `agente-interno:${ctx.usuario.id}`,
        viaUserId: ctx.usuario.id,
      },
      orderBy: { createdAt: "desc" },
      take: input.limite,
      select: { capability: true, createdAt: true },
    });
    return filas.map((f) => ({ capacidad: f.capability, fecha: f.createdAt.toISOString() }));
  },
});

export const capacidades = [
  modelosList,
  turnoPreparar,
  planConfirmar,
  historialList,
  conversacionesList,
  conversacionesGet,
  conversacionesRenombrar,
  conversacionesArchivar,
  conversacionesBorrar,
];
