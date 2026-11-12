import { z } from "zod";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { externo } from "../../externo";
import { duenoDeMetodos, origenDe } from "./comun";

const appSchema = z.object({
  clientId: z.string(),
  nombre: externo(z.string().nullable()),
  sitio: externo(z.string().nullable()),
  /** Tiene `mcp:escribir`: puede preparar y hacer cambios con los permisos de la persona. */
  puedeEscribir: z.boolean(),
  /** Tiene `offline_access`: sigue conectada sin volver a pedir la contraseña. */
  sigueConectada: z.boolean(),
  conectadaEn: z.string(),
  ultimoUso: z.string().nullable(),
});

/**
 * Apps conectadas a OPAI con mi cuenta por OAuth (CAR-247), en la empresa actual. Solo metadatos: el
 * nombre y el sitio los declaró la app al registrarse (texto externo), nunca tokens.
 */
export const appsConectadasList = defineCapability({
  id: "core.apps_conectadas.list",
  descripcion:
    "Mis apps conectadas a OPAI con mi cuenta en esta empresa (por ejemplo Claude): qué pueden hacer, desde cuándo y su último uso. No revela tokens.",
  permiso: null,
  portales: ["erp", "supervisor"],
  input: z.object({}),
  output: z.object({ apps: z.array(appSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const apps = await ctx.identidad.appsConectadas(duenoDeMetodos(ctx), ctx.tenantId);
    return {
      apps: apps.map((a) => ({
        clientId: a.clientId,
        nombre: a.nombre,
        sitio: a.sitio,
        puedeEscribir: a.alcances.includes("mcp:escribir"),
        sigueConectada: a.alcances.includes("offline_access"),
        conectadaEn: a.conectadaEn.toISOString(),
        ultimoUso: a.ultimoUso?.toISOString() ?? null,
      })),
    };
  },
});

/** Desconecta una app: corta sus accesos al momento en esta empresa. Gobierna agentes: solo personas. */
export const appsConectadasDesconectar = defineCapability({
  id: "core.apps_conectadas.desconectar",
  soloPersonas: true,
  descripcion:
    "Solo personas: desconecta una de mis apps conectadas en esta empresa. Corta sus accesos al momento; para volver a usarla hay que conectarla de nuevo desde la app.",
  permiso: null,
  portales: ["erp", "supervisor"],
  input: z.object({ clientId: z.string().min(1).max(200) }),
  output: z.object({ clientId: z.string(), desconectada: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const userId = duenoDeMetodos(ctx);
    const apps = await ctx.identidad.appsConectadas(userId, ctx.tenantId);
    if (!apps.some((a) => a.clientId === input.clientId)) throw noEncontrado("La app");
    if (dryRun) return { clientId: input.clientId, desconectada: false };
    const ok = await ctx.transaccion((tx) =>
      ctx.identidad.desconectarApp(tx, userId, ctx.tenantId, input.clientId, origenDe(ctx)),
    );
    if (!ok) throw noEncontrado("La app");
    return { clientId: input.clientId, desconectada: true };
  },
});
