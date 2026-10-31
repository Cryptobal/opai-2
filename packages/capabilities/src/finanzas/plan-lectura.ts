import { z } from "zod";

import { type AlertaPlan, type CuentaPlan, clavesFaltantes, validarPlan } from "@opai/domain";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { PERMISO_READ } from "./comun";
import { cuentaSchema, vistaCuenta } from "./vistas";

const alertaSchema = z.object({
  codigo: z.string(),
  severidad: z.enum(["error", "aviso"]),
  cuenta: z.string().describe("Código de la cuenta afectada."),
  mensaje: z.string(),
});

type FilaCuenta = Awaited<ReturnType<typeof leerPlan>>[number];

export const leerPlan = (ctx: Contexto) =>
  ctx.db.cuentaContable.findMany({ orderBy: { codigo: "asc" } });

/** Cuentas como las ve el validador del dominio: el padre por código en vez de por id. */
export function aPlan(filas: readonly FilaCuenta[]): CuentaPlan[] {
  const codigoDe = new Map(filas.map((f) => [f.id, f.codigo]));
  return filas.map((f) => ({
    codigo: f.codigo,
    nombre: f.nombre,
    tipo: f.tipo as CuentaPlan["tipo"],
    naturaleza: f.naturaleza as CuentaPlan["naturaleza"],
    grupo: f.grupo as CuentaPlan["grupo"],
    exigeCentroCosto: f.exigeCentroCosto,
    aceptaAsientos: f.aceptaAsientos,
    padreCodigo: f.padreId ? (codigoDe.get(f.padreId) ?? "?") : null,
    claveSistema: f.claveSistema as CuentaPlan["claveSistema"],
    activa: f.activa,
  }));
}

/** Lanza el primer error de validación de la cuenta cambiada; los avisos no bloquean. */
export function exigirValida(plan: CuentaPlan[], codigo: string): void {
  const error = validarPlan(plan).find((a: AlertaPlan) => a.severidad === "error" && a.cuenta === codigo);
  if (error) throw reglaDeNegocio(error.mensaje);
}

export const planListar = defineCapability({
  id: "finanzas.plan.listar",
  descripcion:
    "Lista el plan de cuentas del tenant en orden de código, con cada cuenta (tipo, naturaleza, grupo corriente o no corriente, si exige centro de costo) y las alertas de validación, como una cuenta en el grupo equivocado.",
  permiso: PERMISO_READ,
  input: z.object({ incluirInactivas: z.boolean().default(true) }),
  output: z.object({
    cuentas: z.array(cuentaSchema),
    alertas: z.array(alertaSchema),
    clavesFaltantes: z.array(z.string()),
    inicializado: z.boolean(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await leerPlan(ctx);
    const plan = aPlan(filas);
    return {
      cuentas: filas.filter((f) => input.incluirInactivas || f.activa).map(vistaCuenta),
      alertas: validarPlan(plan),
      clavesFaltantes: filas.length ? clavesFaltantes(plan) : [],
      inicializado: filas.length > 0,
    };
  },
});

