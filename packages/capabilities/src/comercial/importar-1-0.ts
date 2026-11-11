import { defineCapability } from "../define";
import { executeCapability } from "../execute";
import { ErrorCapacidad } from "../errores";
import type { Contexto } from "../types";
import type { DatosOpai1, Plan } from "@opai/db/importar-opai1";
import { ejecutarImportar10, inputImportar10, pideOpai1 } from "./importar-1-0-handler";
import { leerExportDeOpai1 } from "./importar-1-0-origen";
import { exigirOwnerAdmin } from "./importar-1-0-usuarios";
import { resultadoImportar10Schema } from "./importar-1-0-resultado";
import { resumenSiiDelPlan } from "./importar-1-0-sii";

async function fijarCorrelativosCpqDesdePlan(ctx: Contexto, plan: Plan, dryRun: boolean): Promise<number> {
  let n = 0;
  for (const c of plan.correlativosCpq) {
    if (c.omitido) continue;
    const r = await executeCapability(
      ctx,
      "cpq.correlativos.fijar",
      { anio: c.anio, ultimo: c.fijariaUltimo },
      { dryRun },
    );
    if (!r.ok) throw new ErrorCapacidad(r.error.code, r.error.message);
    n += 1;
  }
  return n;
}

type Resultado = Awaited<ReturnType<typeof ejecutarImportar10>>;
type Sii = Awaited<ReturnType<typeof resumenSiiDelPlan>>;
type Preparado = {
  traido: DatosOpai1 | undefined;
  resultado?: Resultado;
  correlativosCpq?: number;
  sii?: Sii | null;
};

async function complementos(ctx: Contexto, r: Resultado, dryRun: boolean) {
  const plan = "plan" in r ? (r.plan as Plan | undefined) : undefined;
  let correlativosCpq = 0;
  if (plan && (r.accion === "simular" || r.accion === "conciliar" || (r.accion === "aplicar" && !dryRun))) {
    correlativosCpq = await fijarCorrelativosCpqDesdePlan(ctx, plan, dryRun || r.accion !== "aplicar");
  }
  // Decisión de Carlos (11-nov-2026): importar no consulta el SII por su cuenta. Solo se informa
  // cuántas cuentas podría completar; la consulta se pide a mano en cada cuenta.
  const sii =
    plan && (r.accion === "simular" || r.accion === "aplicar")
      ? await resumenSiiDelPlan(ctx, plan, { encolar: false })
      : null;
  return { correlativosCpq, sii };
}

/** Importa cuentas, contactos, instalaciones y negocios desde OPAI 1.0 con corridas reversibles. */
export const comercialImportar10 = defineCapability({
  id: "comercial.importar_1_0",
  soloPersonas: true,
  descripcion:
    "Importa un export de OPAI 1.0 (simular, aplicar, conciliar o revertir). Idempotente por ids externos; solo owner o admin. Informa en `sii` cuántas cuentas el SII podría completar (simular lee la caché; aplicar encola las consultas) sin escribir datos del SII en las cuentas.",
  permiso: "comercial:config.manage",
  // El export pegado trae datos personales (contactos, RUT): no se copia a la auditoría.
  sensibles: ["origen"],
  input: inputImportar10,
  output: resultadoImportar10Schema,
  efecto: "escritura",
  dryRun: true,
  // Antes de la transacción de la escritura (tope de 15 s): la lectura de OPAI 1 por red y la carga
  // misma, que va por lotes con sus propias transacciones y queda registrada como corrida reversible.
  // La transacción de la capacidad solo arma la salida y deja la auditoría.
  async preparar(ctx, input): Promise<Preparado> {
    await exigirOwnerAdmin(ctx);
    const traido = pideOpai1(input) ? await leerExportDeOpai1(ctx) : undefined;
    if (input.accion !== "aplicar") return { traido };
    // Todo lo que puede fallar va aquí, junto a la carga: al handler solo le queda armar la salida y
    // dejar la auditoría, para que una corrida real no quede sin su evento por un fallo posterior.
    const resultado = await ejecutarImportar10(ctx, input, false, undefined, traido);
    return { traido, resultado, ...(await complementos(ctx, resultado, false)) };
  },
  async handler(ctx, input, { dryRun, idempotencyKey, preparado }) {
    // Antes de leer OPAI 1 también en simulación (ahí `preparar` no corre).
    await exigirOwnerAdmin(ctx);
    const p = preparado as Preparado | undefined;
    const traido = p?.traido ?? (pideOpai1(input) && !p ? await leerExportDeOpai1(ctx) : undefined);
    const r = p?.resultado ?? (await ejecutarImportar10(ctx, input, dryRun, idempotencyKey, traido));
    const { correlativosCpq, sii } =
      p?.resultado && p.sii !== undefined && p.correlativosCpq !== undefined
        ? { correlativosCpq: p.correlativosCpq, sii: p.sii }
        : await complementos(ctx, r, dryRun);
    const reporte = r.reporte
      ? { ...r.reporte, modulosActivos: [...r.reporte.modulosActivos] }
      : null;
    const aplicadas =
      r.aplicadas && r.accion === "aplicar"
        ? { ...r.aplicadas, correlativosCpq }
        : r.aplicadas;
    return {
      dryRun: r.dryRun,
      accion: r.accion,
      reporte,
      conciliacion: "conciliacion" in r ? (r.conciliacion ?? null) : null,
      revertir: "revertir" in r ? (r.revertir ?? null) : null,
      aplicadas: aplicadas ?? null,
      usuariosResueltos: r.usuariosResueltos ?? 0,
      usuariosSinMembresia: r.usuariosSinMembresia ?? [],
      sii,
    };
  },
});
