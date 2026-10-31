import { z } from "zod";

import { disponibilidadSeccion, type SeccionPortal } from "@opai/domain";

import { tenantActual } from "../core/comun";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { configDeCuenta } from "./config-datos";
import { PERMISO_PORTAL, accesoDelActor, seccionSchema } from "./comun";

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mes en curso («AAAA-MM») en la zona horaria de la empresa. */
function mesActual(timezone: string, ahora: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" })
    .formatToParts(ahora);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

const perfilSchema = z.object({
  cuentaId: z.string(),
  cuentaNombre: z.string(),
  /** true si el contacto ve solo algunas de las instalaciones de su cuenta. */
  limitado: z.boolean(),
  instalaciones: z.array(z.object({ id: z.string(), nombre: z.string(), direccion: z.string().nullable() })),
  seccionesVisibles: z.array(seccionSchema),
  muestraFotoGuardias: z.boolean(),
  muestraRutGuardias: z.boolean(),
  gestionaListas: z.boolean(),
});

export const miAcceso = defineCapability({
  id: "portal_cliente.mi_acceso",
  descripcion:
    "Muestra a un contacto del cliente su cuenta, las instalaciones que puede ver y lo que su empresa de seguridad dejó visible en el portal. Sin un acceso activo responde que no tiene perfil.",
  permiso: "portal_cliente:read",
  input: z.object({}),
  output: perfilSchema,
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  async handler(ctx) {
    const a = await accesoDelActor(ctx);
    const { config } = await configDeCuenta(ctx, a.cuentaId);
    const total = await ctx.db.instalacion.count({ where: { cuentaId: a.cuentaId, estado: "activa", archivadaEn: null } });
    return {
      cuentaId: a.cuentaId,
      cuentaNombre: a.cuentaNombre,
      limitado: !a.todasInstalaciones && a.instalacionIds.length < total,
      instalaciones: a.instalaciones.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        direccion: i.direccionFormateada ?? i.comuna ?? null,
      })),
      seccionesVisibles: [...config.seccionesVisibles],
      muestraFotoGuardias: config.muestraFotoGuardias,
      muestraRutGuardias: config.muestraRutGuardias,
      gestionaListas: config.gestionaListas,
    };
  },
});

const seccionResumen = z.object({
  seccion: seccionSchema,
  /** «pendiente»: la fuente de datos aún no está integrada; nunca se inventa una cifra. */
  disponibilidad: z.enum(["disponible", "pendiente"]),
});

export const resumenLeer = defineCapability({
  id: "portal_cliente.resumen.leer",
  descripcion:
    "Resumen del mes del Portal Cliente: una tarjeta por instalación habilitada para el contacto, con el estado de cada sección (cobertura, rondas, novedades). Las secciones sin datos aún se marcan como pendientes, sin cifras.",
  permiso: PERMISO_PORTAL,
  input: z.object({ mes: z.string().regex(MES).optional() }),
  output: z.object({
    cuentaId: z.string(),
    cuentaNombre: z.string(),
    mes: z.string(),
    mesEnCurso: z.boolean(),
    limitado: z.boolean(),
    instalaciones: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        direccion: z.string().nullable(),
        secciones: z.array(seccionResumen),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  async handler(ctx, input) {
    const [a, tenant] = await Promise.all([accesoDelActor(ctx), tenantActual(ctx)]);
    const actual = mesActual(tenant.timezone, new Date());
    const mes = input.mes ?? actual;
    if (mes > actual) throw reglaDeNegocio("El informe de un mes futuro aún no existe.");
    const { config } = await configDeCuenta(ctx, a.cuentaId);
    const total = await ctx.db.instalacion.count({ where: { cuentaId: a.cuentaId, estado: "activa", archivadaEn: null } });
    const secciones = config.seccionesVisibles.filter(
      (s): s is Extract<SeccionPortal, "cobertura" | "rondas" | "novedades"> =>
        s === "cobertura" || s === "rondas" || s === "novedades",
    );
    return {
      cuentaId: a.cuentaId,
      cuentaNombre: a.cuentaNombre,
      mes,
      mesEnCurso: mes === actual,
      limitado: !a.todasInstalaciones && a.instalacionIds.length < total,
      instalaciones: a.instalaciones.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        direccion: i.direccionFormateada ?? i.comuna ?? null,
        secciones: secciones.map((s) => ({ seccion: s, disponibilidad: disponibilidadSeccion(s) })),
      })),
    };
  },
});
