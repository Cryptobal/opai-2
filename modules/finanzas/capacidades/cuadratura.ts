import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { cierreMesAnterior, cuadraturaMensual, mesSiguiente, type MovimientoSaldo } from "../domain/cuadratura";
import { saldoDelBanco } from "./bancos/saldo-banco";
import { aNumeroSeguro, saldoSchema } from "./esquemas";
import { PERMISO_VER } from "./permisos";
import { aFecha, aIso } from "./util";

const mesSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Usa el formato aaaa-mm.");
const MAX_MESES = 36;

const mesCuadradoSchema = z.object({
  mes: mesSchema,
  saldoInicial: saldoSchema,
  abonos: saldoSchema,
  cargos: saldoSchema,
  saldoFinal: saldoSchema,
  movimientos: z.number().int(),
});

const mesesEntre = (desde: string, hasta: string) => {
  let n = 0;
  for (let m = desde; m <= hasta; m = mesSiguiente(m)) n += 1;
  return n;
};

/** Cuadratura mensual del saldo de cada cuenta contra su cartola (CAR-343). Solo lectura. */
export const cuadraturaMensualObtener = defineCapability({
  id: "finanzas.cuadratura.mensual",
  descripcion:
    "Entrega, por cuenta bancaria y por mes, el saldo inicial, los abonos, los cargos, el saldo final y la cantidad de movimientos, calculados desde el último saldo conocido del banco y la cartola cargada. Sirve para comparar al peso con la cartola del banco y detectar meses con movimientos faltantes o sobrantes.",
  permiso: PERMISO_VER,
  input: z.object({ desde: mesSchema, hasta: mesSchema, cuentaId: z.uuid().optional() }),
  output: z.object({
    cuentas: z.array(
      z.object({
        cuentaId: z.string(),
        banco: z.string(),
        numeroVisible: z.string(),
        ancla: z
          .object({ saldo: saldoSchema, fecha: z.string() })
          .nullable()
          .describe("Último saldo conocido de la cuenta y su fecha; sin él no se puede cuadrar."),
        meses: z.array(mesCuadradoSchema),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (input.desde > input.hasta) throw reglaDeNegocio("El mes inicial no puede ser posterior al mes final.");
    if (mesesEntre(input.desde, input.hasta) > MAX_MESES) throw reglaDeNegocio(`Pide como máximo ${MAX_MESES} meses.`);
    const cuentas = await ctx.db.cuentaBancaria.findMany({
      where: { activa: true, ...(input.cuentaId ? { id: input.cuentaId } : {}) },
      select: { id: true, banco: true, numeroVisible: true },
      orderBy: { createdAt: "asc" },
    });
    const anclas = new Map((await saldoDelBanco(ctx.db)).cuentasConSaldo.map((c) => [c.cuentaId, c] as const));
    const conAncla = cuentas.filter((c) => anclas.has(c.id));
    const fechas = conAncla.map((c) => anclas.get(c.id)?.fecha ?? "");
    const inicio = [cierreMesAnterior(input.desde), ...fechas].sort()[0] as string;
    const fin = [cierreMesAnterior(mesSiguiente(input.hasta)), ...fechas].sort().at(-1) as string;
    const filas = conAncla.length
      ? await ctx.db.movimientoBancario.findMany({
          where: {
            estado: { not: "ignorado" },
            cuentaId: { in: conAncla.map((c) => c.id) },
            fecha: { gt: aFecha(inicio), lte: aFecha(fin) },
          },
          select: { cuentaId: true, fecha: true, monto: true },
        })
      : [];
    const porCuenta = new Map<string, MovimientoSaldo[]>();
    for (const f of filas) {
      const lista = porCuenta.get(f.cuentaId) ?? [];
      lista.push({ fecha: aIso(f.fecha), monto: aNumeroSeguro(f.monto) });
      porCuenta.set(f.cuentaId, lista);
    }
    return {
      cuentas: cuentas.map((c) => {
        const ancla = anclas.get(c.id);
        return {
          cuentaId: c.id,
          banco: c.banco,
          numeroVisible: c.numeroVisible,
          ancla: ancla ? { saldo: ancla.saldo, fecha: ancla.fecha } : null,
          meses: ancla ? cuadraturaMensual(ancla, porCuenta.get(c.id) ?? [], input.desde, input.hasta) : [],
        };
      }),
    };
  },
});
