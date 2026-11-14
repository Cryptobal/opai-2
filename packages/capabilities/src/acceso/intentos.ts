import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { cursorDe, pagina } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { dondeInstalacionId, instalacionEnAlcance } from "../rondas/comun";
import { nombresInstalacion, PERMISO_READ } from "./comun";

const MOTIVOS_INTENTO = [
  "bloqueado",
  "fuera_de_lista",
  "fuera_de_horario",
  "uso_unico_consumido",
] as const;

const item = z.object({
  id: uuidSchema,
  instalacionId: uuidSchema,
  instalacion: z.string(),
  ocurrioEn: z.string(),
  tipoRegistro: z.string(),
  documento: z.string(),
  motivo: z.string(),
});

/**
 * Intentos denegados (CAR-474, R9): quién no pudo entrar y por qué categoría. El texto del bloqueo de la lista
 * no sale por aquí (solo lo ve quien gestiona listas, en `acceso.listas.listar`).
 */
export const intentosListar = defineCapability({
  id: "acceso.intentos.listar",
  descripcion:
    "Lista los intentos de acceso denegados de una instalación o de todas las que el usuario tiene a cargo, del más reciente al más antiguo: documento enmascarado, tipo de registro y categoría del rechazo (bloqueado, fuera de lista, fuera de horario o uso único ya usado). Nunca revela el motivo escrito del bloqueo.",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema.optional(),
    motivo: z.enum(MOTIVOS_INTENTO).optional(),
    cursor: z.uuid().optional().describe("Id del último intento de la página anterior."),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({ items: z.array(item), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.items.map((r) => r.id),
  async handler(ctx, input) {
    if (input.instalacionId) await instalacionEnAlcance(ctx, input.instalacionId);
    const filas = await ctx.db.intentoDenegado.findMany({
      where: {
        AND: [
          dondeInstalacionId(ctx),
          input.instalacionId ? { instalacionId: input.instalacionId } : {},
          input.motivo ? { motivo: input.motivo } : {},
        ],
      },
      orderBy: [{ horaCorregida: "desc" }, { id: "desc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente } = pagina(filas, input.limite, input.cursor);
    const nombres = await nombresInstalacion(
      ctx,
      items.map((r) => r.instalacionId),
    );
    return {
      siguiente,
      items: items.map((r) => ({
        id: r.id,
        instalacionId: r.instalacionId,
        instalacion: nombres.get(r.instalacionId) ?? "",
        ocurrioEn: r.horaCorregida.toISOString(),
        tipoRegistro: r.tipoRegistro,
        documento: r.mascara,
        motivo: r.motivo,
      })),
    };
  },
});
