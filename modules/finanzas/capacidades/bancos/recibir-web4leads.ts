import { createHash } from "node:crypto";

import { z } from "zod";

import { credencialDe, defineCapability, ErrorCapacidad, reglaDeNegocio } from "@opai/capabilities";
import { verificarFirmaWeb4leads } from "@opai/domain";

import { PERMISO_BANCOS_GESTIONAR } from "./permisos";
import { sincronizarMovimientos, sincronizarOutput } from "./sincronizar";

/** Formato del webhook de Web4Leads, igual al de OPAI 1.0 para no cambiar lo que Web4Leads envía. */
const payloadSchema = z.object({
  accountNumber: z.string().trim().min(3).max(40),
  bankCode: z.string().trim().max(60).optional(),
  movements: z
    .array(
      z.object({
        externalId: z.string().trim().min(1).max(120),
        transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().trim().min(1).max(500),
        reference: z.string().trim().max(200).nullish(),
        amount: z.number().int().refine((v) => v !== 0),
        balance: z.number().int().nullish(),
      }),
    )
    .max(500),
  accountBalance: z.object({ current: z.number().int(), asOf: z.string().max(40) }).nullish(),
});

export const bancosRecibirWeb4leads = defineCapability({
  id: "finanzas.bancos.recibir_web4leads",
  descripcion:
    "Recibe el webhook de movimientos de Web4Leads: verifica la firma con el secreto guardado de la empresa y delega en la sincronización de movimientos bancarios.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  interna: true,
  // El cuerpo trae movimientos y glosas bancarias y la firma es una credencial: nunca a la auditoría inmutable.
  sensibles: ["cuerpo", "firma"],
  input: z.object({
    cuerpo: z.string().min(2).max(1_000_000),
    timestamp: z.string().max(20),
    firma: z.string().max(200),
  }),
  output: sincronizarOutput.extend({ firmaValida: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const secreto = await credencialDe(ctx, "web4leads");
    // Firma inválida o sin secreto: se lanza antes de escribir, así el intento no deja fila en la auditoría.
    if (!secreto || !verificarFirmaWeb4leads(secreto.valor, input.cuerpo, input.timestamp, input.firma)) {
      throw new ErrorCapacidad("UNAUTHENTICATED", "Firma inválida.");
    }
    let crudo: unknown;
    try {
      crudo = JSON.parse(input.cuerpo);
    } catch {
      throw reglaDeNegocio("El cuerpo no es JSON válido.");
    }
    const p = payloadSchema.safeParse(crudo);
    if (!p.success) throw reglaDeNegocio("El formato del webhook no es válido.");
    const r = await sincronizarMovimientos(
      ctx,
      {
        numeroCuenta: p.data.accountNumber,
        ...(p.data.bankCode ? { codigoBanco: p.data.bankCode } : {}),
        movimientos: p.data.movements.map((m) => ({
          idExterno: m.externalId, fecha: m.transactionDate, glosa: m.description,
          referencia: m.reference ?? null, monto: m.amount, saldoDespues: m.balance ?? null,
        })),
        saldoCuenta: p.data.accountBalance ? { actual: p.data.accountBalance.current, al: p.data.accountBalance.asOf } : null,
        // Incluye el hash del cuerpo: dos entregas con el mismo timestamp pero distinto contenido no se confunden.
        idempotencyKey: `web4leads:${input.timestamp}:${createHash("sha256").update(input.cuerpo).digest("hex").slice(0, 16)}`,
      },
      dryRun,
    );
    return { ...r, firmaValida: true };
  },
});
