import { z } from "zod";

import { defineCapability } from "../define";
import { configDeCuenta } from "./config-datos";
import { SECCIONES_MODO_HISTORIAL, accesoDelActor, seccionSchema } from "./comun";

const perfilSchema = z.object({
  cuentaId: z.string(),
  cuentaNombre: z.string(),
  alcance: z.enum(["completo", "limitado", "historial"]),
  limitado: z.boolean(),
  instalaciones: z.array(z.object({ id: z.string(), nombre: z.string(), direccion: z.string().nullable() })),
  seccionesVisibles: z.array(seccionSchema),
  muestraFotoGuardias: z.boolean(),
  muestraRutGuardias: z.boolean(),
  gestionaListas: z.boolean(),
});

const vacio = {
  instalaciones: [] as { id: string; nombre: string; direccion: string | null }[],
  seccionesVisibles: [] as z.infer<typeof seccionSchema>[],
  muestraFotoGuardias: false,
  muestraRutGuardias: false,
  gestionaListas: false,
};

function mapInstalaciones(
  instalaciones: Awaited<ReturnType<typeof accesoDelActor>>["instalaciones"],
): { id: string; nombre: string; direccion: string | null }[] {
  return instalaciones.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    direccion: i.direccionFormateada ?? i.comuna ?? null,
  }));
}

export const miAcceso = defineCapability({
  id: "portal_cliente.mi_acceso",
  descripcion:
    "Muestra a un contacto del cliente su cuenta, las instalaciones que puede ver y lo que su empresa de seguridad dejó visible en el portal. Un prospecto entra con alcance limitado y solo ve su propuesta. Sin un acceso activo responde que no tiene perfil.",
  permiso: "portal_cliente:read",
  input: z.object({}),
  output: perfilSchema,
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  async handler(ctx) {
    const a = await accesoDelActor(ctx, { permitirLimitado: true });
    const base = { cuentaId: a.cuentaId, cuentaNombre: a.cuentaNombre, alcance: a.alcance };
    if (a.alcance === "limitado") return { ...base, limitado: true, ...vacio };
    if (a.alcance === "historial") {
      const { config } = await configDeCuenta(ctx, a.cuentaId);
      return {
        ...base,
        limitado: true,
        instalaciones: mapInstalaciones(a.instalaciones),
        seccionesVisibles: config.seccionesVisibles.filter((s) => SECCIONES_MODO_HISTORIAL.includes(s)),
        muestraFotoGuardias: false,
        muestraRutGuardias: false,
        gestionaListas: false,
      };
    }
    const { config } = await configDeCuenta(ctx, a.cuentaId);
    const total = await ctx.db.instalacion.count({ where: { cuentaId: a.cuentaId, estado: "activa", archivadaEn: null } });
    return {
      ...base,
      limitado: !a.todasInstalaciones && a.instalacionIds.length < total,
      instalaciones: mapInstalaciones(a.instalaciones),
      seccionesVisibles: [...config.seccionesVisibles],
      muestraFotoGuardias: config.muestraFotoGuardias,
      muestraRutGuardias: config.muestraRutGuardias,
      gestionaListas: config.gestionaListas,
    };
  },
});