import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_SOLICITUDES_READ } from "./solicitudes-comun";
import { solicitudDe } from "./solicitudes-comun";

const accionSchema = z.object({
  id: z.string(),
  capability: z.string(),
  creadaEn: z.string(),
  actorTipo: z.string(),
  actorId: z.string().nullable(),
  viaUserId: z.string().nullable(),
  apiKeyNombre: z.string().nullable(),
  responsableNombre: z.string().nullable(),
  resumen: z.string(),
});

export const solicitudesAccionesAgente = defineCapability({
  auditarLectura: (s) => s.map((a) => a.id),
  id: "comercial.solicitudes.acciones_agente",
  descripcion:
    "Lista las acciones de agentes sobre una solicitud (crear, enriquecer, derivar, duplicada, propuesta de conversión) con identidad «agente vía responsable», para la ficha de detalle.",
  permiso: PERMISO_SOLICITUDES_READ,
  input: z.object({ id: uuidSchema, limite: z.number().int().min(1).max(50).default(30) }),
  output: z.array(accionSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await solicitudDe(ctx, input.id);
    const caps = [
      "comercial.solicitudes.create",
      "comercial.solicitudes.enriquecer",
      "comercial.solicitudes.derivar",
      "comercial.solicitudes.marcar_duplicada",
      "comercial.solicitudes.convertir",
    ];
    const filas = await ctx.db.auditEvent.findMany({
      where: {
        tenantId: ctx.tenantId,
        capability: { in: caps },
        // La propuesta de conversión queda en la auditoría de la aprobación (entidad «aprobacion»):
        // se liga a la solicitud por el id de su input.
        OR: [
          { entityType: "solicitud", entityId: input.id },
          { entityType: "aprobacion", payload: { path: ["input", "id"], equals: input.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: input.limite,
    });
    const keyIds = [
      ...new Set(filas.map((f) => (f.actorType === "agent" ? f.actorId : null)).filter(Boolean)),
    ] as string[];
    const userIds = [...new Set(filas.map((f) => f.viaUserId).filter(Boolean))] as string[];
    const [keys, users] = await Promise.all([
      keyIds.length
        ? ctx.db.apiKey.findMany({
            where: { id: { in: keyIds } },
            select: { id: true, nombre: true },
          })
        : [],
      userIds.length
        ? ctx.db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
        : [],
    ]);
    const keyNom = new Map(keys.map((k) => [k.id, k.nombre]));
    const userNom = new Map(users.map((u) => [u.id, u.name]));
    return filas.map((f) => ({
      id: f.id,
      capability: f.capability,
      creadaEn: f.createdAt.toISOString(),
      actorTipo: f.actorType,
      actorId: f.actorId,
      viaUserId: f.viaUserId,
      apiKeyNombre: f.actorType === "agent" && f.actorId ? (keyNom.get(f.actorId) ?? null) : null,
      responsableNombre: f.viaUserId ? (userNom.get(f.viaUserId) ?? null) : null,
      resumen: resumenDe(f.capability, f.payload),
    }));
  },
});

function resumenDe(capability: string, payload: unknown): string {
  const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  if (p.intento === "APPROVAL_REQUIRED") return "Propuso conversión · pendiente de aprobación";
  switch (capability) {
    case "comercial.solicitudes.create":
      return "Registró la solicitud";
    case "comercial.solicitudes.enriquecer":
      return "Enriqueció datos propuestos";
    case "comercial.solicitudes.derivar":
      return "Derivó a revisión";
    case "comercial.solicitudes.marcar_duplicada":
      return "Marcó como duplicada";
    case "comercial.solicitudes.convertir":
      return "Convirtió en negocio";
    default:
      return capability;
  }
}
