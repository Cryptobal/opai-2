import { z } from "zod";

import { defineCapability } from "../define";
import { emailSchema } from "../core/esquemas";
import { rutSchema } from "../core/maestros/comun";
import { claveDuplicado } from "./solicitudes-dominio";
import { PERMISO_SOLICITUDES_READ, solicitudSchema, vistaSolicitud } from "./solicitudes-comun";

export const solicitudesBuscarDuplicadas = defineCapability({
  auditarLectura: (s) => s.items.map((x) => x.id),
  id: "comercial.solicitudes.buscar_duplicadas",
  descripcion:
    "Busca posibles solicitudes duplicadas en la bandeja por correo o RUT canónico, sin abrir una ficha. Útil para un agente antes de registrar o enlazar duplicadas.",
  permiso: PERMISO_SOLICITUDES_READ,
  input: z
    .object({
      email: emailSchema.optional(),
      rut: rutSchema.optional(),
      excluirId: z.uuid().optional().describe("Omite una solicitud (p. ej. la que acabas de crear)."),
    })
    .refine((v) => v.email || v.rut, { message: "Indica correo o RUT." }),
  output: z.object({ items: z.array(solicitudSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const claves = claveDuplicado({ email: input.email ?? null, rut: input.rut ?? null });
    if (!claves.length) return { items: [] };
    const posibles = await ctx.db.solicitud.findMany({
      where: {
        ...(input.excluirId ? { id: { not: input.excluirId } } : {}),
        OR: [
          ...(input.email ? [{ email: { equals: input.email, mode: "insensitive" as const } }] : []),
          ...(input.rut ? [{ rut: input.rut }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    return { items: posibles.map(vistaSolicitud) };
  },
});
