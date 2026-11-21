import { cifradoDeCampos } from "../core/cumplimiento/cifrado-campos";
import type { Contexto } from "../types";

export type CuentaPago = {
  bancoCodigo: string | null;
  tipoCuenta: string | null;
  numeroCuenta: string | null;
};

async function descifrarNumero(ctx: Contexto, guardado: string | null) {
  if (!guardado) return null;
  return cifradoDeCampos(ctx).descifrar("personas_pago", "numero_cuenta", guardado);
}

/** Cuenta por defecto (o la primera) de cada persona, con número de cuenta descifrado. */
export async function cuentasPagoPorPersona(
  ctx: Contexto,
  personaIds: readonly string[],
): Promise<Map<string, CuentaPago>> {
  if (personaIds.length === 0) return new Map();
  const filas = await ctx.db.personaPago.findMany({
    where: { personaId: { in: [...personaIds] } },
    orderBy: [{ porDefecto: "desc" }, { createdAt: "asc" }],
    select: { personaId: true, bancoCodigo: true, tipoCuenta: true, numeroCuenta: true },
  });
  const map = new Map<string, (typeof filas)[0]>();
  for (const f of filas) if (!map.has(f.personaId)) map.set(f.personaId, f);
  const out = new Map<string, CuentaPago>();
  for (const [id, f] of map) {
    out.set(id, {
      bancoCodigo: f.bancoCodigo,
      tipoCuenta: f.tipoCuenta,
      numeroCuenta: f.numeroCuenta ? await descifrarNumero(ctx, f.numeroCuenta) : null,
    });
  }
  return out;
}