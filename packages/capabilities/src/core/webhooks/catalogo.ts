import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { catalogoDeEventos } from "../../eventos/catalogo";

export const webhooksEventosList = defineCapability({
  id: "core.webhooks.eventos_list",
  descripcion:
    "Catálogo de eventos a los que se puede suscribir un destino de eventos salientes (webhook), con su descripción. Ordenado por id, paginado por cursor; se puede filtrar por prefijo (por ejemplo «core.cuenta.»).",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({
    prefijo: z.string().trim().max(80).optional().describe("Solo los ids que empiezan así."),
    // CAR-353: contrato único de listas. El cursor es el id del último evento de la página anterior.
    cursor: z.string().max(120).optional(),
    limite: z.number().int().min(1).max(200).default(200),
  }),
  output: z.object({
    items: z.array(z.object({ id: z.string(), descripcion: z.string() })),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(_ctx, input) {
    const todos = [...catalogoDeEventos()]
      .filter((e) => !input.prefijo || e.id.startsWith(input.prefijo))
      .filter((e) => !input.cursor || e.id > input.cursor)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((e) => ({ id: e.id, descripcion: e.descripcion }));
    const items = todos.slice(0, input.limite);
    return { items, siguiente: todos.length > input.limite ? (items.at(-1)?.id ?? null) : null };
  },
});
