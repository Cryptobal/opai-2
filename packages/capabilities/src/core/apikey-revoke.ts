import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { uuidSchema } from "./esquemas";

export const apikeysRevoke = defineCapability({
  id: "core.apikeys.revoke",
  // Las credenciales las gobiernan personas, nunca una key.
  soloPersonas: true,
  descripcion: "Revoca una API key. Deja de funcionar de inmediato; no se puede deshacer.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({ apiKeyId: uuidSchema }),
  output: z.object({ id: z.string(), nombre: z.string(), revocadaEn: z.string() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const key = await ctx.db.apiKey.findUnique({ where: { id: input.apiKeyId } });
    if (!key) throw noEncontrado("La API key");
    if (key.revocadaEn || dryRun)
      return {
        id: key.id,
        nombre: key.nombre,
        revocadaEn: (key.revocadaEn ?? new Date()).toISOString(),
      };
    const r = await ctx.db.apiKey.update({
      where: { id: key.id },
      data: { revocadaEn: new Date() },
    });
    return { id: r.id, nombre: r.nombre, revocadaEn: (r.revocadaEn ?? new Date()).toISOString() };
  },
});
