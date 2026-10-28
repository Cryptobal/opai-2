import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";
import type { CampoAjuste } from "./registro";

export const descripcionCampo = z.object({
  modulo: z.string(),
  clave: z.string(),
  etiqueta: z.string(),
  ayuda: z.string().nullable(),
  grupo: z.string().nullable(),
  ambito: z.enum(["tenant", "usuario", "plataforma"]),
  control: z.string().nullable(),
  editable: z.boolean().describe("Si el actor puede cambiarlo (los de plataforma los fija OPAI)."),
  esquema: z.record(z.string(), z.unknown()).describe("JSON Schema del valor."),
});

export function puedeEditar(ctx: Contexto, c: CampoAjuste): boolean {
  if (c.meta.ambito === "plataforma") return false;
  if (c.meta.ambito === "usuario")
    return (
      ctx.actor.tipo === "user" ||
      (c.clave.startsWith("navegacion_") &&
        ctx.actor.tipo === "agent" &&
        ctx.principal?.tipo === "usuario" &&
        ctx.usuario?.id === ctx.actor.viaUserId)
    );
  return ctx.autorizar(c.meta.permiso ?? PERMISOS_CORE.configManage);
}

export const describir = (ctx: Contexto, c: CampoAjuste) => ({
  modulo: c.modulo,
  clave: c.clave,
  etiqueta: c.meta.etiqueta,
  ayuda: c.meta.ayuda ?? null,
  grupo: c.meta.grupo ?? null,
  ambito: c.meta.ambito,
  control: c.meta.control ?? null,
  editable: puedeEditar(ctx, c),
  esquema: z.toJSONSchema(c.schema, { io: "input", unrepresentable: "any" }) as Record<
    string,
    unknown
  >,
});
