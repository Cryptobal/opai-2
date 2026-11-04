import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { PERMISO_READ } from "./comun";
import { documentoEmitidoIdSchema } from "./ventas-comun";

const envioSchema = z.object({
  id: z.string(),
  estado: z.enum(["enviado", "fallido"]),
  destinatarios: z.array(z.string()).describe("El primero es el destinatario; el resto va en copia."),
  adjuntos: z.array(z.string()),
  error: z.string().nullable(),
  enviadoEn: z.string().describe("Fecha y hora del envío (ISO)."),
});

export const ventasEnvios = defineCapability({
  id: "finanzas.ventas.envios",
  descripcion:
    "Lista los envíos al cliente de un documento emitido (a quién, con qué adjuntos y si salió o falló), del más reciente al más antiguo.",
  permiso: PERMISO_READ,
  input: z.object({ documentoId: documentoEmitidoIdSchema }),
  output: z.object({ envios: z.array(envioSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (_s, input) => [input.documentoId],
  async handler(ctx, input) {
    const doc = await ctx.db.documentoEmitido.findFirst({
      where: { id: input.documentoId },
      select: { id: true },
    });
    if (!doc) throw noEncontrado("El documento");
    const filas = await ctx.db.documentoEmitidoEnvio.findMany({
      where: { documentoId: doc.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      envios: filas.map((f) => ({
        id: f.id,
        estado: f.estado === "enviado" ? ("enviado" as const) : ("fallido" as const),
        destinatarios: f.destinatarios,
        adjuntos: f.adjuntos,
        error: f.error,
        enviadoEn: f.createdAt.toISOString(),
      })),
    };
  },
});
