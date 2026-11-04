import { z } from "zod";

import { defineCapability, reglaDeNegocio, type Contexto } from "@opai/capabilities";
import {
  normalizarBanco,
  normalizarNumeroCuenta,
  planificarMovimientosApi,
  type MovimientoApiEntrada,
} from "@opai/domain";

import { PERMISO_BANCOS_GESTIONAR } from "./permisos";
import { aFecha } from "./util";
import { aplicarSincronizacion, type MovimientoNuevo } from "./sincronizar-aplicar";

const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe ser AAAA-MM-DD.");

export const movimientoEntradaSchema = z.object({
  idExterno: z.string().trim().min(1).max(120),
  fecha: fechaIso,
  glosa: z.string().trim().min(1).max(500),
  referencia: z.string().trim().max(200).nullish(),
  monto: z.number().int().refine((v) => v !== 0, "El monto no puede ser 0."),
  saldoDespues: z.number().int().nullish(),
});

export const sincronizarInput = z.object({
  numeroCuenta: z.string().trim().min(3).max(40),
  codigoBanco: z.string().trim().max(60).optional(),
  movimientos: z.array(movimientoEntradaSchema).max(500),
  saldoCuenta: z.object({ actual: z.number().int(), al: z.string().max(40) }).nullish(),
  idempotencyKey: z.string().min(8).max(120),
});

export const sincronizarOutput = z.object({
  reconocida: z.boolean(),
  cuentaId: z.string().nullable(),
  nuevos: z.number().int(),
  duplicados: z.number().int(),
  sospechosos: z.number().int(),
  saldoBanco: z.number().int().nullable(),
});

export type SincronizarInput = z.infer<typeof sincronizarInput>;
type Salida = z.infer<typeof sincronizarOutput>;
const sinCuenta: Salida = { reconocida: false, cuentaId: null, nuevos: 0, duplicados: 0, sospechosos: 0, saldoBanco: null };

/** Cuenta activa por número (solo dígitos); el código de banco solo desempata si hay varias. */
async function resolverCuenta(ctx: Contexto, numero: string, banco?: string) {
  const buscada = normalizarNumeroCuenta(numero);
  if (!buscada) return null;
  const cuentas = (await ctx.db.cuentaBancaria.findMany({ where: { activa: true } })).filter(
    (c) => normalizarNumeroCuenta(c.numeroVisible) === buscada,
  );
  if (cuentas.length <= 1) return cuentas[0] ?? null;
  const porBanco = cuentas.filter((c) => banco && normalizarBanco(c.banco) === normalizarBanco(banco));
  if (porBanco.length === 1) return porBanco[0] ?? null;
  throw reglaDeNegocio("Hay varias cuentas con ese número: indica el código del banco.");
}

/** Saldo que reportó el banco: el explícito, o el posterior al último movimiento que lo trae. */
function saldoReportado(i: SincronizarInput): number | null {
  if (i.saldoCuenta) return i.saldoCuenta.actual;
  const ordenados = i.movimientos.filter((m) => m.saldoDespues != null).sort((a, b) => a.fecha.localeCompare(b.fecha));
  return ordenados.at(-1)?.saldoDespues ?? null;
}

export async function sincronizarMovimientos(ctx: Contexto, input: SincronizarInput, dryRun: boolean): Promise<Salida> {
  const cuenta = await resolverCuenta(ctx, input.numeroCuenta, input.codigoBanco);
  if (!cuenta) return sinCuenta;
  // Serializa entregas simultáneas de la misma cuenta: el UPDATE toma el bloqueo de la fila hasta el COMMIT
  // y las lecturas de abajo ya ven lo que confirmó la entrega anterior (ordinales y huellas correctos).
  if (!dryRun) await ctx.db.cuentaBancaria.update({ where: { id: cuenta.id }, data: { ultimaSyncEn: new Date() } });
  const entrantes: MovimientoApiEntrada[] = input.movimientos.map((m, indice) => ({
    indice, idExterno: m.idExterno, fecha: m.fecha, monto: m.monto, glosa: m.glosa, saldoDespues: m.saldoDespues ?? null,
  }));
  const existentes = entrantes.length
    ? await ctx.db.movimientoBancario.findMany({
        where: {
          cuentaId: cuenta.id,
          OR: [
            { idExterno: { in: entrantes.map((e) => e.idExterno) } },
            { fecha: { in: [...new Set(entrantes.map((e) => e.fecha))].map(aFecha) } },
          ],
        },
        select: { claveDedupe: true, saldoDespues: true, idExterno: true },
      })
    : [];
  const plan = planificarMovimientosApi(entrantes, existentes);
  const nuevos: MovimientoNuevo[] = [];
  let sospechosos = 0;
  for (const p of plan) {
    const m = input.movimientos[p.indice];
    if (p.estado !== "nuevo" || !m) continue;
    if (p.sospechoso) sospechosos += 1;
    nuevos.push({ ...m, referencia: m.referencia ?? null, saldoDespues: m.saldoDespues ?? null, claveDedupe: p.claveDedupe });
  }
  const duplicados = plan.length - nuevos.length;
  const saldoBanco = saldoReportado(input);
  const base = { reconocida: true, cuentaId: cuenta.id, duplicados, sospechosos, saldoBanco };
  if (dryRun) return { ...base, nuevos: nuevos.length };
  const insertados = await aplicarSincronizacion(ctx, { cuentaId: cuenta.id, nuevos, duplicados, sospechosos, saldoBanco });
  return { ...base, nuevos: insertados };
}

export const bancosSincronizar = defineCapability({
  id: "finanzas.bancos.sincronizar",
  descripcion:
    "Importa movimientos entregados por el conector bancario en línea (Web4Leads): reconoce la cuenta por su número, descarta los ya guardados (por id externo o por huella y saldo) y marca los sospechosos de duplicado. Con vista previa.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: sincronizarInput,
  output: sincronizarOutput,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    return sincronizarMovimientos(ctx, input, dryRun);
  },
});
